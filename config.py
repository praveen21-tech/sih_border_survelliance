import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if available
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings:
    # Base paths
    BASE_DIR = Path(__file__).resolve().parent
    DATA_DIR = BASE_DIR / "data"
    CROPS_DIR = DATA_DIR / "crops"
    VECTOR_DB_DIR = DATA_DIR / "vector_db"
    
    # LLM Settings (Feature 12)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq").lower()
    LLM_MODEL: str = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/surveillance.db")
    
    # Re-ID Settings (Feature 13)
    REID_SIMILARITY_THRESHOLD: float = float(os.getenv("REID_SIMILARITY_THRESHOLD", "0.72"))
    REID_FEATURE_DIM: int = int(os.getenv("REID_FEATURE_DIM", "512"))
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolo11n.pt")
    REID_BACKBONE: str = os.getenv("REID_BACKBONE", "osnet_x0_25")
    DEVICE: str = os.getenv("DEVICE", "cpu")
    
    # Server Settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    def ensure_directories(self):
        """Ensure necessary runtime directories exist."""
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.CROPS_DIR.mkdir(parents=True, exist_ok=True)
        self.VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
