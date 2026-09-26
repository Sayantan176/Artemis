import argparse
import joblib
import pandas as pd
import os
import warnings
from sklearn.exceptions import InconsistentVersionWarning

# Suppress sklearn version warnings since we just want a clean CLI output
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

from la_extractor import extract_features
from brand_matcher import BrandMatcher, guess_technique

def predict_domain(domain, model_path='models/lookalike_domain_model.joblib'):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}. Please train the model first.")
        
    pipeline = joblib.load(model_path)
    
    # 1. Brand Identification (Independent)
    matcher = BrandMatcher(threshold=0.62)
    matcher.load_brands_from_dataset()
    
    impersonated_brand, brand_score, original_domain = matcher.find_best_match(domain)
    
    # We still need a target_domain to compute the ML features. 
    # If the matcher found a brand, use its domain. Otherwise, just use the domain itself 
    # (or a dummy) so the ML model can just evaluate structural features (like entropy, length, hyphens).
    target_domain = original_domain if original_domain else domain
    
    # 2. Lookalike Classification
    features = extract_features(domain, target_domain)
    df_features = pd.DataFrame([features])
    
    prob = pipeline.predict_proba(df_features)[0][1]
    
    # Determine Risk
    risk = "LOW"
    if prob >= 0.8:
        risk = "HIGH"
    elif prob >= 0.5:
        risk = "MEDIUM"
        
    technique = guess_technique(domain, impersonated_brand)
    
    # 3. Domain Intelligence
    from legitimate_domains import DomainIntelligenceEngine
    intelligence_engine = DomainIntelligenceEngine()
    intelligence = intelligence_engine.analyze_domain(domain)
    
    return {
        "domain": domain,
        "impersonated_brand": impersonated_brand,
        "brand_score": brand_score,
        "probability": prob,
        "risk": risk,
        "technique": technique,
        "features": features,
        "target_domain": target_domain,
        "intelligence": intelligence
    }

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.rule import Rule

console = Console()

def print_result(result):
    # Determine classification
    is_lookalike = result['probability'] >= 0.5
    classification = "LOOKALIKE" if is_lookalike else "LEGITIMATE"
    
    # Styling mappings
    class_style = "bold red" if is_lookalike else "bold green"
    
    risk_style = "bold green"
    if result['risk'] == "HIGH":
        risk_style = "bold red"
    elif result['risk'] == "MEDIUM":
        risk_style = "bold yellow"
        
    console.print()
    console.print(" [bold blue]════════════════ ARTEMIS MODEL ANALYSIS ════════════════[/bold blue]")
    console.print()
    
    # Domain Text
    console.print(" [bold]Domain[/bold]")
    console.print(Rule(style="dim"))
    console.print(f" {result['domain']}")
    console.print()
    
    # Details Table
    table = Table(show_header=True, header_style="bold", show_edge=True)
    table.add_column("Detection", style="dim", width=30)
    table.add_column("Result", width=37)
    
    # Add rows
    confidence = result['probability'] if is_lookalike else (1.0 - result['probability'])
    table.add_row("Classification", f"[{class_style}]{classification}[/]")
    table.add_row("Model Confidence", f"{confidence * 100:.2f}%")
    table.add_row("Risk Level", f"[{risk_style}]{result['risk']}[/]")
    
    if result['impersonated_brand']:
        table.add_row("Likely Brand", result['impersonated_brand'].capitalize())
        if is_lookalike:
            table.add_row("Brand Similarity", f"{result['brand_score'] * 100:.1f}%")
            table.add_row("Detected Technique", result['technique'])
    else:
        if is_lookalike:
            table.add_row("Likely Brand", "No strong brand match")
        else:
            table.add_row("Likely Brand", "None identified")
            
    console.print(table)
    console.print()
    
    # --- MODEL EXPLANATION SECTION ---
    console.print(" [bold blue]══════════════════════ MODEL EXPLANATION ══════════════════════[/bold blue]")
    console.print()
    
    features = result['features']
    
    # 1. Feature Values Table
    feat_table = Table(show_header=True, header_style="bold", show_edge=True)
    feat_table.add_column("Feature", style="dim", width=30)
    feat_table.add_column("Value", width=37)
    
    feat_table.add_row("Domain Length", str(features['domain_length']))
    feat_table.add_row("Entropy", f"{features['entropy']:.3f}")
    
    if result['impersonated_brand']:
        feat_table.add_row("Levenshtein Distance", str(features['levenshtein_distance']))
        feat_table.add_row("Jaro-Winkler Similarity", f"{features['jaro_winkler_similarity']:.3f}")
        feat_table.add_row("Brand Similarity Score", f"{result['brand_score'] * 100:.1f}%")
        
    feat_table.add_row("Digit Count", str(features['digit_count']))
    feat_table.add_row("Hyphen Count", str(features['hyphen_count']))
    feat_table.add_row("Subdomain Count", str(features['subdomain_count']))
    console.print(feat_table)
    console.print()
    
    # 2. Technique Explanation
    if result['impersonated_brand'] and result['technique'] != "Unknown":
        tech_table = Table(title="Technique Explanation", show_header=True, header_style="bold", show_edge=True)
        tech_table.add_column("Property", style="dim", width=30)
        tech_table.add_column("Detail", width=37)
        
        tech_table.add_row("Detected Technique", result['technique'])
        tech_table.add_row("Reference Domain", result['target_domain'])
        tech_table.add_row("Observed Domain", result['domain'])
        console.print(tech_table)
        console.print()
        
    # 3. Why Artemis flagged this domain
    if is_lookalike:
        console.print(" [bold]WHY ARTEMIS FLAGGED THIS DOMAIN[/bold]")
        if result['impersonated_brand']:
            console.print(f" • Strong lexical similarity to the identified brand domain ({result['target_domain']})")
            if features['levenshtein_distance'] <= 2 and features['levenshtein_distance'] > 0:
                console.print(f" • Very small edit distance ({features['levenshtein_distance']})")
            console.print(f" • {result['technique']} detected")
        else:
            console.print(" • Suspicious lexical characteristics detected")
            console.print(" • Lookalike pattern identified by the model without a specific target brand")
            if features['entropy'] > 3.0:
                console.print(f" • High domain entropy ({features['entropy']:.2f})")
            if features['digit_count'] > 2:
                console.print(f" • Unusual number of digits ({features['digit_count']})")
            if features['hyphen_count'] > 1:
                console.print(f" • Unusual number of hyphens ({features['hyphen_count']})")
    else:
        console.print(" [bold]WHY ARTEMIS CLEARED THIS DOMAIN[/bold]")
        if result['impersonated_brand']:
            console.print(f" • Contains brand similarity, but structural features appear benign")
            if features['levenshtein_distance'] > 3:
                console.print(f" • High edit distance ({features['levenshtein_distance']}) reduces impersonation risk")
        else:
            console.print(" • Lexical characteristics are consistent with normal domain patterns")
            console.print(" • No strong brand similarity detected")
            if features['entropy'] < 3.0:
                console.print(f" • Normal domain entropy ({features['entropy']:.2f})")
                
    console.print()
    
    console.print(" [bold cyan]══════════════════ DOMAIN INTELLIGENCE ══════════════════[/bold cyan]")
    console.print()

    # Domain Intelligence Table
    intel = result.get('intelligence', {})
    tranco = intel.get('tranco', {})
    majestic = intel.get('majestic', {})
    cisco = intel.get('cisco', {})
    agreement = intel.get('agreement', 'NO')
    agreed_domain = intel.get('agreed_domain')
    
    intel_table = Table(show_header=True, header_style="bold", show_edge=True)
    intel_table.add_column("Source", style="dim", width=25)
    intel_table.add_column("Result", width=42)
    
    # Helper to add individual detailed source rows
    def add_detailed_source_rows(source_name, data):
        match_type = data.get('match_type', 'NONE')
        if match_type == 'EXACT':
            intel_table.add_row(source_name, "Exact match")
            if data.get('rank'):
                intel_table.add_row(f"{source_name} Rank", f"#{int(data['rank'])}")
        elif match_type == 'SUBDOMAIN':
            intel_table.add_row(source_name, "Exact match (Subdomain)")
            intel_table.add_row(f"Parent {source_name}", data.get('matched_domain', ''))
            if data.get('rank'):
                intel_table.add_row(f"{source_name} Rank", f"#{int(data['rank'])}")
        elif match_type == 'SIMILAR':
            intel_table.add_row(source_name, "No exact match")
            intel_table.add_row(f"Closest {source_name}", data.get('matched_domain', ''))
            intel_table.add_row(f"{source_name} Similarity", f"{data.get('similarity', 0) * 100:.1f}%")
            if data.get('rank'):
                intel_table.add_row(f"{source_name} Rank", f"#{int(data['rank'])}")
        else:
            intel_table.add_row(source_name, "No exact match")
            intel_table.add_row(f"Closest {source_name}", "No strong match")
            
    add_detailed_source_rows("Tranco", tranco)
    intel_table.add_section()
    add_detailed_source_rows("Majestic", majestic)
    intel_table.add_section()
    add_detailed_source_rows("Cisco", cisco)
    intel_table.add_section()
    intel_table.add_row("Cross-source Match", agreement)
    
    console.print(intel_table)
    console.print()


import sys

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict if a domain is a lookalike.", add_help=False)
    parser.add_argument("domain", type=str, nargs='?', help="The domain name to check (e.g., paypal-login.com)")
    parser.add_argument("--model", type=str, default="models/lookalike_domain_model.joblib", help="Path to the trained model")
    parser.add_argument("-h", "--help", action="store_true", help="Show this help message and exit")
    
    args = parser.parse_args()
    
    if args.help or not args.domain:
        usage_panel = Panel(
            Text("Usage: python src/predict.py <domain_or_url> [--model path]", style="bold cyan"),
            title="Artemis CLI",
            border_style="blue"
        )
        console.print(usage_panel)
        sys.exit(1 if not args.domain and not args.help else 0)
    
    try:
        # If it's a full URL, extractor already uses tldextract which cleanly parses URLs too!
        result = predict_domain(args.domain, args.model)
        print_result(result)
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}")

