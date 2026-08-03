import Link from "next/link";
import { ArrowRight, CarFront, Check, MapPin, ShieldCheck } from "lucide-react";
import { homePageContent } from "@/content/de/home-page";
import { vehicles } from "@/data/vehicles";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { QuickSearchForm } from "./_components/quick-search-form";
import { AnimatedSection } from "@/components/motion/animated-section";
import { createPublicMetadata } from "@/lib/metadata";
import { VehicleDiscoverySearch } from "./_components/vehicle-discovery-search";

export const metadata = createPublicMetadata(
  "Startseite",
  homePageContent.description,
  publicRoutes.home,
);
export default function HomePage() {
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
              <span className="hero-location inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
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
              <Button asChild variant="accent" className="group">
                <Link href={publicRoutes.vehicles}>
                  <CarFront /> Fahrzeuge entdecken
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="hero-secondary-action"
              >
                <Link href={publicRoutes.contact}>
                  Persönlich beraten lassen
                </Link>
              </Button>
            </div>
            <div className="hero-trust mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5 text-xs font-semibold sm:text-sm">
              {homePageContent.trust.map((item) => (
                <span className="flex items-center gap-2" key={item}>
                  <span className="hero-check grid size-5 place-items-center rounded-full">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <QuickSearchForm />
        </div>
      </section>
      <section className="section-space">
        <AnimatedSection>
          <VehicleDiscoverySearch />
        </AnimatedSection>
      </section>
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
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {vehicles
              .filter((vehicle) => vehicle.isFeatured)
              .map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
          </div>
        </div>
      </section>
      <section className="section-space">
        <div className="site-container">
          <p className="eyebrow">Unser Versprechen</p>
          <h2 className="section-title mt-3">
            {homePageContent.benefitsTitle}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {homePageContent.benefits.map((benefit) => (
              <Card className="p-6" key={benefit.title}>
                <ShieldCheck className="text-success size-8" />
                <h3 className="mt-5 text-lg font-extrabold">{benefit.title}</h3>
                <p className="text-muted-foreground mt-2">{benefit.text}</p>
              </Card>
            ))}
          </div>
          <div className="mt-12">
            <Card className="p-8 lg:max-w-2xl">
              <p className="eyebrow">Inzahlungnahme</p>
              <h2 className="section-title mt-3">Was ist Ihr Fahrzeug wert?</h2>
              <p className="text-muted-foreground mt-4">
                In wenigen Schritten zur kostenlosen und unverbindlichen
                Bewertung.
              </p>
              <Button asChild className="mt-6">
                <Link href={publicRoutes.sellVehicle}>
                  <CarFront />
                  Bewertung starten
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
