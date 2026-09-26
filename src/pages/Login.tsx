import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../lib/firebase"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Shield, Lock, Mail, AlertCircle } from "lucide-react"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate("/app")
    } catch (err: any) {
      setError(err.message || "Failed to log in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-sm space-y-8 relative z-10 p-8 border border-border bg-card/50 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Link to="/" className="flex items-center gap-2 text-foreground font-semibold mb-2 group">
            <div className="p-2 bg-primary/10 rounded-sm border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl tracking-tight">Artemis</span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">Authenticate</h1>
            <p className="text-xs text-muted-foreground font-mono">
              SECURE_SESSION_INIT // ENTER_CREDENTIALS
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 mt-8">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/30 flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Operator ID [Email]</label>
              <Input
                type="email"
                placeholder="name@Artemis.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Passkey</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full uppercase tracking-widest text-xs" isLoading={isLoading}>
            Initialize Session
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground font-mono border-t border-border pt-6 mt-6">
          NO_CLEARANCE?{" "}
          <Link to="/signup" className="text-primary hover:text-primary/80 transition-colors">
            [REQUEST_ACCESS]
          </Link>
        </div>
      </div>
    </div>
  )
}
