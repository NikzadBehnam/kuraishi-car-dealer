import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  CarFront,
  Check,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VehicleActions } from "@/components/vehicle/vehicle-actions";
import { publicRoutes } from "@/config/routes.config";
import {
  formatBodyType,
  formatCurrency,
  formatFuelType,
  formatMileage,
  formatPower,
  formatRegistration,
  formatTransmission,
} from "@/lib/formatters";
import type { PublicVehicleDetailDTO } from "@/types/inventory";

import { VehicleImageGallery } from "./vehicle-image-gallery";

export function InventoryVehicleDetail({
  vehicle,
  images,
}: {
  vehicle: PublicVehicleDetailDTO;
  images: string[];
}) {
  const title = `${vehicle.make} ${vehicle.model}`;
  const contactHref =
    vehicle.status === "published"
      ? `${publicRoutes.contact}?vehicle=${encodeURIComponent(vehicle.slug)}`
      : publicRoutes.contact;
  const contactLabel =
    vehicle.status === "sold"
      ? "Allgemeine Anfrage stellen"
      : vehicle.status === "reserved"
        ? "Kontakt für Statusinformationen"
        : "Händler kontaktieren";
  const statusLabel =
    vehicle.status === "published"
      ? "Sofort verfügbar"
      : vehicle.status === "reserved"
        ? "Reserviert"
        : "Verkauft";
  const facts = [
    [
      "Erstzulassung",
      formatOptional(vehicle.firstRegistration, formatRegistration),
    ],
    ["Kilometerstand", formatOptional(vehicle.mileage, formatMileage)],
    ["Kraftstoff", vehicle.fuelType ? formatFuelType(vehicle.fuelType) : "—"],
    [
      "Getriebe",
      vehicle.transmissionType
        ? formatTransmission(vehicle.transmissionType)
        : "—",
    ],
    [
      "Leistung",
      vehicle.powerKw !== null && vehicle.powerPs !== null
        ? formatPower(vehicle.powerKw, vehicle.powerPs)
        : "—",
    ],
    ["Fahrzeugtyp", vehicle.bodyType ? formatBodyType(vehicle.bodyType) : "—"],
    ["Farbe", vehicle.exteriorColor ?? "—"],
    ["Vorbesitzer", vehicle.ownerCount?.toString() ?? "—"],
  ] as const;

  return (
    <>
      <div className="site-container grid gap-8 py-8 pb-24 lg:grid-cols-[minmax(0,1.45fr)_minmax(21rem,.72fr)] lg:pb-10">
        <div className="min-w-0">
          <VehicleImageGallery images={images} title={title} />

          <section className="py-10 sm:py-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Technische Daten</p>
                <h2 className="section-title mt-2">Fahrzeugdetails</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Angaben laut Händlerbeschreibung.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {facts.map(([label, value]) => (
                <Card
                  className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[var(--radius-sm)] p-4"
                  key={label}
                >
                  <span className="bg-secondary text-primary grid size-10 place-items-center rounded-[var(--radius-sm)]">
                    <CarFront className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="text-muted-foreground block text-xs">
                      {label}
                    </span>
                    <strong className="block truncate">{value}</strong>
                  </span>
                </Card>
              ))}
            </div>
          </section>

          {vehicle.features.length > 0 && (
            <Card className="rounded-[var(--radius-sm)] p-5 shadow-none sm:p-7">
              <div className="flex items-center gap-2">
                <Sparkles className="text-accent size-5" aria-hidden="true" />
                <h2 className="text-xl font-extrabold">Ausstattung</h2>
              </div>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {vehicle.features.map((feature) => (
                  <li
                    className="bg-secondary/50 flex min-w-0 items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3"
                    key={feature}
                  >
                    <Check
                      className="text-success size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 text-sm font-semibold break-words">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {vehicle.description && (
            <Card className="mt-5 rounded-[var(--radius-sm)] p-5 shadow-none sm:p-7">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="text-accent size-5"
                  aria-hidden="true"
                />
                <h2 className="text-xl font-extrabold">Beschreibung</h2>
              </div>
              <p className="text-muted-foreground mt-4 text-sm leading-7 whitespace-pre-wrap">
                {vehicle.description}
              </p>
            </Card>
          )}
        </div>

        <aside className="order-first min-w-0 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:order-last lg:self-start">
          <Card className="overflow-hidden rounded-[var(--radius-sm)]">
            <div className="p-6">
              <nav
                aria-label="Brotkrümelnavigation"
                className="text-muted-foreground flex flex-wrap gap-1 text-xs"
              >
                <Link
                  className="hover:text-foreground"
                  href={publicRoutes.home}
                >
                  Startseite
                </Link>
                <span aria-hidden="true"> / </span>
                <Link
                  className="hover:text-foreground"
                  href={publicRoutes.vehicles}
                >
                  Fahrzeuge
                </Link>
                <span aria-hidden="true"> / </span>
                <span aria-current="page">{title}</span>
              </nav>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1 text-xs font-extrabold">
                  {vehicle.status === "published" && (
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                  )}
                  {vehicle.status === "reserved" && (
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                  )}
                  {statusLabel}
                </span>
                {vehicle.location && (
                  <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-bold">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {vehicle.location}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
                {title}
              </h1>
              {vehicle.variant && (
                <p className="text-muted-foreground mt-2">{vehicle.variant}</p>
              )}
              {vehicle.hasPassedInspection && (
                <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
                  <ShieldCheck
                    className="text-success size-4"
                    aria-hidden="true"
                  />
                  Prüfung bestanden
                </p>
              )}
            </div>
            <div className="bg-brand-panel text-brand-panel-foreground p-6">
              <p className="text-brand-panel-muted text-xs font-bold">
                {vehicle.status === "sold" ? "Verkaufsstatus" : "Angebotspreis"}
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight">
                {vehicle.price === null
                  ? "Preis auf Anfrage"
                  : formatCurrency(Number(vehicle.price))}
              </p>
              <Button asChild variant="accent" className="mt-6 w-full">
                <Link href={contactHref}>
                  <Mail />
                  {contactLabel}
                </Link>
              </Button>
            </div>
            <div className="p-6">
              {vehicle.status !== "sold" && (
                <VehicleActions vehicleId={vehicle.id} />
              )}
              <hr className="my-6" />
              <h2 className="font-extrabold">{vehicle.dealerName}</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Für weitere Informationen kontaktieren Sie unser Team.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={publicRoutes.contact}>Kontakt</Link>
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      <section className="section-space bg-surface">
        <div className="site-container flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Fahrzeugbestand</p>
            <h2 className="section-title mt-2">Weitere Fahrzeuge</h2>
          </div>
          <Button asChild variant="link">
            <Link href={publicRoutes.vehicles}>Alle Fahrzeuge ansehen</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function formatOptional<T>(
  value: T | null,
  format: (value: T) => string,
): string {
  return value === null ? "—" : format(value);
}
