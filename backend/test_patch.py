import sys
import pandas as pd
import joblib
import sklearn.utils.validation
import sklearn.utils._tags

# Patch for older category_encoders / sklearn pickles
def dummy_is_pandas_df(X):
    return hasattr(X, "columns") and hasattr(X, "iloc")

def dummy_safe_tags(estimator, key=None):
    return getattr(estimator, "_get_tags", lambda: {})().get(key, None) if key else getattr(estimator, "_get_tags", lambda: {})()

sklearn.utils.validation._is_pandas_df = dummy_is_pandas_df
sklearn.utils._tags._safe_tags = dummy_safe_tags
sys.modules['sklearn.utils.validation']._is_pandas_df = dummy_is_pandas_df
sys.modules['sklearn.utils._tags']._safe_tags = dummy_safe_tags

try:
    print("Loading engineer...")
    engineer = joblib.load("models/engineer.joblib")
    print("Engineer loaded successfully!")
    
    print("Loading calibrator...")
    calibrator = joblib.load("models/calibrator.joblib")
    print("Calibrator loaded successfully!")
    
    print("Loading ensemble...")
    ensemble = joblib.load("models/ensemble.joblib")
    print("Ensemble loaded successfully!")
except Exception as e:
    print("Error:", e)
