"use client";
import Image from "next/image";
import { Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="bg-surface overflow-hidden rounded-[var(--radius-sm)] border">
      <Table className="border-collapse text-left">
        <TableCaption className="sr-only">
          Vergleich ausgewählter Fahrzeuge
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-surface sticky left-0 z-10 h-auto min-w-40 p-4 align-top">
              Merkmal
            </TableHead>
            {selected.map((vehicle) => (
              <TableHead
                className="h-auto min-w-72 border-l p-4 align-top"
                scope="col"
                key={vehicle.id}
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-extrabold">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">
                      {vehicle.variant}
                    </p>
                  </div>
                  <div className="bg-secondary relative h-16 w-24 overflow-hidden rounded-sm sm:justify-self-end">
                    <Image
                      fill
                      sizes="6rem"
                      src={vehicle.images[0]}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="object-cover"
                    />
                  </div>
                </div>
                <Button
                  className="mt-3 flex w-fit items-center justify-center"
                  size="sm"
                  variant="outline"
                  onClick={() => toggleComparison(vehicle.id)}
                >
                  <Trash2 />
                  Entfernen
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([label, getValue]) => (
            <TableRow key={label}>
              <TableHead
                scope="row"
                className="bg-surface sticky left-0 z-10 h-auto p-4"
              >
                {label}
              </TableHead>
              {selected.map((vehicle) => (
                <TableCell className="border-l p-4" key={vehicle.id}>
                  {getValue(vehicle)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
