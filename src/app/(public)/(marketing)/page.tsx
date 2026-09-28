import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  Check,
  MapPin,
  MessageCircle,
  ReceiptText,
} from "lucide-react";
import { homePageContent } from "@/content/de/home-page";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { QuickSearchForm } from "./_components/quick-search-form";
import { AnimatedSection } from "@/components/motion/animated-section";
import { createPublicMetadata } from "@/lib/metadata";
import { VehicleDiscoverySearch } from "./_components/vehicle-discovery-search";
import {
  getPublicVehicleSearchFacets,
  listFeaturedPublicVehicles,
} from "@/features/vehicles/server/public-queries.ts";

export const metadata = createPublicMetadata(
  "Startseite",
  homePageContent.description,
  publicRoutes.home,
);
export default async function HomePage() {
  const [featuredVehicles, vehicleFacets] = await Promise.all([
    listFeaturedPublicVehicles(),
    getPublicVehicleSearchFacets(),
  ]);

  return (
    <>
      <section className="hero-shell relative isolate flex min-h-[calc(100svh-var(--header-height))] overflow-hidden">
        <div
          className="hero-poster absolute inset-0 -z-30 bg-cover bg-center"
          aria-hidden="true"
        />
        <video
          className="hero-video absolute inset-0 -z-20 size-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=82"
          aria-hidden="true"
        >
          <source
            src="https://videos.pexels.com/video-files/5309381/5309381-hd_1920_1080_25fps.mp4"
            type="video/mp4"
          />
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
              Entdecken Sie sorgfältig ausgewählte Gebrauchtwagen mit klarer
              Historie, fairen Konditionen und persönlicher Beratung in Wien.
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
            <div className="hero-trust mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5 text-xs font-semibold sm:text-sm">
              {homePageContent.trust.map((item) => (
                <span className="flex items-center gap-2" key={item}>
                  <span className="hero-check grid size-5 place-items-center rounded-[var(--radius-sm)]">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <QuickSearchForm facets={vehicleFacets} />
        </div>
      </section>
      {/* <section className="py-12 sm:py-14 lg:py-16">
        <AnimatedSection>
          <VehicleDiscoverySearch facets={vehicleFacets} />
        </AnimatedSection>
      </section> */}
      <section className="section-space bg-surface">
        <div className="site-container">
          <div className="flex items-end justify-between gap-4">
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
          {featuredVehicles.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featuredVehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          ) : (
            <Card className="text-muted-foreground mt-8 rounded-[var(--radius-sm)] p-6 text-center">
              Derzeit sind keine hervorgehobenen Fahrzeuge verfügbar.
            </Card>
          )}
        </div>
      </section>
      <section className="section-space">
        <div className="site-container grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,0.72fr)] lg:items-stretch">
          <div>
            <p className="eyebrow">Unser Versprechen</p>
            <h2 className="section-title mt-3 max-w-3xl">
              {homePageContent.benefitsTitle}
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
              Klare Fahrzeugdaten, nachvollziehbare Preise und eine Prüfung, die
              vor der Übergabe dokumentiert wird.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
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

          <Card className="bg-brand-panel text-brand-panel-foreground grid rounded-[var(--radius-sm)] p-6 sm:p-8 lg:content-between">
            <div>
              <p className="eyebrow text-[#ff9a75]">Inzahlungnahme</p>
              <h2 className="mt-3 text-3xl leading-tight font-extrabold sm:text-4xl">
                Was ist Ihr Fahrzeug wert?
              </h2>
              <p className="text-brand-panel-muted mt-4 leading-7">
                In wenigen Schritten zur kostenlosen und unverbindlichen
                Bewertung.
              </p>
            </div>

            <div className="mt-8">
              <div className="text-brand-panel-muted grid gap-3 text-sm">
                {["Fahrzeugdaten eingeben", "Bewertung erhalten"].map(
                  (step, index) => (
                    <span className="flex items-center gap-3" key={step}>
                      <span className="grid size-7 place-items-center rounded-[var(--radius-sm)] bg-white/10 text-xs font-extrabold text-white">
                        {index + 1}
                      </span>
                      {step}
                    </span>
                  ),
                )}
              </div>
              <Button asChild variant="accent" className="mt-7 w-full sm:w-fit">
                <Link href={publicRoutes.sellVehicle}>
                  <CarFront />
                  Bewertung starten
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
