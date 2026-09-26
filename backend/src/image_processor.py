"""
src/image_processor.py  –  PhishShield Image Threat Processor
==============================================================
Extracts threat-relevant features from an image file path and
returns a feature dict that predict_image.py feeds to the model.

Dependencies (add to requirements.txt):
    Pillow
    pytesseract        # also needs: apt install tesseract-ocr
    pyzbar             # also needs: apt install libzbar0
    ExifRead

Run standalone for a quick test:
    python src/image_processor.py path/to/image.png
"""

from __future__ import annotations
import os, math
from collections import Counter
from typing import Any

# ── optional imports – graceful fallback if not installed ─────────────────────
try:
    from PIL import Image
    PIL_OK = True
except ImportError:
    PIL_OK = False
    print("[image_processor] WARNING: Pillow not installed. pip install Pillow")

try:
    import pytesseract
    import shutil
    if os.name == 'nt':
        tess_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        if os.path.exists(tess_path):
            pytesseract.pytesseract.tesseract_cmd = tess_path
        else:
            sh_path = shutil.which("tesseract")
            if sh_path:
                pytesseract.pytesseract.tesseract_cmd = sh_path
    TESS_OK = True
except ImportError:
    TESS_OK = False

try:
    import cv2
    CV2_OK = True
except Exception:
    CV2_OK = False

try:
    import exifread
    EXIF_OK = True
except ImportError:
    EXIF_OK = False

# ── phishing keyword list (mirrors training data) ─────────────────────────────
PHISH_KEYWORDS = [
    "verify your account", "click here", "urgent", "suspended",
    "confirm password", "log in now", "your account has been",
    "update billing", "limited time", "act now", "security alert",
    "reset password", "unusual activity", "prize", "congratulations",
    "free gift", "claim reward", "bank alert", "paypal", "blockchain",
    "authenticate", "validate", "credential", "expire", "penalty",
]

# ── helpers ───────────────────────────────────────────────────────────────────

def _byte_entropy(data: bytes) -> float:
    """Shannon entropy of raw bytes, 0-8."""
    if not data:
        return 0.0
    counts = Counter(data)
    total  = len(data)
    return -sum((c / total) * math.log2(c / total) for c in counts.values())


def _lsb_score(img) -> float:
    """
    Chi-Square Pairs-of-Values (PoV) and Bit-0 vs Bit-1 correlation score [0, 1].
    Distinguishes natural photographic textures/gradients from random LSB steganography payloads.
    """
    try:
        import numpy as np
        arr = np.array(img.convert("L"), dtype=np.uint8)
        # Flat / low-variance images (solid colors, plain documents, screenshots) cannot contain LSB stego
        if arr.std() < 5.0 or len(np.unique(arr)) < 10:
            return 0.0

        # 1. Pairs-of-Values (PoV) Chi-square distribution measure
        hist, _ = np.histogram(arr, bins=256, range=(0, 256))
        pov_diffs = 0.0
        valid_pairs = 0
        for k in range(0, 256, 2):
            n1, n2 = int(hist[k]), int(hist[k+1])
            total = n1 + n2
            if total > 20:
                expected = total / 2.0
                chi = ((n1 - expected) ** 2 + (n2 - expected) ** 2) / expected
                pov_diffs += chi
                valid_pairs += 1

        avg_chi = (pov_diffs / valid_pairs) if valid_pairs > 0 else 10.0

        # 2. Bit 0 vs Bit 1 correlation (natural photos have strong bit correlation; stego doesn't)
        bit0 = arr & 1
        bit1 = (arr >> 1) & 1
        bit_diff = float(np.mean(bit0 != bit1))

        # In random LSB stego, avg_chi is very low (< 2.0) and bit_diff is close to 0.50
        if avg_chi < 2.0 and abs(bit_diff - 0.5) < 0.03:
            score = max(0.0, 1.0 - (avg_chi / 2.0))
            return round(score, 3)
        return 0.0
    except Exception:
        return 0.0


def _keyword_hits(text: str) -> int:
    lo = text.lower()
    return sum(1 for kw in PHISH_KEYWORDS if kw in lo)


# ── main extractor ────────────────────────────────────────────────────────────

def extract_features(image_path: str) -> dict[str, Any]:
    """
    Returns a feature dict with the same keys used during training.
    Also includes diagnostic fields (qr_urls, extracted_text, alerts)
    for the predict_image.py report.
    """
    result: dict[str, Any] = {
        # ── model features ──────────────────────────────────────────────────
        "has_text":           0,
        "ocr_word_count":     0,
        "phish_keyword_hits": 0,
        "text_entropy":       0.0,
        "has_qr_code":        0,
        "qr_url_malicious":   0,
        "zip_magic_found":    0,
        "lsb_anomaly_score":  0.0,
        "trailing_bytes_kb":  0.0,
        "exif_field_count":   0,
        "suspicious_exif":    0,
        "file_size_kb":       0.0,
        "text_threat_score":  0.0,
        "stego_threat_score": 0.0,
        # ── diagnostics (not fed to model) ──────────────────────────────────
        "extracted_text": "",
        "qr_urls":        [],
        "alerts":         [],
        "error":          None,
    }

    if not os.path.isfile(image_path):
        result["error"] = f"File not found: {image_path}"
        return result

    # ── file size ─────────────────────────────────────────────────────────────
    result["file_size_kb"] = round(os.path.getsize(image_path) / 1024, 1)

    # ── raw bytes analysis (polyglot / embedded ZIP) ──────────────────────────
    with open(image_path, "rb") as fh:
        raw = fh.read()

    result["text_entropy"] = round(_byte_entropy(raw[:4096]), 3)  # first 4 KB

    # ZIP magic bytes = PK\x03\x04
    if b"PK\x03\x04" in raw:
        result["zip_magic_found"] = 1
        result["alerts"].append("ZIP / archive bytes found inside image (polyglot threat).")

    # Check for trailing data after PNG IEND or JPEG FFD9
    trailing_bytes = 0
    if raw[:4] == b"\x89PNG":
        iend = raw.rfind(b"IEND\xaeB`\x82")
        if iend != -1:
            trailing_bytes = max(0, len(raw) - (iend + 12))
    elif raw[:2] == b"\xff\xd8":
        eoi = raw.rfind(b"\xff\xd9")
        if eoi != -1:
            trailing_bytes = max(0, len(raw) - (eoi + 2))

    result["trailing_bytes_kb"] = round(trailing_bytes / 1024, 2)
    if trailing_bytes > 512:   # > 512 bytes after EOF marker is suspicious
        result["alerts"].append(
            f"Trailing data after image EOF: {result['trailing_bytes_kb']} KB"
        )

    # ── PIL-dependent work ────────────────────────────────────────────────────
    if not PIL_OK:
        result["error"] = "Pillow not installed; skipping image analysis."
        _finalize(result)
        return result

    try:
        img = Image.open(image_path)
    except Exception as e:
        result["error"] = f"Cannot open image: {e}"
        _finalize(result)
        return result

    # LSB steganography score
    result["lsb_anomaly_score"] = round(_lsb_score(img), 3)
    if result["lsb_anomaly_score"] > 0.7:
        result["alerts"].append(
            f"High LSB anomaly score ({result['lsb_anomaly_score']}) - possible steganography."
        )

    # ── QR code detection ─────────────────────────────────────────────────────
    if CV2_OK:
        try:
            import numpy as np
            cv_img = cv2.cvtColor(np.array(img.convert('RGB')), cv2.COLOR_RGB2BGR)
            detector = cv2.QRCodeDetector()
            val, pts, st_code = detector.detectAndDecode(cv_img)
            if val:
                result["has_qr_code"] = 1
                result["qr_urls"].append(val)
                result["alerts"].append(
                    f"QR code found: ['{val}'] - route through URL classifier."
                )
        except Exception:
            pass
    else:
        result["alerts"].append(
            "opencv-python not installed - QR scanning skipped. pip install opencv-python"
        )

    # ── OCR text extraction ───────────────────────────────────────────────────
    if TESS_OK:
        try:
            text = pytesseract.image_to_string(img).strip()
            if text:
                result["has_text"]       = 1
                result["extracted_text"] = text
                words = text.split()
                result["ocr_word_count"]     = len(words)
                result["phish_keyword_hits"] = _keyword_hits(text)
                if result["phish_keyword_hits"] > 0:
                    result["alerts"].append(
                        f"{result['phish_keyword_hits']} phishing keyword(s) found in OCR text."
                    )
        except Exception as e:
            err_str = str(e).lower()
            if "tesseract is not installed" in err_str or "not in your path" in err_str or "tesseractnotfound" in err_str:
                pass
            else:
                result["alerts"].append(f"OCR note: {e}")
    else:
        result["alerts"].append(
            "pytesseract not installed - OCR skipped. pip install pytesseract"
        )

    # ── EXIF metadata ─────────────────────────────────────────────────────────
    if EXIF_OK:
        try:
            with open(image_path, "rb") as fh:
                tags = exifread.process_file(fh, details=False)
            result["exif_field_count"] = len(tags)
            # Heuristic: any tag value longer than 500 chars is suspicious
            for v in tags.values():
                if len(str(v)) > 500:
                    result["suspicious_exif"] = 1
                    result["alerts"].append("Oversized EXIF tag value detected.")
                    break
        except Exception:
            pass
    else:
        result["alerts"].append(
            "exifread not installed - EXIF skipped. pip install ExifRead"
        )

    _finalize(result)
    return result


def _finalize(r: dict) -> None:
    """Compute compound scores from raw features."""
    kw_hits = r["phish_keyword_hits"]
    r["text_threat_score"]  = round(min(kw_hits / 6, 1.0) * r["has_text"], 3)
    r["stego_threat_score"] = round(
        r["lsb_anomaly_score"]  * 0.5 +
        r["zip_magic_found"]    * 0.3 +
        min(r["trailing_bytes_kb"] / 100, 1.0) * 0.2,
        3,
    )


# ── CLI quick-test ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys, json
    path = sys.argv[1] if len(sys.argv) > 1 else "test.png"
    feats = extract_features(path)
    print(json.dumps(feats, indent=2))
