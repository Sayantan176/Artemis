# Artemis: Frequently Asked Questions (FAQ)

This document provides a deep dive into the architecture, mathematics, and logic powering the Artemis Lookalike Domain Detection Engine.

---

## 1. Machine Learning & Detection Algorithm

### What machine learning algorithm does Artemis use?
Artemis uses an **ExtraTreesClassifier (Extremely Randomized Trees)** as its primary detection model. ExtraTrees is an ensemble learning method that aggregates the results of many decision trees. It was selected because it provides robust performance against overfitting, handles the non-linear interactions of our lexical features very well, and is extremely fast during inference.

### How does the model actually make a prediction?
The prediction is not just a single string comparison. When a domain is checked:
1. Artemis extracts **29 distinct structural and lexical features** from the domain (e.g., entropy, vowel-to-consonant ratios, hyphen density, subdomains).
2. The domain is checked against a database of known brands to establish a "reference target" (if one exists).
3. The features are fed into the trained ExtraTrees model, which produces a probability score (0.0 to 1.0) indicating how closely the domain matches known malicious patterns.

### How are Risk Levels calculated?
Risk levels are determined deterministically based on the model's confidence probability:
*   **HIGH RISK:** Probability ≥ 80% (0.80)
*   **MEDIUM RISK:** Probability between 50% (0.50) and 79.9%
*   **LOW RISK:** Probability < 50% (Considered Legitimate/Cleared)

---

## 2. The Mathematics of Lookalike Detection

### What is the math behind calculating domain "Entropy"?
Artemis calculates Shannon Entropy to measure the randomness of the domain string. Malicious actors often use domain generation algorithms (DGAs) which result in highly random, high-entropy strings.
The formula used is:
```text
H(X) = - Σ [ P(x) * log₂(P(x)) ]
```
Where `P(x)` is the frequency of a specific character divided by the total length of the domain. Higher entropy (e.g., > 3.0) strongly suggests obfuscation or randomness.

### How does Artemis calculate Brand Similarity?
Artemis uses a weighted multi-metric similarity score to ensure typosquats are caught reliably without creating false positives for unrelated domains. The equation is:

```text
Score = (0.35 * Levenshtein_Similarity) 
      + (0.30 * Jaro_Winkler_Similarity) 
      + (0.20 * N_Gram_Similarity) 
      + (0.15 * Prefix_Similarity)
```

If the target brand is very short (≤ 4 characters) and the observed domain is significantly longer, a severe **0.8x penalty multiplier** is applied to prevent short generic words from falsely flagging long unrelated domains.

### What is the threshold for a brand match?
Artemis requires the weighted similarity score to be **≥ 0.62 (62%)**. If the score falls below this, Artemis will report "No strong brand match" to avoid forcing arbitrary matches.

### How does Artemis detect Homoglyphs (e.g., `paypa1.com`)?
Before running the mathematical similarity scoring, Artemis runs the observed domain through a normalization function that maps known visual confusables (like `1` → `l`, `0` → `o`, `rn` → `m`) back to their base characters. It then scores *both* the raw string and the normalized string, taking the highest score.

---

## 3. Legitimate Domain Intelligence

### What databases does Artemis use for Intelligence?
Artemis queries three independent, world-class domain ranking datasets:
1.  **Tranco** (A research-focused top domains list)
2.  **Majestic Million** (Top million domains based on referring subnets)
3.  **Cisco Umbrella Top 1M** (Top million domains based on enterprise DNS traffic)

### What is the purpose of querying these databases?
These databases provide **Domain Intelligence**. They help analysts understand if a suspicious domain is actually a highly popular, well-established corporate domain. 

### Does being in the database mean a domain is 100% safe?
**No.** Presence in these datasets is treated strictly as an *intelligence signal*, not definitive proof of safety. A compromised legitimate domain might still appear in Tranco, and a brand-new legitimate startup might not appear in any of them. The Artemis ExtraTrees ML model remains the sole authority on the actual Lookalike Classification.

### How does the Cross-Source Match work?
Because Artemis queries three independent datasets, it calculates a consensus. If a domain is found in Tranco, Majestic, and Cisco, it returns a `3 / 3` agreement. This allows analysts to instantly gauge the global footprint and reputation stability of a domain.

### Why does Artemis sometimes show a "Closest Similarity" in the Intelligence table?
If an exact match isn't found, Artemis slices the top 100,000 domains from the databases and runs a C++ optimized RapidFuzz search to find the closest popular domain. It then rigorously scores it using the Artemis Brand Matcher equation. This helps analysts contextualize exactly *who* the domain might be trying to impersonate.
