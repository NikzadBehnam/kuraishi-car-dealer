import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Fuel, Gauge, Settings2, Zap } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import type {
  PublicInventoryVehicleDTO,
  PublicVehicleCardImageDTO,
} from "@/types/inventory";
import {
  formatCurrency,
  formatFuelType,
  formatMileage,
  formatRegistration,
  formatTransmission,
} from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VehicleActions } from "./vehicle-actions";
import { VehicleImagePlaceholder } from "./vehicle-image-placeholder";
import { routeBuilders } from "@/config/routes.config";
export function VehicleCard({
  vehicle,
  inventoryImages,
  variant = "grid",
}: {
  vehicle: Vehicle | PublicInventoryVehicleDTO;
  inventoryImages?: PublicVehicleCardImageDTO[];
  variant?: "grid" | "list" | "compact";
}) {
  const detailsHref = routeBuilders.vehicleDetails(vehicle.slug);
  const inventoryImage = inventoryImages?.[0];
  const fixtureImage =
    inventoryImages === undefined && "images" in vehicle
      ? vehicle.images.find((src) => src.trim().length > 0)
      : undefined;
  const imageSrc = inventoryImage?.url ?? fixtureImage;
  const vehicleTitle = [vehicle.make, vehicle.model, vehicle.variant]
    .filter(Boolean)
    .join(" ");
  const imageAlt = inventoryImage?.altText?.trim() || vehicleTitle;
  const availabilityLabel =
    "status" in vehicle
      ? vehicle.status === "reserved"
        ? "Reserviert"
        : vehicle.status === "sold"
          ? "Verkauft"
          : "Sofort verfügbar"
      : vehicle.isAvailable
        ? "Sofort verfügbar"
        : "Derzeit nicht verfügbar";

  return (
    <Card
      className={
        variant === "list"
          ? "group grid h-full overflow-hidden rounded-[var(--radius-sm)] md:grid-cols-[18rem_1fr]"
          : "group flex h-full flex-col overflow-hidden rounded-[var(--radius-sm)]"
      }
    >
      <Link
        className="bg-secondary relative block aspect-[21/10] overflow-hidden focus-visible:outline-none"
        href={detailsHref}
        aria-label={`${vehicle.make} ${vehicle.model} Details ansehen`}
      >
        {imageSrc ? (
          <Image
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            src={imageSrc}
            alt={imageAlt}
          />
        ) : (
          <VehicleImagePlaceholder />
        )}
        {vehicle.labels.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {vehicle.labels.map((label) => (
              <Badge key={label}>{label}</Badge>
            ))}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link className="min-w-0" href={detailsHref}>
          <h2 className="font-heading truncate text-lg font-extrabold tracking-tight">
            {vehicle.make} {vehicle.model}
          </h2>
          {vehicle.variant && (
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              {vehicle.variant}
            </p>
          )}
        </Link>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-2xl font-black tracking-tight">
            {vehicle.price === null
              ? "Preis auf Anfrage"
              : formatCurrency(vehicle.price)}
          </p>
          <span
            className={`shrink-0 text-[0.68rem] font-extrabold uppercase ${
              vehicle.isAvailable ? "text-success" : "text-muted-foreground"
            }`}
          >
            {availabilityLabel}
          </span>
        </div>

        <div className="text-muted-foreground mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <span className="flex min-w-0 items-center gap-1">
            <Gauge className="size-4" />
            <span className="truncate">
              {vehicle.mileage === null
                ? "Keine Angabe"
                : formatMileage(vehicle.mileage)}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <Fuel className="size-4" />
            <span className="truncate">
              {vehicle.fuelType === null
                ? "Keine Angabe"
                : formatFuelType(vehicle.fuelType)}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <Settings2 className="size-4" />
            <span className="truncate">
              {vehicle.transmissionType === null
                ? "Keine Angabe"
                : formatTransmission(vehicle.transmissionType)}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <Zap className="size-4" />
            <span className="truncate">
              {vehicle.powerKw === null
                ? "Keine Angabe"
                : `${vehicle.powerKw} kW`}
              {" · "}
              {vehicle.firstRegistration === null
                ? "Keine Angabe"
                : formatRegistration(vehicle.firstRegistration)}
            </span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t p-3">
        <VehicleActions vehicleId={vehicle.id} compact />
        <Button
          asChild
          variant="accent"
          className="min-w-0 flex-1 rounded-[var(--radius-sm)]"
        >
          <Link href={detailsHref}>
            Details
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
