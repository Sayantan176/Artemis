import { Outlet, Link } from "react-router-dom"
import { Shield } from "lucide-react"
import { Button } from "../components/ui/Button"
import { useAuth } from "../contexts/AuthContext"
import { ThemeToggle } from "../components/ThemeToggle"

export function LandingLayout() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Shield className="w-5 h-5 text-foreground" />
            <span>Artemis</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <Link to="/app/how-it-works" className="hover:text-foreground transition-colors">How it Works</Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <Button onClick={() => window.location.href='/app'} size="sm">
                Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Button onClick={() => window.location.href='/signup'} size="sm">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-background py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Artemis Security</span>
          </div>
          <p>© {new Date().getFullYear()} Artemis. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

// trigger HMR
