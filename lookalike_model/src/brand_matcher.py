import re
import math
import tldextract
from Levenshtein import distance as levenshtein_dist, jaro_winkler
import pandas as pd

# Generic keywords to ignore during brand matching
GENERIC_KEYWORDS = {
    'login', 'signin', 'secure', 'security', 'account', 'verify', 
    'verification', 'support', 'help', 'auth', 'authentication', 
    'update', 'billing', 'payment', 'wallet', 'portal', 'service',
    'app', 'web', 'online', 'center', 'team', 'mail', 'cloud'
}

def normalize_token(token):
    """Normalize homoglyphs and confusables for better matching while retaining raw token separately."""
    t = token.lower()
    # Simple homoglyph replacements
    replacements = {
        '0': 'o',
        '1': 'l',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
        '8': 'b',
        'rn': 'm',
        'vv': 'w',
        'cl': 'd'
    }
    for k, v in replacements.items():
        t = t.replace(k, v)
    return t

def get_character_ngram_similarity(s1, s2, n=2):
    if len(s1) < n or len(s2) < n:
        if s1 == s2: return 1.0
        return 0.0
    ngrams1 = set([s1[i:i+n] for i in range(len(s1)-n+1)])
    ngrams2 = set([s2[i:i+n] for i in range(len(s2)-n+1)])
    intersection = ngrams1.intersection(ngrams2)
    union = ngrams1.union(ngrams2)
    return len(intersection) / len(union) if union else 0.0

def get_prefix_similarity(s1, s2):
    min_len = min(len(s1), len(s2))
    if min_len == 0: return 0.0
    match_len = 0
    for i in range(min_len):
        if s1[i] == s2[i]:
            match_len += 1
        else:
            break
    return match_len / max(len(s1), len(s2))

def compute_similarity(token, brand):
    if not token or not brand:
        return 0.0
        
    norm_token = normalize_token(token)
    norm_brand = normalize_token(brand)
    
    # We will use the maximum similarity between raw and normalized
    def calc_score(t, b):
        max_len = max(len(t), len(b))
        if max_len == 0: return 0.0
        lev_sim = 1.0 - (levenshtein_dist(t, b) / max_len)
        jw_sim = jaro_winkler(t, b)
        ngram_sim = get_character_ngram_similarity(t, b, n=2)
        pref_sim = get_prefix_similarity(t, b)
        
        score = (0.35 * lev_sim) + (0.30 * jw_sim) + (0.20 * ngram_sim) + (0.15 * pref_sim)
        if len(b) <= 4 and max_len > len(b) + 2:
            score *= 0.8
        return score
        
    raw_score = calc_score(token, brand)
    norm_score = calc_score(norm_token, norm_brand)
    
    return max(raw_score, norm_score)

def tokenize_domain(domain):
    # Extract the main registrable part of the domain (ignore subdomains and TLD for tokenization)
    ext = tldextract.extract(domain)
    main_part = ext.domain
    
    # Handle punycode decoding if present
    if main_part.startswith('xn--'):
        try:
            main_part = main_part.encode('ascii').decode('idna')
        except:
            pass
            
    # Split by hyphens
    raw_tokens = main_part.split('-')
    
    # Filter generic keywords
    meaningful_tokens = [t for t in raw_tokens if t.lower() not in GENERIC_KEYWORDS and len(t) > 2]
    
    # If all tokens were generic (e.g. secure-login.com), fall back to raw tokens
    if not meaningful_tokens:
        meaningful_tokens = [t for t in raw_tokens if len(t) > 0]
        
    return meaningful_tokens

def guess_technique(domain, matched_brand):
    """Simple heuristic to guess the attack technique based on the domain and brand."""
    if not matched_brand:
        return "Unknown"
    
    ext = tldextract.extract(domain)
    main_part = ext.domain
    
    if matched_brand in main_part and '-' in main_part:
        return "Brand + Keyword Insertion"
    
    if matched_brand in ext.subdomain:
        return "Subdomain Impersonation"
        
    if domain.replace(ext.suffix, '') == matched_brand + '.':
        return "TLD Substitution"
        
    if len(main_part) > len(matched_brand):
        return "Character Insertion"
    elif len(main_part) < len(matched_brand):
        return "Character Deletion"
    else:
        if main_part != matched_brand:
            # Check if it's a homoglyph or substitution
            if any(c.isdigit() for c in main_part) and not any(c.isdigit() for c in matched_brand):
                return "Homoglyph / Character Substitution"
            return "Character Substitution"
            
    return "Lookalike"

class BrandMatcher:
    def __init__(self, threshold=0.62):
        self.threshold = threshold
        # Initialize a default list of target brands (simulating a DB)
        self.known_brands = {
            'paypal': 'paypal.com',
            'apple': 'apple.com',
            'microsoft': 'microsoft.com',
            'amazon': 'amazon.com',
            'google': 'google.com',
            'facebook': 'facebook.com',
            'netflix': 'netflix.com',
            'chase': 'chase.com',
            'bankofamerica': 'bankofamerica.com',
            'wellsfargo': 'wellsfargo.com',
            'linkedin': 'linkedin.com',
            'twitter': 'twitter.com',
            'instagram': 'instagram.com',
            'adobe': 'adobe.com',
            'dropbox': 'dropbox.com'
        }
        
    def load_brands_from_dataset(self, csv_path=None):
        if csv_path is None:
            import os
            csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'train.csv')
        try:
            df = pd.read_csv(csv_path)
            # Extract unique original domains and brands
            unique_pairs = df[['brand', 'original_domain']].dropna().drop_duplicates()
            for _, row in unique_pairs.iterrows():
                brand_name = str(row['brand']).lower().strip()
                domain = str(row['original_domain']).lower().strip()
                self.known_brands[brand_name] = domain
        except Exception as e:
            print(f"Warning: Could not load brands from dataset: {e}")

    def find_best_match(self, domain):
        tokens = tokenize_domain(domain)
        best_overall_brand = None
        best_overall_score = 0.0
        best_overall_domain = None
        
        candidates = []
        
        for token in tokens:
            for known_brand, known_domain in self.known_brands.items():
                score = compute_similarity(token, known_brand)
                candidates.append({
                    'brand': known_brand,
                    'domain': known_domain,
                    'score': score
                })
        
        if not candidates:
            return None, 0.0, None
            
        # Sort candidates by score descending
        candidates.sort(key=lambda x: x['score'], reverse=True)
        
        # Get the top candidate
        top_candidate = candidates[0]
        
        if top_candidate['score'] >= self.threshold:
            return top_candidate['brand'], top_candidate['score'], top_candidate['domain']
        
        return None, top_candidate['score'], None
