"use client";
import { vehicles } from "@/data/vehicles";
import { useVehicleState } from "@/components/providers/vehicle-state-provider";
import {
  formatCurrency,
  formatFuelType,
  formatMileage,
  formatRegistration,
  formatTransmission,
} from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
export function ComparisonTable() {
  const { comparison, toggleComparison } = useVehicleState();
  const selected = vehicles
    .filter((vehicle) => comparison.has(vehicle.id))
    .slice(0, 3);
  if (!selected.length)
    return (
      <EmptyState
        title="Noch keine Fahrzeuge im Vergleich"
        description="Fügen Sie bis zu drei Fahrzeuge über die Vergleichsschaltfläche hinzu."
      />
    );
  const rows: Array<[string, (vehicle: (typeof vehicles)[number]) => string]> =
    [
      ["Preis", (vehicle) => formatCurrency(vehicle.price)],
      ["Monatliche Rate", (vehicle) => formatCurrency(vehicle.monthlyRate)],
      ["Kilometerstand", (vehicle) => formatMileage(vehicle.mileage)],
      [
        "Erstzulassung",
        (vehicle) => formatRegistration(vehicle.firstRegistration),
      ],
      ["Kraftstoff", (vehicle) => formatFuelType(vehicle.fuelType)],
      ["Getriebe", (vehicle) => formatTransmission(vehicle.transmissionType)],
      ["Leistung", (vehicle) => `${vehicle.powerKw} kW`],
      ["Verfügbarkeit", () => "Sofort verfügbar"],
    ];
  return (
    <div className="bg-surface overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Vergleich ausgewählter Fahrzeuge</caption>
        <thead>
          <tr>
            <th className="bg-surface sticky left-0 min-w-40 p-4">Merkmal</th>
            {selected.map((vehicle) => (
              <th
                className="min-w-60 border-l p-4"
                scope="col"
                key={vehicle.id}
              >
                {vehicle.make} {vehicle.model}
                <Button
                  className="mt-3 block"
                  size="sm"
                  variant="outline"
                  onClick={() => toggleComparison(vehicle.id)}
                >
                  Entfernen
                </Button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, getValue]) => (
            <tr key={label}>
              <th scope="row" className="bg-surface sticky left-0 border-t p-4">
                {label}
              </th>
              {selected.map((vehicle) => (
                <td className="border-t border-l p-4" key={vehicle.id}>
                  {getValue(vehicle)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
