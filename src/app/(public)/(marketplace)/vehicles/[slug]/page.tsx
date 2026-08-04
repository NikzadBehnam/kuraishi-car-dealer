import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Check, Mail, MapPin, Phone } from "lucide-react";
import { vehicles } from "@/data/vehicles";
import { dealers } from "@/data/dealers";
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
export function generateStaticParams() {
  return vehicles.map((vehicle) => ({ slug: vehicle.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = vehicles.find((item) => item.slug === slug);
  return vehicle
    ? {
        title: `${vehicle.make} ${vehicle.model}`,
        description: `${vehicle.variant}, ${formatMileage(vehicle.mileage)}, ${formatCurrency(vehicle.price)}`,
        alternates: { canonical: routeBuilders.vehicleDetails(vehicle.slug) },
        openGraph: { url: routeBuilders.vehicleDetails(vehicle.slug) },
      }
    : { title: "Fahrzeug nicht gefunden" };
}
export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vehicle = vehicles.find((item) => item.slug === slug);
  if (!vehicle) notFound();
  const dealer = dealers.find((item) => item.id === vehicle.dealerId)!;
  const facts = [
    ["Erstzulassung", formatRegistration(vehicle.firstRegistration)],
    ["Kilometerstand", formatMileage(vehicle.mileage)],
    ["Kraftstoff", formatFuelType(vehicle.fuelType)],
    ["Getriebe", formatTransmission(vehicle.transmissionType)],
    ["Leistung", formatPower(vehicle.powerKw, vehicle.powerPs)],
    ["Fahrzeugtyp", formatBodyType(vehicle.bodyType)],
    ["Farbe", vehicle.exteriorColor],
    ["Vorbesitzer", "1"],
  ];
  return (
    <>
      <div className="bg-surface border-b py-10">
        <div className="site-container">
          <nav
            aria-label="Brotkrümelnavigation"
            className="text-muted-foreground text-sm"
          >
            <Link href={publicRoutes.home}>Startseite</Link>
            <span aria-hidden="true"> / </span>
            <Link href={publicRoutes.vehicles}>Fahrzeuge</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">
              {vehicle.make} {vehicle.model}
            </span>
          </nav>
          <h1 className="page-title mt-3">
            {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-muted-foreground mt-2">{vehicle.variant}</p>
        </div>
      </div>
      <div className="site-container grid gap-7 py-8 lg:grid-cols-[1.4fr_.75fr]">
        <div>
          <VehicleImageGallery
            images={vehicle.images}
            title={`${vehicle.make} ${vehicle.model}`}
          />
          <section className="section-space">
            <h2 className="section-title">Fahrzeugdetails</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {facts.map(([label, value]) => (
                <Card className="p-4" key={label}>
                  <span className="text-muted-foreground block text-xs">
                    {label}
                  </span>
                  <strong>{value}</strong>
                </Card>
              ))}
            </div>
          </section>
          <section className="pb-14">
            <h2 className="section-title">Ausstattung</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {vehicle.features.map((feature) => (
                <div
                  className="bg-surface flex items-center gap-2 rounded-md border p-4"
                  key={feature}
                >
                  <Check className="text-success size-4" />
                  {feature}
                </div>
              ))}
            </div>
          </section>
          <section className="pb-14">
            <h2 className="section-title">Beschreibung</h2>
            <p className="text-muted-foreground mt-5 leading-7">
              {vehicle.description} Vor Auslieferung erhält das Fahrzeug eine
              professionelle Aufbereitung. Irrtümer und Zwischenverkauf
              vorbehalten.
            </p>
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <p className="text-4xl font-black tracking-tight">
              {formatCurrency(vehicle.price)}
            </p>
            <Button asChild variant="accent" className="mt-6 w-full">
              <Link href={`${publicRoutes.contact}?vehicle=${vehicle.slug}`}>
                <Mail />
                Händler kontaktieren
              </Link>
            </Button>
            <div className="mt-3">
              <VehicleActions vehicleId={vehicle.id} />
            </div>
            <hr className="my-6" />
            <h2 className="font-extrabold">{dealer.name}</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              ★ {dealer.rating} ({dealer.reviewCount} Bewertungen)
            </p>
            <p className="mt-4 flex gap-2 text-sm">
              <MapPin className="size-4 shrink-0" />
              {dealer.address}
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <a href={`tel:${dealer.phone}`}>
                <Phone /> {dealer.phone}
              </a>
            </Button>
          </Card>
        </aside>
      </div>
      <section className="section-space bg-surface">
        <div className="site-container">
          <h2 className="section-title">Ähnliche Fahrzeuge</h2>
          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {vehicles
              .filter(
                (item) =>
                  item.id !== vehicle.id && item.bodyType === vehicle.bodyType,
              )
              .slice(0, 3)
              .map((item) => (
                <VehicleCard key={item.id} vehicle={item} />
              ))}
          </div>
        </div>
      </section>
      <div className="bg-surface fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t p-3 lg:hidden">
        <Button asChild variant="outline" className="flex-1">
          <a href={`tel:${dealer.phone}`}>
            <Phone />
            Anrufen
          </a>
        </Button>
        <Button asChild variant="accent" className="flex-1">
          <Link href={`${publicRoutes.contact}?vehicle=${vehicle.slug}`}>
            <CalendarCheck />
            Probefahrt
          </Link>
        </Button>
      </div>
    </>
  );
}
