# 🛡️ Artemis
**Advanced Multi-Layered Cybersecurity & Threat Intelligence Platform**

Artemis is a comprehensive, machine-learning-powered cybersecurity platform designed to analyze digital artifacts, detect phishing, expose malware, and prevent social engineering threats. Built with a robust React frontend and a highly optimized FastAPI/Python backend, Artemis leverages dual-engine Machine Learning pipelines, stacking meta-learners, and real-time threat intelligence to protect users from sophisticated cyber attacks.

---

## 📑 Table of Contents
1. [Platform Overview](#-platform-overview)
2. [Core Features & Scanners](#-core-features--scanners)
3. [System Architecture](#-system-architecture)
4. [Machine Learning Pipeline](#-machine-learning-pipeline)
5. [Installation & Setup](#-installation--setup)
6. [Environment Variables](#-environment-variables)
7. [Running the Application](#-running-the-application)
8. [API Integration](#-api-integration)
9. [Disclaimer](#-disclaimer)

---

## 🔎 Platform Overview
Modern cyber threats utilize evasion techniques, homoglyphs, and steganography to bypass standard static filters. Artemis combats this by using mathematical telemetry, Explainable AI (XAI), and ensemble learning. From forensic email header analysis to tracking the geographical origin of malicious IPs, Artemis serves as a one-stop Security Operations Center (SOC) toolkit.

---

## 🚀 Core Features & Scanners

Artemis provides 10 distinct modules to investigate and neutralize threats:

1. **Dashboard** (`/dashboard`)
   - The central nervous system of Artemis. Displays real-time threat intelligence, aggregate scan data, and global cybersecurity news feeds.
2. **Email Analyzer** (`/email`)
   - Forensic email analysis engine. Extracts headers, normalizes adversarial evasion tactics (e.g., zero-width characters), and utilizes a dual-engine ML framework (Legacy SVM + Modern Engine) to classify phishing attempts.
   - Outputs highly detailed Explainable AI (XAI) insights and token-level risk influence.
3. **URL Scanner** (`/url`)
   - Evaluates links for credential harvesting and malware deployment.
   - Provides Softmax probabilities, raw logit exponentials, and step-by-step risk explanations.
4. **ImageXScanner** (`/imagex`)
   - Advanced steganography detection tool. Scans media files for hidden payloads, malicious scripts, and embedded malware that bypass traditional email filters.
5. **Message Scanner** (`/sms`)
   - Specifically trained to detect Smishing (SMS Phishing) threats, evaluating urgent social engineering tactics and malicious short-links.
6. **MulexScanner** (`/mulex`)
   - A multi-layered fraud and malware extraction tool.
   - Employs a complex Stacking Meta-Learner (LightGBM/XGBoost) and Feature Engineering pipeline (`engineer`, `ensemble`, `calibrator`) to calculate dynamic Risk Scores (0-100) based on behavioral velocity, device farming indicators, and address history.
7. **Lookalike Scanner** (`/lookalike`)
   - Domain Lookalike Engine that uses AI to detect homoglyphs, typosquatting, and brand impersonation domains designed to visually deceive victims.
8. **Origin Traceability** (`/trace`)
   - Geolocation toolkit mapping the network origins of IP addresses and domains using Carto basemaps, WHOIS records, and BGP routing data.
9. **Abuse Report** (`/abuse-report`)
   - Integrated directly with the global **AbuseIPDB API**. Allows users to securely report malicious IP addresses directly to centralized threat intelligence databases.
10. **Global AI Chatbot**
    - An ever-present security assistant (Powered by Groq / `openai/gpt-oss-20b`). Contextually aware of all Artemis platform capabilities and trained to help users interpret complex telemetry (e.g., SVM margins, Softmax normalizations).

---

## 🏗️ System Architecture

**Frontend (Client)**
* **Framework:** React 18 + TypeScript + Vite
* **Styling:** Tailwind CSS, Framer Motion (Animations), Lucide React (Icons)
* **Design Pattern:** Component-based architecture with separated page modules and dynamic dashboards.

**Backend (API)**
* **Framework:** FastAPI (Python)
* **Server:** Uvicorn
* **Data Processing:** Pandas, NumPy
* **Machine Learning:** Scikit-Learn, LightGBM, XGBoost, Joblib
* **LLM Integration:** Groq API (OpenAI compatible) for conversational AI

---

## 🧠 Machine Learning Pipeline

Artemis heavily relies on pre-trained serialized `.joblib` and `.pkl` models located in `backend/models/`. 

### The Mulex Fraud Pipeline (`predict_mulex.py` & `pipeline.py`)
- **DataLoader:** Preprocesses raw JSON payloads, replacing sentinel values (e.g., `-1`) and creating missingness indicators.
- **FraudFeatureEngineer:** Generates risk interaction ratios (e.g., Credit Utilization, Income Velocity) and behavioral aggregations.
- **Ensemble (Stacking Meta-Learner):** Combines tree-based algorithms (like LightGBM) to evaluate raw probabilities.
- **Calibrator:** Calibrates raw logit probabilities into an accurate percentage, which is then mapped piecewise to a `0-100` Dynamic Risk Score.

### Email & URL Threat Engines
- Features TF-IDF vectorization and SVM/Logistic Regression classification.
- Pipeline strips adversarial noise (homoglyph normalization, zero-width space removal) before inference.

---

## ⚙️ Installation & Setup

### Prerequisites
* Node.js (v18+ recommended)
* Python (3.9+ recommended)
* API Keys for Groq and AbuseIPDB

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/PhishX.git
cd PhishX
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The frontend will run on `http://localhost:5173`.*

### 3. Backend Setup
```bash
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
# Activate on Windows: venv\Scripts\activate
# Activate on Mac/Linux: source venv/bin/activate

# Install Python requirements (ensure pandas, scikit-learn, fastapi, uvicorn, requests, joblib, lightgbm are installed)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
*The backend API will run on `http://localhost:8000`.*

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory with the following keys. **Do not expose these to the frontend.**

```env
# Groq API Key for the Global Security Chatbot
GROQ_API_KEY=gsk_your_groq_api_key_here

# AbuseIPDB API Key for the Abuse Reporting module
ABUSEIPDB_API_KEY=your_abuseipdb_api_key_here

# OpenRouter API Key (Optional fallback)
OPENROUTER_API_KEY=sk-or-your_openrouter_key
```

---

## 💻 Running the Application
For full functionality, both the frontend and backend must be running simultaneously.
1. Run `npm run dev` in the root folder.
2. Run `uvicorn main:app --reload --port 8000` in the `/backend` folder.
3. Open your browser and navigate to `http://localhost:5173`.

---

## 🔌 API Integration (Backend Endpoints)
- `POST /api/scan/email`: Processes raw email text/headers and returns dual-engine classification.
- `POST /api/scan/url`: Analyzes URLs and returns mathematical telemetry and step-by-step risk factors.
- `POST /api/scan/mulex`: Accepts heavily nested JSON applicant data, engineers behavioral features, and returns a dynamic risk tier (Approved, Medium Risk, High Risk).
- `POST /api/chat`: Processes conversational AI queries via the Groq API, injecting systemic platform context.

---

## ⚠️ Disclaimer
Artemis is designed for educational, research, and defensive cybersecurity purposes. Users must ensure they have authorization before scanning proprietary data or analyzing PII (Personally Identifiable Information). The authors are not responsible for the misuse of this tool.
