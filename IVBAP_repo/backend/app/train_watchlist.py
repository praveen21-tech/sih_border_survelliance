# BorderEye AI — Watchlist trainer
#
#   Images -> Face Detection (RetinaFace) -> Face Embeddings (ArcFace) -> Watchlist
#
# Reads every readable image in a folder, keeps every valid detected face, and
# stores the embeddings under the person's name. No manual image selection.
#
# Usage:
#   python -m app.train_watchlist --name Daniel --folder D:\IVBAP\bordereye-ai\mybeautifulface
import argparse
import glob
import os
import sys
import time

import cv2

from app.face_detector import FaceDetector
from app.watchlist_manager import WatchlistManager

IMAGE_EXTS = ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.bmp", "*.tiff", "*.JPG", "*.JPEG", "*.PNG", "*.WEBP")


def collect_images(folder: str) -> list[str]:
    files: list[str] = []
    for pat in IMAGE_EXTS:
        files.extend(glob.glob(os.path.join(folder, pat)))
    return sorted(set(files))


def train(name: str, folder: str, min_det: float, manager: WatchlistManager | None = None) -> dict:
    manager = manager or WatchlistManager()
    images = collect_images(folder)
    print(f"[train] person={name} folder={folder}")
    print(f"[train] found {len(images)} image(s)")

    detector = FaceDetector(min_det_score=min_det)

    embeddings: list = []
    processed = 0
    rejected = 0
    for i, img_path in enumerate(images, 1):
        img = cv2.imread(img_path)
        if img is None:
            print(f"[train] unreadable: {os.path.basename(img_path)}")
            rejected += 1
            continue
        faces = detector.recognize(img, max_num=5)
        for f in faces:
            embeddings.append(f["embedding"])
        processed += 1
        if i % 10 == 0 or i == len(images):
            print(f"[train] {i}/{len(images)} images, {len(embeddings)} face(s) so far (det>= {min_det:.2f})", flush=True)

    if not embeddings:
        print("[train] ERROR: no face embeddings were generated — check the image folder / detection", flush=True)
        sys.exit(2)

    person = manager.add_person(name, embeddings, replace=True)
    print(f"[train] stored person_id={person['person_id']} name={person['name']} "
          f"embeddings={len(embeddings)} (det_score>={min_det:.2f})")

    # Self-check: each stored embedding should match Daniel.
    sims = [manager.best_match(e, threshold=-1.0)[1] for e in embeddings]
    pos = sum(1 for s in sims if s >= 0.45)
    print(f"[train] self-check: {pos}/{len(sims)} embeddings match Daniel at sim>=0.45 "
          f"(min={min(sims):.3f} median={sorted(sims)[len(sims)//2]:.3f} max={max(sims):.3f})")
    print(f"[train] watchlist DB: {manager.path}")
    return {"images": processed, "faces": len(embeddings), "person": person, "rejected": rejected}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Train watchlist embeddings from a face image folder")
    ap.add_argument("--name", default="Daniel")
    ap.add_argument("--folder", default=r"D:\IVBAP\bordereye-ai\mybeautifulface")
    ap.add_argument("--min-det", type=float, default=0.4, help="minimum RetinaFace detection score")
    args = ap.parse_args()
    t0 = time.time()
    result = train(args.name, args.folder, args.min_det)
    print(f"[train] done in {time.time() - t0:.1f}s")