import traceback
import pandas as pd
import joblib

original_init = pd.StringDtype.__init__

def patched_init(self, *args, **kwargs):
    try:
        original_init(self, *args, **kwargs)
    except TypeError:
        original_init(self)

pd.StringDtype.__init__ = patched_init

try:
    print("Loading MuleX engineer...")
    engineer = joblib.load("models/engineer.joblib")
    print("MuleX engineer loaded successfully!")
except Exception as e:
    traceback.print_exc()
