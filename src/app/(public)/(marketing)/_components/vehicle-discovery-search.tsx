"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CarFront, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { publicRoutes } from "@/config/routes.config";
import { vehicles } from "@/data/vehicles";
import { filterVehicles } from "@/lib/vehicle-filters";

const vehicleKinds = [
  { label: "Auto", value: "car" },
  { label: "Moto", value: "motorcycle" },
  { label: "Camper", value: "camper" },
  { label: "Lkw", value: "truck" },
  { label: "Anhänger", value: "trailer" },
] as const;

const categories = [
  { label: "SUV", image: "suv", filter: "suv" },
  { label: "Limousine", image: "sedan", filter: "sedan" },
  { label: "Kombi", image: "wagon", filter: "wagon" },
  { label: "Kleinwagen", image: "compact", filter: "compact" },
  { label: "Van", image: "minivan", filter: "van" },
  { label: "Sportwagen", image: "coupe", filter: "sports" },
  { label: "Cabriolet", image: "convertible", filter: "convertible" },
  { label: "Transporter", image: "transporter", filter: "van" },
] as const;

export function VehicleDiscoverySearch() {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("Düsseldorf");

  const makes = useMemo(
    () => [...new Set(vehicles.map((vehicle) => vehicle.make))].toSorted(),
    [],
  );
  const models = useMemo(
    () =>
      [
        ...new Set(
          vehicles
            .filter((vehicle) => !make || vehicle.make === make)
            .map((vehicle) => vehicle.model),
        ),
      ].toSorted(),
    [make],
  );
  const resultCount = useMemo(
    () => filterVehicles(vehicles, { make, model, location }).length,
    [make, model, location],
  );

  const submitSearch = () => {
    const params = new URLSearchParams();
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    params.set("location", location);
    router.push(`${publicRoutes.vehicles}?${params}`);
  };

  return (
    <div className="site-container">
      <div className="mb-7 max-w-2xl">
        <p className="eyebrow">Direkt einsteigen</p>
        <h2 className="section-title mt-3">
          Finden Sie Ihr nächstes Fahrzeug.
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          Durchsuchen Sie unseren geprüften Bestand oder starten Sie direkt über
          die passende Fahrzeugklasse.
        </p>
      </div>

      <Card className="overflow-hidden rounded border shadow-none">
        <div className="border-b px-5 pt-5 sm:px-7">
          <div
            className="flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Fahrzeugarten"
          >
            {vehicleKinds.map((kind, index) => (
              <button
                key={kind.value}
                type="button"
                role="tab"
                aria-selected={index === 0}
                aria-disabled={index !== 0}
                disabled={index !== 0}
                title={index === 0 ? undefined : "Derzeit nicht verfügbar"}
                className={`relative min-h-11 shrink-0 px-4 text-sm font-bold transition-colors ${
                  index === 0
                    ? "text-foreground after:bg-accent after:absolute after:inset-x-2 after:bottom-0 after:h-0.5"
                    : "text-muted-foreground opacity-55"
                }`}
              >
                {kind.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <form
            className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <Select
              value={make || "all"}
              onValueChange={(value) => {
                setMake(value === "all" ? "" : value);
                setModel("");
              }}
            >
              <SelectTrigger aria-label="Marke">
                <SelectValue placeholder="Alle Marken" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Marken</SelectItem>
                {makes.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={model || "all"}
              onValueChange={(value) => setModel(value === "all" ? "" : value)}
            >
              <SelectTrigger aria-label="Modell">
                <SelectValue placeholder="Alle Modelle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Modelle</SelectItem>
                {models.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <MapPin
                className="text-accent pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                aria-label="Stadt oder Postleitzahl"
                placeholder="Stadt oder PLZ"
                className="focus-visible:border-input pl-9 focus-visible:ring-0! focus-visible:outline-none!"
              />
            </div>

            <Button
              type="submit"
              variant="accent"
              className="rounded-[15px] px-6"
            >
              <Search />
              {resultCount} Fahrzeuge
            </Button>
          </form>

          <div className="mt-4 flex justify-end">
            <Button asChild variant="link">
              <Link href={publicRoutes.vehicleSearch}>
                Erweiterte Suche <ArrowRight />
              </Link>
            </Button>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <CarFront className="text-accent size-5" aria-hidden="true" />
            <h3 className="font-extrabold">Fahrzeuge nach Typ entdecken</h3>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((category) => (
              <Link
                key={category.label}
                href={`${publicRoutes.vehicles}?bodyType=${category.filter}`}
                className="group rounded-lg p-2 text-center focus-visible:outline-none"
              >
                <span className="relative block aspect-2/1">
                  <Image
                    fill
                    sizes="(max-width: 640px) 42vw, (max-width: 1024px) 20vw, 140px"
                    src={`/images/vehicle-types/${category.image}.webp`}
                    alt=""
                    className="object-contain transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105"
                  />
                </span>
                <span className="group-hover:text-accent mt-2 block text-sm font-bold">
                  {category.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
