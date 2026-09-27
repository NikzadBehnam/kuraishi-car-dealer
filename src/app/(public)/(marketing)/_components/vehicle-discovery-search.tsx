"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CarFront, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { publicRoutes } from "@/config/routes.config";
import type { VehicleBodyType } from "@/features/vehicles/constants.ts";
import type { PublicVehicleSearchFacetsDto } from "@/features/vehicles/dto.ts";

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
  { label: "Van / Transporter", image: "transporter", filter: "van" },
  { label: "Sportwagen", image: "coupe", filter: "sports" },
] as const satisfies readonly {
  label: string;
  image: string;
  filter: VehicleBodyType;
}[];

export function VehicleDiscoverySearch({
  facets,
}: {
  facets: PublicVehicleSearchFacetsDto;
}) {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const models = useMemo(() => getModelOptions(facets, make), [facets, make]);
  const resultCount = useMemo(
    () => getResultCount(facets, make, model),
    [facets, make, model],
  );

  const submitSearch = () => {
    const params = new URLSearchParams();
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    const queryString = params.toString();
    router.push(
      queryString
        ? `${publicRoutes.vehicles}?${queryString}`
        : publicRoutes.vehicles,
    );
  };

  return (
    <div className="site-container">
      <Card className="overflow-hidden rounded-[var(--radius-sm)] border shadow-none">
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
            className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]"
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
                {facets.makes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value} ({option.count})
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
                {models.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value} ({option.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="submit"
              variant="accent"
              className="rounded-[var(--radius-sm)] px-6"
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

          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
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

function getModelOptions(
  facets: PublicVehicleSearchFacetsDto,
  selectedMake: string,
) {
  if (selectedMake) {
    return (
      facets.makes.find((make) => make.value === selectedMake)?.models ?? []
    );
  }

  const counts = new Map<string, number>();

  for (const make of facets.makes) {
    for (const model of make.models) {
      counts.set(model.value, (counts.get(model.value) ?? 0) + model.count);
    }
  }

  return Array.from(counts, ([value, count]) => ({ value, count })).toSorted(
    (left, right) => left.value.localeCompare(right.value, "de"),
  );
}

function getResultCount(
  facets: PublicVehicleSearchFacetsDto,
  selectedMake: string,
  selectedModel: string,
) {
  if (selectedMake) {
    const make = facets.makes.find((option) => option.value === selectedMake);

    if (!make) return 0;
    if (!selectedModel) return make.count;

    return (
      make.models.find((model) => model.value === selectedModel)?.count ?? 0
    );
  }

  if (selectedModel) {
    return facets.makes.reduce(
      (total, make) =>
        total +
        (make.models.find((model) => model.value === selectedModel)?.count ??
          0),
      0,
    );
  }

  return facets.total;
}
