import { useState } from "react"
import { ShieldAlert, AlertTriangle, Search, Activity, CheckCircle, Info, Send, Flag, Shield } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"
import { logActivity } from "../lib/activity"
import { cn } from "../utils/cn"

const ABUSE_CATEGORIES = [
  { id: 4, name: "DDoS Attack" },
  { id: 5, name: "FTP Brute-Force" },
  { id: 7, name: "Ping of Death" },
  { id: 8, name: "Phishing" },
  { id: 9, name: "Open Proxy" },
  { id: 10, name: "Web Spam" },
  { id: 11, name: "Email Spam" },
  { id: 12, name: "Blog Spam" },
  { id: 13, name: "VPN IP" },
  { id: 14, name: "Port Scan" },
  { id: 15, name: "Hacking" },
  { id: 16, name: "SQL Injection" },
  { id: 17, name: "Spoofing" },
  { id: 18, name: "Brute-Force" },
  { id: 19, name: "Bad Web Bot" },
  { id: 20, name: "Exploited Host" },
  { id: 21, name: "Web App Attack" },
  { id: 22, name: "SSH" },
  { id: 23, name: "IoT Targeted" }
]

export function AbuseReport() {
  const { user } = useAuth()
  
  // Reporting State
  const [ip, setIp] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [comment, setComment] = useState("")
  const [timestamp, setTimestamp] = useState("")
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState<any>(null)
  
  const [mode, setMode] = useState<'form' | 'review'>('form')
  
  // IP Intelligence State
  const [checkIp, setCheckIp] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [intelResult, setIntelResult] = useState<any>(null)

  const isValidIp = (ipStr: string) => {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
    return ipv4Regex.test(ipStr) || ipv6Regex.test(ipStr)
  }

  const toggleCategory = (id: number) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(prev => prev.filter(c => c !== id))
    } else {
      setSelectedCategories(prev => [...prev, id])
    }
  }

  const handleReview = () => {
    setReportError(null)
    if (!isValidIp(ip)) {
      setReportError("Invalid IP address format.")
      return
    }
    if (selectedCategories.length === 0) {
      setReportError("Please select at least one abuse category.")
      return
    }
    if (comment.trim().length < 10) {
      setReportError("Please provide more detailed evidence (at least 10 characters).")
      return
    }
    setMode('review')
  }

  const submitReport = async () => {
    setIsSubmitting(true)
    setReportError(null)
    
    try {
      let isoTimestamp = undefined
      if (timestamp) {
        isoTimestamp = new Date(timestamp).toISOString()
      }

      const response = await fetch('http://localhost:8000/api/abuseipdb/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: ip.trim(),
          categories: selectedCategories,
          comment: comment.trim(),
          timestamp: isoTimestamp
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to submit report")
      }
      
      setReportSuccess(data.data || data)
      if (user) {
        logActivity(user.uid, 'app', 'AbuseIPDB Report', 'Submitted')
      }
    } catch (err: any) {
      setReportError(err.message)
      setMode('form') // back to form to fix
    } finally {
      setIsSubmitting(false)
    }
  }

  const checkIntelligence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkIp || !isValidIp(checkIp)) {
      setCheckError("Please enter a valid IP address.")
      return
    }
    
    setIsChecking(true)
    setCheckError(null)
    setIntelResult(null)

    try {
      const response = await fetch(`http://localhost:8000/api/abuseipdb/check?ip=${encodeURIComponent(checkIp.trim())}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch IP intelligence")
      }
      
      setIntelResult(data.data)
      if (user) {
        logActivity(user.uid, 'app', 'AbuseIPDB Intelligence', data.data?.abuseConfidenceScore > 50 ? 'suspicious' : 'benign')
      }
    } catch (err: any) {
      setCheckError(err.message)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AbuseIPDB Reporting</h1>
        <p className="text-muted-foreground">
          Report malicious IP addresses directly to AbuseIPDB or query IP intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Report Form */}
        <div className="lg:col-span-2 space-y-6">
          {!reportSuccess ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  {mode === 'form' ? "Submit Abuse Report" : "Review Report"}
                </CardTitle>
                <CardDescription>
                  Help the community by reporting observed malicious activity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mode === 'form' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">IP Address *</label>
                      <Input
                        placeholder="e.g. 185.XXX.XXX.XXX"
                        value={ip}
                        onChange={e => setIp(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Abuse Categories *</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {ABUSE_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={cn(
                              "px-3 py-1.5 text-xs rounded-full border transition-colors",
                              selectedCategories.includes(cat.id) 
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-foreground border-border hover:border-primary/50"
                            )}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex justify-between">
                        <span>Evidence / Comment *</span>
                        <span className="text-muted-foreground text-xs">{comment.length}/1024</span>
                      </label>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value.slice(0, 1024))}
                        placeholder="Multiple SSH brute-force attempts were observed from this IP..."
                        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground">Provide factual evidence. Do not fabricate observations.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Incident Timestamp (Optional)</label>
                      <Input
                        type="datetime-local"
                        value={timestamp}
                        onChange={e => setTimestamp(e.target.value)}
                      />
                    </div>

                    {reportError && (
                      <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {reportError}
                      </div>
                    )}

                    <Button onClick={handleReview} className="w-full">
                      Review Submission
                    </Button>
                  </div>
                )}

                {mode === 'review' && (
                  <div className="space-y-6">
                    <div className="bg-secondary/20 p-6 rounded-lg border border-border/50 space-y-4">
                      <div>
                        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">IP Address</h4>
                        <p className="font-mono text-lg">{ip}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Categories</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedCategories.map(id => {
                            const cat = ABUSE_CATEGORIES.find(c => c.id === id)
                            return cat ? <span key={id} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">{cat.name}</span> : null
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Evidence</h4>
                        <p className="text-sm bg-background p-3 rounded border border-border/50 break-words">{comment}</p>
                      </div>

                      {timestamp && (
                        <div>
                          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Incident Time</h4>
                          <p className="text-sm">{new Date(timestamp).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {reportError && (
                      <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {reportError}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button variant="outline" onClick={() => setMode('form')} disabled={isSubmitting} className="flex-1">
                        Edit Report
                      </Button>
                      <Button onClick={submitReport} disabled={isSubmitting} className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isSubmitting ? (
                          <><Activity className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                        ) : (
                          <><Send className="w-4 h-4 mr-2" /> Submit Report</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-green-500/50">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <CardTitle className="text-2xl text-green-500">Report Submitted</CardTitle>
                  <CardDescription>
                    The IP address was successfully reported to AbuseIPDB.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-secondary/10 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase">IP Address</p>
                      <p className="font-mono text-lg mt-1">{reportSuccess.ipAddress || ip}</p>
                    </div>
                    <div className="bg-secondary/10 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase">Abuse Confidence</p>
                      <p className="text-2xl font-bold text-destructive mt-1">{reportSuccess.abuseConfidenceScore || 0}%</p>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full" onClick={() => {
                    setReportSuccess(null);
                    setIp("");
                    setComment("");
                    setSelectedCategories([]);
                    setMode('form');
                  }}>
                    Submit Another Report
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column: IP Intelligence */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Check IP Intelligence
              </CardTitle>
              <CardDescription>Query an IP against the AbuseIPDB database.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={checkIntelligence} className="space-y-4">
                <Input
                  placeholder="203.XXX.XXX.XXX"
                  value={checkIp}
                  onChange={e => setCheckIp(e.target.value)}
                  className="font-mono"
                />
                <Button type="submit" disabled={isChecking || !checkIp} className="w-full">
                  {isChecking ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Search Database
                </Button>
                {checkError && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{checkError}</span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {intelResult && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-secondary/5 border-primary/20">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">IP Intelligence</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">AbuseIPDB Database</p>
                    </div>
                    <Shield className="w-5 h-5 text-primary opacity-50" />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">IP Address</p>
                      <p className="font-mono font-medium">{intelResult.ipAddress}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase">Confidence</p>
                      <p className={cn(
                        "font-bold text-lg",
                        intelResult.abuseConfidenceScore > 80 ? "text-destructive" :
                        intelResult.abuseConfidenceScore > 30 ? "text-yellow-500" :
                        "text-green-500"
                      )}>{intelResult.abuseConfidenceScore}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm border-t border-border/50 pt-4">
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Total Reports</p>
                      <p className="font-medium">{intelResult.totalReports}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Reporters</p>
                      <p className="font-medium">{intelResult.numDistinctUsers}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Country</p>
                      <p className="font-medium truncate" title={intelResult.countryName}>{intelResult.countryName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">ISP</p>
                      <p className="font-medium truncate" title={intelResult.isp}>{intelResult.isp}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs mb-0.5">Usage Type</p>
                      <p className="font-medium">{intelResult.usageType || 'Unknown'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs mb-0.5">Domain</p>
                      <p className="font-mono truncate">{intelResult.domain || 'N/A'}</p>
                    </div>
                  </div>

                  {intelResult.lastReportedAt && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Last Reported: {new Date(intelResult.lastReportedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  )
}
