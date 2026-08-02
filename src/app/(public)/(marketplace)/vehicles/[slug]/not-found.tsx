import { EmptyState } from "@/components/shared/empty-state";
export default function VehicleNotFound() {
  return (
    <EmptyState
      title="Fahrzeug nicht gefunden"
      description="Dieses Fahrzeug ist möglicherweise nicht mehr verfügbar."
    />
  );
}
