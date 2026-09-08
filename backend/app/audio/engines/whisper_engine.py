# -*- coding: utf-8 -*-
"""
Whisper Speech Intelligence Engine — Module 17
===============================================
Uses faster-whisper (CTranslate2) with Whisper large-v3 for maximum
accuracy across all Indian languages and dialects.

Supported language families:
  Indo-Aryan  : Hindi, Urdu, Punjabi, Bengali, Marathi, Gujarati, Odia,
                Assamese, Sindhi, Kashmiri, Nepali, Dogri, Maithili,
                Bodo, Santali, Konkani, Rajasthani (treated as Hindi)
  Dravidian   : Tamil, Telugu, Kannada, Malayalam
  Tibeto-Burman: Manipuri (Meitei), Naga, Mizo (romanised)
  Global      : English, Arabic, Pashto, Dari, Burmese, Chinese,
                + all other Whisper-supported languages

Design decisions:
  • language=None → Whisper auto-detects from the first 30 s of audio.
    This is more accurate than forcing a language for border intercepts
    where the speaker's language is unknown.
  • beam_size=5 for a good accuracy/speed tradeoff on CPU (int8).
  • vad_filter=True removes silence and reduces hallucinations.
  • word_timestamps=True gives per-word timing for forensic evidence.
  • condition_on_previous_text=False prevents hallucination propagation
    across segments (critical for noisy field recordings).
  • initial_prompt is set to a multilingual border-context hint that
    primes the model vocabulary without forcing language detection.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

import numpy as np

from ..config import settings
from ..ontology import DISTRESS_PHRASES, DISTRESS_KEYWORDS_MULTILINGUAL

# ── Indian language metadata ──────────────────────────────────────────────────
# Maps Whisper language code → (native name, script, ISO 639-1)
INDIAN_LANGUAGES: dict[str, dict] = {
    "hi": {"name": "Hindi",      "native": "हिन्दी",     "script": "Devanagari", "iso": "hi"},
    "mr": {"name": "Marathi",    "native": "मराठी",      "script": "Devanagari", "iso": "mr"},
    "ne": {"name": "Nepali",     "native": "नेपाली",     "script": "Devanagari", "iso": "ne"},
    "sa": {"name": "Sanskrit",   "native": "संस्कृत",    "script": "Devanagari", "iso": "sa"},
    "mai": {"name": "Maithili",  "native": "मैथिली",     "script": "Devanagari", "iso": "mai"},
    "bn": {"name": "Bengali",    "native": "বাংলা",       "script": "Bengali",    "iso": "bn"},
    "as": {"name": "Assamese",   "native": "অসমীয়া",    "script": "Bengali",    "iso": "as"},
    "pa": {"name": "Punjabi",    "native": "ਪੰਜਾਬੀ",     "script": "Gurmukhi",   "iso": "pa"},
    "gu": {"name": "Gujarati",   "native": "ગુજરાતી",    "script": "Gujarati",   "iso": "gu"},
    "or": {"name": "Odia",       "native": "ଓଡ଼ିଆ",      "script": "Odia",       "iso": "or"},
    "ta": {"name": "Tamil",      "native": "தமிழ்",      "script": "Tamil",      "iso": "ta"},
    "te": {"name": "Telugu",     "native": "తెలుగు",     "script": "Telugu",     "iso": "te"},
    "kn": {"name": "Kannada",    "native": "ಕನ್ನಡ",       "script": "Kannada",    "iso": "kn"},
    "ml": {"name": "Malayalam",  "native": "മലയാളം",      "script": "Malayalam",  "iso": "ml"},
    "ur": {"name": "Urdu",       "native": "اردو",        "script": "Perso-Arabic","iso": "ur"},
    "sd": {"name": "Sindhi",     "native": "سنڌي",        "script": "Perso-Arabic","iso": "sd"},
    "ks": {"name": "Kashmiri",   "native": "कॉशुर",       "script": "Devanagari", "iso": "ks"},
    "bo": {"name": "Tibetan",    "native": "བོད་ཡིག",    "script": "Tibetan",    "iso": "bo"},
    "mni": {"name": "Manipuri",  "native": "মৈতৈলোন্",   "script": "Bengali",    "iso": "mni"},
    "en": {"name": "English",    "native": "English",     "script": "Latin",      "iso": "en"},
}

# Romanisation note appended to output when script is non-Latin
_SCRIPT_NOTE = {
    "Devanagari":   "Text in Devanagari script",
    "Bengali":      "Text in Bengali/Assamese script",
    "Gurmukhi":     "Text in Gurmukhi (Punjabi) script",
    "Gujarati":     "Text in Gujarati script",
    "Odia":         "Text in Odia script",
    "Tamil":        "Text in Tamil script",
    "Telugu":       "Text in Telugu script",
    "Kannada":      "Text in Kannada script",
    "Malayalam":    "Text in Malayalam script",
    "Perso-Arabic": "Text in Arabic/Urdu script",
    "Tibetan":      "Text in Tibetan script",
}

# Initial prompt to prime Whisper vocabulary for border/security context.
# Written in multiple scripts so the tokeniser pre-activates the right vocab.
# Deliberately kept factual — no invented speech.
_INITIAL_PROMPT = (
    "Border security audio recording. "
    "सीमा सुरक्षा ऑडियो रिकॉर्डिंग। "
    "सीमा सुरक्षा ऑडिओ रेकॉर्डिंग. "       # Marathi
    "সীমান্ত নিরাপত্তা অডিও রেকর্ডিং। "     # Bengali
    "ਸਰਹੱਦੀ ਸੁਰੱਖਿਆ ਆਡੀਓ ਰਿਕਾਰਡਿੰਗ। "       # Punjabi
    "بارڈر سیکیورٹی آڈیو ریکارڈنگ۔ "          # Urdu
    "Tamil: எல்லை பாதுகாப்பு ஆடியோ. "
    "Telugu: సరిహద్దు భద్రత ఆడియో. "
    "Kannada: ಗಡಿ ಭದ್ರತೆ ಆಡಿಯೋ. "
    "Malayalam: അതിർത്തി സുരക്ഷ ഓഡിയോ."
)


class WhisperEngine:
    """
    OpenAI Whisper large-v3 via faster-whisper (CTranslate2 int8).

    Supports all 22 Indian scheduled languages plus all other
    Whisper-supported global languages automatically.
    """

    def __init__(self) -> None:
        self.model = None
        self.error: str | None = None
        self._size = settings.whisper_size

    def load(self) -> None:
        import logging
        log = logging.getLogger("border.whisper")
        
        try:
            from faster_whisper import WhisperModel
        except (ImportError, Exception) as exc:
            log.info("faster_whisper not available (%s); Whisper engine will run in fallback acoustic mode.", exc)
            self.model = None
            self.error = str(exc)
            return

        # 1. Try configured device (e.g. cuda float16)
        try:
            log.info("Loading Whisper %s (%s %s)", settings.whisper_size, settings.whisper_device, settings.whisper_compute)
            self.model = WhisperModel(
                settings.whisper_size,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute,
                download_root=str(settings.models_dir / "whisper"),
            )
            self._size = settings.whisper_size
            self.error = None
            log.info("Whisper %s ready on %s", settings.whisper_size, settings.whisper_device)
            return
        except Exception as exc:
            log.warning("Whisper %s on %s failed: %s", settings.whisper_size, settings.whisper_device, exc)

        # 2. Try large-v3 on CPU int8 fallback if CUDA failed
        if settings.whisper_device != "cpu":
            try:
                log.info("Falling back to Whisper %s on CPU (int8)", settings.whisper_size)
                self.model = WhisperModel(
                    settings.whisper_size,
                    device="cpu",
                    compute_type="int8",
                    download_root=str(settings.models_dir / "whisper"),
                )
                self._size = settings.whisper_size
                self.error = None
                log.info("Whisper %s ready on CPU int8", settings.whisper_size)
                return
            except Exception as exc2:
                log.warning("Whisper %s on CPU int8 failed: %s", settings.whisper_size, exc2)

        # 3. Fall back to base on CPU
        try:
            log.info("Falling back to Whisper base on CPU")
            self.model = WhisperModel(
                "base",
                device="cpu",
                compute_type="int8",
            )
            self._size = "base"
            self.error = "large-v3 unavailable, running base"
        except Exception as exc3:
            self.model = None
            self.error = str(exc3)

    @property
    def ready(self) -> bool:
        return self.model is not None

    def transcribe(self, y: np.ndarray, sr: int) -> dict[str, Any]:
        """
        Transcribe audio. Supports all Indian and global languages.

        Returns:
          text              : full transcript (native script)
          language          : ISO 639-1 code e.g. "hi", "ta", "en"
          language_name     : English name e.g. "Hindi", "Tamil"
          language_native   : Native name e.g. "हिन्दी", "தமிழ்"
          language_script   : Script name e.g. "Devanagari", "Tamil"
          language_probability : float 0-1
          distress          : bool — any distress phrase matched
          distress_phrases  : list of matched phrases
          threat_keywords   : list of border-threat keywords matched
          segments          : per-segment dicts with start/end/text/words
          word_count        : total word count
          model_size        : which whisper model produced this
        """
        empty = _empty_result(self._size)
        if not self.ready or len(y) < sr * 0.35:
            return empty

        try:
            segments_iter, info = self.model.transcribe(
                y,
                language=None,            # auto-detect
                beam_size=5,
                vad_filter=True,
                vad_parameters={"min_silence_duration_ms": 300},
                word_timestamps=True,
                condition_on_previous_text=False,  # prevent hallucination chains
                initial_prompt=_INITIAL_PROMPT,
                task="transcribe",
                temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0],  # fallback greedy
                log_prob_threshold=-1.0,
                no_speech_threshold=0.6,
                compression_ratio_threshold=2.4,
            )
        except Exception as exc:
            import logging
            logging.getLogger("border.whisper").warning("Transcribe error: %s", exc)
            return empty

        # Collect segments
        segs: list[dict] = []
        texts: list[str] = []
        word_count = 0
        for seg in segments_iter:
            piece = seg.text.strip()
            if not piece:
                continue
            texts.append(piece)
            # Per-word timing (available with word_timestamps=True)
            words = []
            if hasattr(seg, "words") and seg.words:
                for w in seg.words:
                    words.append({
                        "word":       w.word.strip(),
                        "start":      round(w.start, 3),
                        "end":        round(w.end, 3),
                        "confidence": round(float(w.probability), 4),
                    })
                    word_count += 1
            segs.append({
                "start":       round(seg.start, 2),
                "end":         round(seg.end, 2),
                "text":        piece,
                "confidence":  round(float(getattr(seg, "avg_logprob", -1.0)), 4),
                "words":       words,
            })

        text = " ".join(texts).strip()
        lang_code = (getattr(info, "language", None) or "").lower()
        lang_prob  = float(getattr(info, "language_probability", 0) or 0)

        # Language metadata
        lang_meta = INDIAN_LANGUAGES.get(lang_code, {
            "name":   lang_code.upper() if lang_code else "Unknown",
            "native": "",
            "script": "Latin",
            "iso":    lang_code,
        })

        script_type = detect_script(text) if text else lang_meta.get("script", "Latin")

        # Distress and threat analysis
        distress_phrases = _distress_hits(text, lang_code)
        threat_keywords  = _threat_keywords(text)
        distress_flag    = bool(distress_phrases) or bool(threat_keywords)

        return {
            "text":                 text,
            "raw_text":             text,
            "clean_text":           text,
            "language":             lang_code,
            "language_code":        lang_code,
            "primary_language":     lang_code,
            "language_name":        lang_meta.get("name", ""),
            "language_native":      lang_meta.get("native", ""),
            "language_script":      script_type,
            "script":               script_type,
            "language_probability": round(lang_prob, 4),
            "distress":             distress_flag,
            "is_distress":          distress_flag,
            "distress_phrases":     distress_phrases,
            "threat_keywords":      threat_keywords,
            "segments":             segs,
            "word_count":           word_count,
            "model_size":           self._size,
        }


# ── Distress detection ────────────────────────────────────────────────────────

def _distress_hits(text: str, lang: str = "") -> list[str]:
    """Match DISTRESS_PHRASES against normalised transcript."""
    if not text:
        return []
    norm = _normalise(text)
    hits: set[str] = set()

    for phrase in DISTRESS_PHRASES:
        phrase_norm = _normalise(phrase)
        if phrase_norm in norm:
            hits.add(phrase)

    # Word-boundary check for short English tokens
    tokens = set(re.findall(r"[a-zA-Z']{2,}", norm))
    for word in ("help", "mayday", "emergency", "ceasefire", "surrender"):
        if word in tokens:
            hits.add(word)

    # Unicode script hit for script-native distress tokens
    for phrase in DISTRESS_PHRASES:
        if _has_non_latin(phrase) and phrase in text:
            hits.add(phrase)

    return sorted(hits)


def detect_script(text: str) -> str:
    """Determines the dominant writing script of transcribed text."""
    if not text:
        return "Unknown"
    scripts = {
        "Devanagari":  r'[\u0900-\u097F]',
        "Bengali":     r'[\u0980-\u09FF]',
        "Gurmukhi":    r'[\u0A00-\u0A7F]',
        "Gujarati":    r'[\u0A80-\u0AFF]',
        "Tamil":       r'[\u0B80-\u0BFF]',
        "Telugu":      r'[\u0C00-\u0C7F]',
        "Kannada":     r'[\u0C80-\u0CFF]',
        "Malayalam":   r'[\u0D00-\u0D7F]',
        "Arabic/Urdu": r'[\u0600-\u06FF]',
        "Latin":       r'[a-zA-Z]'
    }
    for script, regex in scripts.items():
        if re.search(regex, text):
            return script
    return "Unknown"


def _threat_keywords(text: str) -> list[str]:
    """
    Match border-threat tactical keywords across all languages including native scripts.
    Returns keywords found — these elevate alert severity independently
    of the full distress phrase match.
    """
    if not text:
        return []

    norm  = _normalise(text)
    found = []

    # 1. Native script distress and threat keywords from ontology
    for lang, words in DISTRESS_KEYWORDS_MULTILINGUAL.items():
        for word in words:
            word_norm = _normalise(word)
            if word in text or word_norm in norm:
                found.append(word)

    # 2. Transliterated and tactical keywords
    TACTICAL = {
        "infiltrat", "smuggl", "crossing", "bomb", "landmine",
        "ied", "explosive", "rpg", "ak47", "weapons cache",
        "tunnel", "surang", "narcotics", "drugs", "heroin",
        "aatankwadi", "atankwadi", "ghuspaithiya", "aar par",
        "surang", "bomb hai", "hatiyar", "hathiyar",
        "terrorist", "jihaad", "jihadi",
    }
    tokens = set(re.findall(r"\S+", norm))
    for kw in TACTICAL:
        kw_norm = _normalise(kw)
        if kw_norm in norm or any(kw_norm in tok for tok in tokens):
            found.append(kw)

    return sorted(set(found))


class IndianMultilingualWhisperEngine:
    """
    Refactored native Faster-Whisper ASR pipeline class for Indian Regional Languages,
    Script Identification, and Operational Threat Keyword extraction.
    """
    def __init__(self, model_size: str = "large-v3", device: str = "auto") -> None:
        self.model_size = model_size
        self.device = device
        self.engine = WhisperEngine()
        self.engine.load()

    def detect_script(self, text: str) -> str:
        return detect_script(text)

    def transcribe_audio(self, audio_path: str) -> dict[str, Any]:
        """Runs multilingual ASR on an audio file, returning text, script, and threat tags."""
        import librosa
        y, sr = librosa.load(audio_path, sr=16000)
        res = self.engine.transcribe(y, sr)
        full_text = res.get("text", "")
        script_type = self.detect_script(full_text)
        threats = res.get("threat_keywords", [])
        return {
            "text":                 full_text,
            "raw_text":             full_text,
            "clean_text":           full_text,
            "language_code":        res.get("language", ""),
            "primary_language":     res.get("language", ""),
            "language_name":        res.get("language_name", ""),
            "language_probability": res.get("language_probability", 0.0),
            "script":               script_type,
            "threat_keywords":      threats,
            "is_distress":          res.get("distress", False),
        }


# ── Utilities ─────────────────────────────────────────────────────────────────

def _normalise(s: str) -> str:
    """
    Lower-case + Unicode NFC normalisation.
    Keeps all scripts intact (Devanagari, Tamil, etc.) but standardises
    composed/decomposed forms and ligatures.
    """
    return unicodedata.normalize("NFC", s).lower()


def _has_non_latin(s: str) -> bool:
    """True if string contains any non-ASCII Unicode character."""
    return any(ord(c) > 127 for c in s)


def _empty_result(size: str = "large-v3") -> dict[str, Any]:
    return {
        "text":                 "",
        "raw_text":             "",
        "clean_text":           "",
        "language":             "",
        "language_code":        "",
        "primary_language":     "",
        "language_name":        "",
        "language_native":      "",
        "language_script":      "",
        "script":               "",
        "language_probability": 0.0,
        "distress":             False,
        "is_distress":          False,
        "distress_phrases":     [],
        "threat_keywords":      [],
        "segments":             [],
        "word_count":           0,
        "model_size":           size,
    }
