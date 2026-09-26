import re

with open("main.py", "r", encoding="utf-8") as f:
    content = f.read()

new_scan_image = """@app.post("/api/scan/image")
async def scan_image(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    upload_dir = os.path.join(BASE_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            import shutil
            shutil.copyfileobj(file.file, buffer)
        
        # Run prediction
        from src.predict_image import predict_image
        report = predict_image(file_path)
        
        # Map verdict to standard UI format (high/medium/low risk)
        verdict = report.get("verdict", "ERROR")
        risk_level = "safe"
        if verdict == "MALICIOUS":
            risk_level = "high"
        elif verdict == "ERROR":
            risk_level = "low"
            
        return {
            "status": report.get("threat_type", "error"),
            "risk": risk_level,
            "confidence": report.get("confidence", 0.0) * 100,
            "alerts": report.get("alerts", []),
            "features": report.get("features", {}),
            "qr_analysis": report.get("qr_analysis"),
            "text_analysis": report.get("text_analysis"),
            "malicious_probability": report.get("malicious_probability", 0.0)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up file after analysis
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass"""

content = re.sub(
    r'@app\.post\("/api/scan/image"\)\s*\nasync def scan_image\(file: UploadFile = File\(\.\.\.\)\):.*?(?=@app\.post\("/api/scan/mulex"\))',
    new_scan_image + "\n\n",
    content,
    flags=re.DOTALL
)

with open("main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated image route successfully!")
