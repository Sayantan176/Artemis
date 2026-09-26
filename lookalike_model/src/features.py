import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib

def get_feature_pipeline(use_char_tfidf=False):
    """
    Constructs the feature extraction pipeline.
    """
    numeric_features = [
        'domain_length', 'subdomain_count', 'digit_count', 'letter_count',
        'hyphen_count', 'dot_count', 'special_character_count',
        'digit_letter_ratio', 'hyphen_ratio', 'vowel_count', 'consonant_count',
        'entropy', 'has_https_keyword', 'has_login_keyword', 'has_security_keyword',
        'has_payment_keyword', 'has_ip_address', 'tld_length', 'levenshtein_distance',
        'normalized_levenshtein', 'jaro_winkler_similarity', 'character_ngram_similarity',
        'prefix_similarity', 'suffix_similarity', 'length_difference',
        'contains_unicode', 'contains_homoglyph', 'is_punycode'
    ]
    
    categorical_features = ['tld']
    
    numeric_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(handle_unknown='ignore', max_categories=50))
    ])
    
    transformers = [
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ]
    
    if use_char_tfidf:
        text_transformer = Pipeline(steps=[
            ('tfidf', TfidfVectorizer(analyzer='char', ngram_range=(2, 5), min_df=2))
        ])
        # We need to process a specific text column. 
        # ColumnTransformer can apply a transformer to a 1D text column (pass column name as string).
        transformers.append(('text', text_transformer, 'generated_domain'))
        
    preprocessor = ColumnTransformer(transformers=transformers, remainder='drop')
    return preprocessor

def get_train_data(data_path="data/train.csv"):
    df = pd.read_csv(data_path)
    X = df.drop(columns=['label'])
    y = df['label']
    return X, y, df

def get_val_data(data_path="data/validation.csv"):
    df = pd.read_csv(data_path)
    X = df.drop(columns=['label'])
    y = df['label']
    return X, y, df

def get_test_data(data_path="data/test.csv"):
    df = pd.read_csv(data_path)
    X = df.drop(columns=['label'])
    y = df['label']
    return X, y, df
