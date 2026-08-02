import { cn } from "@/lib/utils";
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Inhalt wird geladen"
      className={cn("bg-secondary animate-pulse rounded-md", className)}
    />
  );
}
