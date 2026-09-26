import { useState } from "react"
import { Mail, ArrowRight, Loader2, Terminal, Activity, Shield, AlertTriangle } from 'lucide-react'
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"
import { logActivity } from "../lib/activity"
import { cn } from "../utils/cn"
import { EmailResultsDisplay } from '../components/EmailResultsDisplay';

export function EmailAnalyzer() {
  const { user } = useAuth()
  const [emailContent, setEmailContent] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleScan = async (e?: React.FormEvent, scanUrls: boolean = false) => {
    if (e) e.preventDefault()

    if (!emailContent) return
    
    setIsScanning(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('http://localhost:8000/api/scan/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: emailContent, scan_urls: scanUrls })
      })
      
      if (!response.ok) throw new Error('API request failed')
      
      const data = await response.json()
              setResult(data)
        
        if (data.extracted_urls && data.extracted_urls.length > 0 && !scanUrls) {
          setTimeout(async () => {
              if (window.confirm("URLs detected in the email. Do you want to evaluate these extracted URLs with the URL Threat Engine?")) {
                 await handleScan(undefined, true)
              }
          }, 100)
        }
      
      if (user) {
        logActivity(user.uid, 'email', emailContent.substring(0, 50) + '...', data.risk)
      }
    } catch (err) {
      console.error(err)
      setError("Failed to analyze email content. Please check connection and try again.")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight uppercase">Email Forensic Engine</h1>
        <p className="text-muted-foreground text-xs font-mono mt-1">ISOLATED ENVIRONMENT // EXTRACT HEADERS & IDENTIFY SPEAR-PHISHING</p>
      </div>

      <Card className="border-t-primary">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-widest text-sm text-primary flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Initialize Scan Sequence
          </CardTitle>
          <CardDescription>Paste the full email raw content or headers for deep extraction</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="space-y-4">
            <textarea
              className="w-full h-48 rounded-[2px] border border-border bg-input/50 px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[inset_0_0_10px_rgba(59,130,246,0.1),0_0_10px_rgba(59,130,246,0.2)] font-mono resize-y"
              placeholder="Return-Path: <sender@suspicious.com>&#10;Received: from mail.suspicious.com...&#10;&#10;Dear user, your account has been compromised..."
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isScanning} className="w-40 uppercase tracking-widest text-xs">
                {isScanning ? (
                  <span className="flex items-center gap-2 font-mono">
                    <Activity className="w-4 h-4 animate-spin" /> EXTRACTING
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" /> FORENSIC SCAN
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

      {result && <EmailResultsDisplay result={result} />}
    </div>
  )
}
