import { useState, useRef, useEffect } from "react"
import { Shield, CheckCircle2, AlertTriangle, UploadCloud, Terminal, MapPin, Globe, Server, User, Search, BrainCircuit, ScanSearch } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { motion } from "framer-motion"

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix for default marker icons in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface TraceHop {
  hop_index: number
  extracted_ip: string | null
  is_trusted: boolean
  reason: string
}

interface OriginProfile {
  email_id: string
  extraction: {
    origin_ip: string | null
    confidence: string
    trace: TraceHop[]
  }
  geolocation: {
    country: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
  } | null
  asn: {
    asn: number | null
    asn_org: string | null
  } | null
  ip_reputation: {
    is_vpn: boolean
    is_proxy: boolean
    is_datacenter: boolean
    is_tor: boolean
    provider_name: string | null
  } | null
  domain: {
    domain: string | null
    registrar: string | null
    domain_age_days: number | null
    spf_present: boolean
    dmarc_present: boolean
  } | null
  llm_prediction: {
    predicted_country: string
    confidence_score: string
    reasoning: string
    web_search_used: boolean
  } | null
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export function OriginTraceability() {
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<OriginProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [predictedCoords, setPredictedCoords] = useState<[number, number] | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (result?.llm_prediction?.predicted_country) {
      // Free Nominatim geocoding
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(result.llm_prediction.predicted_country)}&format=json&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setPredictedCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)])
          }
        })
        .catch(err => console.error("Geocoding failed", err))
    } else {
      setPredictedCoords(null)
    }
  }, [result])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setIsScanning(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("http://localhost:8000/api/scan/origin-trace", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to trace origin. Please check backend logs.")
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred during tracing.")
    } finally {
      setIsScanning(false)
    }
  }

  const resetScanner = () => {
    setResult(null)
    setError(null)
    setFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const renderTable = (headers: string[], rows: (string | React.ReactNode)[][], title?: string, titleIcon?: React.ReactNode) => (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase font-mono italic">
          {titleIcon} {title}
        </div>
      )}
      <div className="border border-border/50 rounded overflow-hidden">
        <table className="w-full text-left text-sm font-mono">
          <thead className="bg-secondary/20">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2 text-primary border-b border-r border-border/50 font-semibold last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/10 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2 border-r border-border/50 last:border-r-0">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const coords: [number, number] | null = result?.geolocation?.latitude && result?.geolocation?.longitude 
    ? [result.geolocation.latitude, result.geolocation.longitude] 
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight uppercase font-mono flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> Origin Traceability
        </h1>
        <p className="text-muted-foreground text-sm font-mono">
          Defeat cloud webmail IP masking using chronological header tracing and Semantic OSINT.
        </p>
      </div>

      {!result && !isScanning ? (
        <Card className="border-dashed border-2 border-border/50 hover:border-primary/50 transition-colors bg-card/30">
          <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".eml"
              className="hidden" 
            />
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload .EML File</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Select an email file (.eml) to initiate forensic origin tracing.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Browse Files
            </Button>
          </div>
        </Card>
      ) : isScanning ? (
        <Card className="bg-card/50">
          <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
              <Globe className="w-12 h-12 text-muted-foreground m-2 animate-pulse" />
            </div>
            <div className="space-y-1 text-center font-mono">
              <p className="text-primary font-medium tracking-widest uppercase">Executing Trace</p>
              <p className="text-xs text-muted-foreground">Parsing Headers & Running Semantic Search...</p>
            </div>
          </div>
        </Card>
      ) : error ? (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive" />
            <div className="space-y-2">
              <p className="text-destructive font-semibold">Trace Execution Failed</p>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
            <Button variant="outline" onClick={resetScanner}>Try Again</Button>
          </CardContent>
        </Card>
      ) : result ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex justify-between items-center bg-card/50 p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded border border-primary/30">
                <ScanSearch className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground uppercase font-mono tracking-widest">Origin Traceability Report</h2>
            </div>
            <Button variant="outline" size="sm" onClick={resetScanner}>New Trace</Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Table 1: Extraction Summary */}
              {renderTable(
                ["Field", "Value"],
                [
                  ["Email ID", result.email_id],
                  ["Origin IP", <span className="text-primary font-bold">{result.extraction.origin_ip || "Unknown"}</span>],
                  ["Confidence", <span className={result.extraction.confidence === "high" ? "text-green-500" : "text-yellow-500"}>{result.extraction.confidence.toUpperCase()}</span>]
                ]
              )}

              {/* Table 2: Header Trace Audit */}
              {renderTable(
                ["Hop", "Extracted IP", "Trusted?", "Reason / Classifier"],
                result.extraction.trace.map(hop => [
                  hop.hop_index.toString(),
                  hop.extracted_ip || "None",
                  hop.is_trusted ? <span className="text-green-500">Yes</span> : <span className="text-red-500 font-bold">No</span>,
                  hop.reason
                ]),
                "Header Trace Audit (Chronological)"
              )}

              {/* Table 3: Physical Origin & Network */}
              {renderTable(
                ["Country", "City", "Coordinates", "ASN", "Network Org"],
                [[
                  result.geolocation?.country || "Unknown",
                  result.geolocation?.city || "Unknown",
                  result.geolocation?.latitude ? `${result.geolocation.latitude}, ${result.geolocation.longitude}` : "Unknown",
                  result.asn?.asn ? `AS${result.asn.asn}` : "Unknown",
                  result.asn?.asn_org || "Unknown"
                ]],
                "Physical Origin & Network (MaxMind)"
              )}

              {/* Table 4: Origin IP Intelligence */}
              {renderTable(
                ["Provider / ISP", "Datacenter?", "VPN?", "Proxy?"],
                [[
                  (result.asn?.asn ? `AS${result.asn.asn} ` : "") + (result.asn?.asn_org || "Unknown"),
                  result.ip_reputation?.is_datacenter ? <span className="text-red-500">Yes</span> : "No",
                  result.ip_reputation?.is_vpn ? <span className="text-red-500">Yes</span> : "No",
                  result.ip_reputation?.is_proxy ? <span className="text-red-500">Yes</span> : "No"
                ]],
                "Origin IP Intelligence"
              )}

              {/* Table 5: Claimed Sender Domain */}
              {renderTable(
                ["Domain", "Registrar", "Age (Days)", "SPF Present", "DMARC Present"],
                [[
                  result.domain?.domain || "Unknown",
                  result.domain?.registrar || "Unknown",
                  result.domain?.domain_age_days !== null ? result.domain?.domain_age_days.toString() : "Unknown",
                  result.domain?.spf_present ? <span className="text-green-500">Yes</span> : <span className="text-red-500">No</span>,
                  result.domain?.dmarc_present ? <span className="text-green-500">Yes</span> : <span className="text-red-500">No</span>
                ]],
                "Claimed Sender Domain"
              )}

              {/* Table 6: OSINT Contextual Attribution */}
              {result.llm_prediction && renderTable(
                ["Predicted Country", "Confidence", "Web Search Fallback", "Reasoning"],
                [[
                  <span className="text-yellow-500 font-bold">{result.llm_prediction.predicted_country}</span>,
                  <span className={result.llm_prediction.confidence_score.toUpperCase() === "HIGH" ? "text-green-500" : "text-yellow-500"}>{result.llm_prediction.confidence_score.toUpperCase()}</span>,
                  result.llm_prediction.web_search_used ? <span className="text-primary">Yes</span> : "No",
                  <div className="max-w-xs md:max-w-md whitespace-normal">{result.llm_prediction.reasoning}</div>
                ]],
                "OSINT Contextual Attribution (Groq LLM)"
              )}
            </div>

            <div className="xl:h-[1000px] h-[500px] border-2 border-border/50 rounded-lg overflow-hidden relative">
              <div className="absolute top-4 left-4 z-[1000] bg-background/80 backdrop-blur border border-border p-3 rounded-md text-sm font-mono shadow-xl">
                <div className="flex items-center gap-2 mb-2 font-bold text-foreground">
                  <MapPin className="w-4 h-4 text-primary" /> Map Intelligence
                </div>
                {coords ? (
                  <>
                    <p className="text-muted-foreground">Original IP Location Plotted</p>
                    <p className="mt-1">Lat: {coords[0].toFixed(4)}, Lng: {coords[1].toFixed(4)}</p>
                  </>
                ) : (
                  <p className="text-yellow-500">No physical coordinates extracted.</p>
                )}
                {result.llm_prediction && (
                  <p className="mt-2 text-primary font-bold">Predicted Origin: {result.llm_prediction.predicted_country}</p>
                )}
              </div>
              {(coords || predictedCoords) ? (
                <MapContainer center={coords || predictedCoords || [20, 0]} zoom={coords && predictedCoords ? 2 : 4} style={{ height: '100%', width: '100%' }}>
                  <MapUpdater center={coords || predictedCoords || [20, 0]} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_332m_1_23cc1144485231b6779bca53"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  {coords && (
                    <Marker position={coords}>
                      <Popup className="font-mono">
                        <b>MaxMind Extraction:</b><br/>
                        {result.geolocation?.country}, {result.geolocation?.city}
                      </Popup>
                    </Marker>
                  )}
                  {predictedCoords && (
                    <Marker position={predictedCoords}>
                      <Popup className="font-mono text-yellow-600">
                        <b>OSINT Predicted Origin:</b><br/>
                        {result.llm_prediction?.predicted_country}
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              ) : (
                <div className="w-full h-full bg-secondary/10 flex flex-col items-center justify-center font-mono text-muted-foreground p-6 text-center">
                  <Globe className="w-16 h-16 mb-4 opacity-50" />
                  <p>Physical IP Location Unavailable.</p>
                  <p className="text-sm mt-2 opacity-70">
                    If OSINT Attribution predicted a country, the trace relies entirely on contextual heuristics rather than Network GeoIP.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
