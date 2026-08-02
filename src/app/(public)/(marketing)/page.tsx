import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CarFront,
  Check,
  ShieldCheck,
} from "lucide-react";
import { homePageContent } from "@/content/de/home-page";
import { vehicles } from "@/data/vehicles";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { QuickSearchForm } from "./_components/quick-search-form";
import { AnimatedSection } from "@/components/motion/animated-section";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Startseite",
  homePageContent.description,
  publicRoutes.home,
);
export default function HomePage() {
  return (
    <>
      <section className="bg-primary relative min-h-[42rem] overflow-hidden text-white">
        <Image
          priority
          fill
          sizes="100vw"
          className="object-cover opacity-50"
          src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=86"
          alt="Premiumfahrzeug auf einer Landstraße"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08172b] via-[#08172bcc] to-transparent" />
        <div className="site-container relative flex min-h-[42rem] items-center py-16">
          <div className="max-w-3xl">
            <p className="eyebrow text-[#ff9a75]">{homePageContent.eyebrow}</p>
            <h1 className="display-title mt-4">{homePageContent.title}</h1>
            <p className="mt-6 max-w-2xl text-lg text-[#dce5ee]">
              {homePageContent.description}
            </p>
            <QuickSearchForm />
            <div className="mt-6 flex flex-wrap gap-5 text-sm font-semibold">
              {homePageContent.trust.map((item) => (
                <span className="flex items-center gap-2" key={item}>
                  <Check className="size-4 text-[#ff9a75]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="section-space">
        <AnimatedSection>
          <div className="site-container">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Direkt einsteigen</p>
                <h2 className="section-title mt-3">Welcher Typ sind Sie?</h2>
              </div>
              <p className="text-muted-foreground max-w-xl">
                Vom wendigen Stadtwagen bis zum souveränen Reisefahrzeug:
                Entdecken Sie unsere Auswahl.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {homePageContent.categories.map((category) => (
                <Link
                  href={`${publicRoutes.vehicles}?bodyType=${category.toLowerCase()}`}
                  key={category}
                >
                  <Card className="flex min-h-28 items-end justify-between p-5 text-lg font-extrabold transition hover:-translate-y-1 hover:shadow-md">
                    <span>{category}</span>
                    <ArrowRight className="text-accent size-5" />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
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
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {homePageContent.benefits.map((benefit) => (
              <Card className="p-6" key={benefit.title}>
                <ShieldCheck className="text-success size-8" />
                <h3 className="mt-5 text-lg font-extrabold">{benefit.title}</h3>
                <p className="text-muted-foreground mt-2">{benefit.text}</p>
              </Card>
            ))}
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <Card className="bg-primary p-8 text-white">
              <p className="eyebrow text-[#ff9a75]">Finanzierung</p>
              <h2 className="section-title mt-3">Traumwagen. Planbare Rate.</h2>
              <p className="mt-4 text-[#c9d3df]">
                Berechnen Sie unverbindlich eine Monatsrate, die zu Ihrem Alltag
                passt.
              </p>
              <Button asChild variant="accent" className="mt-6">
                <Link href={publicRoutes.financing}>
                  <Calculator />
                  Rate berechnen
                </Link>
              </Button>
            </Card>
            <Card className="p-8">
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
