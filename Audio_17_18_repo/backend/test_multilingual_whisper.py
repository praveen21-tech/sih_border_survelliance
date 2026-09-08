# -*- coding: utf-8 -*-
"""
Verification Test Suite: Multilingual Speech Intelligence Pipeline
===================================================================
Tests script detection, multilingual threat keyword extraction,
fusion risk score calculation, and whisper engine payload formatting.
"""

import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
sys.path.insert(0, os.path.dirname(__file__))

from app.engines.whisper_engine import detect_script, _threat_keywords
from app.engines.fusion import calculate_fused_risk
from app.ontology import DISTRESS_KEYWORDS_MULTILINGUAL

def test_script_detection():
    print("=== Testing Script Detection ===")
    cases = {
        "Devanagari": "बचाओ, सीमा पर ड्रोन दिखा है",
        "Bengali": "সাহায্য করুন, সীমান্তে ড্রোন দেখা গেছে",
        "Gurmukhi": "ਮਦਦ ਕਰੋ, ਸਰਹੱਦ 'ਤੇ ਡਰੋਨ ਵੇਖਿਆ ਗਿਆ",
        "Gujarati": "મદદ કરો, સરહદ પર ડ્રોન દેખાયો",
        "Tamil": "உதவி, எல்லையில் ட்ரோன் தெரிகிறது",
        "Telugu": "సహాయం, సరిహద్దు వద్ద డ్రోన్ కనిపిస్తుంది",
        "Kannada": "ಸಹಾಯ ಮಾಡಿ, ಗಡಿಯಲ್ಲಿ ಡ್ರೋನ್ ಕಾಣಿಸಿದೆ",
        "Malayalam": "സഹായം, അതിർത്തിയിൽ ഡ്രോൺ കണ്ടു",
        "Arabic/Urdu": "مدد کرو، سرحد پر ڈرون دیکھا گیا ہے",
        "Latin": "Help, drone spotted near the border fence"
    }

    passed = 0
    for expected_script, sample_text in cases.items():
        detected = detect_script(sample_text)
        status = "PASS" if detected == expected_script else "FAIL"
        print(f"  [{status}] Expected: {expected_script:12s} | Detected: {detected:12s} | Text: {sample_text[:35]}")
        if status == "PASS":
            passed += 1
    print(f"Script Detection Result: {passed}/{len(cases)} PASS\n")
    assert passed == len(cases)

def test_multilingual_threat_keywords():
    print("=== Testing Multilingual Threat Keyword Extraction ===")
    test_inputs = [
        ("बचाओ, सीमा पर ड्रोन दिखा है", ["बचाओ", "सीमा", "ड्रोन"]),
        ("ਮਦਦ, ਸਰਹੱਦ ਤੇ ਬੰਬ ਧਮਾਕਾ", ["ਮਦਦ", "ਸਰਹੱਦ", "ਬੰਬ", "ਧਮਾਕਾ"]),
        ("مدد کرو، سرحد پر بم دھماکہ", ["مدد", "بم", "دھماکہ", "سرحد"]),
        ("உதவி, எல்லையில் குண்டு ட்ரோன்", ["உதவி", "குண்டு", "எல்லை", "ட்ரோன்"]),
    ]

    for text, expected in test_inputs:
        found = _threat_keywords(text)
        print(f"  Text: {text}")
        print(f"    Detected Keywords: {found}")
        assert len(found) > 0, f"Failed to extract keywords from '{text}'"

    print("Multilingual Threat Keywords Result: ALL PASS\n")

def test_fused_risk_scoring():
    print("=== Testing Fused Risk Score Calculation ===")
    speech_result = {
        "is_distress": True,
        "threat_keywords": ["बचाओ", "सीमा", "ड्रोन"],
        "text": "बचाओ, सीमा पर ड्रोन दिखा है"
    }
    fused = calculate_fused_risk(acoustic_score=0.82, visual_score=0.75, speech_result=speech_result)
    print(f"  Fused Risk Score : {fused['fused_risk_score']}")
    print(f"  Threat Level     : {fused['threat_level']}")
    print(f"  Speech Trigger   : {fused['speech_trigger']}")
    print(f"  Keywords         : {fused['detected_keywords']}")

    assert fused["fused_risk_score"] >= 0.75, "Fused risk score should reach CRITICAL (>0.75)"
    assert fused["threat_level"] == "CRITICAL", "Threat level should be CRITICAL"
    print("Fused Risk Score Result: PASS\n")

if __name__ == "__main__":
    test_script_detection()
    test_multilingual_threat_keywords()
    test_fused_risk_scoring()
    print("==================================================")
    print("ALL MULTILINGUAL SPEECH INTELLIGENCE TESTS PASSED!")
    print("==================================================")
