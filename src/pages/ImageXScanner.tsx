import { useState, useRef } from "react"
import { Image as ScanSearch, CheckCircle2, ShieldAlert, AlertTriangle, UploadCloud, Terminal, QrCode, Type, BrainCircuit, Activity } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { motion } from "framer-motion"

interface MathBreakdown {
  base_risk?: string;
  ocr_risk?: string;
  qr_risk?: string;
  formula_expression?: string;
}

interface ImageXScanResult {
  final_prediction: string;
  risk_score: number;
  vision_prediction: string;
  vision_confidence: number;
  ocr_word_count: number;
  extracted_text: string;
  qr_payloads: string[];
  math_breakdown: MathBreakdown;
}

export function ImageXScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<ImageXScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    
    // Start scan
    setIsScanning(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("http://localhost:8000/api/scan/imagex", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to analyze image. Please check connection.")
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred during scanning.")
    } finally {
      setIsScanning(false)
    }
  }

  const resetScanner = () => {
    setResult(null)
    setError(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const isPhishing = result?.final_prediction === "Phishing"
  const isUnknown = result?.final_prediction === "Unknown"
  const isSafe = !isPhishing && !isUnknown

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight uppercase font-mono flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-primary" /> ImageX Scanner
        </h1>
        <p className="text-muted-foreground text-sm font-mono">
          Multimodal Phishing Detection Engine. Analyzes screenshots using Vision Classification, OCR, and QR payload extraction.
        </p>
      </div>

      {!result && !isScanning ? (
        <Card className="border-dashed border-2 border-border/50 hover:border-primary/50 transition-colors bg-card/30">
          <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png, image/jpeg, image/webp"
              className="hidden" 
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-full bg-secondary/50 border border-border flex items-center justify-center mb-6 cursor-pointer hover:bg-secondary transition-colors"
            >
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            
            <h3 className="text-lg font-mono font-medium mb-2 uppercase tracking-widest">Select Screenshot</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-md leading-relaxed font-mono">
              Drag and drop a PNG, JPG, or WEBP screenshot of a suspicious email or login page.
            </p>
            
            <Button onClick={() => fileInputRef.current?.click()} size="lg" className="uppercase font-mono tracking-widest">
              Upload & Analyze
            </Button>
          </div>
        </Card>
      ) : isScanning ? (
        <Card className="border border-primary/20 bg-card/30">
          <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="flex flex-col items-center w-full max-w-md"
             >
               <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden border border-border bg-black/50">
                 {previewUrl && (
                   <img src={previewUrl} alt="Preview" className="w-full h-full object-contain opacity-50" />
                 )}
                 <motion.div 
                   animate={{ top: ['0%', '100%', '0%'] }}
                   transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                   className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                 />
               </div>
               
               <h3 className="text-lg font-mono font-bold mb-2 tracking-widest text-primary uppercase">Running Multimodal Pipeline</h3>
               <p className="text-sm text-muted-foreground font-mono flex items-center justify-center gap-2">
                 <Activity className="w-4 h-4 animate-spin" /> Evaluating ResNet-18 Vision, OCR & QR
               </p>
             </motion.div>
          </div>
        </Card>
      ) : result ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {error && (
            <div className="p-4 rounded-md border bg-destructive/10 border-destructive/20 text-destructive flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-mono">{error}</p>
            </div>
          )}
          
          <div className={`p-5 rounded-md border flex items-start gap-5 shadow-sm ${
            isPhishing ? 'bg-destructive/10 border-destructive/30 text-destructive' :
            isUnknown ? 'bg-warning/10 border-warning/30 text-warning' :
            'bg-success/10 border-success/30 text-success'
          }`}>
            {isPhishing ? <ShieldAlert className="w-8 h-8 flex-shrink-0 mt-1" /> : 
             isUnknown ? <AlertTriangle className="w-8 h-8 flex-shrink-0 mt-1" /> : 
             <CheckCircle2 className="w-8 h-8 flex-shrink-0 mt-1" />}
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-xl font-bold uppercase tracking-widest font-mono">
                  {isPhishing ? 'PHISHING DETECTED' : isUnknown ? 'ANALYSIS UNKNOWN' : 'LEGITIMATE SCREENSHOT'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-sm text-xs font-mono font-bold uppercase tracking-widest border ${
                  isPhishing ? 'bg-destructive/20 border-destructive/30' :
                  isUnknown ? 'bg-warning/20 border-warning/30' :
                  'bg-success/20 border-success/30'
                }`}>
                  Risk Score: {result.risk_score.toFixed(4)}
                </span>
              </div>
              <p className="text-sm opacity-90 font-mono">
                Threshold: &gt;= 0.55 &nbsp;|&nbsp; 
                Verdict: <strong>{result.final_prediction.toUpperCase()}</strong>
              </p>
            </div>
            
            <div className="ml-4">
              <Button 
                variant="outline" 
                size="sm" 
                className={`font-mono uppercase tracking-wider ${
                  isPhishing ? 'border-destructive/30 text-destructive hover:bg-destructive/10' :
                  isUnknown ? 'border-warning/30 text-warning hover:bg-warning/10' :
                  'border-success/30 text-success hover:bg-success/10'
                }`}
                onClick={resetScanner}
              >
                Scan Another
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-border bg-card/50 overflow-hidden h-full">
                <CardHeader className="border-b border-border/50 pb-3 bg-muted/20">
                  <CardTitle className="text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                    <ScanSearch className="w-4 h-4" /> Input Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-48px)] flex flex-col">
                  <div className="relative flex-1 flex items-center justify-center bg-black/80 p-4 min-h-[300px]">
                     {previewUrl && (
                       <img src={previewUrl} alt="Uploaded" className="max-w-full max-h-full object-contain rounded border border-white/10" />
                     )}
                     {isPhishing && (
                       <div className="absolute inset-0 border-4 border-destructive/50 pointer-events-none" />
                     )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Vision Classification */}
                <Card className="border-border bg-card/50">
                  <CardHeader className="border-b border-border/50 pb-3 bg-muted/20">
                    <CardTitle className="text-sm font-mono uppercase tracking-widest flex items-center gap-2 text-primary">
                      <BrainCircuit className="w-4 h-4" /> [1] Vision Classification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 font-mono text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Prediction:</span>
                      <span className="font-semibold">{result.vision_prediction}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span>{(result.vision_confidence * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Risk:</span>
                      <span className="text-primary">{result.math_breakdown?.base_risk || "0.0"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* OCR Extraction */}
                <Card className="border-border bg-card/50">
                  <CardHeader className="border-b border-border/50 pb-3 bg-muted/20">
                    <CardTitle className="text-sm font-mono uppercase tracking-widest flex items-center gap-2 text-warning">
                      <Type className="w-4 h-4" /> [2] OCR Extraction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 font-mono text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Word Count:</span>
                      <span>{result.ocr_word_count}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Risk Score:</span>
                      <span className="text-warning">{result.math_breakdown?.ocr_risk?.split("=").pop()?.trim() || "0.0"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground break-words truncate">
                      Extracted: {result.extracted_text ? `"${result.extracted_text.substring(0, 50)}..."` : "None"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* QR Detection & Final Equation */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-border bg-card/50">
                  <CardHeader className="border-b border-border/50 pb-3 bg-muted/20">
                    <CardTitle className="text-sm font-mono uppercase tracking-widest flex items-center gap-2 text-success">
                      <QrCode className="w-4 h-4" /> [3] QR Detection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 font-mono text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Payloads:</span>
                      <span>{result.qr_payloads?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk Score:</span>
                      <span className="text-success">{result.math_breakdown?.qr_risk?.split("(")[0]?.trim() || "0.0"}</span>
                    </div>
                    {result.qr_payloads?.length > 0 && (
                      <div className="text-xs mt-2 bg-background/50 p-2 border border-border rounded break-all">
                        {result.qr_payloads.join(", ")}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={`border-2 shadow-sm ${
                  isPhishing ? 'bg-destructive/5 border-destructive' :
                  isUnknown ? 'bg-warning/5 border-warning' :
                  'bg-success/5 border-success'
                }`}>
                  <CardHeader className="border-b border-border/50 pb-3">
                    <CardTitle className="text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> Final Risk Equation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 font-mono text-sm flex flex-col justify-center">
                    <div className="text-xs text-muted-foreground mb-1">Total Risk = min(1.0, Base + OCR + QR)</div>
                    <div className="p-3 bg-background rounded border border-border text-xs break-words font-medium">
                      {result.math_breakdown?.formula_expression || "N/A"}
                    </div>
                    <div className={`text-lg font-bold text-center mt-2 ${
                      isPhishing ? 'text-destructive' :
                      isUnknown ? 'text-warning' :
                      'text-success'
                    }`}>
                      VERDICT: {result.final_prediction.toUpperCase()}
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
