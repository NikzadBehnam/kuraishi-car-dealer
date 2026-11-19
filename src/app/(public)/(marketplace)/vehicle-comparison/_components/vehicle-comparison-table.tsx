"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { VehicleImagePlaceholder } from "@/components/vehicle/vehicle-image-placeholder";
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
import {
  formatCurrency,
  formatFuelType,
  formatMileage,
  formatPower,
  formatRegistration,
  formatTransmission,
} from "@/lib/formatters";
import type { PublicInventoryVehicleDTO } from "@/types/inventory";
import { useVehicleState } from "@/components/providers/vehicle-state-provider";

import { resolvePublicComparison } from "../actions";

type ComparisonEntry = Awaited<
  ReturnType<typeof resolvePublicComparison>
>[number];

type ComparisonRow = readonly [
  string,
  (vehicle: PublicInventoryVehicleDTO) => string,
];

const rows: ComparisonRow[] = [
  [
    "Preis",
    (vehicle) =>
      vehicle.price === null
        ? "Preis auf Anfrage"
        : formatCurrency(vehicle.price),
  ],
  [
    "Kilometerstand",
    (vehicle) =>
      vehicle.mileage === null ? "—" : formatMileage(vehicle.mileage),
  ],
  [
    "Erstzulassung",
    (vehicle) =>
      vehicle.firstRegistration === null
        ? "—"
        : formatRegistration(vehicle.firstRegistration),
  ],
  [
    "Kraftstoff",
    (vehicle) =>
      vehicle.fuelType === null ? "—" : formatFuelType(vehicle.fuelType),
  ],
  [
    "Getriebe",
    (vehicle) =>
      vehicle.transmissionType === null
        ? "—"
        : formatTransmission(vehicle.transmissionType),
  ],
  [
    "Leistung",
    (vehicle) =>
      vehicle.powerKw === null || vehicle.powerPs === null
        ? "—"
        : formatPower(vehicle.powerKw, vehicle.powerPs),
  ],
  [
    "Verfügbarkeit",
    (vehicle) =>
      vehicle.status === "reserved" ? "Reserviert" : "Sofort verfügbar",
  ],
];

export function ComparisonTable() {
  const {
    comparison,
    ready,
    toggleComparison,
    removeComparisonItems,
    clearComparison,
  } = useVehicleState();
  const [resolution, setResolution] = useState<{
    selectionKey: string;
    entries: ComparisonEntry[];
    failed: boolean;
  } | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const selectedIds = useMemo(() => [...comparison].slice(0, 3), [comparison]);
  const selectionKey = JSON.stringify(selectedIds);

  useEffect(() => {
    if (!ready || selectedIds.length === 0) {
      return;
    }

    let active = true;
    void resolvePublicComparison(selectedIds)
      .then((entries) => {
        if (!active) {
          return;
        }

        setResolution({ selectionKey, entries, failed: false });
        const resolvedIds = new Set(entries.map(({ vehicle }) => vehicle.id));
        const unavailableIds = selectedIds.filter((id) => !resolvedIds.has(id));
        if (unavailableIds.length > 0) {
          removeComparisonItems(unavailableIds);
        }
      })
      .catch(() => {
        if (active) {
          setResolution({ selectionKey, entries: [], failed: true });
        }
      });

    return () => {
      active = false;
    };
  }, [ready, selectedIds, selectionKey, retryToken, removeComparisonItems]);

  if (!ready) {
    return (
      <p className="text-muted-foreground py-12 text-center" role="status">
        Vergleichsauswahl wird geladen …
      </p>
    );
  }

  if (selectedIds.length === 0) {
    return (
      <EmptyState
        title="Noch keine Fahrzeuge im Vergleich"
        description="Fügen Sie bis zu drei Fahrzeuge über die Vergleichsschaltfläche hinzu."
      />
    );
  }

  const currentResolution =
    resolution?.selectionKey === selectionKey ? resolution : null;

  if (!currentResolution) {
    return (
      <p className="text-muted-foreground py-12 text-center" role="status">
        Vergleichsdaten werden geladen …
      </p>
    );
  }

  if (currentResolution.failed) {
    return (
      <div
        className="bg-surface grid justify-items-center gap-4 rounded-[var(--radius-sm)] border p-8 text-center"
        role="alert"
      >
        <p>Vergleichsdaten konnten nicht geladen werden.</p>
        <Button
          variant="outline"
          onClick={() => {
            setResolution(null);
            setRetryToken((current) => current + 1);
          }}
        >
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (currentResolution.entries.length === 0) {
    return (
      <EmptyState
        title="Noch keine Fahrzeuge im Vergleich"
        description="Nicht mehr vergleichbare Fahrzeuge wurden aus der Auswahl entfernt."
      />
    );
  }

  return (
    <div className="bg-surface overflow-hidden rounded-[var(--radius-sm)] border">
      <div className="flex justify-end border-b p-3">
        <Button variant="outline" size="sm" onClick={clearComparison}>
          Alle entfernen
        </Button>
      </div>
      <Table className="border-collapse text-left">
        <TableCaption className="sr-only">
          Vergleich ausgewählter Fahrzeuge
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-surface sticky left-0 z-10 h-auto min-w-40 p-4 align-top">
              Merkmal
            </TableHead>
            {currentResolution.entries.map(({ vehicle, images }) => {
              const primaryImage = images[0];
              return (
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
                        {vehicle.variant ?? "—"}
                      </p>
                    </div>
                    <div className="bg-secondary relative h-16 w-24 overflow-hidden rounded-sm sm:justify-self-end">
                      {primaryImage ? (
                        <Image
                          fill
                          sizes="6rem"
                          src={primaryImage.url}
                          alt={
                            primaryImage.altText?.trim() ||
                            `${vehicle.make} ${vehicle.model}`
                          }
                          className="object-cover"
                        />
                      ) : (
                        <VehicleImagePlaceholder compact />
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {vehicle.status === "reserved"
                      ? "Reserviert"
                      : "Sofort verfügbar"}
                  </p>
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
              );
            })}
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
              {currentResolution.entries.map(({ vehicle }) => (
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
