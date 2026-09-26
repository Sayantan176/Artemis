import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link as LinkIcon, Mail, MessageSquare, Database, Layers, Bug, Zap, CheckCircle2, ShieldAlert, Terminal, ChevronRight, Crosshair } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { cn } from "../utils/cn"

export function HowItWorks() {
  const [activeModel, setActiveModel] = useState<'url' | 'email' | 'sms'>('email')
  const [activeLayer, setActiveLayer] = useState<number>(0)

  const models = {
    url: {
      icon: LinkIcon,
      title: "URL Classification",
      description: "Random Forest model analyzing 25+ numerical & lexical features.",
      dataset: "651,200 labeled URLs (benign, defacement, phishing, malware)",
      classes: [
        { name: "Benign", desc: "Safe, legitimate websites." },
        { name: "Phishing", desc: "Decoy pages designed to steal credentials." },
        { name: "Malware", desc: "Links hosting malicious binaries." },
        { name: "Defacement", desc: "Hacked websites displaying unauthorized content." }
      ]
    },
    email: {
      icon: Mail,
      title: "Email Classification",
      description: "Multi-Modal NLP Model processing structural metadata and TF-IDF vectors.",
      dataset: "23,332 perfectly balanced 5-class emails compiled from 7 recognized sources",
      classes: [
        { name: "Ham", desc: "Legitimate personal or business emails." },
        { name: "Promotional", desc: "Unsolicited but safe marketing newsletters." },
        { name: "Phishing", desc: "Deceptive emails to steal credentials." },
        { name: "Scam", desc: "High-risk extortion or advance-fee frauds." },
        { name: "Spam", desc: "Generic bulk junk (non-threatening)." }
      ]
    },
    sms: {
      icon: MessageSquare,
      title: "SMS Classification",
      description: "Short-text NLP pipeline optimized for rapid mobile threats.",
      dataset: "10,191 balanced modern text messages from Mendeley Data",
      classes: [
        { name: "Ham", desc: "Safe, legitimate conversational texts." },
        { name: "Spam", desc: "Commercial advertising texts." },
        { name: "Smishing", desc: "Mobile phishing (bank alerts, urgent parcels)." }
      ]
    }
  }

  const layers = [
    {
      title: "Layer 1: Stacked URL Scan",
      desc: "Extracts links from emails. If the dedicated URL model flags a link as malicious (phishing/malware) with >35% confidence, it triggers an immediate phishing override.",
      icon: Crosshair
    },
    {
      title: "Layer 2: Short-Text Safeguard",
      desc: "Short emails (<500 chars) are scanned for social engineering triggers. 2+ triggers ('urgent', 'compromised') automatically bypass standard NLP to prevent tree underfitting.",
      icon: ShieldAlert
    },
    {
      title: "Layer 3: Legitimate Overlay",
      desc: "Solves Enron-skew bias. If predicted phishing but lacks any Call-to-Action (No URLs, Emails, or Phones), it safely overrides the prediction back to 'Ham'.",
      icon: CheckCircle2
    }
  ]

  const bugs = [
    {
      id: "BUG-01",
      title: "Typosquatting Brand Mismatch",
      issue: "Simple substring matching flagged official domains (google.com) as malicious.",
      fix: "Implemented tldextract to verify if the registered domain precisely matches the brand keyword."
    },
    {
      id: "BUG-02",
      title: "Dataset Shortcut Leakage",
      issue: "Model learned that 'http://' meant malicious because 96% of malware URLs had it vs 8% of benign.",
      fix: "Engineered a pre-processing normalization step to strip protocols before lexical extraction."
    },
    {
      id: "OPT-01",
      title: "Training Pipeline Speed Bottleneck",
      issue: "High-capacity TF-IDF + 30 features took over 10 minutes to train locally.",
      fix: "Utilized full multi-core CPU parallelism (n_jobs=-1), dropping execution to <25 seconds."
    }
  ]

  // We define a component placeholder since lucide Crosshair isn't imported above, wait I imported Crosshair? No I didn't import Crosshair. Let me import it.
  
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight uppercase">Artemis ML Architecture</h1>
        <p className="text-muted-foreground text-sm font-mono max-w-3xl leading-relaxed">
          COMPLETE CONTEXT-TRANSFER BRIDGE // VISUALIZING DATASETS, FEATURE ENGINEERING, AND PREDICTIVE PIPELINES
        </p>
      </div>

      {/* Model Selector Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold uppercase tracking-widest text-primary">Core Threat Models</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(models) as Array<keyof typeof models>).map((key) => {
            const model = models[key]
            const Icon = model.icon
            const isActive = activeModel === key
            return (
              <button
                key={key}
                onClick={() => setActiveModel(key)}
                className={cn(
                  "p-4 rounded-md border font-mono text-left transition-all duration-300 relative overflow-hidden",
                  isActive 
                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                    : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="model-glow"
                    className="absolute inset-0 bg-primary/5 z-0"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-bold uppercase tracking-widest text-sm">{model.title}</span>
                </div>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeModel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-t-primary">
              <CardHeader>
                <CardTitle className="font-mono uppercase text-sm">{models[activeModel].title} Specifications</CardTitle>
                <CardDescription className="text-foreground">{models[activeModel].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-3 rounded-md border border-border">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Training Dataset</span>
                  <p className="font-mono text-sm text-primary">{models[activeModel].dataset}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {models[activeModel].classes.map((cls, idx) => (
                    <div key={idx} className="flex gap-3 items-start border border-border/50 p-3 rounded-md bg-card/30">
                      <div className={cn(
                        "w-2 h-2 mt-1.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]",
                        cls.name === 'Benign' || cls.name === 'Ham' || cls.name === 'Promotional' ? "text-success bg-success" :
                        cls.name === 'Phishing' || cls.name === 'Smishing' || cls.name === 'Scam' || cls.name === 'Malware' ? "text-destructive bg-destructive" :
                        "text-warning bg-warning"
                      )} />
                      <div>
                        <h4 className="font-mono text-sm uppercase tracking-wider">{cls.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cls.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Stacked Architecture Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold uppercase tracking-widest text-primary">Stacked Security Engine</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Email analyzer doesn't rely on a single ML prediction. It routes data through a multi-layered verification system to eliminate false positives on benign content while maintaining extremely high sensitivity to real threats.
        </p>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-3">
            {layers.map((layer, idx) => {
              const isActive = activeLayer === idx
              return (
                <button
                  key={idx}
                  onClick={() => setActiveLayer(idx)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-md border font-mono text-left transition-all",
                    isActive 
                      ? "bg-secondary text-secondary-foreground border-secondary shadow-[0_0_15px_rgba(var(--secondary),0.15)]" 
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-background/50 border border-border text-[10px]">
                      {idx + 1}
                    </div>
                    <span className="uppercase text-xs tracking-widest font-bold">{layer.title}</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", isActive ? "opacity-100" : "opacity-0 -translate-x-2")} />
                </button>
              )
            })}
          </div>

          <div className="w-full md:w-2/3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeLayer}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Card className="h-full border-t-secondary bg-gradient-to-br from-card to-secondary/5">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-md bg-secondary/20 flex items-center justify-center mb-4 border border-secondary/30">
                      {(() => {
                        const Icon = layers[activeLayer].icon
                        return <Icon className="w-5 h-5 text-secondary-foreground" />
                      })()}
                    </div>
                    <CardTitle className="font-mono uppercase tracking-widest text-lg text-secondary-foreground">
                      {layers[activeLayer].title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed font-mono text-sm border-l-2 border-secondary pl-4 py-1">
                      {layers[activeLayer].desc}
                    </p>
                    
                    {/* Visualizer pseudo-terminal */}
                    <div className="mt-6 rounded-sm border border-border bg-[#0a0a0a] p-4 font-mono text-xs overflow-hidden">
                      <div className="flex items-center gap-2 mb-3 opacity-50">
                        <div className="w-2 h-2 rounded-full bg-destructive"></div>
                        <div className="w-2 h-2 rounded-full bg-warning"></div>
                        <div className="w-2 h-2 rounded-full bg-success"></div>
                      </div>
                      
                      {activeLayer === 0 && (
                        <div className="space-y-1 text-muted-foreground">
                          <p>&gt; EXTRACTING payload...</p>
                          <p>&gt; Found: <span className="text-warning">http://update-billing-secure.com</span></p>
                          <p>&gt; Routing to URL Classifier...</p>
                          <p>&gt; RESULT: <span className="text-destructive font-bold">PHISHING</span> (Conf: 89%)</p>
                          <p>&gt; <span className="text-primary font-bold">SYSTEM OVERRIDE INITIATED.</span></p>
                        </div>
                      )}
                      
                      {activeLayer === 1 && (
                        <div className="space-y-1 text-muted-foreground">
                          <p>&gt; CharCount: 124 <span className="text-success">(SHORT_TEXT)</span></p>
                          <p>&gt; Scanning Social Engineering vectors...</p>
                          <p>&gt; Match: <span className="text-destructive">['urgent', 'compromised']</span></p>
                          <p>&gt; Threat Threshold Met (&gt;=2)</p>
                          <p>&gt; <span className="text-primary font-bold">SYSTEM OVERRIDE INITIATED.</span></p>
                        </div>
                      )}

                      {activeLayer === 2 && (
                        <div className="space-y-1 text-muted-foreground">
                          <p>&gt; Base Prediction: <span className="text-warning">SCAM</span></p>
                          <p>&gt; Scanning Call-to-Actions (URLs, Emails, Phones)...</p>
                          <p>&gt; CTA Found: <span className="text-destructive">FALSE</span></p>
                          <p>&gt; Threat Signature: <span className="text-destructive">FALSE</span></p>
                          <p>&gt; Evaluating Enron-bias protocol...</p>
                          <p>&gt; <span className="text-success font-bold">DOWNGRADING TO HAM.</span></p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Debug & Optimization Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold uppercase tracking-widest text-primary">Architecture Patches & Optimizations</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bugs.map((bug, i) => (
            <Card key={i} className="flex flex-col border-t-warning/50 bg-card/40 hover:bg-card/80 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest bg-warning/10 text-warning px-2 py-1 rounded-sm border border-warning/20">
                    {bug.id}
                  </span>
                  {bug.id.startsWith("OPT") ? <Zap className="w-4 h-4 text-warning" /> : <Bug className="w-4 h-4 text-warning" />}
                </div>
                <CardTitle className="text-sm uppercase tracking-wide font-mono leading-tight">{bug.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-mono tracking-widest">The Issue</span>
                  <p className="text-foreground leading-relaxed">{bug.issue}</p>
                </div>
                <div className="space-y-1 mt-auto pt-4 border-t border-border/50">
                  <span className="text-[10px] uppercase text-primary font-mono tracking-widest">The Fix</span>
                  <p className="text-muted-foreground leading-relaxed">{bug.fix}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
