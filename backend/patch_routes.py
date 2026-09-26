import re

with open("main.py", "r", encoding="utf-8") as f:
    content = f.read()

new_scan_url = """@app.post("/api/scan/url")
async def scan_url(request: URLRequest):
    from src.predict_url import predict_url
    from src.url_features import extract_features
    try:
        response = predict_url(request.url)
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
            
        prediction = response["status"]
        class_probabilities = response["class_probabilities"]
        
        risk_level = "low"
        if prediction != "benign":
            if class_probabilities.get(prediction, 0) > 85:
                risk_level = "high"
            else:
                risk_level = "medium"
                
        features = extract_features(request.url)
        domain = features.get("hostname", "Unknown")
        
        final_response = {
            "status": prediction,
            "risk": risk_level,
            "confidence": max(class_probabilities.values()) if class_probabilities else 0,
            "class_probabilities": class_probabilities,
            "domain": domain,
            "analysis_summary": response.get("analysis_summary", {}),
            "mathematical_breakdown": response.get("mathematical_breakdown", {})
        }
        return final_response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))"""

new_scan_message = """@app.post("/api/scan/message")
async def scan_message(request: TextRequest):
    from src.predict_sms import predict_sms
    try:
        response = predict_sms(request.text)
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
            
        prediction = response["status"]
        class_probabilities = response["class_probabilities"]
        
        risk_level = "low"
        if prediction in ["spam", "smishing"]:
            risk_level = "high" if class_probabilities.get(prediction, 0) > 80 else "medium"
        else:
            risk_level = "low"
            
        final_response = {
            "status": prediction,
            "risk": risk_level,
            "confidence": max(class_probabilities.values()) if class_probabilities else 0,
            "class_probabilities": class_probabilities,
            "analysis_summary": response.get("analysis_summary", {}),
            "mathematical_breakdown": response.get("mathematical_breakdown", {})
        }
        return final_response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))"""

# Replace scan_url
content = re.sub(
    r'@app\.post\("/api/scan/url"\)\s*\nasync def scan_url\(request: URLRequest\):.*?(?=@app\.post\("/api/scan/email"\))',
    new_scan_url + "\n\n",
    content,
    flags=re.DOTALL
)

# Replace scan_message
content = re.sub(
    r'@app\.post\("/api/scan/message"\)\s*\nasync def scan_message\(request: TextRequest\):.*?(?=@app\.post\("/api/scan/image"\))',
    new_scan_message + "\n\n",
    content,
    flags=re.DOTALL
)

with open("main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated main.py routes successfully!")
