import { publicRoutes } from "../../config/routes.config.ts";
import {
  publicVehicleListQuerySchema,
  type PublicVehicleListQuery,
} from "./schemas.ts";

export type PublicVehicleSearchParams = Record<
  string,
  string | string[] | undefined
>;

const directQueryKeys = [
  "bodyType",
  "condition",
  "featured",
  "fuelType",
  "make",
  "maximumMileage",
  "maximumPriceCents",
  "minimumPriceCents",
  "model",
  "page",
  "pageSize",
  "search",
  "sort",
  "transmissionType",
] as const;

export function parsePublicVehicleListingSearchParams(
  searchParams: PublicVehicleSearchParams,
): PublicVehicleListQuery {
  const candidate: Record<string, unknown> = {};

  for (const key of directQueryKeys) {
    const value = getSingleValue(searchParams[key]);

    if (value !== undefined) candidate[key] = value;
  }

  const maximumPriceEuros = getSingleValue(searchParams.maximumPrice);

  if (maximumPriceEuros !== undefined) {
    candidate.maximumPriceCents = convertEurosToCents(maximumPriceEuros);
  }

  return parseWithInvalidFieldsRemoved(candidate);
}

export function createPublicVehicleListingSearchParams(
  query: PublicVehicleListQuery,
) {
  const params = new URLSearchParams();

  setParam(params, "make", query.make);
  setParam(params, "model", query.model);
  setParam(params, "bodyType", query.bodyType);
  setParam(params, "fuelType", query.fuelType);
  setParam(params, "condition", query.condition);
  setParam(params, "transmissionType", query.transmissionType);
  setParam(params, "search", query.search);
  setParam(params, "maximumMileage", query.maximumMileage);
  setParam(params, "minimumPriceCents", query.minimumPriceCents);

  if (query.maximumPriceCents !== undefined) {
    params.set("maximumPrice", String(query.maximumPriceCents / 100));
  }

  if (query.featured !== undefined) {
    params.set("featured", String(query.featured));
  }

  if (query.sort !== "featured") params.set("sort", query.sort);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));

  return params;
}

export function buildPublicVehicleListingHref(
  query: PublicVehicleListQuery,
  page = query.page,
) {
  const params = createPublicVehicleListingSearchParams({ ...query, page });
  const queryString = params.toString();

  return queryString
    ? `${publicRoutes.vehicles}?${queryString}`
    : publicRoutes.vehicles;
}

function parseWithInvalidFieldsRemoved(candidate: Record<string, unknown>) {
  const sanitized = { ...candidate };

  for (let attempt = 0; attempt <= directQueryKeys.length; attempt += 1) {
    const result = publicVehicleListQuerySchema.safeParse(sanitized);

    if (result.success) return result.data;

    let removedField = false;

    for (const issue of result.error.issues) {
      const field = issue.path[0];

      if (typeof field === "string" && field in sanitized) {
        delete sanitized[field];
        removedField = true;
      }
    }

    if (!removedField) break;
  }

  return publicVehicleListQuerySchema.parse({});
}

function getSingleValue(value: string | string[] | undefined) {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return normalized || undefined;
}

function convertEurosToCents(value: string) {
  const euros = Number(value);
  const cents = euros * 100;

  return Number.isSafeInteger(cents) ? cents : value;
}

function setParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (value !== undefined) params.set(key, String(value));
}
