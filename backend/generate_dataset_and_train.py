"""
PhishShield Image Threat Dataset Generator & Model Trainer
===========================================================
Run this script once to:
  1. Generate  dataset/image_threat_dataset.csv
  2. Train models/image_threat_model.pkl

It uses fully synthetic feature vectors that mirror what
image_processor.py will extract at inference time, so no
real images or Tesseract/zbar are needed to train the model.
"""

import os, random, struct, json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

random.seed(42)
np.random.seed(42)

# ── helpers ──────────────────────────────────────────────────────────────────

MALICIOUS_KEYWORDS = [
    "verify your account", "click here", "urgent", "suspended",
    "confirm password", "log in now", "your account has been",
    "update billing", "limited time", "act now", "security alert",
    "reset password", "unusual activity", "prize", "congratulations",
    "free gift", "claim reward", "bank alert", "paypal", "blockchain",
]

BENIGN_KEYWORDS = [
    "meeting agenda", "quarterly report", "project update", "team lunch",
    "invoice attached", "photo album", "company newsletter", "welcome",
    "conference schedule", "product catalogue", "thank you", "recipe",
    "travel itinerary", "event flyer", "class photo",
]

MALICIOUS_DOMAINS = [
    "paypa1-secure.com", "login-verification.net", "account-update.info",
    "secure-bank-alert.org", "verify-now.biz", "free-prize-claim.co",
    "amazon-security.tk", "apple-id-locked.ml", "microsoft-alert.cf",
]

BENIGN_DOMAINS = [
    "company.com", "newsletter.org", "events.io", "photos.net",
    "docs.example.com", "calendar.company.org", "updates.firm.com",
]

def rand_text_features(label):
    """Return (has_text, ocr_word_count, phish_keyword_hits, entropy)."""
    if label == "malicious_screenshot":
        has_text = 1
        word_count = random.randint(20, 120)
        hits = random.randint(2, 6)
        entropy = round(random.uniform(3.8, 5.5), 3)
    elif label == "benign":
        has_text = random.choice([0, 1])
        word_count = random.randint(0, 80) if has_text else 0
        hits = random.randint(0, 1)
        entropy = round(random.uniform(2.0, 4.2), 3)
    else:  # qr / stego / polyglot — text may or may not be present
        has_text = random.choice([0, 1])
        word_count = random.randint(0, 40) if has_text else 0
        hits = random.randint(0, 2)
        entropy = round(random.uniform(3.0, 5.8), 3)
    return has_text, word_count, hits, entropy


def rand_qr_features(label):
    """Return (has_qr, qr_url_is_malicious)."""
    if label == "malicious_qr":
        return 1, 1
    elif label == "benign":
        # occasional benign QR (e.g. event ticket)
        has_qr = random.choices([0, 1], weights=[85, 15])[0]
        return has_qr, 0
    else:
        has_qr = random.choices([0, 1], weights=[70, 30])[0]
        return has_qr, 0


def rand_stego_features(label):
    """Return (zip_magic_found, lsb_anomaly_score, trailing_bytes_kb)."""
    if label == "malicious_stego":
        zip_magic = random.choices([0, 1], weights=[30, 70])[0]
        lsb = round(random.uniform(0.55, 1.0), 3)
        trailing = round(random.uniform(5.0, 200.0), 2)
    elif label == "malicious_polyglot":
        zip_magic = 1
        lsb = round(random.uniform(0.1, 0.5), 3)
        trailing = round(random.uniform(10.0, 500.0), 2)
    else:
        zip_magic = 0
        lsb = round(random.uniform(0.0, 0.25), 3)
        trailing = round(random.uniform(0.0, 2.0), 2)
    return zip_magic, lsb, trailing


def rand_meta_features(label):
    """Return (exif_field_count, suspicious_exif, file_size_kb)."""
    if label in ("malicious_stego", "malicious_polyglot"):
        exif_count = random.randint(0, 5)
        suspicious_exif = random.choices([0, 1], weights=[40, 60])[0]
        file_kb = round(random.uniform(150, 3000), 1)
    elif label == "malicious_screenshot":
        exif_count = random.randint(0, 8)
        suspicious_exif = random.choices([0, 1], weights=[70, 30])[0]
        file_kb = round(random.uniform(30, 500), 1)
    elif label == "malicious_qr":
        exif_count = random.randint(0, 6)
        suspicious_exif = 0
        file_kb = round(random.uniform(10, 200), 1)
    else:  # benign
        exif_count = random.randint(0, 20)
        suspicious_exif = 0
        file_kb = round(random.uniform(10, 800), 1)
    return exif_count, suspicious_exif, file_kb


# ── dataset generation ────────────────────────────────────────────────────────

LABEL_MAP = {
    "benign":               0,
    "malicious_screenshot": 1,
    "malicious_qr":         2,
    "malicious_stego":      3,
    "malicious_polyglot":   4,
}

# Weighted so benign ≈ 40 %, each threat ≈ 15 %
LABEL_WEIGHTS = [0.40, 0.15, 0.15, 0.15, 0.15]
LABEL_NAMES   = list(LABEL_MAP.keys())

N_SAMPLES = 3000

rows = []
for _ in range(N_SAMPLES):
    label = random.choices(LABEL_NAMES, weights=LABEL_WEIGHTS)[0]

    has_text, word_count, kw_hits, entropy    = rand_text_features(label)
    has_qr, qr_malicious                       = rand_qr_features(label)
    zip_magic, lsb_score, trailing_kb          = rand_stego_features(label)
    exif_count, suspicious_exif, file_kb       = rand_meta_features(label)

    # derived compound features
    text_threat_score  = round(min(kw_hits / 6, 1.0) * has_text, 3)
    stego_threat_score = round((lsb_score * 0.5 + zip_magic * 0.3 +
                                min(trailing_kb / 100, 1.0) * 0.2), 3)

    rows.append({
        # raw features
        "has_text":           has_text,
        "ocr_word_count":     word_count,
        "phish_keyword_hits": kw_hits,
        "text_entropy":       entropy,
        "has_qr_code":        has_qr,
        "qr_url_malicious":   qr_malicious,
        "zip_magic_found":    zip_magic,
        "lsb_anomaly_score":  lsb_score,
        "trailing_bytes_kb":  trailing_kb,
        "exif_field_count":   exif_count,
        "suspicious_exif":    suspicious_exif,
        "file_size_kb":       file_kb,
        # compound
        "text_threat_score":  text_threat_score,
        "stego_threat_score": stego_threat_score,
        # target
        "label_name":         label,
        "label":              LABEL_MAP[label],
    })

df = pd.DataFrame(rows)
print(f"Dataset shape: {df.shape}")
print(df["label_name"].value_counts())
print(df.head(3).to_string())

# ── save dataset ──────────────────────────────────────────────────────────────

os.makedirs("dataset", exist_ok=True)
df.to_csv("dataset/image_threat_dataset.csv", index=False)
print("\n✅  Saved  dataset/image_threat_dataset.csv")

# ── train model ───────────────────────────────────────────────────────────────

FEATURE_COLS = [
    "has_text", "ocr_word_count", "phish_keyword_hits", "text_entropy",
    "has_qr_code", "qr_url_malicious",
    "zip_magic_found", "lsb_anomaly_score", "trailing_bytes_kb",
    "exif_field_count", "suspicious_exif", "file_size_kb",
    "text_threat_score", "stego_threat_score",
]

X = df[FEATURE_COLS].values
y = df["label"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

clf = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
print("\n── Test-set Classification Report ──")
print(classification_report(y_test, y_pred,
      target_names=LABEL_NAMES))

# ── save model ────────────────────────────────────────────────────────────────

os.makedirs("models", exist_ok=True)

model_bundle = {
    "model":        clf,
    "feature_cols": FEATURE_COLS,
    "label_map":    LABEL_MAP,
    "label_names":  LABEL_NAMES,
}
joblib.dump(model_bundle, "models/image_threat_model.pkl")
print("✅  Saved  models/image_threat_model.pkl")
print("\nDone — copy dataset/image_threat_dataset.csv and models/image_threat_model.pkl into your project.")
