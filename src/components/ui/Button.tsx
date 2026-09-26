import { forwardRef } from "react"
import { cn } from "../../utils/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[2px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 font-mono tracking-tight",
          
          // Variants with cyber-defense styling
          variant === "default" && "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)] hover:-translate-y-[1px] hover:shadow-[0_0_20px_-2px_rgba(59,130,246,0.6)] border border-primary/50",
          variant === "destructive" && "bg-destructive text-destructive-foreground shadow-[0_0_15px_-3px_rgba(239,68,68,0.5)] hover:-translate-y-[1px] hover:shadow-[0_0_20px_-2px_rgba(239,68,68,0.6)] border border-destructive/50",
          variant === "outline" && "border border-border bg-background hover:border-primary hover:text-primary shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] hover:bg-primary/5",
          variant === "secondary" && "bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/80",
          variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
          variant === "link" && "text-primary underline-offset-4 hover:underline",
          
          // Sizes
          size === "default" && "h-9 px-4 py-2",
          size === "sm" && "h-8 px-3 text-xs",
          size === "lg" && "h-10 px-8",
          size === "icon" && "h-9 w-9",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
