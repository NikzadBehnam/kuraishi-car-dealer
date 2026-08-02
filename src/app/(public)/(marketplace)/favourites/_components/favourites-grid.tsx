"use client";
import { vehicles } from "@/data/vehicles";
import { useVehicleState } from "@/components/providers/vehicle-state-provider";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { EmptyState } from "@/components/shared/empty-state";
export function FavouritesGrid() {
  const { favourites } = useVehicleState();
  const saved = vehicles.filter((vehicle) => favourites.has(vehicle.id));
  return saved.length ? (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {saved.map((vehicle) => (
        <VehicleCard vehicle={vehicle} key={vehicle.id} />
      ))}
    </div>
  ) : (
    <EmptyState
      title="Noch nichts gemerkt"
      description="Speichern Sie interessante Fahrzeuge und finden Sie sie hier jederzeit wieder."
    />
  );
}
