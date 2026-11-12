"use client";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVehicleState } from "@/components/providers/vehicle-state-provider";
export function VehicleActions({
  vehicleId,
  compact = false,
}: {
  vehicleId: string;
  compact?: boolean;
}) {
  const { comparison, toggleComparison } = useVehicleState();
  return (
    <div className="flex gap-2">
      <Button
        variant={comparison.has(vehicleId) ? "accent" : "outline"}
        size={compact ? "icon" : "default"}
        aria-label={
          comparison.has(vehicleId)
            ? "Aus Vergleich entfernen"
            : "Zum Vergleich hinzufügen"
        }
        onClick={() => toggleComparison(vehicleId)}
      >
        <Scale />
        {!compact && "Vergleichen"}
      </Button>
    </div>
  );
}
