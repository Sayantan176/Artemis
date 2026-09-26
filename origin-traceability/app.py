import os
import glob
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import geoip2.database
from dotenv import load_dotenv

from enrichers import NetworkEnricher
from orchestrator import OriginTraceabilityService

load_dotenv()

# Global state for service and DB readers
city_reader = None
asn_reader = None
service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global city_reader, asn_reader, service
    try:
        city_path = "GeoLite2-City.mmdb"
        asn_path = "GeoLite2-ASN.mmdb"
        
        if os.path.exists(city_path):
            city_reader = geoip2.database.Reader(city_path)
        if os.path.exists(asn_path):
            asn_reader = geoip2.database.Reader(asn_path)
            
        enricher = NetworkEnricher(geoip_city_db=city_reader, geoip_asn_db=asn_reader)
        service = OriginTraceabilityService(enricher=enricher)
        print("Backend Services Initialized Successfully.")
        yield
    finally:
        if city_reader:
            city_reader.close()
        if asn_reader:
            asn_reader.close()
        print("Backend Services Shutdown Gracefully.")

app = FastAPI(title="Origin Traceability API", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return FileResponse("templates/index.html")

@app.post("/api/analyze")
async def analyze_email(file: UploadFile = File(...)):
    if not file.filename.endswith(".eml"):
        raise HTTPException(status_code=400, detail="Only .eml files are supported.")
    
    try:
        content_bytes = await file.read()
        raw_email = content_bytes.decode('utf-8', errors='replace')
        
        # Build profile
        profile = service.build_origin_profile(email_id=file.filename, raw_email=raw_email)
        
        # Convert to model_dump to ensure datetime serialization natively by FastAPI
        return JSONResponse(content=profile.model_dump(mode='json'))
    except Exception as e:
        print(f"Error analyzing email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/samples")
async def get_samples():
    eml_files = glob.glob("*.eml")
    return {"samples": eml_files}

@app.post("/api/analyze-sample/{filename}")
async def analyze_sample(filename: str):
    if not filename.endswith(".eml"):
        raise HTTPException(status_code=400, detail="Invalid filename.")
    
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail="Sample not found.")
        
    try:
        with open(filename, "r", encoding="utf-8", errors="replace") as f:
            raw_email = f.read()
            
        profile = service.build_origin_profile(email_id=filename, raw_email=raw_email)
        return JSONResponse(content=profile.model_dump(mode='json'))
    except Exception as e:
        print(f"Error analyzing sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
