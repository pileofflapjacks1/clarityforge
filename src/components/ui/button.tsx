import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 min-h-11 px-3.5 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "border border-[color:color-mix(in_srgb,var(--accent)_50%,var(--border))] bg-[var(--accent-dim)] text-foreground hover:bg-[color-mix(in_srgb,var(--accent)_28%,transparent)]",
        secondary:
          "border border-border bg-panel text-foreground hover:bg-panel-2",
        ghost: "text-muted hover:bg-panel hover:text-foreground",
        danger:
          "border border-[color:color-mix(in_srgb,var(--danger)_55%,var(--border))] bg-[var(--danger-dim)] text-[#fecaca] hover:bg-[color-mix(in_srgb,var(--danger)_35%,transparent)]",
        freeze:
          "border border-[color:color-mix(in_srgb,var(--danger)_70%,var(--border))] bg-[var(--danger)] text-white hover:opacity-90",
        ok: "border border-[color:color-mix(in_srgb,var(--ok)_50%,var(--border))] bg-[var(--ok-dim)] text-foreground hover:bg-[color-mix(in_srgb,var(--ok)_28%,transparent)]",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-3 text-xs",
        lg: "h-12 px-5",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={asChild ? undefined : type}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
