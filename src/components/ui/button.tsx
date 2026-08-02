import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-bold transition-[transform,background-color,color] duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]",
        accent:
          "bg-accent text-accent-foreground hover:brightness-90 dark:hover:brightness-110",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-95 dark:hover:brightness-110",
        outline: "border border-border bg-surface hover:bg-surface-muted",
        ghost: "hover:bg-surface-muted",
        destructive: "bg-destructive text-white",
        link: "rounded-none px-0 text-primary underline-offset-4 hover:translate-y-0 hover:underline",
      },
      size: {
        default: "px-4",
        sm: "px-4",
        lg: "px-4",
        icon: "w-9 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);
interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
export { Button, buttonVariants };
