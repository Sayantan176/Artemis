import unittest
from brand_matcher import BrandMatcher

class TestBrandMatcher(unittest.TestCase):
    def setUp(self):
        self.matcher = BrandMatcher(threshold=0.62)
        # Using a small explicit dictionary for testing
        self.matcher.known_brands = {
            'paypal': 'paypal.com',
            'apple': 'apple.com',
            'microsoft': 'microsoft.com',
            'amazon': 'amazon.com',
            'google': 'google.com'
        }

    def test_strong_matches(self):
        cases = {
            'paypall.com': 'paypal',
            'paypa1.com': 'paypal',
            'payapl.com': 'paypal',
            'paypal-login.com': 'paypal',
            'paypal-security.com': 'paypal',
            'micr0soft.com': 'microsoft',
            'microsft.com': 'microsoft',
            'microsoft-login.com': 'microsoft',
            'amaz0n.com': 'amazon',
            'arnazon.com': 'amazon',
            'amazon-support.com': 'amazon',
            'g00gle.com': 'google',
            'googlle.com': 'google',
            'google-security.com': 'google'
        }
        
        for domain, expected_brand in cases.items():
            with self.subTest(domain=domain):
                brand, score, _ = self.matcher.find_best_match(domain)
                self.assertEqual(brand, expected_brand, f"Failed for {domain}. Expected {expected_brand}, got {brand} with score {score}")
                self.assertTrue(score >= 0.62, f"Score {score} too low for {domain}")

    def test_unrelated_domains(self):
        cases = [
            'random-example-8472.com',
            'completelyunrelateddomain.com',
            'cloud-storage-example.com',
            'apple-music-fan.com' # 'apple' might be a match if it wasn't split, wait "apple" is in known brands!
        ]
        
        for domain in cases:
            if domain == 'apple-music-fan.com': 
                # This should match apple since 'apple' is a token! 
                continue
                
            with self.subTest(domain=domain):
                brand, score, _ = self.matcher.find_best_match(domain)
                self.assertIsNone(brand, f"Unrelated domain {domain} incorrectly matched {brand} with score {score}")

if __name__ == '__main__':
    unittest.main()
