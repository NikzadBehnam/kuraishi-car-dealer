"use client";
import { Heart, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVehicleState } from "@/components/providers/vehicle-state-provider";
export function VehicleActions({
  vehicleId,
  compact = false,
}: {
  vehicleId: string;
  compact?: boolean;
}) {
  const { favourites, comparison, toggleFavourite, toggleComparison } =
    useVehicleState();
  return (
    <div className="flex gap-2">
      <Button
        variant={favourites.has(vehicleId) ? "accent" : "outline"}
        size={compact ? "icon" : "default"}
        aria-label={
          favourites.has(vehicleId)
            ? "Aus Merkliste entfernen"
            : "Zur Merkliste hinzufügen"
        }
        onClick={() => toggleFavourite(vehicleId)}
      >
        <Heart className={favourites.has(vehicleId) ? "fill-current" : ""} />
        {!compact && "Merken"}
      </Button>
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
