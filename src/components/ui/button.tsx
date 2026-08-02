import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-[transform,background-color,color] duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50",
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
        link: "min-h-0 rounded-none p-0 text-primary underline-offset-4 hover:translate-y-0 hover:underline",
      },
      size: {
        default: "h-11",
        sm: "min-h-9 px-4",
        lg: "h-13 px-7 text-base",
        icon: "size-11 p-0",
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
