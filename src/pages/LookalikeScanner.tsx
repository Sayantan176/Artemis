import { useState } from "react"
import { Shield, AlertTriangle, ShieldAlert, Info, Search, Activity, Terminal } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext"
import { logActivity } from "../lib/activity"
import { cn } from "../utils/cn"

interface IntelData {
  match_type: string;
  matched_domain: string | null;
  rank: number | null;
  similarity: number | null;
}

interface LookalikeResult {
  domain: string;
  impersonated_brand: string | null;
  brand_score: number | null;
  probability: number;
  risk: "HIGH" | "MEDIUM" | "LOW";
  technique: string;
  target_domain: string | null;
  features: {
    domain_length: number;
    entropy: number;
    levenshtein_distance: number;
    jaro_winkler_similarity: number;
    digit_count: number;
    hyphen_count: number;
    subdomain_count: number;
    [key: string]: number;
  };
  intelligence: {
    tranco: IntelData;
    majestic: IntelData;
    cisco: IntelData;
    agreement: string;
    agreed_domain: string | null;
  };
}

export function LookalikeScanner() {
  const { user } = useAuth()
  const [domain, setDomain] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LookalikeResult | null>(null)

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!domain) return
    
    setIsScanning(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('http://localhost:8000/api/scan/lookalike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: domain }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze domain')
      }

      const data = await response.json()
      setResult(data)
      
      if (user) {
        logActivity(user.uid, 'url', 'Lookalike Scan', data.risk || 'unknown')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsScanning(false)
    }
  }

  const renderIntelSource = (name: string, data: IntelData) => {
    return (
      <div className="border border-border/50 rounded-md p-3">
        <h4 className="font-semibold text-primary mb-2 uppercase tracking-wider">{name}</h4>
        <div className="space-y-1 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Match Type:</span>
            <span>{data.match_type}</span>
          </div>
          {data.matched_domain && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Domain:</span>
              <span>{data.matched_domain}</span>
            </div>
          )}
          {data.rank && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rank:</span>
              <span>#{data.rank}</span>
            </div>
          )}
          {data.similarity !== null && data.similarity !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Similarity:</span>
              <span>{(data.similarity * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Domain Lookalike Engine</h1>
        <p className="text-muted-foreground">
          Detect typosquatting, homoglyph attacks, and targeted brand impersonation using ML and Domain Intelligence.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyze a Domain</CardTitle>
          <CardDescription>Enter a domain or URL to inspect for lookalike traits.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-4">
            <Input
              type="text"
              placeholder="e.g., paypall.com or https://paypall.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="flex-1 font-mono"
            />
            <Button type="submit" disabled={isScanning || !domain}>
              {isScanning ? (
                <Activity className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {isScanning ? 'Analyzing...' : 'Analyze'}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main ML Predictions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={cn(
              "border-t-4",
              result.risk === 'HIGH' ? "border-t-destructive" :
              result.risk === 'MEDIUM' ? "border-t-yellow-500" :
              "border-t-green-500"
            )}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  {result.risk === 'HIGH' ? <ShieldAlert className="w-5 h-5 text-destructive" /> :
                   result.risk === 'MEDIUM' ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
                   <Shield className="w-5 h-5 text-green-500" />}
                  <h3 className="font-semibold uppercase tracking-wider">Risk Level</h3>
                </div>
                <p className={cn(
                  "text-3xl font-bold",
                  result.risk === 'HIGH' ? "text-destructive" :
                  result.risk === 'MEDIUM' ? "text-yellow-500" :
                  "text-green-500"
                )}>{result.risk}</p>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  Probability: {(result.probability * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold uppercase tracking-wider">Target Brand</h3>
                </div>
                <p className="text-2xl font-bold font-mono truncate">
                  {result.impersonated_brand ? result.impersonated_brand.toUpperCase() : "NONE DETECTED"}
                </p>
                {result.impersonated_brand && (
                  <p className="text-sm text-primary mt-1 font-mono">
                    Match: {(result.brand_score! * 100).toFixed(1)}% ({result.target_domain})
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold uppercase tracking-wider">Technique</h3>
                </div>
                <p className="text-xl font-bold">
                  {result.technique !== "Unknown" ? result.technique : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Domain Intelligence Section */}
            <Card className="h-full bg-secondary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Domain Intelligence
                </CardTitle>
                <CardDescription>
                  Cross-referenced against global top 1M traffic databases.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderIntelSource("Tranco", result.intelligence.tranco)}
                {renderIntelSource("Majestic", result.intelligence.majestic)}
                {renderIntelSource("Cisco", result.intelligence.cisco)}
                
                <div className="p-3 bg-background border border-border/50 rounded-md font-mono text-sm mt-4">
                  <span className="text-muted-foreground">Consensus Agreement: </span>
                  <span className="font-bold text-primary">{result.intelligence.agreement}</span>
                  {result.intelligence.agreed_domain && (
                    <span> ({result.intelligence.agreed_domain})</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Explainable Features Section */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Explainable Lexical Features
                </CardTitle>
                <CardDescription>
                  Underlying metrics used by the ML model.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between p-2 border-b border-border/50">
                    <span className="text-muted-foreground">Domain Length</span>
                    <span>{result.features.domain_length}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-border/50">
                    <span className="text-muted-foreground">Entropy</span>
                    <span>{result.features.entropy.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-border/50">
                    <span className="text-muted-foreground">Levenshtein Distance</span>
                    <span>{result.features.levenshtein_distance}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-border/50">
                    <span className="text-muted-foreground">Jaro-Winkler Similarity</span>
                    <span>{result.features.jaro_winkler_similarity.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-border/50">
                    <span className="text-muted-foreground">Digit Count</span>
                    <span>{result.features.digit_count}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-border/50">
                    <span className="text-muted-foreground">Hyphen Count</span>
                    <span>{result.features.hyphen_count}</span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span className="text-muted-foreground">Subdomain Count</span>
                    <span>{result.features.subdomain_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  )
}
