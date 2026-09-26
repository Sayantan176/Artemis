# Artemis: Lookalike Domain Detection

This repository contains the training pipeline and prediction service for the Artemis project's lookalike domain detection system.

## Project Structure
- `data/`: Contains the synthetic domain dataset (`dataset.csv`, `train.csv`, `validation.csv`, `test.csv`) and the legitimate Tranco DB (`tranco_Y8YYG.csv`).
- `src/`: Source code for feature extraction, training, evaluation, and prediction.
- `models/`: Trained model binaries (`.joblib` format).
- `results/`: Output CSVs from evaluation, such as false positives/negatives, and feature importance.

## Domain Intelligence
Artemis uses multiple domain datasets as additional independent intelligence sources:
- **Tranco**
- **Majestic Million**
- **Cisco Umbrella Top 1M**

- **Exact Matches:** It can correctly identify if a domain (or its parent domain) exactly matches an entry in any of these datasets.
- **Similar Matches:** Suspicious domains are checked against the top 100,000 domains across these databases using lexical similarity.
- **Cross-Source Corroboration:** Artemis computes the cross-source agreement across all databases.
- **Contextual Only:** Presence in any dataset is NOT treated as proof of safety, and absence from these datasets is NOT treated as proof of maliciousness. The ML detection model remains the sole authority on classifying a domain's lookalike risk.

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Inspect Dataset (Optional)
```bash
python src/inspect_data.py
```

### 3. Train Models
This will extract features, train 9 different models (Classical ML, Tree-based, Boosting, Char-level baseline, and Hybrid models), save a comparison CSV to `results/model_comparison.csv`, and save the best performing pipeline to `models/lookalike_domain_model.joblib`.
```bash
python src/train.py
```

### 4. Evaluate Model
Evaluates the saved model against the validation set to determine threshold trade-offs, runs a final holdout test on `test.csv`, and performs error analysis.
```bash
python src/evaluate.py
```

### 5. Run Prediction on a Domain
Allows testing the trained model on an arbitrary domain.
```bash
python src/predict.py paypal-login.com
python src/predict.py google.com
```

### Using in Python
You can also import it in your Artemis backend code directly:
```python
from src.predict import predict_domain

result = predict_domain("paypal-login.com")
print(result)
```
