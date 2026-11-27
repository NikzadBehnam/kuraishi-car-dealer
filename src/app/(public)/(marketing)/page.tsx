import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  MapPin,
  MessageCircle,
  ReceiptText,
} from "lucide-react";
import { homePageContent } from "@/content/de/home-page";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
import { getFeaturedVehicles } from "@/lib/inventory-queries";
import { listPublicVehicleCardImages } from "@/lib/vehicle-photos";

export async function generateMetadata() {
  return createPublicMetadata(
    "Startseite",
    homePageContent.description,
    publicRoutes.home,
  );
}
export const dynamic = "force-dynamic";
const heroPoster = "/images/decorative/hero-poster.webp";

export default async function HomePage() {
  const featuredVehicles = await getFeaturedVehicles({ limit: 8 });
  const imagesByVehicleId = await listPublicVehicleCardImages(
    featuredVehicles.map(({ id }) => id),
  );

  return (
    <>
      <section className="hero-shell relative isolate flex min-h-[calc(100svh-var(--header-height))] overflow-hidden">
        <div
          className="absolute inset-0 -z-30 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroPoster})` }}
          aria-hidden="true"
        />
        <video
          className="hero-video absolute inset-0 -z-20 size-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={heroPoster}
          aria-hidden="true"
        >
          <source src="/videos/decorative/hero-drive.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay absolute inset-0 -z-10" />

        <div className="site-container flex w-full flex-col justify-center py-10 sm:py-14 lg:py-16">
          <div className="hero-content max-w-[49rem]">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">{homePageContent.eyebrow}</p>
              <span className="hero-location inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1 text-xs font-semibold">
                <MapPin className="size-3.5" aria-hidden="true" /> Wien
              </span>
            </div>
            <h1 className="hero-title mt-5 text-[clamp(2.65rem,6.2vw,5.75rem)] leading-[0.94] font-extrabold tracking-[-0.065em]">
              Mobilität, die zu
              <span className="text-accent block">Ihrem Leben passt.</span>
            </h1>
            <p className="hero-description mt-6 max-w-2xl text-base leading-7 sm:text-lg">
              Durchsuchen Sie die veröffentlichten Fahrzeugangebote und senden
              Sie uns bei Fragen eine Anfrage.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="accent">
                <Link href={publicRoutes.vehicles}>
                  <CarFront />
                  Fahrzeuge entdecken
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="hero-secondary-action"
              >
                <Link href={publicRoutes.contact}>
                  <MessageCircle />
                  Persönlich beraten lassen
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="section-space bg-surface">
        <div className="site-container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Sofort verfügbar</p>
              <h2 className="section-title mt-3">
                {homePageContent.featuredTitle}
              </h2>
            </div>
            <Button asChild variant="link">
              <Link href={publicRoutes.vehicles}>
                Alle Fahrzeuge <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredVehicles.length > 0 ? (
              featuredVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  inventoryImages={imagesByVehicleId.get(vehicle.id) ?? []}
                />
              ))
            ) : (
              <p className="text-muted-foreground col-span-full py-10 text-center">
                {homePageContent.featuredEmpty}
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="section-space">
        <div className="site-container">
          <div>
            <p className="eyebrow">Unser Angebot</p>
            <h2 className="section-title mt-3 max-w-3xl">
              {homePageContent.benefitsTitle}
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
              In den Fahrzeugangeboten finden Sie Angaben zur Ausstattung, zu
              den technischen Daten und zum Preis.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {homePageContent.benefits.map((benefit, index) => {
                const Icon = index === 0 ? BadgeCheck : ReceiptText;

                return (
                  <Card
                    className="grid gap-4 rounded-[var(--radius-sm)] p-5 sm:grid-cols-[auto_1fr] sm:p-6"
                    key={benefit.title}
                  >
                    <span className="bg-success/10 text-success grid size-11 shrink-0 place-items-center rounded-[var(--radius-sm)]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <h3 className="text-lg font-extrabold">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground mt-2 leading-6">
                        {benefit.text}
                      </p>
                    </span>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <p className="site-container text-muted-foreground pb-4 text-xs">
        Symbolvideo und Standbild:{" "}
        <a
          className="underline"
          href="https://commons.wikimedia.org/wiki/File:2025-08-15_Monterey_Ferrari_F80.webm"
        >
          Ferrari F80 in Monterey - VictorDoesCars
        </a>
        {" · "}
        <a
          className="underline"
          href="https://creativecommons.org/licenses/by/4.0/"
        >
          CC BY 4.0
        </a>
        {" · "}stumm, neu kodiert; Standbild aus dem Video.
      </p>
    </>
  );
}
