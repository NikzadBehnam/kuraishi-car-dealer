import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  CarFront,
  Check,
  Fuel,
  Gauge,
  Mail,
  MapPin,
  Palette,
  Phone,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { dealers } from "@/data/dealers";
import {
  getPublicVehicleBySlug,
  listSimilarPublicVehicles,
} from "@/features/vehicles/server/public-queries.ts";
import {
  formatBodyType,
  formatCurrency,
  formatFuelType,
  formatMileage,
  formatPower,
  formatRegistration,
  formatTransmission,
} from "@/lib/formatters";
import { VehicleActions } from "@/components/vehicle/vehicle-actions";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { publicRoutes, routeBuilders } from "@/config/routes.config";
import { VehicleImageGallery } from "./_components/vehicle-image-gallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getPublicVehicleBySlug(slug);

  return vehicle
    ? {
        title: `${vehicle.make} ${vehicle.model}`,
        description: `${vehicle.variant}, ${formatMileage(vehicle.mileage)}, ${formatCurrency(vehicle.priceCents / 100)}`,
        alternates: { canonical: routeBuilders.vehicleDetails(vehicle.slug) },
        openGraph: {
          title: `${vehicle.make} ${vehicle.model}`,
          description: `${vehicle.variant}, ${formatMileage(vehicle.mileage)}, ${formatCurrency(vehicle.priceCents / 100)}`,
          url: routeBuilders.vehicleDetails(vehicle.slug),
          images: vehicle.coverImage
            ? [
                {
                  url: vehicle.coverImage.url,
                  alt: vehicle.coverImage.altText,
                },
              ]
            : undefined,
        },
      }
    : {
        title: "Fahrzeug nicht gefunden",
        robots: { index: false, follow: false },
      };
}
export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vehicle = await getPublicVehicleBySlug(slug);
  if (!vehicle) notFound();

  const similarVehicles = await listSimilarPublicVehicles(vehicle);
  const dealer = dealers[0];

  if (!dealer) {
    throw new Error("Public dealership configuration is missing.");
  }

  const vehicleTitle = `${vehicle.make} ${vehicle.model}`;
  const vehiclePrice = vehicle.priceCents / 100;
  const facts: Array<{
    label: string;
    value: string;
    Icon: LucideIcon;
  }> = [
    {
      label: "Erstzulassung",
      value: formatRegistration(vehicle.firstRegistration),
      Icon: CalendarDays,
    },
    {
      label: "Kilometerstand",
      value: formatMileage(vehicle.mileage),
      Icon: Gauge,
    },
    {
      label: "Kraftstoff",
      value: formatFuelType(vehicle.fuelType),
      Icon: Fuel,
    },
    {
      label: "Getriebe",
      value: formatTransmission(vehicle.transmissionType),
      Icon: Settings2,
    },
    {
      label: "Leistung",
      value: formatPower(vehicle.powerKw, vehicle.powerPs),
      Icon: Zap,
    },
    {
      label: "Fahrzeugtyp",
      value: formatBodyType(vehicle.bodyType),
      Icon: CarFront,
    },
    { label: "Farbe", value: vehicle.exteriorColor, Icon: Palette },
    {
      label: "Vorbesitzer",
      value: String(vehicle.ownerCount),
      Icon: UserRound,
    },
  ];
  return (
    <>
      <div className="bg-surface border-b">
        <div className="site-container py-8 sm:py-10">
          <nav
            aria-label="Brotkrümelnavigation"
            className="text-muted-foreground flex flex-wrap gap-1 text-sm"
          >
            <Link className="hover:text-foreground" href={publicRoutes.home}>
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
            <span aria-current="page">{vehicleTitle}</span>
          </nav>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-success bg-success/10 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1 text-xs font-extrabold">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  {vehicle.status === "reserved"
                    ? "Reserviert"
                    : "Sofort verfügbar"}
                </span>
                <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-bold">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {dealer.address}
                </span>
              </div>
              <h1 className="page-title mt-4">{vehicleTitle}</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                {vehicle.variant}
              </p>
            </div>
            <div className="bg-background rounded-[var(--radius-sm)] border px-5 py-4 shadow-sm">
              <span className="text-muted-foreground text-xs font-bold">
                Angebotspreis
              </span>
              <p className="text-3xl font-black tracking-tight">
                {formatCurrency(vehiclePrice)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="site-container grid gap-8 py-8 pb-24 lg:grid-cols-[minmax(0,1.45fr)_minmax(21rem,.72fr)] lg:pb-10">
        <div className="min-w-0">
          <VehicleImageGallery images={vehicle.images} title={vehicleTitle} />

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
              {facts.map(({ label, value, Icon }) => (
                <Card
                  className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[var(--radius-sm)] p-4"
                  key={label}
                >
                  <span className="bg-secondary text-primary grid size-10 place-items-center rounded-[var(--radius-sm)]">
                    <Icon className="size-4" aria-hidden="true" />
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

          <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
            <section>
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="text-accent size-5" aria-hidden="true" />
                <h2 className="text-2xl font-extrabold">Ausstattung</h2>
              </div>
              <div className="grid gap-3">
                {vehicle.features.map((feature) => (
                  <div
                    className="bg-surface flex items-center gap-3 rounded-[var(--radius-sm)] border p-4"
                    key={feature}
                  >
                    <span className="bg-success/10 text-success grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)]">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                    <span className="font-semibold">{feature}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center gap-2">
                <ShieldCheck
                  className="text-accent size-5"
                  aria-hidden="true"
                />
                <h2 className="text-2xl font-extrabold">Beschreibung</h2>
              </div>
              <Card className="rounded-[var(--radius-sm)] p-6">
                <p className="text-muted-foreground leading-7">
                  {vehicle.description} Vor Auslieferung erhält das Fahrzeug
                  eine professionelle Aufbereitung. Irrtümer und Zwischenverkauf
                  vorbehalten.
                </p>
              </Card>
            </section>
          </div>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:self-start">
          <Card className="overflow-hidden rounded-[var(--radius-sm)]">
            <div className="bg-brand-panel text-brand-panel-foreground p-6">
              <p className="text-brand-panel-muted text-xs font-bold">
                Direkt anfragen
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight">
                {formatCurrency(vehiclePrice)}
              </p>
              <Button asChild variant="accent" className="mt-6 w-full">
                <Link href={`${publicRoutes.contact}?vehicle=${vehicle.slug}`}>
                  <Mail />
                  Händler kontaktieren
                </Link>
              </Button>
            </div>
            <div className="p-6">
              <VehicleActions vehicleId={vehicle.id} />
              <hr className="my-6" />
              <h2 className="font-extrabold">{dealer.name}</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                ★ {dealer.rating} ({dealer.reviewCount} Bewertungen)
              </p>
              <p className="mt-4 flex gap-2 text-sm">
                <MapPin className="text-accent size-4 shrink-0" />
                {dealer.address}
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <a href={`tel:${dealer.phone}`}>
                  <Phone /> {dealer.phone}
                </a>
              </Button>
            </div>
          </Card>

          <Card className="mt-4 rounded-[var(--radius-sm)] p-5">
            <div className="flex gap-3">
              <span className="bg-success/10 text-success grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)]">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-extrabold">Geprüftes Fahrzeug</h2>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  120-Punkte-Check, klare Historie und persönliche Übergabe in
                  Wien.
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <section className="section-space bg-surface">
        <div className="site-container">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Weitere Optionen</p>
              <h2 className="section-title mt-2">Ähnliche Fahrzeuge</h2>
            </div>
            <Button asChild variant="link">
              <Link href={publicRoutes.vehicles}>Alle Fahrzeuge ansehen</Link>
            </Button>
          </div>
          {similarVehicles.length ? (
            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {similarVehicles.map((item) => (
                <VehicleCard key={item.id} vehicle={item} />
              ))}
            </div>
          ) : (
            <Card className="text-muted-foreground mt-7 rounded-[var(--radius-sm)] p-6 text-center">
              Derzeit sind keine ähnlichen Fahrzeuge verfügbar.
            </Card>
          )}
        </div>
      </section>

      <div className="bg-surface fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_auto] gap-2 border-t p-3 lg:hidden">
        <div>
          <p className="text-muted-foreground text-xs">Angebotspreis</p>
          <p className="font-black tracking-tight">
            {formatCurrency(vehiclePrice)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="icon">
            <a href={`tel:${dealer.phone}`}>
              <Phone />
            </a>
          </Button>
          <Button asChild variant="accent">
            <Link href={`${publicRoutes.contact}?vehicle=${vehicle.slug}`}>
              <CalendarCheck />
              Probefahrt
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
