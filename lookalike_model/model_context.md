# Artemis Lookalike Domain Model: Integration Context

This document is designed for developers integrating the **Artemis Lookalike Domain Detection Engine** into a larger backend application and building a frontend interface for it. It provides the necessary context on the project architecture, dependencies, and exactly how to consume the Python API.

---

## 1. Project Overview
Artemis is a machine-learning-powered engine that detects typosquatting, homoglyph attacks, and lookalike domains. It uses an `ExtraTreesClassifier` trained on lexical and structural features of domains, combined with a custom deterministic brand-matching algorithm and three external domain intelligence databases (Tranco, Majestic Million, Cisco Umbrella).

### Core Capabilities:
1.  **ML Risk Classification**: Predicts the probability that a domain is a lookalike.
2.  **Brand Identification**: Identifies the specific brand being targeted using weighted similarity algorithms.
3.  **Explainability**: Extracts 29 lexical features (e.g., entropy, edit distance) and identifies the specific attack technique (e.g., Character Insertion).
4.  **Domain Intelligence**: Cross-references the domain against top 1M global traffic databases.

---

## 2. Dependencies & Environment
Ensure the environment running the model has the dependencies installed from `requirements.txt`:
*   `pandas`, `numpy`, `scikit-learn` (ML processing and pipeline)
*   `tldextract` (Domain parsing)
*   `Levenshtein`, `rapidfuzz` (String similarity algorithms)
*   `joblib` (Model loading)

*Note: The model expects the `data/` folder to contain the CSVs for Tranco, Majestic, and Cisco if Domain Intelligence features are used.*

---

## 3. Python API Integration

You do not need to call the CLI via subprocess. You can directly import and call the prediction function in your backend (e.g., FastAPI, Django, Flask).

### Example Import
```python
import sys
import os

# Ensure the src directory is in the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lookalike_model', 'src'))

from predict import predict_domain

# Run prediction
try:
    result_payload = predict_domain("paypall.com", model_path="models/lookalike_domain_model.joblib")
except Exception as e:
    print(f"Error processing domain: {e}")
```

---

## 4. API Output Specification (JSON / Dict)

The `predict_domain` function returns a heavily structured Python dictionary, which is perfectly suited to be serialized into JSON for a frontend application.

### Output Schema

```json
{
  "domain": "paypall.com",
  "impersonated_brand": "paypal",
  "brand_score": 0.88,
  "probability": 0.92,
  "risk": "HIGH",
  "technique": "Character Insertion",
  "target_domain": "paypal.com",
  "features": {
    "domain_length": 11,
    "entropy": 2.914,
    "levenshtein_distance": 1,
    "jaro_winkler_similarity": 0.982,
    "digit_count": 0,
    "hyphen_count": 0,
    "subdomain_count": 0,
    "...": "(22 other numeric features)"
  },
  "intelligence": {
    "tranco": {
      "match_type": "SIMILAR", 
      "matched_domain": "paypal.com",
      "rank": 170,
      "similarity": 0.88
    },
    "majestic": {
      "match_type": "NONE",
      "matched_domain": null,
      "rank": null,
      "similarity": null
    },
    "cisco": {
      "match_type": "SIMILAR",
      "matched_domain": "paypal.com",
      "rank": 1332,
      "similarity": 0.88
    },
    "agreement": "2 / 3",
    "agreed_domain": "paypal.com"
  }
}
```

### Field Definitions for Frontend UI

#### Core Metrics
*   `probability`: Float between `0.0` and `1.0`. `> 0.5` means LOOKALIKE, otherwise LEGITIMATE. Render as a percentage (e.g. `92.0%`).
*   `risk`: String enum: `"HIGH"` (prob >= 0.8), `"MEDIUM"` (prob >= 0.5), `"LOW"` (prob < 0.5). Useful for color-coding (Red/Yellow/Green).
*   `impersonated_brand`: String or `None`. The detected target. 
*   `technique`: String (e.g., `"Character Insertion"`, `"Homoglyph / Character Substitution"`). 

#### Explainable Features (`result["features"]`)
*   Pass these directly to the frontend to build a "Model Explanation" or "Evidence" panel. 
*   Key features to display: `entropy`, `levenshtein_distance`, `domain_length`, `digit_count`, `hyphen_count`.

#### Domain Intelligence (`result["intelligence"]`)
*   Contains sub-dictionaries for `tranco`, `majestic`, and `cisco`.
*   `match_type`: String enum:
    *   `"EXACT"`: Domain exactly matches the DB.
    *   `"SUBDOMAIN"`: Domain is a subdomain of an exact match in the DB.
    *   `"SIMILAR"`: No exact match, but structurally similar to a popular domain.
    *   `"NONE"`: No strong match found.
*   `agreement`: String (e.g., `"3 / 3"`, `"2 / 3"`, `"NO"`). Displays consensus across datasets.

---

## 5. Frontend UI Recommendations

When building the frontend dashboard, we recommend adhering to the structural philosophy developed in the CLI:

1.  **Strict Separation:** Ensure the ML Model predictions (Probability, Risk, Brand) are visually separated from the Domain Intelligence (Tranco/Majestic/Cisco). They are two different types of intelligence (Inference vs. Database presence).
2.  **Explainability First:** Instead of just showing "Malicious," expose the `features` dictionary in a side panel or tooltip. Showing the user *why* (e.g., "Edit distance: 1", "Entropy: 3.9") builds trust in the tool.
3.  **Color Semantics:** 
    *   Map `Risk: HIGH` to Error/Red colors.
    *   Map `Risk: LOW` to Success/Green colors.
    *   For Domain Intelligence, exact matches in Tranco/Majestic should not automatically be colored "Safe/Green", as compromised domains can exist in top rankings. Treat it as contextual grey/blue intelligence.
