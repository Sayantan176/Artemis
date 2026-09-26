import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { ShieldAlert, Link as LinkIcon, Mail, Activity } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from "../contexts/AuthContext"
import { db } from "../lib/firebase"
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"

export function Dashboard() {
  const { user } = useAuth()
  
  const [allScans, setAllScans] = useState<any[]>([])

  useEffect(() => {
    async function fetchScans() {
      if (!user) return
      try {
        const q = query(
          collection(db, "scans"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(100)
        )
        const querySnapshot = await getDocs(q)
        const scans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setAllScans(scans)
      } catch (error) {
        console.error("Error fetching scans:", error)
      }
    }
    fetchScans()
  }, [user])

  const recentScans = useMemo(() => allScans.slice(0, 5), [allScans])
  
  const metrics = useMemo(() => {
    const total = allScans.length
    const threats = allScans.filter(s => s.risk !== 'safe' && s.risk !== 'low').length
    const urls = allScans.filter(s => s.type === 'url').length
    const emails = allScans.filter(s => s.type === 'email').length
    return { total, threats, urls, emails }
  }, [allScans])

  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dataMap: Record<string, { scans: number, threats: number }> = {}
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dataMap[days[d.getDay()]] = { scans: 0, threats: 0 }
    }

    allScans.forEach(scan => {
      if (!scan.timestamp?.toDate) return
      const date = scan.timestamp.toDate()
      const dayName = days[date.getDay()]
      if (dataMap[dayName]) {
        dataMap[dayName].scans += 1
        if (scan.risk !== 'safe' && scan.risk !== 'low') {
          dataMap[dayName].threats += 1
        }
      }
    })

    return Object.keys(dataMap).map(name => ({
      name,
      ...dataMap[name]
    }))
  }, [allScans])

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">System Overview</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1">STATUS: ONLINE // REAL-TIME THREAT MONITORING</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">Total Scans</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono text-foreground">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card className="border-t-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">Threats Detected</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono text-destructive">{metrics.threats}</div>
          </CardContent>
        </Card>
        <Card className="border-t-secondary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">URLs Analyzed</CardTitle>
            <LinkIcon className="h-4 w-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono text-foreground">{metrics.urls}</div>
          </CardContent>
        </Card>
        <Card className="border-t-secondary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">Emails Scanned</CardTitle>
            <Mail className="h-4 w-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono text-foreground">{metrics.emails}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4 border-t-primary">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest text-sm">Threat Detection Vector</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#4B5563" tick={{fill: '#9CA3AF'}} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4B5563" tick={{fill: '#9CA3AF'}} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '2px', fontFamily: 'JetBrains Mono' }}
                    itemStyle={{ color: '#F3F4F6' }}
                  />
                  <Area type="monotone" dataKey="scans" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorScans)" />
                  <Area type="monotone" dataKey="threats" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorThreats)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-3 border-t-primary">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest text-sm">Action Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentScans.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent scans found.</div>
              ) : (
                recentScans.map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0 hover:bg-muted/50 p-2 -mx-2 rounded-sm transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-sm ${item.risk === 'safe' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : item.risk === 'suspicious' ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium leading-none text-foreground truncate max-w-[200px]">{item.target}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-mono tracking-wider">{item.type} Scanner • {item.risk} Risk</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                      {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : 'Just now'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
