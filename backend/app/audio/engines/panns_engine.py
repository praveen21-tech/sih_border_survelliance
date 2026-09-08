from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn

from ..ontology import match_taxonomy
from .assets import ensure_panns_labels, ensure_panns_weights


class PannsEngine:
    """PANNs CNN14 pretrained on AudioSet. Real checkpoint, no wget."""

    def __init__(self) -> None:
        self.model: nn.Module | None = None
        self.labels: list[str] = []
        self.error: str | None = None
        self.device = torch.device("cpu")

    def load(self) -> None:
        try:
            labels_csv = ensure_panns_labels()
            weights = ensure_panns_weights()

            self.labels = _read_labels(labels_csv)
            from panns_inference.models import Cnn14

            net = Cnn14(
                sample_rate=32000,
                window_size=1024,
                hop_size=320,
                mel_bins=64,
                fmin=50,
                fmax=14000,
                classes_num=len(self.labels) or 527,
            )
            try:
                ckpt = torch.load(weights, map_location="cpu", weights_only=False)
            except TypeError:
                ckpt = torch.load(weights, map_location="cpu")
            state = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt
            net.load_state_dict(state)
            net.eval()
            self.model = net
            self.error = None
        except Exception as exc:  # pragma: no cover
            self.error = str(exc)
            self.model = None

    @property
    def ready(self) -> bool:
        return self.model is not None

    def infer(self, y: np.ndarray, sr: int) -> tuple[list[dict[str, Any]], np.ndarray | None]:
        if not self.ready:
            return [], None
        import librosa

        y32 = y.astype(np.float32)
        if sr != 32000:
            y32 = librosa.resample(y32, orig_sr=sr, target_sr=32000)
        if y32.size < 32000:
            y32 = np.pad(y32, (0, 32000 - y32.size))
        win = 32000 * 2
        hop = win
        starts = list(range(0, max(1, y32.size - min(win, y32.size) + 1), hop)) or [0]
        clip_acc = None
        embedding = None
        with torch.no_grad():
            for start in starts[:8]:
                chunk = y32[start : start + win]
                if chunk.size < win:
                    chunk = np.pad(chunk, (0, win - chunk.size))
                tensor = torch.from_numpy(chunk[None, :]).float()
                out = self.model(tensor, None)
                cw = out["clipwise_output"].cpu().numpy()[0]
                embedding = out["embedding"].cpu().numpy()[0]
                clip_acc = cw if clip_acc is None else np.maximum(clip_acc, cw)
        clipwise = clip_acc
        top = np.argsort(clipwise)[::-1][:18]
        hits = []
        for idx in top:
            name = self.labels[int(idx)] if idx < len(self.labels) else f"class_{idx}"
            score = float(clipwise[int(idx)])
            matched = match_taxonomy(name)
            hits.append(
                {
                    "label": name,
                    "score": score,
                    "category": matched[0] if matched else "other",
                    "source_model": "PANNs-CNN14",
                    "hindi_label": matched[1]["hindi"] if matched else "",
                    "operational_note": matched[1]["note"] if matched else "",
                }
            )
        return hits, embedding


def _read_labels(path: Path) -> list[str]:
    import csv

    names: list[str] = []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            names.append(row.get("display_name") or row.get("display-name") or list(row.values())[2])
    return names
