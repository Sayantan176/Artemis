import { ShieldAlert, Link as LinkIcon, Mail, ChevronRight, Terminal, Activity, Users } from "lucide-react"
import { Button } from "../components/ui/Button"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"

export function Landing() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
      
      <main className="flex-1 flex flex-col relative z-10">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-primary/30 bg-primary/10 text-primary mb-8 font-mono text-xs tracking-widest uppercase"
          >
            <Activity className="w-3 h-3" />
            <span>System Status: Optimal // Monitoring Active</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground max-w-4xl"
          >
            Advanced Threat Intelligence <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary-foreground">
              for Modern Networks
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl font-mono text-sm"
          >
            Deploy military-grade analysis models to detect, isolate, and neutralize phishing vectors across URLs, emails, and SMS gateways.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto gap-2 uppercase tracking-widest text-xs h-12">
                Deploy Sandbox <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/app/how-it-works">
              <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 uppercase tracking-widest text-xs h-12">
                <Terminal className="w-4 h-4" /> How It Works
              </Button>
            </Link>
          </motion.div>
        </section>

        <section id="features" className="py-24 bg-card/30 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {[
                {
                  icon: LinkIcon,
                  title: "URL Sandbox Analysis",
                  description: "Real-time deep scanning of web destinations, detecting malicious payloads and deceptive routing.",
                  metric: "99.9% Detection Rate"
                },
                {
                  icon: Mail,
                  title: "Email Forensic Engine",
                  description: "Comprehensive header extraction and content analysis to identify spear-phishing attempts.",
                  metric: "Sub-50ms Latency"
                },
                {
                  icon: ShieldAlert,
                  title: "SMS Threat Gateway",
                  description: "Mobile-focused pattern matching to neutralize smishing vectors before they compromise devices.",
                  metric: "Global Carrier Sync"
                },
                {
                  icon: Users,
                  title: "Mule Scanner",
                  description: "Detect synthetic identities and complex mule networks via multidimensional case study extraction.",
                  metric: "Groq ML Integrated"
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="group relative p-8 border border-border bg-card/50 hover:bg-card transition-colors overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="mb-6 inline-flex p-3 rounded-sm bg-primary/10 text-primary border border-primary/20">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 tracking-tight">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm font-mono leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  <div className="text-xs font-mono text-primary uppercase tracking-widest border-t border-border pt-4 mt-auto">
                    [ {feature.metric} ]
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
