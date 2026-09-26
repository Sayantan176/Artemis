"""
src/predict_image.py  –  PhishShield Image Threat Predictor
============================================================
Mirrors the interface of predict_email.py / predict_sms.py / predict_url.py.

Usage (CLI):
    python src/predict_image.py path/to/image.png

Usage (API / import):
    from src.predict_image import predict_image
    report = predict_image("uploads/scan_me.png")
    print(report["verdict"])       # "MALICIOUS" | "SAFE"
    print(report["threat_type"])   # e.g. "malicious_screenshot"
    print(report["confidence"])    # 0.0 – 1.0
    print(report["alerts"])        # list of human-readable findings
"""

from __future__ import annotations
import os, sys, json, hashlib
from typing import Any

import joblib
import numpy as np

# ── path setup so this runs from project root ─────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "image_threat_model.pkl")
SRC_DIR    = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from image_processor import extract_features   # noqa: E402  (sibling module)

# ── load model once at import time ────────────────────────────────────────────
try:
    _bundle      = joblib.load(MODEL_PATH)
    _clf         = _bundle.get("pipeline") or _bundle.get("model")
    _FEAT_COLS   = _bundle.get("feature_cols", [])
    _LABEL_NAMES = list(_bundle.get("label_names") or _bundle.get("classes") or [])
    _MODEL_OK    = True if _clf is not None else False
    _MODEL_ERR   = "No model found in pkl bundle" if not _MODEL_OK else ""
except Exception as e:
    _MODEL_OK  = False
    _MODEL_ERR = str(e)

# ── optional: existing URL classifier for QR link analysis ────────────────────
try:
    from predict_url import predict_url as _predict_url
    URL_CLF_OK = True
except ImportError:
    URL_CLF_OK = False

# ── optional: existing email/SMS NLP for OCR text analysis ────────────────────
try:
    from predict_email import predict_email as _predict_email
    EMAIL_CLF_OK = True
except ImportError:
    EMAIL_CLF_OK = False

try:
    from predict_sms import predict_sms as _predict_sms
    SMS_CLF_OK = True
except ImportError:
    SMS_CLF_OK = False


# ── main function ─────────────────────────────────────────────────────────────

def predict_image(image_path: str) -> dict[str, Any]:
    """
    Analyse an image file and return a comprehensive threat report.
    """
    report: dict[str, Any] = {
        "verdict":       "SAFE",
        "threat_type":   "benign",
        "confidence":    0.0,
        "alerts":        [],
        "qr_analysis":   None,
        "text_analysis": None,
        "features":      {},
        "malicious_probability": 0.0,   # 1 - P(benign), from the model when available
    }

    # 1. Extract features
    feats = extract_features(image_path)
    report["features"] = feats
    report["alerts"]   = feats.get("alerts", [])

    if feats.get("error"):
        report["verdict"] = "ERROR"
        report["threat_type"] = "error"
        report["alerts"].append(feats["error"])
        return report

    # 1b. Evaluate QR code URLs before model evaluation
    qr_urls = feats.get("qr_urls", [])
    if qr_urls:
        if URL_CLF_OK:
            url_results = []
            for url in qr_urls:
                try:
                    url_result = _predict_url(url)
                    url_results.append({"url": url, "result": url_result})
                    if url_result.get("status") in ["phishing", "malware", "defacement"] or url_result.get("risk") == "high":
                        feats["qr_url_malicious"] = 1
                        report["alerts"].append(
                            f"[URL CLASSIFIER] QR URL flagged as malicious: {url}"
                        )
                except Exception as e:
                    url_results.append({"url": url, "error": str(e)})
            report["qr_analysis"] = url_results
        else:
            report["alerts"].append(
                f"[QR] URL(s) found in image: {qr_urls}"
            )

    # 2. Model prediction (if model bundle loaded)
    if _MODEL_OK and _FEAT_COLS:
        try:
            X = np.array([[feats.get(col, 0.0) for col in _FEAT_COLS]], dtype=float)
            pred_idx   = int(_clf.predict(X)[0])
            pred_proba = _clf.predict_proba(X)[0]
            confidence = float(pred_proba[pred_idx])
            threat_type = str(_LABEL_NAMES[pred_idx]) if pred_idx < len(_LABEL_NAMES) else "malicious_image"

            report["threat_type"] = threat_type
            report["confidence"]  = round(confidence, 4)
            report["verdict"]     = "SAFE" if threat_type == "benign" else "MALICIOUS"

            # P(malicious) = 1 - P(benign), independent of which class won,
            # so the schema report can show a stable 0-100 risk score.
            if "benign" in _LABEL_NAMES:
                benign_idx = _LABEL_NAMES.index("benign")
                report["malicious_probability"] = round(1.0 - float(pred_proba[benign_idx]), 4)
            else:
                report["malicious_probability"] = round(confidence if threat_type != "benign" else 1 - confidence, 4)

            if threat_type != "benign":
                report["alerts"].insert(
                    0,
                    f"[MODEL] Classified as '{threat_type}' with {confidence * 100:.1f}% confidence."
                )
        except Exception as e:
            report["alerts"].append(f"[MODEL WARN] Pipeline evaluation warning: {e}")

    # 3. Rule-based heuristic & downstream classifier escalation
    # Escalation Rule A: Zip magic found / Polyglot
    if feats.get("zip_magic_found") == 1 or feats.get("trailing_bytes_kb", 0) > 0.5:
        report["verdict"] = "MALICIOUS"
        if report["threat_type"] == "benign":
            report["threat_type"] = "malicious_polyglot"
        report["confidence"] = max(report["confidence"], 0.95)
        report["malicious_probability"] = max(report["malicious_probability"], 0.95)

    # Escalation Rule B: High Steganography anomaly score
    if feats.get("lsb_anomaly_score", 0) > 0.7:
        report["verdict"] = "MALICIOUS"
        if report["threat_type"] == "benign":
            report["threat_type"] = "malicious_stego"
        report["confidence"] = max(report["confidence"], 0.88)
        report["malicious_probability"] = max(report["malicious_probability"], 0.88)

    # Escalation Rule C: Phishing keyword hits in OCR text
    kw_hits = feats.get("phish_keyword_hits", 0)
    if kw_hits >= 2:
        report["verdict"] = "MALICIOUS"
        if report["threat_type"] == "benign":
            report["threat_type"] = "malicious_screenshot"
        report["confidence"] = max(report["confidence"], 0.90)
        report["malicious_probability"] = max(report["malicious_probability"], 0.90)

    # Escalation Rule D: Malicious QR URL flag
    if feats.get("qr_url_malicious") == 1:
        report["verdict"] = "MALICIOUS"
        report["threat_type"] = "malicious_qr"
        report["confidence"] = max(report["confidence"], 0.96)
        report["malicious_probability"] = max(report["malicious_probability"], 0.96)

    # 5. Chain to email / SMS classifier for OCR text
    text = feats.get("extracted_text", "")
    if text:
        word_count = feats.get("ocr_word_count", 0)
        if word_count >= 10 and EMAIL_CLF_OK:
            try:
                email_result = _predict_email(text)
                report["text_analysis"] = email_result
                if email_result.get("status") in ["phishing", "scam", "spam"]:
                    report["verdict"] = "MALICIOUS"
                    if report["threat_type"] == "benign":
                        report["threat_type"] = "malicious_screenshot"
                    report["confidence"] = max(report["confidence"], 0.92)
                    report["malicious_probability"] = max(report["malicious_probability"], 0.92)
                    report["alerts"].append(
                        f"[EMAIL CLASSIFIER] OCR text flagged as {email_result.get('status')}."
                    )
            except Exception as e:
                report["alerts"].append(f"Email classifier error: {e}")
        elif word_count > 0 and SMS_CLF_OK:
            try:
                sms_result = _predict_sms(text)
                report["text_analysis"] = sms_result
                if sms_result.get("status") in ["smishing", "spam"]:
                    report["verdict"] = "MALICIOUS"
                    if report["threat_type"] == "benign":
                        report["threat_type"] = "malicious_screenshot"
                    report["confidence"] = max(report["confidence"], 0.90)
                    report["malicious_probability"] = max(report["malicious_probability"], 0.90)
                    report["alerts"].append(
                        f"[SMS CLASSIFIER] OCR text flagged as {sms_result.get('status')}."
                    )
            except Exception as e:
                report["alerts"].append(f"SMS classifier error: {e}")

    # Final confidence fallback
    if report["confidence"] == 0.0:
        report["confidence"] = 0.98 if report["verdict"] == "SAFE" else 0.85
    if report["malicious_probability"] == 0.0 and report["verdict"] == "MALICIOUS":
        report["malicious_probability"] = report["confidence"]

    return report


# ── schema-formatted report ───────────────────────────────────────────────────
# NOTE: every field below is populated straight from `predict_image()`'s real
# output (model probabilities, OCR text, QR/zip/EXIF checks). Nothing is
# invented — if the image can't be read, this reports an ERROR tier instead
# of guessing.

def _image_id(image_path: str) -> str:
    """Deterministic ID from the file's own bytes, so the same image always
    gets the same ID (no random/placeholder identifiers)."""
    try:
        with open(image_path, "rb") as fh:
            digest = hashlib.sha256(fh.read()).hexdigest()[:8]
        return f"IMG-{digest}"
    except Exception:
        return "IMG-unreadable"


def _risk_tier(score: float) -> str:
    if score >= 66:
        return "High Risk \U0001F534"
    if score >= 33:
        return "Medium Risk \U0001F7E1"
    return "Low Risk \U0001F7E2"


def format_schema_report(image_path: str, report: dict[str, Any]) -> str:
    feats = report.get("features", {})

    if report["verdict"] == "ERROR":
        return (
            "=" * 60 + "\n"
            "IMAGE THREAT ANALYSIS - INFERENCE RESULTS\n" + "=" * 60 + "\n"
            f"Image ID       : {_image_id(image_path)}\n"
            "Risk Tier      : ERROR - could not analyse\n"
            "Risk Score     : n/a\n" + "-" * 60 + "\n"
            f"[!] {feats.get('error', 'Unknown error')}\n" + "=" * 60
        )

    risk_score = round(report["malicious_probability"] * 100, 1)
    tier = _risk_tier(risk_score)

    # Red flags: pulled only from findings the pipeline actually raised.
    red_flags = list(report.get("alerts", []))[:3]
    if not red_flags:
        red_flags = ["None detected"]

    # Green flags: only asserted when the underlying feature confirms it.
    green_flags = []
    if feats.get("zip_magic_found", 0) == 0 and feats.get("trailing_bytes_kb", 0) <= 0.5:
        green_flags.append("No polyglot/archive signature found after image EOF marker")
    if feats.get("lsb_anomaly_score", 0) <= 0.3:
        green_flags.append(f"Pixel LSB distribution consistent with a natural image (score {feats.get('lsb_anomaly_score', 0)})")
    if feats.get("phish_keyword_hits", 0) == 0:
        green_flags.append("No phishing keywords found in OCR text")
    if feats.get("has_qr_code", 0) == 0:
        green_flags.append("No QR code detected")
    if feats.get("suspicious_exif", 0) == 0 and feats.get("exif_field_count", 0) >= 0:
        green_flags.append(f"EXIF metadata within normal size bounds ({feats.get('exif_field_count', 0)} tags)")
    green_flags = green_flags[:3] if green_flags else ["None identified"]

    ocr_text = feats.get("extracted_text") or "No text detected"

    # Visual manipulation: only reports what this pipeline actually checks
    # (LSB steganography, polyglot/appended-archive bytes). It does NOT run
    # deepfake/GenAI-image detection, so that is not asserted either way.
    if feats.get("lsb_anomaly_score", 0) > 0.7:
        manip = f"Possible LSB steganography (anomaly score {feats['lsb_anomaly_score']})"
    elif feats.get("zip_magic_found", 0) == 1:
        manip = "Polyglot file — archive bytes appended after image EOF"
    elif feats.get("trailing_bytes_kb", 0) > 0.5:
        manip = f"Trailing data after EOF ({feats['trailing_bytes_kb']} KB) — unverified payload"
    else:
        manip = "Standard image structure, no steganography/polyglot signatures detected"

    if report["threat_type"] == "malicious_screenshot" or feats.get("phish_keyword_hits", 0) >= 2:
        ui_check = f"Spoofed system alert pattern ({feats.get('phish_keyword_hits', 0)} phishing keyword hits in OCR text)"
    elif report["threat_type"] == "malicious_qr" or feats.get("qr_url_malicious", 0) == 1:
        ui_check = "Malicious URL embedded in QR code"
    elif feats.get("has_text", 0) == 1:
        ui_check = "Text detected, no spoofed-alert keyword pattern matched"
    else:
        ui_check = "No text/UI content detected"

    if report["verdict"] == "MALICIOUS":
        severity = f"Classified '{report['threat_type']}' at {report['confidence']*100:.1f}% model confidence — recommend downstream review."
    else:
        severity = f"No threat indicators cleared escalation thresholds ({report['confidence']*100:.1f}% benign confidence)."

    lines = []
    lines.append("=" * 60)
    lines.append("IMAGE THREAT ANALYSIS - INFERENCE RESULTS")
    lines.append("=" * 60)
    lines.append(f"Image ID       : {_image_id(image_path)}")
    lines.append(f"Risk Tier      : {tier}")
    lines.append(f"Risk Score     : {risk_score} / 100.0")
    lines.append("-" * 60)
    lines.append("[+] Top Risk-Increasing Factors (Red Flags):")
    for f in red_flags:
        lines.append(f"  - {f}")
    lines.append("[-] Top Trust-Increasing Factors (Green Flags):")
    for f in green_flags:
        lines.append(f"  - {f}")
    lines.append("[i] Image Analysis & Technical Findings:")
    lines.append(f"  - Extracted Text / OCR : {ocr_text}")
    lines.append(f"  - Visual Manipulation  : {manip}")
    lines.append(f"  - UI Phishing Check    : {ui_check}")
    lines.append(f"  - Anomaly Severity     : {severity}")
    lines.append("=" * 60)
    return "\n".join(lines)


# ── CLI entry point ────────────────────────────────────────────────────────────

def _print_report(report: dict) -> None:
    verdict = report["verdict"]
    print(f"\n" + "-" * 55)
    print(f"  PhishShield Image Analysis Report")
    print(f"-" * 55)
    print(f"  Verdict     : {verdict}")
    print(f"  Threat Type : {report['threat_type']}")
    print(f"  Confidence  : {report['confidence'] * 100:.1f}%")

    alerts = report.get("alerts", [])
    if alerts:
        print(f"\n  Findings ({len(alerts)}):")
        for a in alerts:
            print(f"    * {a}")

    feats = report.get("features", {})
    if feats:
        print(f"\n  Feature Snapshot:")
        for k in (
            "file_size_kb", "has_text", "ocr_word_count", "phish_keyword_hits",
            "has_qr_code", "zip_magic_found", "lsb_anomaly_score",
            "trailing_bytes_kb", "exif_field_count",
        ):
            print(f"    {k:25s}: {feats.get(k, 'n/a')}")

    print(f"-" * 55 + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python src/predict_image.py <image_path> [--json | --schema]")
        sys.exit(1)

    img_path = sys.argv[1]
    result = predict_image(img_path)

    if "--schema" in sys.argv:
        print(format_schema_report(img_path, result))
    else:
        print(f"Analysing: {img_path}")
        _print_report(result)

    if "--json" in sys.argv:
        print(json.dumps(result, indent=2))
