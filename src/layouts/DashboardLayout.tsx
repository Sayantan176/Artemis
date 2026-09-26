import { Outlet, Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Link as LinkIcon, Mail, MessageSquare, Shield, Bell, Settings, FileCode, Users, AlertOctagon, Globe, Search, Flag } from "lucide-react"
import { cn } from "../utils/cn"
import { useAuth } from "../contexts/AuthContext"
import { auth } from "../lib/firebase"
import { useTheme } from "../components/ThemeProvider"
import { useEffect } from "react"

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'URL Scanner', href: '/app/url-scanner', icon: LinkIcon },
  { name: 'Email Analyzer', href: '/app/email-analyzer', icon: Mail },
// { name: 'ImageX Scanner', href: '/app/imagex-scanner', icon: BrainCircuit },
  { name: 'Message Scanner', href: '/app/message-scanner', icon: MessageSquare },
  { name: 'Mule Scanner', href: '/app/mulex-scanner', icon: Users },
  { name: 'Origin Trace', href: '/app/origin-trace', icon: Globe },
  { name: 'Domain Lookalike', href: '/app/lookalike-scanner', icon: Search },
  { name: 'Abuse Reporting', href: '/app/abuse-report', icon: Flag },
  { name: 'How It Works', href: '/app/how-it-works', icon: FileCode },
  { name: 'Report Crime', href: '/app/report-crime', icon: AlertOctagon },
]

export function DashboardLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const { setTheme } = useTheme()

  useEffect(() => {
    setTheme("dark")
  }, [setTheme])

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col sticky top-0 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Shield className="w-5 h-5 text-foreground" />
            <span>Artemis</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Scanners</div>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-4 w-4 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-muted-foreground rounded-md transition-colors">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center border border-border">
              <span className="text-foreground text-[10px] uppercase">
                {user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <span className="truncate flex-1 text-left">{user?.email || 'User Account'}</span>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="md:hidden flex items-center gap-2">
             <Shield className="w-5 h-5 text-foreground" />
             <span className="font-semibold text-lg">Artemis</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button 
              onClick={() => alert("No new notifications")}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button 
              onClick={() => alert("Settings panel will be available in a future update")}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
