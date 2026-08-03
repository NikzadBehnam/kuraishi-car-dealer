import type { Vehicle } from "@/types/vehicle";
export interface VehicleFilters {
  make?: string;
  model?: string;
  bodyType?: string;
  fuelType?: string;
  location?: string;
  maximumPrice?: number;
  sort?: string;
}
export function filterVehicles(input: Vehicle[], filters: VehicleFilters) {
  const result = input.filter(
    (vehicle) =>
      (!filters.make || vehicle.make === filters.make) &&
      (!filters.model || vehicle.model === filters.model) &&
      (!filters.bodyType || vehicle.bodyType === filters.bodyType) &&
      (!filters.fuelType || vehicle.fuelType === filters.fuelType) &&
      (!filters.location ||
        vehicle.location
          .toLocaleLowerCase("de")
          .includes(filters.location.toLocaleLowerCase("de"))) &&
      (!filters.maximumPrice || vehicle.price <= filters.maximumPrice),
  );
  return result.toSorted((a, b) =>
    filters.sort === "price-asc"
      ? a.price - b.price
      : filters.sort === "price-desc"
        ? b.price - a.price
        : filters.sort === "newest"
          ? b.firstRegistration.localeCompare(a.firstRegistration)
          : Number(b.isFeatured) - Number(a.isFeatured),
  );
}
