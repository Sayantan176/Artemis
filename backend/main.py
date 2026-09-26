import os
import joblib
import pandas as pd
import requests
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
from dotenv import load_dotenv

import sklearn.utils.validation
if not hasattr(sklearn.utils.validation, '_is_pandas_df'):
    sklearn.utils.validation._is_pandas_df = lambda X: hasattr(X, "iloc") and hasattr(X, "columns")

load_dotenv()
origin_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "origin-traceability", ".env")
if os.path.exists(origin_env_path):
    load_dotenv(origin_env_path)

# Ensure absolute backend path is prioritized so src imports resolve correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Add ImageX to path
IMAGEX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ImageX-main")
sys.path.insert(0, os.path.abspath(IMAGEX_DIR))

# Add Origin Traceability to path
ORIGIN_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "origin-traceability")
sys.path.insert(0, os.path.abspath(ORIGIN_DIR))

# Add Lookalike Model to path
LOOKALIKE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lookalike_model", "src")
sys.path.insert(0, os.path.abspath(LOOKALIKE_DIR))


from src.url_features import extract_features
from src.email_features import extract_email_metadata
from src.sms_features import extract_sms_metadata
from src.predict_image import predict_image
from sklearn.base import BaseEstimator, TransformerMixin
import re
import string

class CleanTextTransformer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X, y=None):
        import pandas as pd
        if isinstance(X, pd.DataFrame):
            X = X.iloc[:, 0]
        if hasattr(X, 'apply'):
            return X.apply(self._clean)
        elif isinstance(X, list):
            return [self._clean(t) for t in X]
        else:
            return [self._clean(X)]
            
    def _clean(self, text):
        if not isinstance(text, str):
            text = str(text)
        text = text.lower()
        text = re.sub(r'\d+', '', text)
        text = text.translate(str.maketrans('', '', string.punctuation))
        text = text.strip()
        return text

from contextlib import asynccontextmanager
import geoip2.database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load MaxMind DBs on startup
    city_db_path = os.path.join(ORIGIN_DIR, "GeoLite2-City.mmdb")
    asn_db_path = os.path.join(ORIGIN_DIR, "GeoLite2-ASN.mmdb")
    
    city_db = None
    asn_db = None
    if os.path.exists(city_db_path):
        city_db = geoip2.database.Reader(city_db_path)
    if os.path.exists(asn_db_path):
        asn_db = geoip2.database.Reader(asn_db_path)
        
    # Initialize Enricher and Service
    from enrichers import NetworkEnricher
    from orchestrator import OriginTraceabilityService
    enricher = NetworkEnricher(redis_client=None, geoip_city_db=city_db, geoip_asn_db=asn_db)
    app.state.origin_service = OriginTraceabilityService(enricher=enricher)
    
    yield
    
    # Clean up DBs on shutdown
    if city_db:
        city_db.close()
    if asn_db:
        asn_db.close()

app = FastAPI(title="Artemis ML API", lifespan=lifespan)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models (Global state to avoid loading on every request)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

try:
    url_model = joblib.load(os.path.join(MODELS_DIR, 'phishshield_url_model.pkl'))
except Exception as e:
    print(f"Warning: Failed to load URL model - {e}")
    url_model = None

try:
    email_model = joblib.load(os.path.join(MODELS_DIR, 'email_spam_model.pkl'))
except Exception as e:
    print(f"Warning: Failed to load Email model - {e}")
    email_model = None

try:
    sms_model = joblib.load(os.path.join(MODELS_DIR, 'sms_spam_model.pkl'))
except Exception as e:
    print(f"Warning: Failed to load SMS model - {e}")
    sms_model = None


# Request Models
class URLRequest(BaseModel):
    url: str

class EmailRequest(BaseModel):
    text: str
    scan_urls: bool = False

class TextRequest(BaseModel):
    text: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

@app.post("/api/scan/url")
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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan/email")
async def scan_email(request: EmailRequest):
    from src.predict_email import predict_email
    try:
        response = predict_email(request.text, evaluate_urls=request.scan_urls)
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
        
        prediction = response["status"]
        class_probabilities = response["class_probabilities"]
        
        risk_level = "low"
        if prediction in ["phishing", "spam", "scam"]:
            risk_level = "high" if class_probabilities.get(prediction, 0) > 85 else "medium"
        elif prediction == "promotional":
            risk_level = "low"
            
        final_response = {
            "status": prediction,
            "risk": risk_level,
            "confidence": max(class_probabilities.values()) if class_probabilities else 0,
            "class_probabilities": class_probabilities,
            **{k: v for k, v in response.items() if k not in ["status", "class_probabilities"]}
        }
        if "security_alert" in response:
            final_response["security_alert"] = response["security_alert"]
            
        return final_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan/message")
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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan/image")
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
                pass

@app.post("/api/scan/origin-trace")
async def scan_origin_trace(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    try:
        # Read file contents safely
        content_bytes = await file.read()
        raw_email = content_bytes.decode('utf-8', errors='replace')
        email_id = file.filename or "uploaded_email.eml"
        
        # Get the initialized service from app state
        service = app.state.origin_service
        
        # Build the origin profile
        profile = service.build_origin_profile(email_id=email_id, raw_email=raw_email)
        
        # Return as JSON
        return profile.model_dump()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

imagex_predictor = None

@app.post("/api/scan/imagex")
async def scan_imagex(file: UploadFile = File(...)):
    global imagex_predictor
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    upload_dir = os.path.join(BASE_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        if imagex_predictor is None:
            # Lazy load the predictor to save startup time and memory
            from phish_shield import PhishingPredictor
            imagex_predictor = PhishingPredictor()
            
        result = imagex_predictor.predict_screenshot(file_path)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

@app.post("/api/scan/mulex")
async def scan_mulex(request: dict):
    from src.predict_mulex import predict_mulex
    try:
        return predict_mulex(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat_with_bot(request: ChatRequest):
    # Fallback to the provided key if env isn't reloaded yet
    api_key = os.getenv("GROQ_API_KEY", "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")

    system_prompt = {
        "role": "system",
        "content": """You are the Artemis AI Security Assistant. Artemis is an advanced, multi-layered cybersecurity platform that analyzes digital artifacts for phishing, malware, and social engineering threats using Machine Learning.

Here is the full context of the Artemis platform and its available pages/tools:
1. Dashboard (/dashboard): The main hub displaying threat intelligence, recent scans, and global cybersecurity news.
2. Email Analyzer (/email): A forensic email analysis engine. Extracts headers and uses dual-engine ML to scan emails for phishing patterns. It provides mathematical telemetry, Explainable AI insights, and adversarial metric breakdowns.
3. URL Scanner (/url): Detects malicious URLs using a custom ML threat engine. Provides Softmax probabilities, step-by-step risk evaluation, and identifies credential harvesting domains.
4. ImageXScanner (/imagex): Analyzes images using steganography detection to find hidden payloads, malicious scripts, and embedded malware within media files.
5. Message Scanner (/sms): Evaluates SMS/text messages specifically for smishing (SMS phishing) threats and urgent social engineering tactics.
6. MulexScanner (/mulex): A multi-layered malware extraction tool that performs deep analysis on suspicious files and execution flows.
7. Lookalike Scanner (/lookalike): A Domain Lookalike Engine that uses ML to detect homoglyphs, typosquatting, and brand impersonation domains designed to deceive users.
8. Origin Traceability (/trace): Traces the geographical and network origin of IPs and domains using interactive Carto basemaps, WHOIS data, and IP geolocation tracking.
9. Abuse Report (/abuse-report): Integrates directly with the AbuseIPDB API, allowing users to report malicious IP addresses directly to global threat intelligence databases.
10. Report Crime (/report): Provides resources and guidance for reporting severe cybercrimes to appropriate authorities.

Your job is to assist users in navigating this platform, interpreting the highly technical telemetry (like Softmax normalizations, SVM margins, and TF-IDF models), and providing expert cybersecurity advice. Be highly knowledgeable, professional, and clear."""
    }
    
    api_messages = [system_prompt] + [{"role": msg.role, "content": msg.content} for msg in request.messages]

    try:
        response = requests.post(
            url="https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openai/gpt-oss-20b",
                "messages": api_messages,
            }
        )
        
        response.raise_for_status()
        data = response.json()
        return {"reply": data["choices"][0]["message"]["content"]}
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        if e.response is not None:
            try:
                error_data = e.response.json()
                error_msg = error_data.get("error", {}).get("message", error_msg)
            except:
                pass
        print(f"Chat API Error: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Groq API Error: {error_msg}")
    except Exception as e:
        print(f"Chat API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan/mulex/extract-case-study")
async def extract_mulex_case_study(request: TextRequest):
    import json
    import os
    from groq import Groq
    from fastapi import HTTPException
    
    api_key = os.getenv("GROQ_API_KEY", "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")
    if not api_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
        
    try:
        client = Groq(api_key=api_key)
        
        system_prompt = """You are a precise data extraction assistant. Your task is to extract specific features from the provided case study paragraph and return ONLY a valid JSON object. 
Do not include markdown blocks, explanations, or text outside the JSON object. 
The JSON object must contain exactly these keys with appropriate types:
- income (float)
- name_email_similarity (float)
- prev_address_months_count (integer)
- current_address_months_count (integer)
- customer_age (integer)
- days_since_request (float)
- intended_balcon_amount (float)
- payment_type (string)
- zip_count_4w (integer)
- velocity_6h (float)
- velocity_24h (float)
- velocity_4w (float)
- bank_branch_count (integer)
- date_of_birth_distinct_emails_4w (integer)
- employment_status (string)
- credit_risk_score (integer)
- email_is_free (integer: 1 or 0)
- housing_status (string)
- phone_home_valid (integer: 1 or 0)
- phone_mobile_valid (integer: 1 or 0)
- bank_months_count (integer)
- has_other_cards (integer: 1 or 0)
- proposed_credit_limit (float)
- foreign_request (integer: 1 or 0)
- source (string)
- session_length_in_minutes (float)
- device_os (string)
- keep_alive_session (integer: 1 or 0)
- device_distinct_emails_8w (integer)
- device_fraud_count (integer)
- month (integer)
- application_id (string)

If a value is not explicitly mentioned, provide a reasonable default (e.g., 0 for counts, -1 for missing numeric flags, "UNKNOWN" for strings)."""

        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.text}
            ],
            temperature=0.1,
            max_completion_tokens=2048,
            top_p=1,
            stream=False,
            stop=None
        )
        
        response_text = completion.choices[0].message.content
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        parsed_json = json.loads(response_text.strip())
        return parsed_json
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan/lookalike")
async def scan_lookalike(request: URLRequest):
    try:
        from predict import predict_domain
        import urllib.parse
        
        # Extract just the domain if a full URL was provided
        domain = request.url
        if "://" in domain:
            domain = urllib.parse.urlparse(domain).netloc
            
        model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lookalike_model", "models", "lookalike_domain_model.joblib")
        result = predict_domain(domain, model_path=model_path)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class AbuseReportRequest(BaseModel):
    ip: str
    categories: list[int]
    comment: str
    timestamp: str | None = None

@app.post("/api/abuseipdb/report")
async def report_abuseipdb(request: AbuseReportRequest):
    api_key = os.getenv("ABUSEIPDB_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AbuseIPDB API key not configured")
        
    url = "https://api.abuseipdb.com/api/v2/report"
    headers = {
        "Key": api_key,
        "Accept": "application/json"
    }
    
    data = {
        "ip": request.ip,
        "categories": ",".join(map(str, request.categories)),
        "comment": request.comment
    }
    if request.timestamp:
        data["timestamp"] = request.timestamp

    try:
        response = requests.post(url, headers=headers, data=data)
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit reached. Please try again later.")
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API credentials.")
        elif not response.ok:
            error_msg = "The AbuseIPDB API rejected the request."
            try:
                err_data = response.json()
                if "errors" in err_data and len(err_data["errors"]) > 0:
                    error_msg = err_data["errors"][0].get("detail", error_msg)
            except:
                pass
            raise HTTPException(status_code=response.status_code, detail=error_msg)
            
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail="Network failure connecting to AbuseIPDB.")

@app.get("/api/abuseipdb/check")
async def check_abuseipdb(ip: str):
    api_key = os.getenv("ABUSEIPDB_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AbuseIPDB API key not configured")
        
    url = "https://api.abuseipdb.com/api/v2/check"
    headers = {
        "Key": api_key,
        "Accept": "application/json"
    }
    params = {
        "ipAddress": ip,
        "maxAgeInDays": 90,
        "verbose": True
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit reached. Please try again later.")
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API credentials.")
        elif not response.ok:
            raise HTTPException(status_code=response.status_code, detail="The AbuseIPDB API rejected the request.")
            
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail="Network failure connecting to AbuseIPDB.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
