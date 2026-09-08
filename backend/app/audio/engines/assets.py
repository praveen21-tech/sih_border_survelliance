from __future__ import annotations

import csv
import shutil
import urllib.request
from pathlib import Path

from ..config import settings

PANNS_DIR = Path.home() / "panns_data"
LABELS_URL = "https://storage.googleapis.com/us_audioset/youtube_corpus/v1/csv/class_labels_indices.csv"
PANNS_WEIGHT_NAME = "Cnn14_mAP=0.431.pth"
PANNS_MIN_BYTES = 300_000_000
PANNS_URLS = [
    "https://huggingface.co/thelou1s/panns-inference/resolve/main/Cnn14_mAP%3D0.431.pth?download=true",
    "https://huggingface.co/datasets/Jinbo-HU/PSELDNets/resolve/main/model/Cnn14_mAP%3D0.431.pth?download=true",
    "https://zenodo.org/records/3987831/files/Cnn14_mAP=0.431.pth?download=1",
    "https://zenodo.org/record/3987831/files/Cnn14_mAP%3D0.431.pth?download=1",
]


def download(url: str, dest: Path, min_bytes: int = 1000) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size >= min_bytes:
        return dest
    tmp = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "BorderEye/1.0 (Indian border acoustic intelligence; academic/security R&D)"},
    )
    with urllib.request.urlopen(req, timeout=180) as resp, open(tmp, "wb") as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
    if tmp.stat().st_size < min_bytes:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"download too small: {dest} from {url} ({tmp.stat().st_size if tmp.exists() else 0} bytes)")
    tmp.replace(dest)
    return dest


def download_first(urls: list[str], dest: Path, min_bytes: int) -> Path:
    if dest.exists() and dest.stat().st_size >= min_bytes:
        return dest
    errors: list[str] = []
    for url in urls:
        try:
            return download(url, dest, min_bytes=min_bytes)
        except Exception as exc:
            errors.append(f"{url}: {exc}")
    if dest.exists() and dest.stat().st_size >= min_bytes:
        return dest
    raise RuntimeError("all download mirrors failed: " + " | ".join(errors))


def ensure_panns_labels() -> Path:
    """Must exist before `import panns_inference` (that package shells out to wget)."""
    dest = PANNS_DIR / "class_labels_indices.csv"
    mirrored = settings.models_dir / "class_labels_indices.csv"
    try:
        download(LABELS_URL, dest, min_bytes=5000)
    except Exception:
        if mirrored.exists() and mirrored.stat().st_size >= 5000:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(mirrored.read_bytes())
            return dest
        raise
    if not mirrored.exists():
        mirrored.write_bytes(dest.read_bytes())
    return dest


def ensure_panns_weights() -> Path:
    dest = PANNS_DIR / PANNS_WEIGHT_NAME
    mirrored = settings.models_dir / PANNS_WEIGHT_NAME
    if dest.exists() and dest.stat().st_size >= PANNS_MIN_BYTES:
        return dest
    if mirrored.exists() and mirrored.stat().st_size >= PANNS_MIN_BYTES:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(mirrored, dest)
        return dest
    try:
        from huggingface_hub import hf_hub_download

        local = hf_hub_download(
            repo_id="thelou1s/panns-inference",
            filename="Cnn14_mAP=0.431.pth",
        )
        src = Path(local)
        if src.stat().st_size >= PANNS_MIN_BYTES:
            dest.parent.mkdir(parents=True, exist_ok=True)
            if src.resolve() != dest.resolve():
                shutil.copy2(src, dest)
            if not mirrored.exists():
                shutil.copy2(dest, mirrored)
            return dest
    except Exception:
        pass
    download_first(PANNS_URLS, dest, PANNS_MIN_BYTES)
    if not mirrored.exists():
        shutil.copy2(dest, mirrored)
    return dest


def read_audioset_labels(path: Path) -> list[str]:
    names: list[str] = []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            names.append(row["display_name"])
    return names
