import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  CarFront,
  Check,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
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
import type {
  PublicInventoryVehicleDTO,
  PublicVehicleCardImageDTO,
  PublicVehicleDetailDTO,
} from "@/types/inventory";

import { VehicleImageGallery } from "./vehicle-image-gallery";

type RelatedVehicle = {
  vehicle: PublicInventoryVehicleDTO;
  images: PublicVehicleCardImageDTO[];
};

const conditionLabels = {
  used: "Gebrauchtwagen",
  demonstrator: "Vorführwagen",
  annual: "Jahreswagen",
} satisfies Record<NonNullable<PublicVehicleDetailDTO["condition"]>, string>;
const consumptionFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});
const consumptionUnitLabels = {
  l_per_100_km: "l/100 km",
  kwh_per_100_km: "kWh/100 km",
} satisfies Record<
  NonNullable<PublicVehicleDetailDTO["consumptionUnit"]>,
  string
>;

export function InventoryVehicleDetail({
  vehicle,
  images,
  relatedVehicles,
}: {
  vehicle: PublicVehicleDetailDTO;
  images: Array<{
    id: string;
    url: string;
    title: string;
    altText: string | null;
  }>;
  relatedVehicles: RelatedVehicle[];
}) {
  const title = `${vehicle.make} ${vehicle.model}`;
  const contactHref =
    vehicle.status !== "sold"
      ? `${publicRoutes.contact}?vehicle=${encodeURIComponent(vehicle.slug)}`
      : publicRoutes.contact;
  const contactLabel =
    vehicle.status === "sold"
      ? "Allgemeine Anfrage stellen"
      : vehicle.status === "reserved"
        ? "Kontakt für Statusinformationen"
        : "Händler kontaktieren";
  const phoneHref = `tel:${vehicle.dealer.phone.replace(/[^\d+]/g, "")}`;
  const consumption =
    vehicle.consumption !== null && vehicle.consumptionUnit !== null
      ? `${consumptionFormatter.format(vehicle.consumption)} ${consumptionUnitLabels[vehicle.consumptionUnit]}`
      : "—";
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
    ["Zustand", vehicle.condition ? conditionLabels[vehicle.condition] : "—"],
    ["Verbrauch", consumption],
    [
      "CO₂-Emissionen",
      vehicle.co2Emission === null
        ? "—"
        : `${consumptionFormatter.format(vehicle.co2Emission)} g/km`,
    ],
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
              {vehicle.labels.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {vehicle.labels.map((label, index) => (
                    <Badge key={`${label}-${index}`}>{label}</Badge>
                  ))}
                </div>
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
              <h2 className="font-extrabold">{vehicle.dealer.name}</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {vehicle.dealer.street}, {vehicle.dealer.postalCode}{" "}
                {vehicle.dealer.city}, {vehicle.dealer.country}
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <a href={phoneHref}>
                  <Phone />
                  {vehicle.dealer.phone}
                </a>
              </Button>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href={publicRoutes.contact}>Kontakt</Link>
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {relatedVehicles.length > 0 && (
        <section className="section-space bg-surface">
          <div className="site-container">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Fahrzeugbestand</p>
                <h2 className="section-title mt-2">Ähnliche Fahrzeuge</h2>
              </div>
              <Button asChild variant="link">
                <Link href={publicRoutes.vehicles}>Alle Fahrzeuge ansehen</Link>
              </Button>
            </div>
            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {relatedVehicles.map(({ vehicle: relatedVehicle, images }) => (
                <VehicleCard
                  key={relatedVehicle.id}
                  vehicle={relatedVehicle}
                  inventoryImages={images}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="bg-surface fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_auto] gap-2 border-t p-3 lg:hidden">
        <div>
          <p className="text-muted-foreground text-xs">
            {vehicle.status === "sold" ? "Verkaufspreis" : "Angebotspreis"}
          </p>
          <p className="font-black tracking-tight">
            {vehicle.price === null
              ? "Preis auf Anfrage"
              : formatCurrency(Number(vehicle.price))}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label={`Anrufen: ${vehicle.dealer.phone}`}
          >
            <a href={phoneHref}>
              <Phone />
            </a>
          </Button>
          <Button asChild variant="accent">
            <Link href={contactHref}>
              <Mail />
              {contactLabel}
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function formatOptional<T>(
  value: T | null,
  format: (value: T) => string,
): string {
  return value === null ? "—" : format(value);
}
