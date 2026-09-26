import pandas as pd
import numpy as np
import os
import joblib
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score
from features import get_feature_pipeline, get_train_data, get_val_data
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer

def get_models():
    models = {
        'Baseline_LogReg': LogisticRegression(max_iter=1000, random_state=42),
        'Classical_RandomForest': RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
        'Classical_ExtraTrees': ExtraTreesClassifier(n_estimators=100, random_state=42, n_jobs=-1),
        'Classical_HistGradientBoosting': HistGradientBoostingClassifier(random_state=42),
        'Boosting_XGBoost': XGBClassifier(random_state=42, eval_metric='logloss', use_label_encoder=False),
        'Boosting_LightGBM': LGBMClassifier(random_state=42)
    }
    # SVM can be slow, but the dataset is 15k rows, so it's manageable. We'll add probability=True
    models['Classical_SVM'] = SVC(probability=True, random_state=42)
    return models

def evaluate_model(y_true, y_pred, y_prob):
    return {
        'Accuracy': accuracy_score(y_true, y_pred),
        'Precision': precision_score(y_true, y_pred, zero_division=0),
        'Recall': recall_score(y_true, y_pred, zero_division=0),
        'F1': f1_score(y_true, y_pred, zero_division=0),
        'ROC-AUC': roc_auc_score(y_true, y_prob),
        'PR-AUC': average_precision_score(y_true, y_prob)
    }

def main():
    X_train, y_train, _ = get_train_data()
    X_val, y_val, _ = get_val_data()
    
    results = []
    trained_pipelines = {}
    
    print("--- Training Models with Engineered Features ---")
    models = get_models()
    for name, model in models.items():
        print(f"Training {name}...")
        pipeline = Pipeline([
            ('preprocessor', get_feature_pipeline(use_char_tfidf=False)),
            ('classifier', model)
        ])
        pipeline.fit(X_train, y_train)
        
        y_pred = pipeline.predict(X_val)
        y_prob = pipeline.predict_proba(X_val)[:, 1] if hasattr(pipeline, "predict_proba") else pipeline.decision_function(X_val)
        
        metrics = evaluate_model(y_val, y_pred, y_prob)
        metrics['Model'] = name
        results.append(metrics)
        trained_pipelines[name] = pipeline
        print(metrics)

    print("\n--- Training Character-Level Baseline ---")
    # Only TF-IDF on generated_domain
    char_preprocessor = ColumnTransformer([
        ('text', TfidfVectorizer(analyzer='char', ngram_range=(2, 5), min_df=2), 'generated_domain')
    ], remainder='drop')
    char_pipeline = Pipeline([
        ('preprocessor', char_preprocessor),
        ('classifier', LogisticRegression(max_iter=1000, random_state=42))
    ])
    char_pipeline.fit(X_train, y_train)
    y_pred_char = char_pipeline.predict(X_val)
    y_prob_char = char_pipeline.predict_proba(X_val)[:, 1]
    metrics_char = evaluate_model(y_val, y_pred_char, y_prob_char)
    metrics_char['Model'] = 'CharBaseline_LogReg'
    results.append(metrics_char)
    trained_pipelines['CharBaseline_LogReg'] = char_pipeline
    print(metrics_char)
    
    print("\n--- Training Hybrid Model ---")
    hybrid_pipeline = Pipeline([
        ('preprocessor', get_feature_pipeline(use_char_tfidf=True)),
        ('classifier', LogisticRegression(max_iter=1000, random_state=42))
    ])
    hybrid_pipeline.fit(X_train, y_train)
    y_pred_hybrid = hybrid_pipeline.predict(X_val)
    y_prob_hybrid = hybrid_pipeline.predict_proba(X_val)[:, 1]
    metrics_hybrid = evaluate_model(y_val, y_pred_hybrid, y_prob_hybrid)
    metrics_hybrid['Model'] = 'Hybrid_LogReg'
    results.append(metrics_hybrid)
    trained_pipelines['Hybrid_LogReg'] = hybrid_pipeline
    print(metrics_hybrid)
    
    df_results = pd.DataFrame(results)
    cols = ['Model', 'Accuracy', 'Precision', 'Recall', 'F1', 'ROC-AUC', 'PR-AUC']
    df_results = df_results[cols].sort_values(by='PR-AUC', ascending=False)
    
    os.makedirs('results', exist_ok=True)
    df_results.to_csv('results/model_comparison.csv', index=False)
    print("\nResults saved to results/model_comparison.csv")
    print(df_results)
    
    # Select best model based on PR-AUC
    best_model_name = df_results.iloc[0]['Model']
    print(f"\nBest model selected based on PR-AUC: {best_model_name}")
    
    os.makedirs('models', exist_ok=True)
    best_pipeline = trained_pipelines[best_model_name]
    joblib.dump(best_pipeline, 'models/lookalike_domain_model.joblib')
    print("Best model saved to models/lookalike_domain_model.joblib")

if __name__ == "__main__":
    main()
