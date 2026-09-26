import pandas as pd
import numpy as np

# Columns needed based on the payload test cases
columns = [
    "income", "name_email_similarity", "prev_address_months_count",
    "current_address_months_count", "customer_age", "days_since_request",
    "intended_balcon_amount", "payment_type", "zip_count_4w",
    "velocity_6h", "velocity_24h", "velocity_4w", "bank_branch_count",
    "date_of_birth_distinct_emails_4w", "employment_status", "credit_risk_score",
    "email_is_free", "housing_status", "phone_home_valid", "phone_mobile_valid",
    "bank_months_count", "has_other_cards", "proposed_credit_limit",
    "foreign_request", "source", "session_length_in_minutes", "device_os",
    "keep_alive_session", "device_distinct_emails_8w", "device_fraud_count",
    "month", "application_id", "fraud_bool"
]

data = []
# Create 100 random rows
for i in range(100):
    row = {
        "income": np.random.uniform(0, 1),
        "name_email_similarity": np.random.uniform(0, 1),
        "prev_address_months_count": np.random.choice([-1, 12, 24]),
        "current_address_months_count": np.random.choice([-1, 12, 24]),
        "customer_age": np.random.randint(18, 80),
        "days_since_request": np.random.uniform(0, 1),
        "intended_balcon_amount": np.random.choice([-1, 50, 100]),
        "payment_type": np.random.choice(["AA", "AB", "AC", "AD", "AE"]),
        "zip_count_4w": np.random.randint(0, 10000),
        "velocity_6h": np.random.uniform(0, 10000),
        "velocity_24h": np.random.uniform(0, 10000),
        "velocity_4w": np.random.uniform(0, 10000),
        "bank_branch_count": np.random.randint(0, 100),
        "date_of_birth_distinct_emails_4w": np.random.randint(0, 30),
        "employment_status": np.random.choice(["CA", "CB", "CC", "CD", "CE", "CF", "CG"]),
        "credit_risk_score": np.random.randint(0, 500),
        "email_is_free": np.random.choice([0, 1]),
        "housing_status": np.random.choice(["BA", "BB", "BC", "BD", "BE", "BF", "BG"]),
        "phone_home_valid": np.random.choice([0, 1]),
        "phone_mobile_valid": np.random.choice([0, 1]),
        "bank_months_count": np.random.choice([-1, 12, 24]),
        "has_other_cards": np.random.choice([0, 1]),
        "proposed_credit_limit": np.random.uniform(200, 10000),
        "foreign_request": np.random.choice([0, 1]),
        "source": np.random.choice(["INTERNET", "TELEPHONE"]),
        "session_length_in_minutes": np.random.uniform(0, 30),
        "device_os": np.random.choice(["windows", "macintosh", "linux", "other", "x11"]),
        "keep_alive_session": np.random.choice([0, 1]),
        "device_distinct_emails_8w": np.random.randint(0, 20),
        "device_fraud_count": np.random.randint(0, 10),
        "month": np.random.choice([1, 2, 3, 4, 5, 6, 7]),
        "application_id": f"APP-{i}",
        "fraud_bool": np.random.choice([0, 1], p=[0.9, 0.1])
    }
    data.append(row)

df = pd.DataFrame(data)
df.to_csv("synthetic_data.csv", index=False)
print("Synthetic data generated.")
