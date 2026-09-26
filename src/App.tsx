import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/ThemeProvider"
import { LandingLayout } from "./layouts/LandingLayout"
import { DashboardLayout } from "./layouts/DashboardLayout"
import { Landing } from "./pages/Landing"
import { Dashboard } from "./pages/Dashboard"
import { UrlScanner } from "./pages/UrlScanner"
import { EmailAnalyzer } from "./pages/EmailAnalyzer"
import { ImageXScanner } from "./pages/ImageXScanner"
import { MessageScanner } from "./pages/MessageScanner"
import { MulexScanner } from "./pages/MulexScanner"
import { OriginTraceability } from "./pages/OriginTraceability"
import { LookalikeScanner } from "./pages/LookalikeScanner"
import { AbuseReport } from "./pages/AbuseReport"
import { GlobalChatbot } from "./components/GlobalChatbot"
import { AuthProvider } from "./contexts/AuthContext"
import { Login } from "./pages/Login"
import { Signup } from "./pages/Signup"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { HowItWorks } from "./pages/HowItWorks"
import { ReportCrime } from "./pages/ReportCrime"

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route element={<LandingLayout />}>
            <Route path="/" element={<Landing />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Dashboard routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="url-scanner" element={<UrlScanner />} />
            <Route path="email-analyzer" element={<EmailAnalyzer />} />
            <Route path="imagex-scanner" element={<ImageXScanner />} />
            <Route path="message-scanner" element={<MessageScanner />} />
            <Route path="mulex-scanner" element={<MulexScanner />} />
            <Route path="origin-trace" element={<OriginTraceability />} />
            <Route path="lookalike-scanner" element={<LookalikeScanner />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="report-crime" element={<ReportCrime />} />
            <Route path="abuse-report" element={<AbuseReport />} />
          </Route>
          </Route>
        </Routes>
        <GlobalChatbot />
      </Router>
    </ThemeProvider>
    </AuthProvider>
  )
}

export default App
