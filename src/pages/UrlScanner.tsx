import { useState } from "react"
import { Shield, AlertTriangle, ShieldAlert, Info, Link as LinkIcon, Activity, Terminal } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"
import { logActivity } from "../lib/activity"
import { cn } from "../utils/cn"

export function UrlScanner() {
  const { user } = useAuth()
  const [url, setUrl] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    
    setIsScanning(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('http://localhost:8000/api/scan/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      if (!response.ok) throw new Error('API request failed')
      
      const data = await response.json()
      setResult(data)
      
      if (user) {
        logActivity(user.uid, 'url', url, data.risk)
      }
    } catch (err) {
      console.error(err)
      setError("Failed to analyze URL. Please check connection and try again.")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight uppercase">URL Scanner Sandbox</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">ISOLATED ENVIRONMENT // DETECT MALICIOUS PAYLOADS & DECEPTIVE ROUTING</p>
      </div>

      <Card className="border-t-primary">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-widest text-sm text-primary flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Initialize Scan Sequence
          </CardTitle>
          <CardDescription>Enter the target URL for deep analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="https://example.com/login"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 font-mono"
                icon={<LinkIcon className="w-4 h-4" />}
                required
              />
              <Button type="submit" disabled={isScanning} className="w-32 uppercase tracking-widest text-xs">
                {isScanning ? (
                  <span className="flex items-center gap-2 font-mono">
                    <Activity className="w-4 h-4 animate-spin" /> SCAN
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" /> ANALYZE
                  </span>
                )}
              </Button>
            </div>
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
          <Card className={cn(
            "border-t-4",
            result.risk === 'high' ? "border-t-destructive" :
            result.risk === 'medium' ? "border-t-warning" :
            "border-t-success"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-mono uppercase tracking-widest text-sm">
                  {result.risk === 'high' ? (
                    <ShieldAlert className="w-5 h-5 text-destructive" />
                  ) : result.risk === 'medium' ? (
                    <AlertTriangle className="w-5 h-5 text-warning" />
                  ) : (
                    <Shield className="w-5 h-5 text-success" />
                  )}
                  Analysis Report
                </CardTitle>
                <div className={cn(
                  "px-3 py-1 rounded-sm text-xs font-mono uppercase tracking-widest border",
                  result.risk === 'high' ? "bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" :
                  result.risk === 'medium' ? "bg-warning/10 text-warning border-warning/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" :
                  "bg-success/10 text-success border-success/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                )}>
                  {result.risk} Risk
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest font-mono text-[10px]">Threat Assessment</h3>
                <p className="text-foreground text-sm leading-relaxed">
                  Analysis indicates the URL is <span className="font-bold">{result.status}</span> with a confidence of {result.confidence}%.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-sm border border-border bg-card/50">
                  <h4 className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-widest">
                    <Info className="w-3 h-3" /> Technical Details
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between font-mono text-xs">
                      <span className="text-muted-foreground">Domain:</span>
                      <span className="text-foreground">{result.domain || 'Unknown'}</span>
                    </li>
                    <li className="flex justify-between font-mono text-xs">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-foreground capitalize">{result.status}</span>
                    </li>
                    <li className="flex justify-between font-mono text-xs">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="text-foreground">{result.confidence}%</span>
                    </li>
                  </ul>
                </div>
                
                <div className="p-4 rounded-sm border border-border bg-card/50">
                  <h4 className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-widest">
                    <Activity className="w-3 h-3" /> Model Probabilities
                  </h4>
                  <ul className="space-y-2">
                    {Object.entries(result.class_probabilities || {}).map(([cls, prob]: [string, any], i: number) => (
                      <li key={i} className="flex justify-between font-mono text-xs">
                        <span className="text-muted-foreground capitalize">{cls}:</span>
                        <span className="text-foreground">{prob}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Analysis Summary */}
              {result.analysis_summary && (
                <div className="p-4 rounded-sm border border-border bg-card/50 space-y-3">
                  <h4 className="text-[10px] font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                    <ShieldAlert className="w-3 h-3" /> Analysis Summary
                  </h4>
                  {result.analysis_summary.headline && (
                    <div className="font-mono text-xs font-bold text-foreground">
                      {result.analysis_summary.headline}
                    </div>
                  )}
                  {result.analysis_summary.explanation && (
                    <div className="text-xs text-muted-foreground">
                      {result.analysis_summary.explanation}
                    </div>
                  )}
                  {result.analysis_summary.key_factors && result.analysis_summary.key_factors.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Key Factors</div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                        {result.analysis_summary.key_factors.map((factor: string, i: number) => (
                          <li key={i}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Mathematical Breakdown */}
              {result.mathematical_breakdown && (
                <div className="p-4 rounded-sm border border-border bg-card/50 space-y-4">
                  <h4 className="text-[10px] font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                    <Terminal className="w-3 h-3" /> Mathematical Breakdown
                  </h4>
                  
                  {result.mathematical_breakdown.step_by_step && result.mathematical_breakdown.step_by_step.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Step-by-Step</div>
                      <ul className="space-y-1 text-xs text-muted-foreground font-mono">
                        {result.mathematical_breakdown.step_by_step.map((step: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary">{`[${i+1}]`}</span> <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    {result.mathematical_breakdown.raw_logits_z && (
                      <div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">raw_logits_z</div>
                        <ul className="space-y-1 text-xs text-muted-foreground font-mono">
                          {Object.entries(result.mathematical_breakdown.raw_logits_z).map(([k, v]: [string, any], i: number) => (
                            <li key={i} className="flex justify-between">
                              <span className="capitalize">{k}:</span> <span>{Number(v).toFixed(4)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.mathematical_breakdown.exponentials_exp_z && (
                      <div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">exponentials_exp_z</div>
                        <ul className="space-y-1 text-xs text-muted-foreground font-mono">
                          {Object.entries(result.mathematical_breakdown.exponentials_exp_z).map(([k, v]: [string, any], i: number) => (
                            <li key={i} className="flex justify-between">
                              <span className="capitalize">{k}:</span> <span>{Number(v).toFixed(4)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {result.mathematical_breakdown.sum_denominator && (
                    <div className="flex justify-between font-mono text-xs pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">sum_denominator:</span>
                      <span className="text-foreground">{Number(result.mathematical_breakdown.sum_denominator).toFixed(4)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Static Formulas and Model Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-sm border border-border bg-card/50">
                  <h4 className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-widest">
                    <Info className="w-3 h-3" /> Formulas
                  </h4>
                  <div className="space-y-3 text-xs font-mono text-muted-foreground">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-1 text-foreground">Softmax Probability Formula:</div>
                      <div>P(k) = e^z_k / (Σ_j e^z_j)</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-1 text-foreground">Exponential Transformation:</div>
                      <div>e^z_k</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest mb-1 text-foreground">Probability Normalization:</div>
                      <div>P(k) = e^z_k / (Sum of all exponential scores)</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-sm border border-border bg-card/50">
                  <h4 className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-widest">
                    <Activity className="w-3 h-3" /> Model Information
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li><span className="font-mono text-[10px] uppercase tracking-widest text-foreground">Model Type:</span> LightGBM Ensemble</li>
                    <li><span className="font-mono text-[10px] uppercase tracking-widest text-foreground">Architecture:</span> Ensemble of decision trees</li>
                    <li><span className="font-mono text-[10px] uppercase tracking-widest text-foreground">Output:</span> Raw tree margin scores (logits)</li>
                    <li><span className="font-mono text-[10px] uppercase tracking-widest text-foreground">Conversion:</span> Softmax</li>
                    <li>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground block mt-1">Categories:</span>
                      <div className="font-mono pl-2 border-l border-border mt-1">Benign, Defacement, Malware, Phishing</div>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
