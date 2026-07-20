import Link from "next/link";
import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

const buttonClasses = (
  variant: "primary" | "secondary" | "ghost" | "outline",
  size: "sm" | "md" | "lg",
  className?: string,
) =>
  cn(
    "inline-flex cursor-pointer items-center justify-center font-mono text-xs uppercase tracking-widest transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none",
    variant === "primary" && "bg-accent text-foreground hover:bg-accent-dim",
    variant === "secondary" &&
      "bg-surface-elevated text-foreground border border-border hover:border-muted",
    variant === "ghost" && "text-muted-light hover:text-foreground",
    variant === "outline" &&
      "border border-border text-foreground hover:border-accent hover:text-accent",
    size === "sm" && "px-3 py-1.5",
    size === "md" && "px-5 py-2.5",
    size === "lg" && "px-8 py-3.5",
    className,
  );

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  /** When set, renders a link with button styles (avoids invalid <a><button>). */
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", href, type = "button", ...props }, ref) => {
    const classes = buttonClasses(variant, size, className);

    if (href) {
      return (
        <Link href={href} className={classes}>
          {props.children}
        </Link>
      );
    }

    return <button ref={ref} type={type} className={classes} {...props} />;
  },
);
Button.displayName = "Button";
