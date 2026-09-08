import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("TFHUB_MODEL_LOAD_FORMAT", "COMPRESSED")


ROOT = Path(__file__).resolve().parents[2]
BACKEND = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Bharat Border Audio Intelligence"
    organisation: str = "Ministry of Home Affairs - Border Security Force"
    classification: str = "RESTRICTED - For authorised security personnel only"
    timezone: str = "Asia/Kolkata"

    host: str = "0.0.0.0"
    port: int = 8080

    data_dir: Path = ROOT / "data"
    evidence_dir: Path = ROOT / "data" / "evidence"
    models_dir: Path = ROOT / "data" / "models"
    db_path: Path = ROOT / "data" / "ops.sqlite3"

    sample_rate: int = 16000
    analysis_window_sec: float = 0.96
    hop_sec: float = 0.48
    max_upload_sec: int = 180

    yamnet_handle: str = "https://tfhub.dev/google/yamnet/1"
    # Whisper large-v3 gives the best Indian-language accuracy across all 22 scheduled
    # languages. Falls back gracefully to "base" if memory is constrained.
    # Override via .env: whisper_size=base
    whisper_size: str = "large-v3"
    whisper_device: str = "cuda"
    whisper_compute: str = "float16"
    whisper_beam_size: int = 5
    panns_device: str = "cpu"

    indian_lang_hints: list[str] = [
        "hi", "mr", "pa", "bn", "gu", "ta", "te", "kn", "ml", "or", "ur", "ne", "as"
    ]

    speech_gate: float = 0.18
    event_alert_threshold: float = 0.35
    drone_alert_threshold: float = 0.42

    default_post: str = "BOP-RJ-014"
    default_sector: str = "Barmer-Jaisalmer Sector"
    default_force: str = "BSF South Bengal / Western Command (configurable)"


settings = Settings()
for path in (settings.data_dir, settings.evidence_dir, settings.models_dir, settings.data_dir / "field_samples"):
    path.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("TFHUB_CACHE_DIR", str(settings.models_dir / "tfhub"))
