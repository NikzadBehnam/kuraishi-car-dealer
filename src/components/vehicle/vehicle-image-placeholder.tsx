import { Car } from "lucide-react";

export function VehicleImagePlaceholder({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label="Kein Fahrzeugbild verfügbar"
      className="bg-secondary text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2"
    >
      <Car className={compact ? "size-5" : "size-12"} aria-hidden="true" />
      {!compact && (
        <span className="text-center text-xs font-semibold">
          Kein Bild verfügbar
        </span>
      )}
    </div>
  );
}
