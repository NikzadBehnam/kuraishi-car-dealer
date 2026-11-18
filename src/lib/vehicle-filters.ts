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

export const getVehicleSearchTerms = (query: string) =>
  normalizeSearch(query).trim().split(/\s+/).filter(Boolean);

export function filterVehicles(input: Vehicle[], query: string) {
  const terms = getVehicleSearchTerms(query);
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

  return result.toSorted((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
}
