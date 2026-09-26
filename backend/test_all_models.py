import joblib

try:
    print("Loading email model...")
    model = joblib.load("models/email_spam_model.pkl")
    print("Email model loaded successfully!")
except Exception as e:
    print("Email model error:", e)

try:
    print("Loading MuleX engineer...")
    engineer = joblib.load("models/engineer.joblib")
    print("MuleX engineer loaded successfully!")
except Exception as e:
    print("MuleX engineer error:", e)
