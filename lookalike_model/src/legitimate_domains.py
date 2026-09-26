import os
import pandas as pd
import tldextract
from rapidfuzz import process, fuzz
from brand_matcher import compute_similarity

class BaseDomainDatabase:
    """Base class for legitimate domain databases like Tranco or Majestic."""
    
    def __init__(self, name, csv_path, rank_col, domain_col, has_header=True):
        self.name = name
        self.csv_path = csv_path
        self.rank_col = rank_col
        self.domain_col = domain_col
        self.has_header = has_header
        
        self.domains_dict = {}
        self.domains_list = []
        self.loaded = False
        
    def load(self):
        if not os.path.exists(self.csv_path):
            print(f"Warning: {self.name} dataset not found at {self.csv_path}")
            return
            
        try:
            if self.has_header:
                df = pd.read_csv(self.csv_path)
            else:
                df = pd.read_csv(self.csv_path, header=None)
                # Map integer column indices if provided as ints
                if isinstance(self.rank_col, int):
                    df = df.rename(columns={self.rank_col: 'rank', self.domain_col: 'domain'})
                    self.rank_col = 'rank'
                    self.domain_col = 'domain'
                    
            df = df.dropna(subset=[self.domain_col])
            df[self.domain_col] = df[self.domain_col].astype(str).str.lower().str.strip()
            
            # Use specific cols
            self.domains_dict = dict(zip(df[self.domain_col], df[self.rank_col]))
            self.domains_list = df[self.domain_col].tolist()
            self.loaded = True
        except Exception as e:
            print(f"Error loading {self.name} dataset: {e}")
            
    def get_info(self, raw_domain, similarity_threshold=0.62):
        if not self.loaded:
            return {
                "match_type": "ERROR",
                "matched_domain": None,
                "similarity": None,
                "rank": None
            }
            
        ext = tldextract.extract(raw_domain)
        registered_domain = ext.registered_domain
        
        # 1. Exact Match Check
        if registered_domain in self.domains_dict:
            cleaned_input = raw_domain.lower().replace('https://', '').replace('http://', '').strip('/')
            if cleaned_input == registered_domain or cleaned_input.startswith("www." + registered_domain):
                return {
                    "match_type": "EXACT",
                    "matched_domain": registered_domain,
                    "similarity": 1.0,
                    "rank": self.domains_dict[registered_domain]
                }
            else:
                return {
                    "match_type": "SUBDOMAIN",
                    "matched_domain": registered_domain,
                    "similarity": 1.0,
                    "rank": self.domains_dict[registered_domain]
                }
                
        # 2. Similarity Search
        main_token = ext.domain
        
        # Restrict to top 100,000 domains for performance and to avoid obscure matches
        top_n = 100000
        search_list = self.domains_list[:top_n]
        
        candidates = process.extract(main_token, search_list, scorer=fuzz.QRatio, limit=50)
        
        best_match = None
        best_score = -1
        best_rank = float('inf')
        
        for cand_domain, fuzz_score, _ in candidates:
            cand_ext = tldextract.extract(cand_domain)
            cand_token = cand_ext.domain
            cand_rank = self.domains_dict.get(cand_domain, float('inf'))
            
            score = compute_similarity(main_token, cand_token)
            if score > best_score or (score == best_score and cand_rank < best_rank):
                best_score = score
                best_match = cand_domain
                best_rank = cand_rank
                
        if best_match and best_score >= similarity_threshold:
            return {
                "match_type": "SIMILAR",
                "matched_domain": best_match,
                "similarity": best_score,
                "rank": self.domains_dict.get(best_match)
            }
            
        return {
            "match_type": "NONE",
            "matched_domain": None,
            "similarity": None,
            "rank": None
        }

class DomainIntelligenceEngine:
    """Orchestrator for all legitimate domain datasets."""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DomainIntelligenceEngine, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
        
    def _initialize(self):
        import os
        DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        
        # Initialize Tranco
        self.tranco = BaseDomainDatabase(
            name="Tranco",
            csv_path=os.path.join(DATA_DIR, 'tranco_Y8YYG.csv'),
            rank_col=0,
            domain_col=1,
            has_header=False
        )
        self.tranco.load()
        
        # Initialize Majestic
        self.majestic = BaseDomainDatabase(
            name="Majestic",
            csv_path=os.path.join(DATA_DIR, 'majestic_million.csv'),
            rank_col='GlobalRank',
            domain_col='Domain',
            has_header=True
        )
        self.majestic.load()
        
        # Initialize Cisco Umbrella
        self.cisco = BaseDomainDatabase(
            name="Cisco Umbrella",
            csv_path=os.path.join(DATA_DIR, 'cisco_umbrella.csv'),
            rank_col=0,
            domain_col=1,
            has_header=False
        )
        self.cisco.load()
        
    def analyze_domain(self, domain):
        tranco_res = self.tranco.get_info(domain)
        majestic_res = self.majestic.get_info(domain)
        cisco_res = self.cisco.get_info(domain)
        
        # Determine cross-source agreement
        domains_found = []
        for res in [tranco_res, majestic_res, cisco_res]:
            if res['match_type'] != 'NONE' and res['matched_domain']:
                domains_found.append(res['matched_domain'])
                
        agreement = "NO"
        if domains_found:
            from collections import Counter
            counts = Counter(domains_found)
            most_common_domain, max_count = counts.most_common(1)[0]
            if max_count > 1:
                agreement = f"{max_count} / 3"
                
        return {
            "tranco": tranco_res,
            "majestic": majestic_res,
            "cisco": cisco_res,
            "agreement": agreement,
            "agreed_domain": most_common_domain if agreement != "NO" else None
        }
