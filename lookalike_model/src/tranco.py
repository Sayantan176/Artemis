import os
import pandas as pd
import tldextract
from rapidfuzz import process, fuzz
from brand_matcher import compute_similarity, tokenize_domain

class TrancoDatabase:
    _instance = None
    
    def __new__(cls, csv_path=None):
        if csv_path is None:
            import os
            csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'tranco_Y8YYG.csv')
        if cls._instance is None:
            cls._instance = super(TrancoDatabase, cls).__new__(cls)
            cls._instance._initialize(csv_path)
        return cls._instance
        
    def _initialize(self, csv_path):
        self.domains_dict = {}
        self.domains_list = []
        self.loaded = False
        
        if os.path.exists(csv_path):
            try:
                # Load the database
                df = pd.read_csv(csv_path, header=None, names=['rank', 'domain'])
                # Drop nulls
                df = df.dropna(subset=['domain'])
                df['domain'] = df['domain'].astype(str).str.lower().str.strip()
                
                # Dictionary for O(1) exact lookups
                self.domains_dict = dict(zip(df['domain'], df['rank']))
                # List for similarity search
                self.domains_list = df['domain'].tolist()
                self.loaded = True
            except Exception as e:
                print(f"Error loading Tranco dataset: {e}")
                
    def get_tranco_info(self, raw_domain, similarity_threshold=0.62):
        if not self.loaded:
            return {
                "tranco_match": False,
                "match_type": "ERROR",
                "matched_domain": None,
                "similarity": None,
                "rank": None
            }
            
        # Parse the input domain
        ext = tldextract.extract(raw_domain)
        
        # registered_domain is like 'google.com'
        registered_domain = ext.registered_domain
        
        # Exact match of the registered domain
        if registered_domain in self.domains_dict:
            # Check if it was an exact match of the provided input, or a subdomain
            # Reconstruct the cleaned input domain
            cleaned_input = raw_domain.lower().replace('https://', '').replace('http://', '').strip('/')
            
            # If the user typed 'accounts.google.com', cleaned_input='accounts.google.com'
            if cleaned_input == registered_domain or cleaned_input.startswith("www." + registered_domain):
                return {
                    "tranco_match": True,
                    "match_type": "EXACT",
                    "matched_domain": registered_domain,
                    "similarity": 1.0,
                    "rank": self.domains_dict[registered_domain]
                }
            else:
                # It's a subdomain of a Tranco domain
                return {
                    "tranco_match": True,
                    "match_type": "SUBDOMAIN",
                    "matched_domain": registered_domain,
                    "similarity": 1.0,
                    "rank": self.domains_dict[registered_domain]
                }
                
        # For similarity search, we use the entire domain part (without TLD).
        # We don't tokenize because Tranco has millions of domains (like random.re) 
        # and tokenizing would incorrectly match 'random-example' to 'random.re'.
        main_token = ext.domain
        
        # To avoid matching obscure domains and for performance, we restrict similarity search
        # to the top 100,000 domains in Tranco.
        top_n = 100000
        search_list = self.domains_list[:top_n]
        
        # Extract top 50 matches using rapidfuzz
        candidates = process.extract(main_token, search_list, scorer=fuzz.QRatio, limit=50)
        
        best_match = None
        best_score = -1
        best_rank = float('inf')
        
        for cand_domain, fuzz_score, _ in candidates:
            cand_ext = tldextract.extract(cand_domain)
            cand_token = cand_ext.domain
            cand_rank = self.domains_dict.get(cand_domain, float('inf'))
            
            # Re-score with our rigorous multi-metric similarity algorithm
            score = compute_similarity(main_token, cand_token)
            
            # Use score as primary, and rank as secondary tie-breaker
            if score > best_score or (score == best_score and cand_rank < best_rank):
                best_score = score
                best_match = cand_domain
                best_rank = cand_rank
                
        if best_match and best_score >= similarity_threshold:
            return {
                "tranco_match": True,
                "match_type": "SIMILAR",
                "matched_domain": best_match,
                "similarity": best_score,
                "rank": self.domains_dict.get(best_match)
            }
            
        return {
            "tranco_match": False,
            "match_type": "NONE",
            "matched_domain": None,
            "similarity": None,
            "rank": None
        }
