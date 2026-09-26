import pandas as pd
import numpy as np
import os
import joblib
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, average_precision_score, confusion_matrix, classification_report)
from features import get_val_data, get_test_data

def evaluate_thresholds(y_true, y_prob):
    print("\n--- Threshold Analysis (Validation Set) ---")
    thresholds = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90]
    print(f"{'Threshold':<10} | {'Precision':<10} | {'Recall':<10} | {'F1':<10}")
    print("-" * 50)
    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        p = precision_score(y_true, y_pred, zero_division=0)
        r = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        print(f"{t:<10.2f} | {p:<10.4f} | {r:<10.4f} | {f1:<10.4f}")

def evaluate_test_set(pipeline, X_test, y_test, df_test, t=0.5):
    print("\n--- Final Test Set Evaluation ---")
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= t).astype(int)
    
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"F1:        {f1_score(y_test, y_pred):.4f}")
    print(f"ROC-AUC:   {roc_auc_score(y_test, y_prob):.4f}")
    print(f"PR-AUC:    {average_precision_score(y_test, y_prob):.4f}")
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Error Analysis
    df_test = df_test.copy()
    df_test['predicted_label'] = y_pred
    df_test['predicted_probability'] = y_prob
    df_test['actual_label'] = y_test
    
    fp = df_test[(df_test['actual_label'] == 0) & (df_test['predicted_label'] == 1)]
    fn = df_test[(df_test['actual_label'] == 1) & (df_test['predicted_label'] == 0)]
    
    fp_cols = ['generated_domain', 'brand', 'original_domain', 'actual_label', 'predicted_label', 'predicted_probability', 'attack_type']
    
    os.makedirs('results', exist_ok=True)
    fp[fp_cols].to_csv('results/false_positives.csv', index=False)
    fn[fp_cols].to_csv('results/false_negatives.csv', index=False)
    
    print(f"\nSaved {len(fp)} false positives to results/false_positives.csv")
    print(f"Saved {len(fn)} false negatives to results/false_negatives.csv")

def extract_feature_importance(pipeline, X_val, y_val):
    print("\n--- Feature Importance ---")
    classifier = pipeline.named_steps['classifier']
    preprocessor = pipeline.named_steps['preprocessor']
    
    # Get feature names from preprocessor
    num_features = preprocessor.transformers_[0][2]
    cat_features = preprocessor.transformers_[1][1].named_steps['onehot'].get_feature_names_out(preprocessor.transformers_[1][2])
    
    feature_names = list(num_features) + list(cat_features)
    
    if hasattr(classifier, 'feature_importances_'):
        importances = classifier.feature_importances_
        df_imp = pd.DataFrame({'feature': feature_names, 'importance': importances})
        df_imp = df_imp.sort_values(by='importance', ascending=False)
        df_imp.to_csv('results/feature_importance.csv', index=False)
        print("Feature importance saved to results/feature_importance.csv")
        print(df_imp.head(10))
    else:
        print("Model does not expose feature_importances_")

def main():
    model_path = 'models/lookalike_domain_model.joblib'
    if not os.path.exists(model_path):
        print("Model not found. Run train.py first.")
        return
        
    pipeline = joblib.load(model_path)
    
    X_val, y_val, df_val = get_val_data()
    y_prob_val = pipeline.predict_proba(X_val)[:, 1]
    
    evaluate_thresholds(y_val, y_prob_val)
    extract_feature_importance(pipeline, X_val, y_val)
    
    # Chosen threshold (e.g., 0.5 based on high performance)
    X_test, y_test, df_test = get_test_data()
    evaluate_test_set(pipeline, X_test, y_test, df_test, t=0.5)

if __name__ == "__main__":
    main()
