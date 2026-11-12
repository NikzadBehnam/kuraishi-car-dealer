import type { Vehicle } from "@/types/vehicle";
import {
  formatBodyType,
  formatFuelType,
  formatTransmission,
} from "./formatters.ts";

const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function filterVehicles(input: Vehicle[], query: string) {
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  const result = input.filter((vehicle) => {
    if (!terms.length) return true;

    const searchableText = normalizeSearch(
      [
        vehicle.make,
        vehicle.model,
        vehicle.variant,
        vehicle.bodyType,
        formatBodyType(vehicle.bodyType),
        vehicle.fuelType,
        formatFuelType(vehicle.fuelType),
        vehicle.transmissionType,
        formatTransmission(vehicle.transmissionType),
        vehicle.exteriorColor,
        vehicle.location,
        vehicle.firstRegistration,
        ...vehicle.features,
        ...vehicle.labels,
      ].join(" "),
    );

    return terms.every((term) => searchableText.includes(term));
  });

  return result.toSorted(
    (a, b) => Number(b.isFeatured) - Number(a.isFeatured),
  );
}
