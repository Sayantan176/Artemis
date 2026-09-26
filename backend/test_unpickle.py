import pandas as pd
import joblib
import sklearn.utils.validation

# Patch pandas StringDtype
original_init = pd.StringDtype.__init__
def patched_init(self, *args, **kwargs):
    try:
        original_init(self, *args, **kwargs)
    except TypeError:
        original_init(self)
pd.StringDtype.__init__ = patched_init

# Patch sklearn _is_pandas_df
def dummy_is_pandas_df(X):
    return hasattr(X, "columns") and hasattr(X, "iloc")

sklearn.utils.validation._is_pandas_df = dummy_is_pandas_df

try:
    print("Loading engineer...")
    engineer = joblib.load("models/engineer.joblib")
    print("Engineer loaded.")
    
    print("Loading ensemble...")
    ensemble = joblib.load("models/ensemble.joblib")
    print("Ensemble loaded.")
except Exception as e:
    print("Error:", e)
