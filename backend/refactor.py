import re

# Refactor predict_url.py
with open("src/predict_url.py", "r", encoding="utf-8") as f:
    url_content = f.read()

# Replace main() with predict_url(url)
url_content = re.sub(
    r'def main\(\):[\s\S]*?args = parser\.parse_args\(\)',
    'def predict_url(url):',
    url_content
)
# Replace args.url with url
url_content = url_content.replace('args.url', 'url')
# Replace print(json.dumps(response, indent=2)) with return response
url_content = url_content.replace('print(json.dumps(response, indent=2))', 'return response')
# Replace print(json.dumps({"error"... with return {"error"...
url_content = re.sub(
    r'print\(json\.dumps\(\{"error": f"(.*?)"\}\)\)\n\s*return',
    r'return {"error": f"\1"}',
    url_content
)

with open("src/predict_url.py", "w", encoding="utf-8") as f:
    f.write(url_content)

# Refactor predict_sms.py
with open("src/predict_sms.py", "r", encoding="utf-8") as f:
    sms_content = f.read()

sms_content = re.sub(
    r'def main\(\):[\s\S]*?args = parser\.parse_args\(\)',
    'def predict_sms(text):',
    sms_content
)
sms_content = sms_content.replace('args.text', 'text')
sms_content = sms_content.replace('print(json.dumps(response, indent=2))', 'return response')
sms_content = re.sub(
    r'print\(json\.dumps\(\{"error": f"(.*?)"\}\)\)\n\s*return',
    r'return {"error": f"\1"}',
    sms_content
)

with open("src/predict_sms.py", "w", encoding="utf-8") as f:
    f.write(sms_content)

print("Refactored prediction scripts successfully!")
