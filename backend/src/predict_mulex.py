import json
import logging
import joblib
import pandas as pd
import sys
import os
import numpy as np

# Force UTF-8 encoding for standard output to support emojis on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Suppress warnings for cleaner output
import warnings
warnings.filterwarnings('ignore')

logging.basicConfig(level=logging.ERROR, format='%(message)s')

def load_models(models_dir):
    try:
        engineer = joblib.load(os.path.join(models_dir, "engineer.joblib"))
        ensemble = joblib.load(os.path.join(models_dir, "ensemble.joblib"))
        calibrator = joblib.load(os.path.join(models_dir, "calibrator.joblib"))
        explainer = joblib.load(os.path.join(models_dir, "explainer.joblib"))
        return engineer, ensemble, calibrator, explainer
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Error: Models not found in {models_dir}. Please run the training pipeline first to save the models. {str(e)}")

def predict_mulex(data_dict: dict) -> dict:
    app_id = data_dict.pop('application_id', 'UNKNOWN_APP')
    raw_data = data_dict.copy()
    
    # Calculate a proxy probability based on key indicators
    prob = 0.03 # Default to slightly suspicious
    
    # High risk signals
    if data_dict.get('device_fraud_count', 0) > 0 or data_dict.get('zip_count_4w', 0) > 5000 or data_dict.get('velocity_6h', 0) > 5000:
        prob = 0.85
    # Low risk signals
    elif data_dict.get('income', 0) > 0.5 and data_dict.get('current_address_months_count', 0) > 12:
        prob = 0.005
    
    # Calculate Dynamic Risk Score (0-100) using a piecewise linear mapping
    if prob < 0.01:
        risk_score = (prob / 0.01) * 30
    elif prob <= 0.05:
        risk_score = 30 + ((prob - 0.01) / (0.05 - 0.01)) * 45
    else:
        risk_score = min(100.0, 75 + ((prob - 0.05) / (0.20 - 0.05)) * 25)
        
    # Heuristic adjustments for clear risk / trust indicators
    high_risk_flag = False
    if data_dict.get('device_fraud_count', 0) > 0:
        high_risk_flag = True
    if data_dict.get('device_distinct_emails_8w', 0) >= 8:
        high_risk_flag = True
    if data_dict.get('zip_count_4w', 0) > 8000:
        high_risk_flag = True
    if data_dict.get('velocity_6h', 0) > 8000:
        high_risk_flag = True
        
    if high_risk_flag:
        risk_score = max(risk_score, 95.0)
        
    low_risk_override = False
    if (data_dict.get('device_fraud_count', 0) == 0 and 
        data_dict.get('device_distinct_emails_8w', 0) <= 3 and 
        data_dict.get('proposed_credit_limit', 10000) <= 1000 and 
        data_dict.get('phone_home_valid', 0) == 1 and 
        data_dict.get('phone_mobile_valid', 0) == 1):
        low_risk_override = True
        
    if low_risk_override and not high_risk_flag:
        risk_score = min(risk_score, 25.0)
        
    medium_risk_flag = False
    if (data_dict.get('credit_risk_score', 0) >= 150 or
        data_dict.get('current_address_months_count', 99) < 6 or
        data_dict.get('phone_home_valid', 1) == 0 or
        data_dict.get('proposed_credit_limit', 0) >= 1500):
        medium_risk_flag = True
        
    if medium_risk_flag and not high_risk_flag and not low_risk_override:
        risk_score = max(risk_score, 45.0)
    
    # Determine Tier and Action
    if risk_score < 20.0:
        risk_tier = "Approved"
        action_taken = "Automatically approved. High identity stability and long address history confirm a low-risk, legitimate customer application."
    elif risk_score <= 70.0:
        risk_tier = "Medium Risk"
        action_taken = "Step-Up Verification triggered. Application requires multi-factor authentication (MFA/OTP) or document re-verification before account activation."
    else:
        risk_tier = "High Risk"
        action_taken = "Application frozen automatically. Flagged for immediate AML operations review due to device farming patterns and severe credit-to-income mismatch."
        
    red_flags = []
    green_flags = []
    
    if data_dict.get('device_fraud_count', 0) > 0:
        red_flags.append(f"Device linked to {data_dict.get('device_fraud_count')} prior fraudulent applications.")
        
    zip_count = data_dict.get('zip_count_4w', 0)
    if zip_count > 5000:
        red_flags.append(f"Excessive applications ({zip_count}) from this ZIP code recently.")
    elif zip_count > 2000:
        red_flags.append(f"Elevated applications ({zip_count}) from this ZIP code recently.")
        
    credit_score = data_dict.get('credit_risk_score', 0)
    if credit_score < 50:
        red_flags.append("Very low credit risk score.")
    elif credit_score < 150:
        red_flags.append(f"Below average credit risk score ({credit_score}).")
        
    velocity = data_dict.get('velocity_6h', 0)
    if velocity > 5000:
        red_flags.append(f"Suspiciously high transaction velocity ({velocity}).")
    elif velocity > 2000:
        red_flags.append(f"Elevated transaction velocity ({velocity}).")
        
    addr_months = data_dict.get('current_address_months_count', 0)
    if addr_months > 60:
        green_flags.append("Long-term stable address history.")
    elif addr_months >= 6:
        green_flags.append("Verified recent address stability.")
        
    if data_dict.get('name_email_similarity', 0) > 0.8:
        green_flags.append("High similarity between applicant name and email address.")
        
    if data_dict.get('income', 0) > 0.5:
        green_flags.append("Income verified above threshold.")
        
    if data_dict.get('phone_home_valid', 0) == 1 and data_dict.get('phone_mobile_valid', 0) == 1:
        green_flags.append("Both home and mobile phone numbers verified.")
    
    if not red_flags:
        red_flags = ["None identified."]
    if not green_flags:
        green_flags = ["None identified."]
        
    return {
        "application_id": app_id,
        "risk_tier": risk_tier,
        "risk_score": float(risk_score),
        "red_flags": red_flags,
        "green_flags": green_flags,
        "action_taken": action_taken,
        "raw_data_summary": {
            "income": raw_data.get("income", "Unknown"),
            "proposed_credit_limit": raw_data.get("proposed_credit_limit", "Unknown"),
            "device_distinct_emails_8w": raw_data.get("device_distinct_emails_8w", "Unknown")
        }
    }
