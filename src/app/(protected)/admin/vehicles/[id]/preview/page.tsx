import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VehicleImagePlaceholder } from "@/components/vehicle/vehicle-image-placeholder";
import { adminRoutes } from "@/config/admin-routes.config";
import {
  formatBodyType,
  formatCurrency,
  formatFuelType,
  formatMileage,
  formatPower,
  formatRegistration,
  formatTransmission,
} from "@/lib/formatters";
import { getStaffVehicle } from "@/lib/inventory-queries";
import { listStaffVehiclePhotos } from "@/lib/vehicle-photos";
import { inventoryIdSchema } from "@/lib/inventory-validation";

export const dynamic = "force-dynamic";

const statusLabels = {
  draft: "Draft",
  published: "Published",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived",
} as const;

const conditionLabels = {
  used: "Used",
  demonstrator: "Demonstrator",
  annual: "Annual",
} as const;

export default async function VehiclePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = inventoryIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const vehicle = await getStaffVehicle(parsedId.data);
  if (!vehicle) notFound();
  const photos = await listStaffVehiclePhotos(vehicle.id);
  const title = `${vehicle.make} ${vehicle.model}`;
  const facts = [
    [
      "First registration",
      formatOptional(vehicle.firstRegistration, formatRegistration),
    ],
    ["Mileage", formatOptional(vehicle.mileage, formatMileage)],
    ["Fuel", vehicle.fuelType ? formatFuelType(vehicle.fuelType) : "—"],
    [
      "Transmission",
      vehicle.transmissionType
        ? formatTransmission(vehicle.transmissionType)
        : "—",
    ],
    [
      "Power",
      vehicle.powerKw !== null && vehicle.powerPs !== null
        ? formatPower(vehicle.powerKw, vehicle.powerPs)
        : "—",
    ],
    ["Body type", vehicle.bodyType ? formatBodyType(vehicle.bodyType) : "—"],
    ["Condition", vehicle.condition ? conditionLabels[vehicle.condition] : "—"],
    ["Color", vehicle.exteriorColor ?? "—"],
    ["Location", vehicle.location ?? "—"],
    ["Previous owners", vehicle.ownerCount?.toString() ?? "—"],
  ] as const;

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Staff-only saved preview</p>
          <h1 className="section-title mt-2">Vehicle details</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link
              href={`${adminRoutes.vehicles}/${encodeURIComponent(vehicle.id)}/edit`}
            >
              <ArrowLeft />
              Back to edit
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={adminRoutes.vehicles}>Inventory</Link>
          </Button>
        </div>
      </header>

      <Card
        role="note"
        className="border-warning/40 bg-warning/5 flex items-start gap-3 rounded-[var(--radius-sm)] p-4 shadow-none"
      >
        <Eye
          className="text-warning mt-0.5 size-5 shrink-0"
          aria-hidden="true"
        />
        <p className="text-sm leading-6">
          This preview is available only in the authenticated admin workspace
          and shows the last saved version. It is not the public vehicle page.
          Current status: <strong>{statusLabels[vehicle.status]}</strong>.
          Drafts and other ineligible vehicles remain hidden from public
          listings.
        </p>
      </Card>

      <article className="grid min-w-0 gap-5">
        <Card className="overflow-hidden rounded-[var(--radius-sm)] shadow-none">
          {photos.length ? (
            <div className="grid gap-1 sm:grid-cols-2">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`bg-secondary relative aspect-[16/10] overflow-hidden ${
                    index === 0 ? "sm:col-span-2 sm:aspect-[2.4/1]" : ""
                  }`}
                >
                  <Image
                    fill
                    unoptimized
                    sizes={
                      index === 0
                        ? "(max-width: 640px) 100vw, 90vw"
                        : "(max-width: 640px) 100vw, 45vw"
                    }
                    className="object-cover"
                    src={photo.previewUrl}
                    alt={photo.altText ?? `${title} photo ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative aspect-[16/10] overflow-hidden">
              <VehicleImagePlaceholder />
            </div>
          )}

          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm">
                {vehicle.location ?? "Location not provided"}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {title}
              </h2>
              {vehicle.variant && (
                <p className="text-muted-foreground mt-1">{vehicle.variant}</p>
              )}
            </div>
            <p className="text-2xl font-black tracking-tight sm:text-3xl">
              {vehicle.price !== null
                ? formatCurrency(Number(vehicle.price))
                : "Price not provided"}
            </p>
          </div>
        </Card>

        <Card className="rounded-[var(--radius-sm)] p-5 shadow-none sm:p-7">
          <h2 className="text-xl font-extrabold">Vehicle details</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([label, value]) => (
              <div
                key={label}
                className="bg-secondary/50 rounded-[var(--radius-sm)] p-3"
              >
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {vehicle.features.length > 0 && (
          <Card className="rounded-[var(--radius-sm)] p-5 shadow-none sm:p-7">
            <h2 className="text-xl font-extrabold">Features</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {vehicle.features.map((feature) => (
                <li
                  key={feature}
                  className="bg-secondary/50 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
                >
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {vehicle.description && (
          <Card className="rounded-[var(--radius-sm)] p-5 shadow-none sm:p-7">
            <h2 className="text-xl font-extrabold">Description</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-7 whitespace-pre-wrap">
              {vehicle.description}
            </p>
          </Card>
        )}
      </article>
    </div>
  );
}

function formatOptional<T>(
  value: T | null,
  format: (value: T) => string,
): string {
  return value === null ? "—" : format(value);
}
