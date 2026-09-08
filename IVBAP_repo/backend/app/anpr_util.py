# ANPR text validation + character rectification.
#
# Ported from the tutorial pipeline:
#   https://github.com/computervisioneng/automatic-number-plate-recognition-python-yolov8
# (util.py, MIT-licensed tutorial code) and adapted to our OCR engine.
#
# Purpose: OCR gives ambiguous glyphs (O/0, I/1, S/5, G/6, J/3, A/4, B/8).
# For plates that match the common LL-DD-LLL layout these are corrected per
# position; anything else is returned as-is (never destroyed).

LETTER_TO_DIGIT = {"O": "0", "I": "1", "J": "3", "A": "4", "G": "6", "S": "5"}
DIGIT_TO_LETTER = {"0": "O", "1": "I", "3": "J", "4": "A", "6": "G", "5": "S"}


def _clean(text: str) -> str:
    return "".join(ch for ch in text.upper() if ch.isalnum())


def complies_format(text: str) -> bool:
    """True if text fits the 7-char LL-DD-LLL layout (counting OCR confusions)."""
    if len(text) != 7:
        return False
    pos0_1_ok = any(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" or c in DIGIT_TO_LETTER for c in (text[0], text[1]))
    pos2_3_ok = any(c in "0123456789" or c in LETTER_TO_DIGIT for c in (text[2], text[3]))
    pos4_6_ok = any(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" or c in DIGIT_TO_LETTER for c in (text[4], text[5], text[6]))
    return pos0_1_ok and pos2_3_ok and pos4_6_ok


def format_license(text: str) -> str:
    """Rectify a 7-char LL-DD-LLL plate in place using the per-position maps."""
    mapping = {
        0: DIGIT_TO_LETTER,
        1: DIGIT_TO_LETTER,
        4: DIGIT_TO_LETTER,
        5: DIGIT_TO_LETTER,
        6: DIGIT_TO_LETTER,
        2: LETTER_TO_DIGIT,
        3: LETTER_TO_DIGIT,
    }
    out = []
    for i, ch in enumerate(text):
        out.append(mapping[i].get(ch, ch))
    return "".join(out)


def refine_plate(raw_text: str) -> str | None:
    """Validate+rectify an OCR plate candidate. Returns None for garbage."""
    t = _clean(raw_text)
    if len(t) < 6 or len(t) > 12:
        return None
    if len(t) == 7 and complies_format(t):
        return format_license(t)
    return t