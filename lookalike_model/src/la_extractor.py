import pandas as pd
import numpy as np
import math
import tldextract
from Levenshtein import distance as levenshtein_dist, jaro_winkler

def calculate_entropy(text):
    if not text:
        return 0
    entropy = 0
    for x in set(text):
        p_x = float(text.count(x)) / len(text)
        entropy += - p_x * math.log2(p_x)
    return entropy

def get_character_ngram_similarity(s1, s2, n=2):
    if len(s1) < n or len(s2) < n:
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

def get_suffix_similarity(s1, s2):
    min_len = min(len(s1), len(s2))
    if min_len == 0: return 0.0
    match_len = 0
    for i in range(1, min_len + 1):
        if s1[-i] == s2[-i]:
            match_len += 1
        else:
            break
    return match_len / max(len(s1), len(s2))

def extract_features(domain, target_domain):
    """
    Extract features for a given domain and its closest target_domain.
    """
    ext = tldextract.extract(domain)
    target_ext = tldextract.extract(target_domain)
    
    # We will compute similarities on the domain name without TLD if possible,
    # or the whole domain depending on how the dataset was generated. 
    # Usually dataset compares full domains or just the registrable domain. 
    # Let's compare full domains as features are likely computed that way.
    
    tld = ext.suffix
    tld_length = len(tld) if tld else 0
    
    domain_length = len(domain)
    subdomain_count = len(ext.subdomain.split('.')) if ext.subdomain else 0
    
    digit_count = sum(c.isdigit() for c in domain)
    letter_count = sum(c.isalpha() for c in domain)
    hyphen_count = domain.count('-')
    dot_count = domain.count('.')
    special_character_count = len(domain) - digit_count - letter_count - dot_count
    
    digit_letter_ratio = digit_count / letter_count if letter_count > 0 else 0
    hyphen_ratio = hyphen_count / domain_length if domain_length > 0 else 0
    
    vowels = set("aeiou")
    vowel_count = sum(1 for c in domain.lower() if c in vowels)
    consonant_count = letter_count - vowel_count
    
    entropy = calculate_entropy(domain)
    
    has_https_keyword = 1 if 'https' in domain else 0
    has_login_keyword = 1 if 'login' in domain else 0
    has_security_keyword = 1 if 'security' in domain else 0
    has_payment_keyword = 1 if 'payment' in domain else 0
    has_ip_address = 0 # simple check
    
    lev_dist = levenshtein_dist(domain, target_domain)
    norm_lev = lev_dist / max(len(domain), len(target_domain)) if max(len(domain), len(target_domain)) > 0 else 0
    jw_sim = jaro_winkler(domain, target_domain)
    
    ngram_sim = get_character_ngram_similarity(domain, target_domain)
    pref_sim = get_prefix_similarity(domain, target_domain)
    suff_sim = get_suffix_similarity(domain, target_domain)
    length_diff = abs(len(domain) - len(target_domain))
    
    contains_unicode = 0 # simple heuristic
    contains_homoglyph = 0 # hard to compute without dataset, assume 0 for unseen
    is_punycode = 1 if 'xn--' in domain else 0
    
    return {
        'generated_domain': domain,
        'domain_length': domain_length,
        'subdomain_count': subdomain_count,
        'digit_count': digit_count,
        'letter_count': letter_count,
        'hyphen_count': hyphen_count,
        'dot_count': dot_count,
        'special_character_count': special_character_count,
        'digit_letter_ratio': digit_letter_ratio,
        'hyphen_ratio': hyphen_ratio,
        'vowel_count': vowel_count,
        'consonant_count': consonant_count,
        'entropy': entropy,
        'has_https_keyword': has_https_keyword,
        'has_login_keyword': has_login_keyword,
        'has_security_keyword': has_security_keyword,
        'has_payment_keyword': has_payment_keyword,
        'has_ip_address': has_ip_address,
        'tld': tld,
        'tld_length': tld_length,
        'levenshtein_distance': lev_dist,
        'normalized_levenshtein': norm_lev,
        'jaro_winkler_similarity': jw_sim,
        'character_ngram_similarity': ngram_sim,
        'prefix_similarity': pref_sim,
        'suffix_similarity': suff_sim,
        'length_difference': length_diff,
        'contains_unicode': contains_unicode,
        'contains_homoglyph': contains_homoglyph,
        'is_punycode': is_punycode
    }
