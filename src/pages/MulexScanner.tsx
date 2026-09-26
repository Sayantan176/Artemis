import { useState } from "react"
import { Shield, AlertTriangle, ShieldAlert, Activity, Terminal, CheckCircle2, UserX } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"
import { logActivity } from "../lib/activity"
import { cn } from "../utils/cn"
import jsPDF from "jspdf"
import { toCanvas } from "html-to-image"
import batchTestCases from "../data/batch_test_cases.json"


// Pre-defined test cases mapping from batch_test_cases.json
const TEST_CASES = {
  "High Risk Fraud": {
    "income": 0.05,
    "name_email_similarity": 0.02,
    "prev_address_months_count": -1,
    "current_address_months_count": -1,
    "customer_age": 19,
    "days_since_request": 0.001,
    "intended_balcon_amount": -1,
    "payment_type": "AA",
    "zip_count_4w": 9500,
    "velocity_6h": 9900.0,
    "velocity_24h": 9800.0,
    "velocity_4w": 9400.0,
    "bank_branch_count": 0,
    "date_of_birth_distinct_emails_4w": 22,
    "employment_status": "CA",
    "credit_risk_score": 30,
    "email_is_free": 1,
    "housing_status": "BE",
    "phone_home_valid": 0,
    "phone_mobile_valid": 0,
    "bank_months_count": -1,
    "has_other_cards": 0,
    "proposed_credit_limit": 5000.0,
    "foreign_request": 1,
    "source": "INTERNET",
    "session_length_in_minutes": 0.3,
    "device_os": "other",
    "keep_alive_session": 0,
    "device_distinct_emails_8w": 15,
    "device_fraud_count": 4,
    "month": 7,
    "application_id": "APP-HIGH-9f8e7d6c"
  },
  "Low Risk Customer": {
    "income": 0.85,
    "name_email_similarity": 0.95,
    "prev_address_months_count": 48,
    "current_address_months_count": 120,
    "customer_age": 42,
    "days_since_request": 0.005,
    "intended_balcon_amount": 150.0,
    "payment_type": "AB",
    "zip_count_4w": 450,
    "velocity_6h": 800.0,
    "velocity_24h": 1200.0,
    "velocity_4w": 1400.0,
    "bank_branch_count": 5,
    "date_of_birth_distinct_emails_4w": 1,
    "employment_status": "CB",
    "credit_risk_score": 250,
    "email_is_free": 0,
    "housing_status": "BC",
    "phone_home_valid": 1,
    "phone_mobile_valid": 1,
    "bank_months_count": 84,
    "has_other_cards": 1,
    "proposed_credit_limit": 200.0,
    "foreign_request": 0,
    "source": "INTERNET",
    "session_length_in_minutes": 14.5,
    "device_os": "macintosh",
    "keep_alive_session": 1,
    "device_distinct_emails_8w": 1,
    "device_fraud_count": 0,
    "month": 7,
    "application_id": "APP-LOW-a1b2c3d4"
  },
  "Medium Risk Customer": {
    "income": 0.35,
    "name_email_similarity": 0.45,
    "prev_address_months_count": -1,
    "current_address_months_count": 8,
    "customer_age": 25,
    "days_since_request": 0.015,
    "intended_balcon_amount": -1,
    "payment_type": "AC",
    "zip_count_4w": 2200,
    "velocity_6h": 3400.0,
    "velocity_24h": 4100.0,
    "velocity_4w": 3800.0,
    "bank_branch_count": 1,
    "date_of_birth_distinct_emails_4w": 3,
    "employment_status": "CC",
    "credit_risk_score": 130,
    "email_is_free": 1,
    "housing_status": "BD",
    "phone_home_valid": 1,
    "phone_mobile_valid": 1,
    "bank_months_count": 6,
    "has_other_cards": 0,
    "proposed_credit_limit": 800.0,
    "foreign_request": 0,
    "source": "INTERNET",
    "session_length_in_minutes": 5.2,
    "device_os": "windows",
    "keep_alive_session": 0,
    "device_distinct_emails_8w": 3,
    "device_fraud_count": 0,
    "month": 7,
    "application_id": "APP-MED-5a6b7c8d"
  }
}

export function MulexScanner() {
  const { user } = useAuth()
  const [payloadText, setPayloadText] = useState(JSON.stringify(TEST_CASES["High Risk Fraud"], null, 2))
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [caseStudyText, setCaseStudyText] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)

  const handleExtract = async () => {
    if (!caseStudyText) return
    setIsExtracting(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:8000/api/scan/mulex/extract-case-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: caseStudyText })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Extraction failed')
      }
      
      const data = await response.json()
      setPayloadText(JSON.stringify(data, null, 2))
    } catch (err: any) {
      console.error(err)
      setError(`Failed to extract parameters: ${err.message}`)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payloadText) return
    
    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch (err) {
      setError("Invalid JSON format. Please check your payload.");
      return;
    }

    setIsScanning(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('http://localhost:8000/api/scan/mulex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) throw new Error('API request failed')
      
      const data = await response.json()
      setResult(data)
      
      if (user) {
        // Map risk tier to our standard tracking (high/medium/low/safe)
        let trackingRisk = 'safe';
        if (data.risk_tier.includes("High")) trackingRisk = 'high';
        else if (data.risk_tier.includes("Medium")) trackingRisk = 'medium';
        logActivity(user.uid, 'app', data.application_id, trackingRisk)
      }
    } catch (err) {
      console.error(err)
      setError("Failed to analyze application. Please check connection and try again.")
    } finally {
      setIsScanning(false)
    }
  }

  const exportToPDF = async () => {
    if (!result) return;
    const resultElement = document.getElementById("mulex-result-card");
    if (!resultElement) return;

    try {
      // Hide buttons temporarily in the actual DOM
      const buttons = resultElement.querySelectorAll("button");
      const originalDisplays = Array.from(buttons).map(b => b.style.display);
      buttons.forEach(btn => btn.style.display = 'none');

      // Use html-to-image to support modern CSS (like oklch/oklab) natively
      const canvas = await toCanvas(resultElement, {
        pixelRatio: 2,
        backgroundColor: window.getComputedStyle(resultElement).backgroundColor || "#ffffff"
      });

      // Restore buttons
      buttons.forEach((btn, i) => btn.style.display = originalDisplays[i]);
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      
      // Some jspdf versions export differently depending on module system. Handle both cases.
      const PDFClass = typeof jsPDF === 'function' ? jsPDF : (jsPDF as any).jsPDF;
      const pdf = new PDFClass("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.setFontSize(16);
      pdf.text("MuleX Analysis Report", 10, 10);
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 10, 16);
      
      pdf.addImage(imgData, "JPEG", 0, 20, pdfWidth, pdfHeight);
      pdf.save(`MuleX_Report_${result.application_id}.pdf`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF: " + (err.message || String(err)));
    }
  }

  const loadBatchTestCase = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    if (key && (batchTestCases as any)[key]) {
      setPayloadText(JSON.stringify((batchTestCases as any)[key], null, 2));
    }
  }

  const loadTestCase = (key: keyof typeof TEST_CASES) => {
    setPayloadText(JSON.stringify(TEST_CASES[key], null, 2))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight uppercase">MuleX Account Scanner</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">ADVANCED ENSEMBLE // DETECT MULE ACCOUNTS & SYNTHETIC IDENTITIES</p>
      </div>

      <Card className="border-t-accent">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-widest text-sm text-accent flex items-center gap-2">
            <Terminal className="w-4 h-4" /> AI Case Study Extractor
          </CardTitle>
          <CardDescription>Input a case study paragraph to automatically extract all parameters into the payload using Groq's openai/gpt-oss-120b model.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <textarea
              value={caseStudyText}
              onChange={(e) => setCaseStudyText(e.target.value)}
              className="w-full h-32 bg-background border border-input rounded-sm p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              placeholder="Paste the case study paragraph here..."
            />
            <Button type="button" onClick={handleExtract} disabled={isExtracting || !caseStudyText} className="w-full uppercase tracking-widest text-xs bg-accent text-accent-foreground hover:bg-accent/90">
              {isExtracting ? (
                <span className="flex items-center gap-2 font-mono">
                  <Activity className="w-4 h-4 animate-spin" /> EXTRACTING PARAMETERS...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" /> EXTRACT WITH GROQ AI
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-t-primary">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-widest text-sm text-primary flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Application Data Payload
          </CardTitle>
          <CardDescription>Enter the JSON payload of the customer application features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" type="button" className="font-mono text-[10px] uppercase" onClick={() => loadTestCase("High Risk Fraud")}>
              Load High Risk Fraud
            </Button>
            <Button variant="outline" size="sm" type="button" className="font-mono text-[10px] uppercase" onClick={() => loadTestCase("Medium Risk Customer")}>
              Load Medium Risk
            </Button>
            <Button variant="outline" size="sm" type="button" className="font-mono text-[10px] uppercase" onClick={() => loadTestCase("Low Risk Customer")}>
              Load Low Risk
            </Button>
            <select 
              onChange={loadBatchTestCase}
              defaultValue=""
              className="ml-auto bg-background border border-input rounded-sm px-2 py-1 font-mono text-[10px] uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>Select from Batch Test Cases...</option>
              {Object.keys(batchTestCases).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
          <form onSubmit={handleScan} className="space-y-4">
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              className="w-full h-64 bg-background border border-input rounded-sm p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              placeholder="{...}"
              required
            />
            <Button type="submit" disabled={isScanning} className="w-full uppercase tracking-widest text-xs">
              {isScanning ? (
                <span className="flex items-center gap-2 font-mono">
                  <Activity className="w-4 h-4 animate-spin" /> ANALYZING NEURAL PIPELINE
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" /> EXECUTE STACKING ENSEMBLE SCAN
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-sm flex items-start gap-3 font-mono text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card id="mulex-result-card" className={cn(
            "border-t-4",
            result.risk_tier.includes("High") ? "border-t-destructive" :
            result.risk_tier.includes("Medium") ? "border-t-warning" :
            "border-t-success"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-mono uppercase tracking-widest text-sm">
                  {result.risk_tier.includes("High") ? (
                    <UserX className="w-5 h-5 text-destructive" />
                  ) : result.risk_tier.includes("Medium") ? (
                    <AlertTriangle className="w-5 h-5 text-warning" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  )}
                  {result.application_id}
                </CardTitle>
                <div className={cn(
                  "px-3 py-1 rounded-sm text-xs font-mono uppercase tracking-widest border",
                  result.risk_tier.includes("High") ? "bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" :
                  result.risk_tier.includes("Medium") ? "bg-warning/10 text-warning border-warning/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" :
                  "bg-success/10 text-success border-success/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                )}>
                  {result.risk_tier}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={exportToPDF} className="font-mono text-xs uppercase tracking-widest border-primary/50 hover:bg-primary/10">
                  Download PDF Report
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Application Summary & Decision Narrative */}
              <div className="p-4 rounded-sm border border-border bg-card/50 space-y-4">
                <h4 className="text-[10px] font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                  <Terminal className="w-3 h-3" /> Application Summary & Decision Narrative
                </h4>
                
                <div className="grid sm:grid-cols-2 gap-4 border-b border-border/50 pb-4">
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Income</div>
                    <div className="font-mono text-xs text-foreground">{result.raw_data_summary?.income ?? 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Requested Credit Limit</div>
                    <div className="font-mono text-xs text-foreground">{result.raw_data_summary?.proposed_credit_limit ?? 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Device Email Count (8w)</div>
                    <div className="font-mono text-xs text-foreground">{result.raw_data_summary?.device_distinct_emails_8w ?? 'N/A'}</div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Action Taken</div>
                  <p className="text-foreground text-sm leading-relaxed border-l-2 border-primary pl-3 py-1 font-mono">
                    {result.action_taken}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-sm border border-border bg-card/50">
                  <h4 className="text-[10px] font-mono text-destructive mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <ShieldAlert className="w-3 h-3" /> Risk Factors (Red Flags)
                  </h4>
                  <ul className="space-y-2 text-xs font-mono">
                    {result.red_flags.map((flag: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-destructive mt-0.5">»</span>
                        <span className="text-muted-foreground">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-4 rounded-sm border border-border bg-card/50">
                  <h4 className="text-[10px] font-mono text-success mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <CheckCircle2 className="w-3 h-3" /> Trust Factors (Green Flags)
                  </h4>
                  <ul className="space-y-2 text-xs font-mono">
                    {result.green_flags.map((flag: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-success mt-0.5">»</span>
                        <span className="text-muted-foreground">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="p-4 rounded-sm border border-border bg-card/50 flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Dynamic Risk Score</span>
                <span className="text-lg font-mono font-bold">{result.risk_score.toFixed(1)} / 100.0</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
