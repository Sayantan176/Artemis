import logging
import pandas as pd
import numpy as np
import sys
import os

from src.pipeline import DataLoader, FraudFeatureEngineer, DataSplitter, ImbalanceHandler
from src.models import EnsembleModel, RiskEngine, SHAPExplainer, ModelTuner

logging.basicConfig(level=logging.INFO, format='%(message)s')

def retrain():
    data_path = r"synthetic_data.csv"
    logging.info(f"Starting Mule Fraud Pipeline for dataset: {data_path}")
    
    loader = DataLoader(data_path=data_path)
    raw_data = loader.load_data()
    df = loader.preprocess_missing_values(raw_data)
    
    splitter = DataSplitter()
    train_df, val_df, test_df = splitter.split(df)
    
    # We will use only a subset of the data to retrain quickly in this demo environment
    # Using 10% of the data to ensure retraining finishes in seconds instead of minutes
    tune_df = pd.concat([train_df, val_df]).reset_index(drop=True)
    test_df = test_df.reset_index(drop=True)
    
    # Re-apply walk forward CV splits for the subset
    cv_splits = splitter.get_cv_splits(tune_df)
    
    target_col = 'fraud_bool'
    drop_cols = [target_col, 'month', 'application_id']
    
    y_tune = tune_df[target_col]
    X_tune = tune_df.drop(columns=[c for c in drop_cols if c in tune_df.columns])
    
    y_test = test_df[target_col]
    X_test = test_df.drop(columns=[c for c in drop_cols if c in test_df.columns])
    
    engineer = FraudFeatureEngineer(use_target_encoding=True)
    X_tune_eng = engineer.process_all(X_tune, target=y_tune, is_train=True)
    X_test_eng = engineer.process_all(X_test, is_train=False)
    
    imb_handler = ImbalanceHandler()
    scale_weight = imb_handler.calculate_scale_pos_weight(y_tune)
    
    tuner = ModelTuner(X_tune_eng, y_tune, cv_splits)
    best_lgb_params = tuner.tune(n_trials=3) # minimal trials for speed
    
    ensemble = EnsembleModel(lgb_params=best_lgb_params, scale_pos_weight=scale_weight)
    ensemble.fit(X_tune_eng, y_tune, cv_splits=cv_splits)
    
    if cv_splits:
        val_idx = cv_splits[-1][1] 
    else:
        val_idx = np.arange(len(y_tune))
        
    y_val_calib = y_tune.iloc[val_idx]
    X_val_calib_eng = X_tune_eng.iloc[val_idx]
    
    val_probs = ensemble.predict_proba(X_val_calib_eng)[:, 1]
    
    from sklearn.isotonic import IsotonicRegression
    calibrator = IsotonicRegression(out_of_bounds='clip')
    calibrator.fit(val_probs, y_val_calib)
    
    explainer = SHAPExplainer(ensemble.lgb_model)
    explainer.fit(X_tune_eng.sample(n=min(500, len(X_tune_eng)), random_state=42))
        
    import joblib
    os.makedirs("models", exist_ok=True)
    joblib.dump(engineer, "models/engineer.joblib")
    joblib.dump(ensemble, "models/ensemble.joblib")
    joblib.dump(calibrator, "models/calibrator.joblib")
    joblib.dump(explainer, "models/explainer.joblib")
    logging.info("Saved retrained models to models/ directory.")

if __name__ == "__main__":
    retrain()
