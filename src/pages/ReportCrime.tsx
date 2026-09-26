import { ShieldAlert, ExternalLink, PhoneCall, FileText, Landmark, MessageSquare, Monitor, PauseCircle } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { motion } from "framer-motion"

const steps = [
  {
    icon: PhoneCall,
    text: "Victims of cyber fraud call on Helpline no. 1930(earlier 155260), which is manned and operated by the concerned State Police."
  },
  {
    icon: FileText,
    text: "The Police operator notes down the fraud transaction details and basic personal information of the caller and submits them in the form of a Ticket on the Citizen Financial Cyber Frauds Reporting and Management System."
  },
  {
    icon: Landmark,
    text: "The Ticket gets escalated to the concerned Banks, Wallets, and Merchants and so on. Depending on whether they are the victim's bank or the bank/wallet in which the defrauded money has gone."
  },
  {
    icon: MessageSquare,
    text: "An SMS is also sent to the victim with an acknowledgement number of the complaint with direction to submit complete details of the fraud on the National Cybercrime Reporting Portal (https://cybercrime.gov.in) using the acknowledgement number. An SMS regarding the complaint is also sent to Nodal officer of the Financial Institution (FI)."
  },
  {
    icon: Monitor,
    text: "The concerned Bank, which can now see the ticket on its dashboard on the Reporting Portal, checks the details in its internal systems."
  },
  {
    icon: PauseCircle,
    text: "If the defrauded money is still available, the Bank puts it on hold, i.e., the fraudster cannot withdraw the money. If the defrauded money has moved out to another Bank, the Ticket gets escalated to the next Bank to which the money has moved out. This process is repeated until the money is saved from reaching into the hands of the fraudsters. The information regarding the action taken by respective FI will be informed to the concerned State Police."
  }
]

export function ReportCrime() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-destructive" />
            Report Cybercrime
          </h1>
          <p className="text-muted-foreground text-xs font-mono mt-1 uppercase">
            Working of Citizen Financial Cyber Fraud Reporting and Management System
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="bg-destructive/10 text-destructive px-3 py-1 rounded-sm border border-destructive/30 font-mono text-sm tracking-widest font-bold">
            HELPLINE: 1930
          </div>
          <Button 
            className="uppercase tracking-widest text-xs gap-2"
            onClick={() => window.open('https://cybercrime.gov.in/home', '_blank')}
          >
            NCRP Portal <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-l-4 border-l-primary bg-card/50 hover:bg-card transition-colors">
              <CardContent className="p-4 sm:p-6 flex gap-4 sm:gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    Step {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {step.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 p-6 border border-border bg-card/30 rounded-sm text-center space-y-4">
        <h3 className="font-mono text-sm uppercase tracking-widest text-foreground">Immediate Action Required?</h3>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          If you are a victim of cyber fraud, do not wait. Call the toll-free helpline or register your complaint immediately on the National Cybercrime Reporting Portal.
        </p>
        <Button 
          variant="destructive"
          className="uppercase tracking-widest text-xs gap-2"
          onClick={() => window.open('https://cybercrime.gov.in/home', '_blank')}
        >
          <ShieldAlert className="w-4 h-4" />
          Report to NCRP Now
        </Button>
      </div>
    </div>
  )
}
