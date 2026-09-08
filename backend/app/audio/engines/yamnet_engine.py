from __future__ import annotations

from typing import Any

import numpy as np

from ..config import settings
from ..ontology import match_taxonomy


class YamnetEngine:
    """Google YAMNet (AudioSet, 521 classes) via TensorFlow Hub. Real weights."""

    def __init__(self) -> None:
        self.model = None
        self.class_names: list[str] = []
        self.error: str | None = None

    def load(self) -> None:
        try:
            import tensorflow as tf  # noqa: F401
            import tensorflow_hub as hub

            self.model = hub.load(settings.yamnet_handle)
            class_map_path = self.model.class_map_path().numpy()
            import csv
            import io

            raw = tf.io.gfile.GFile(class_map_path).read()
            reader = csv.DictReader(io.StringIO(raw.decode("utf-8") if isinstance(raw, bytes) else raw))
            self.class_names = [row["display_name"] for row in reader]
            self.error = None
        except Exception as exc:  # pragma: no cover - environment dependent
            self.error = str(exc)
            self.model = None

    @property
    def ready(self) -> bool:
        return self.model is not None

    def infer(self, y: np.ndarray, sr: int) -> list[dict[str, Any]]:
        if not self.ready:
            return []
        import tensorflow as tf

        if sr != 16000:
            import librosa

            y = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=16000)
            sr = 16000
        waveform = tf.convert_to_tensor(y, dtype=tf.float32)
        scores, embeddings, spectrogram = self.model(waveform)
        scores_np = scores.numpy()
        mean_scores = np.mean(scores_np, axis=0)
        max_scores = np.max(scores_np, axis=0)
        n_frames = scores_np.shape[0]

        # -----------------------------------------------------------------------
        # Adaptive pooling strategy
        # Transient events (gunshot/firework/explosion) occupy 1-2 YAMNet tiles
        # (~0.48 s each) so max-heavy pooling captures them better than clip-mean.
        # Sustained events (aircraft, helicopter, crowd, siren) are present across
        # most frames — mean-heavy pooling is more accurate and prevents a single
        # spurious tile from contaminating the label ranking.
        #
        # We use two pooled scores and take the class-specific best:
        #   peak_pool  (0.25 mean + 0.75 max) — for transient security events
        #   mean_pool  (0.65 mean + 0.35 max) — for sustained sounds
        # Then for each class we choose which pool to use based on its ontology
        # category; "other" classes use the blended 0.40/0.60 mix.
        # -----------------------------------------------------------------------
        peak_pool = 0.25 * mean_scores + 0.75 * max_scores   # transients
        mean_pool = 0.65 * mean_scores + 0.35 * max_scores   # sustained
        blend_pool = 0.40 * mean_scores + 0.60 * max_scores  # default

        # Pre-scan top-40 candidates across all pools
        candidate_idx = set(np.argsort(blend_pool)[::-1][:30].tolist())
        candidate_idx |= set(np.argsort(peak_pool)[::-1][:20].tolist())
        candidate_idx |= set(np.argsort(mean_pool)[::-1][:20].tolist())

        _TRANSIENT_CATS = {"gunshot", "explosion"}
        _SUSTAINED_CATS = {"aircraft_rotorcraft", "vehicle", "crowd", "alarm", "speech"}

        scored: list[tuple[float, int]] = []
        for idx in candidate_idx:
            name = self.class_names[int(idx)] if idx < len(self.class_names) else f"class_{idx}"
            matched = match_taxonomy(name)
            cat = matched[0] if matched else "other"
            if cat in _TRANSIENT_CATS:
                s = float(peak_pool[int(idx)])
            elif cat in _SUSTAINED_CATS:
                s = float(mean_pool[int(idx)])
            else:
                s = float(blend_pool[int(idx)])
            scored.append((s, idx))

        scored.sort(key=lambda x: x[0], reverse=True)

        # Suppress generic "Vehicle" label if a more specific aerial label is
        # present in the top results — YAMNet fires "Vehicle" broadly on any
        # engine noise including propeller aircraft.
        _AERIAL_LABELS_LC = {
            "aircraft", "fixed-wing aircraft, airplane", "helicopter",
            "propeller, airscrew", "aircraft engine", "jet engine",
        }
        has_aerial = any(
            self.class_names[int(idx)].lower() in _AERIAL_LABELS_LC
            for s, idx in scored[:20]
            if s > 0.20
        )

        hits = []
        seen_labels: set[str] = set()
        for score, idx in scored:
            if len(hits) >= 22:
                break
            name = self.class_names[int(idx)] if idx < len(self.class_names) else f"class_{idx}"
            key = name.lower()
            if key in seen_labels:
                continue
            seen_labels.add(key)
            # Suppress the broad "Vehicle" label when a specific aerial label
            # is already present with meaningful confidence.
            if has_aerial and key == "vehicle" and score < 0.75:
                continue
            matched = match_taxonomy(name)
            cat = matched[0] if matched else "other"
            hits.append(
                {
                    "label": name,
                    "score": score,
                    "mean_score": float(mean_scores[int(idx)]),
                    "peak_score": float(max_scores[int(idx)]),
                    "category": cat,
                    "source_model": "YAMNet",
                    "hindi_label": matched[1]["hindi"] if matched else "",
                    "operational_note": matched[1]["note"] if matched else "",
                }
            )
        return hits
