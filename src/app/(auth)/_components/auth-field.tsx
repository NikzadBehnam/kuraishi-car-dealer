import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function AuthField({
  id,
  label,
  error,
  children,
  className,
}: AuthFieldProps) {
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm font-semibold text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
