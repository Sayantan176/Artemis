import pandas as pd
import numpy as np
import os

def inspect_dataset():
    data_dir = "data"
    
    print("--- Loading datasets ---")
    df_train = pd.read_csv(os.path.join(data_dir, "train.csv"))
    df_val = pd.read_csv(os.path.join(data_dir, "validation.csv"))
    df_test = pd.read_csv(os.path.join(data_dir, "test.csv"))
    
    print(f"Train shape: {df_train.shape}")
    print(f"Validation shape: {df_val.shape}")
    print(f"Test shape: {df_test.shape}")
    
    print("\n--- Column Types ---")
    print(df_train.dtypes)
    
    print("\n--- Missing Values ---")
    print("Train:", df_train.isnull().sum().sum())
    print("Validation:", df_val.isnull().sum().sum())
    print("Test:", df_test.isnull().sum().sum())
    
    print("\n--- Class Distribution ---")
    print("Train Label:\n", df_train['label'].value_counts(normalize=True))
    print("Validation Label:\n", df_val['label'].value_counts(normalize=True))
    print("Test Label:\n", df_test['label'].value_counts(normalize=True))
    
    print("\n--- Unique Brands ---")
    train_brands = set(df_train['brand'].dropna().unique())
    val_brands = set(df_val['brand'].dropna().unique())
    test_brands = set(df_test['brand'].dropna().unique())
    print(f"Train brands: {len(train_brands)}")
    print(f"Validation brands: {len(val_brands)}")
    print(f"Test brands: {len(test_brands)}")
    
    print("\n--- Leakage Check ---")
    print(f"Brand overlap (Train & Val): {len(train_brands.intersection(val_brands))}")
    print(f"Brand overlap (Train & Test): {len(train_brands.intersection(test_brands))}")
    print(f"Brand overlap (Val & Test): {len(val_brands.intersection(test_brands))}")
    
    train_domains = set(df_train['generated_domain'].unique())
    val_domains = set(df_val['generated_domain'].unique())
    test_domains = set(df_test['generated_domain'].unique())
    
    print(f"Domain overlap (Train & Val): {len(train_domains.intersection(val_domains))}")
    print(f"Domain overlap (Train & Test): {len(train_domains.intersection(test_domains))}")
    print(f"Domain overlap (Val & Test): {len(val_domains.intersection(test_domains))}")
    
    print("\n--- Attack Type Distribution ---")
    print(df_train['attack_type'].value_counts())
    
if __name__ == "__main__":
    inspect_dataset()
