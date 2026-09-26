import joblib

try:
    print("Loading email model...")
    model = joblib.load("models/email_spam_model.pkl")
    print("Email model loaded.")
except Exception as e:
    print("Error:", e)
