# -*- coding: utf-8 -*-
"""Indian border security audio event ontology.

Maps AudioSet / YAMNet / PANNs labels to operational BSF categories.
Scores from the real models are never invented — only remapped.
"""

from __future__ import annotations

import re

SECURITY_TAXONOMY: dict[str, dict] = {
    "speech": {
        "category": "speech",
        "hindi": "मानव वाणी",
        "severity": "LOW",
        "note": "Speech present — Whisper transcription engaged.",
        "labels": {
            "speech",
            "conversation",
            "narration, monologue",
            "male speech, man speaking",
            "female speech, woman speaking",
            "child speech, kid speaking",
            "speech synthesizer",
        },
    },
    "gunshot": {
        "category": "lethal_fire",
        "hindi": "गोली चलने की आवाज़",
        "severity": "CRITICAL",
        "note": "Possible small-arms fire. Correlate with nearest tower camera and alert Quick Reaction Team.",
        "labels": {
            "gunshot, gunfire",
            "gunshot",
            "gunfire",
            "machine gun",
            "cap gun",
            "artillery fire",
        },
    },
    "explosion": {
        "category": "blast",
        "hindi": "विस्फोट",
        "severity": "CRITICAL",
        "note": "Blast-like impulse. Preserve clip as evidence and notify sector HQ.",
        "labels": {"explosion", "boom", "artillery fire", "fireworks"},
    },
    "scream": {
        "category": "distress_vocal",
        "hindi": "चीख / संकट की पुकार",
        "severity": "HIGH",
        "note": "Human distress vocalisation. Run speech pipeline and dispatch nearest patrol.",
        "labels": {
            "screaming",
            "scream",
            "shout",
            "yell",
            "crying, sobbing",
            "wail, moan",
            "baby cry, infant cry",
        },
    },
    "aggression": {
        "category": "aggression",
        "hindi": "आक्रामक मौखिक गतिविधि",
        "severity": "HIGH",
        "note": "Aggressive speech or shouting consistent with confrontation.",
        "labels": {"battle cry", "growling", "snarl", "argument"},
    },
    "crowd": {
        "category": "crowd_activity",
        "hindi": "भीड़ / संदिग्ध सामूहिक गतिविधि",
        "severity": "MEDIUM",
        "note": "Crowd or hubbub near the fence line. Review optical feed for assembly or fencing pressure.",
        "labels": {
            "crowd",
            "hubbub, speech noise, speech babble",
            "chatter",
            "children shouting",
            "cheering",
            "clapping",
            "hubbub",
            "applause",
        },
    },
    "vehicle": {
        "category": "ground_vehicle",
        "hindi": "वाहन / इंजन",
        "severity": "LOW",
        "note": "Ground vehicle or engine noise. Cross-check ANPR cameras if on approach road.",
        "labels": {
            "vehicle",
            "car",
            "truck",
            "motorcycle",
            "engine",
            "idling",
            "accelerating, revving, vroom",
        },
    },
    "aircraft_rotorcraft": {
        "category": "aerial",
        "hindi": "वायुयान / हेलीकॉप्टर",
        "severity": "HIGH",
        "note": "Manned or unmanned aerial acoustic signature. Hand off to drone engine.",
        "labels": {
            "aircraft",
            "fixed-wing aircraft, airplane",
            "helicopter",
            "propeller, airscrew",
            "aircraft engine",
            "jet engine",
        },
    },
    "alarm": {
        "category": "alarm",
        "hindi": "सायरन / अलार्म",
        "severity": "MEDIUM",
        "note": "Siren or alarm tone.",
        "labels": {"siren", "civil defense siren", "alarm", "foghorn", "air horn", "ambulance (siren)", "police car (siren)", "fire engine, fire truck (siren)"},
    },
}

DISTRESS_PHRASES = [
    # ── English ──────────────────────────────────────────────────────────
    "help me", "please help", "save me", "help", "mayday",
    "emergency", "don't shoot", "don't kill", "let me go", "i'm hurt",
    "i am wounded", "ceasefire", "surrender",

    # ── Hindi (हिन्दी) ───────────────────────────────────────────────────
    "bachao", "bachaao", "bacha lo", "madad karo", "madad",
    "help karo", "goli", "goliyan", "maar do", "chhodo", "bhago",
    "dushman", "infiltrat", "smuggl", "aatankwadi", "atankwadi",
    "bomb hai", "hamare upar hamla", "fauj aao", "police",
    "mujhe maara", "dard ho raha", "zakhmi hoon",
    "बचाओ", "मदद", "मदद करो", "गोली", "छोड़ो", "भागो",
    "फौज", "दुश्मन", "आतंकवादी", "बम", "ज़ख्मी",

    # ── Marathi (मराठी) ──────────────────────────────────────────────────
    "vachva", "madad kara", "goli", "paturya", "mala marale",
    "mala sodva", "padhava", "satarkata",
    "वाचवा", "मदत करा", "मला मारले", "मला सोडवा", "पाठवा",

    # ── Bengali (বাংলা) ──────────────────────────────────────────────────
    "bachao", "sahajyo koro", "guli", "amake bachao", "palaao",
    "bachate paro", "aakromon",
    "বাঁচাও", "সাহায্য করো", "আমাকে বাঁচাও", "পালাও", "আক্রমণ",

    # ── Punjabi (ਪੰਜਾਬੀ) ────────────────────────────────────────────────
    "bacha lo", "madad karo", "goli", "chhad do", "faujan nu daaso",
    "ਬਚਾ ਲਓ", "ਮਦਦ ਕਰੋ", "ਗੋਲੀ", "ਛੱਡ ਦੋ",

    # ── Tamil (தமிழ்) ────────────────────────────────────────────────────
    "kaapadu", "udavi seyyungal", "thaakku", "odi po",
    "காப்பாடு", "உதவி செய்யுங்கள்", "தாக்கு", "ஓடி போ",

    # ── Telugu (తెలుగు) ──────────────────────────────────────────────────
    "bachayyi", "sahaayam cheyyandi", "gulli", "paro",
    "బాచాయి", "సహాయం చేయండి", "గుల్లి",

    # ── Kannada (ಕನ್ನಡ) ──────────────────────────────────────────────────
    "ulisi", "sahaaya maadi", "gooli", "ooru bidi",
    "ಉಳಿಸಿ", "ಸಹಾಯ ಮಾಡಿ", "ಗೋಲಿ",

    # ── Malayalam (മലയാളം) ──────────────────────────────────────────────
    "rakshikkuka", "sahaayikkuka", "vedi", "oduka",
    "രക്ഷിക്കുക", "സഹായിക്കുക", "വെടി", "ഓടുക",

    # ── Gujarati (ગુજરાતી) ──────────────────────────────────────────────
    "bachavo", "madad karo", "goli", "bhago",
    "બચાવો", "મદદ કરો", "ગોળી", "ભાગો",

    # ── Odia (ଓଡ଼ିଆ) ────────────────────────────────────────────────────
    "bachao", "sahajya kara", "guli", "palaao",
    "ବଞ୍ଚାଅ", "ସାହାଯ୍ୟ କର", "ଗୁଳି",

    # ── Urdu (اردو) ─────────────────────────────────────────────────────
    "bachao", "madad karo", "goli", "chhod do", "madat",
    "بچاؤ", "مدد کرو", "گولی", "چھوڑ دو",

    # ── Assamese (অসমীয়া) ──────────────────────────────────────────────
    "raksha kora", "sahay kora", "dhoa", "pali ja",
    "ৰক্ষা কৰা", "সাহায্য কৰা", "ধোৱা",

    # ── Kashmiri (कॉशुर) ────────────────────────────────────────────────
    "bachaw", "madath karo", "bandook",
    "بچاو", "مدد کرو",

    # ── Sindhi ──────────────────────────────────────────────────────────
    "bachayo", "madad kayo", "goli",

    # ── Nepali (नेपाली) ─────────────────────────────────────────────────
    "bachau", "madad gara", "goli", "bhago",
    "बचाउ", "मद्दत गर", "गोली", "भाग",

    # ── Dogri / Rajasthani / Haryanvi (border dialects) ─────────────────
    "bacha", "chhado", "maaro na", "bhaj ja",
    "bhaag", "chod de", "maar denge",

    # ── Border/tactical keywords (any language context) ──────────────────
    "infiltrat", "smuggl", "terrorist", "aatank", "bomb",
    "landmine", "surang", "crossing", "aar par", "ghuspaithiya",
]

DISTRESS_KEYWORDS_MULTILINGUAL: dict[str, list[str]] = {
    "hindi": ["मदद", "बचाओ", "गोली", "हमला", "बम", "धमाका", "सीमा", "घुसपैठ", "ड्रोन"],
    "marathi": ["मदत", "वाचवा", "गोळी", "हल्ला", "बॉम्ब", "स्फोट", "सीमा", "ड्रोन"],
    "punjabi": ["ਮਦਦ", "ਬਚਾਓ", "ਗੋਲੀ", "ਹਮਲਾ", "ਬੰਬ", "ਧਮਾਕਾ", "ਸਰਹੱਦ", "ਡਰੋਨ"],
    "bengali": ["সাহায্য", "বাঁচাও", "গুলি", "আক্রমণ", "বোমা", "বিস্ফোরণ", "সীমান্ত", "ড্রোন"],
    "tamil": ["உதவி", "காப்பாற்று", "துப்பாக்கி சூடு", "தாக்குதல்", "குண்டு", "எல்லை", "ட்ரோன்"],
    "telugu": ["సహాయం", "కాపాడండి", "కాల్పులు", "దాడి", "బాంబు", "సరిహద్దు", "డ్రోన్"],
    "urdu": ["مدد", "بچاؤ", "گولی", "حملہ", "بم", "دھماکہ", "سرحد", "ڈرون"],
    "gujarati": ["મદદ", "બચાવો", "ગોળી", "હુમલો", "બોમ્બ", "ધમાકો", "સરહદ", "ડ્રોન"],
    "kannada": ["ಸಹಾಯ", "ಕಾಪಾಡಿ", "ಗುಂಡು", "ದಾಳಿ", "ಬಾಂಬ್", "ಸೀಮೆ", "ಡ್ರೋನ್"],
    "malayalam": ["സഹായം", "രക്ഷിക്കുക", "വെടിവെയ്പ്പ്", "ആക്രമണം", "ബോംബ്", "അതിർത്തി", "ഡ്രോൺ"],
    "latin": ["help", "save", "shoot", "attack", "bomb", "explosion", "border", "intrusion", "drone"]
}


def _parts(label: str) -> set[str]:
    return {p.strip().lower() for p in re.split(r"[,/]", label) if p.strip()}


def match_taxonomy(label: str) -> tuple[str, dict] | None:
    """Exact AudioSet label mapping. Substring matching is not used (it false-fired on speech)."""
    key = label.strip().lower()
    parts = _parts(key)
    for cat, spec in SECURITY_TAXONOMY.items():
        catalog = {x.lower() for x in spec["labels"]}
        catalog_parts: set[str] = set()
        for item in catalog:
            catalog_parts |= _parts(item)
        if key in catalog:
            return cat, spec
        if parts & catalog or parts & catalog_parts:
            return cat, spec
    return None
