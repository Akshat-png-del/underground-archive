import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center font-mono text-xs uppercase tracking-widest transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none",
          variant === "primary" &&
            "bg-accent text-foreground hover:bg-accent-dim",
          variant === "secondary" &&
            "bg-surface-elevated text-foreground border border-border hover:border-muted",
          variant === "ghost" && "text-muted-light hover:text-foreground",
          variant === "outline" &&
            "border border-border text-foreground hover:border-accent hover:text-accent",
          size === "sm" && "px-3 py-1.5",
          size === "md" && "px-5 py-2.5",
          size === "lg" && "px-8 py-3.5",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
