import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-success inline-flex rounded-full bg-[#e8f5ef] px-2.5 py-1 text-[.68rem] font-extrabold tracking-wide uppercase dark:bg-emerald-950/60",
        className,
      )}
      {...props}
    />
  );
}
