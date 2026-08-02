import Image from "next/image";
import Link from "next/link";
import { Fuel, Gauge, Settings2, Zap } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import {
  formatCurrency,
  formatFuelType,
  formatMileage,
  formatRegistration,
  formatTransmission,
} from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VehicleActions } from "./vehicle-actions";
import { routeBuilders } from "@/config/routes.config";
export function VehicleCard({
  vehicle,
  variant = "grid",
}: {
  vehicle: Vehicle;
  variant?: "grid" | "list" | "compact";
}) {
  return (
    <Card
      className={
        variant === "list"
          ? "grid overflow-hidden rounded md:grid-cols-[18rem_1fr]"
          : "group overflow-hidden rounded"
      }
    >
      <div className="bg-secondary relative aspect-16/10 overflow-hidden">
        <Image
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          src={vehicle.images[0]}
          alt={`${vehicle.make} ${vehicle.model} ${vehicle.variant}`}
        />
        <div className="absolute top-3 right-3">
          <VehicleActions vehicleId={vehicle.id} compact />
        </div>
      </div>
      <div className="p-5">
        {vehicle.labels.map((label) => (
          <Badge key={label}>{label}</Badge>
        ))}
        <Link href={routeBuilders.vehicleDetails(vehicle.slug)}>
          <h2 className="font-heading mt-2 text-xl font-extrabold tracking-tight">
            {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-muted-foreground text-sm">{vehicle.variant}</p>
          <p className="mt-4 text-2xl font-black tracking-tight">
            {formatCurrency(vehicle.price)}
          </p>
          <p className="text-muted-foreground text-sm">
            ab {formatCurrency(vehicle.monthlyRate)} mtl.¹
          </p>
          <div className="text-muted-foreground mt-4 grid grid-cols-2 gap-2 text-xs">
            <span className="flex items-center gap-1">
              <Gauge className="size-4" />
              {formatMileage(vehicle.mileage)}
            </span>
            <span className="flex items-center gap-1">
              <Fuel className="size-4" />
              {formatFuelType(vehicle.fuelType)}
            </span>
            <span className="flex items-center gap-1">
              <Settings2 className="size-4" />
              {formatTransmission(vehicle.transmissionType)}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="size-4" />
              {vehicle.powerKw} kW ·{" "}
              {formatRegistration(vehicle.firstRegistration)}
            </span>
          </div>
        </Link>
      </div>
    </Card>
  );
}
