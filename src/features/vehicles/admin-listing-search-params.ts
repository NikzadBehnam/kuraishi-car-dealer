import { adminRoutes } from "../../config/admin-routes.config.ts";
import {
  adminVehicleListQuerySchema,
  type AdminVehicleListQuery,
} from "./schemas.ts";

export type AdminVehicleSearchParams = Record<
  string,
  string | string[] | undefined
>;

const adminQueryKeys = [
  "inspectionStatus",
  "page",
  "pageSize",
  "search",
  "sortDirection",
  "sortField",
  "status",
] as const;

const adminInventoryPageSize = 8;

export function parseAdminVehicleListingSearchParams(
  searchParams: AdminVehicleSearchParams,
): AdminVehicleListQuery {
  const candidate: Record<string, unknown> = {
    pageSize:
      getSingleValue(searchParams.pageSize) ?? String(adminInventoryPageSize),
  };

  for (const key of adminQueryKeys) {
    if (key === "pageSize") continue;

    const value = getSingleValue(searchParams[key]);
    if (value !== undefined) candidate[key] = value;
  }

  return parseWithInvalidFieldsRemoved(candidate);
}

export function createAdminVehicleListingSearchParams(
  query: AdminVehicleListQuery,
) {
  const params = new URLSearchParams();

  setParam(params, "search", query.search);
  setParam(params, "status", query.status);
  setParam(params, "inspectionStatus", query.inspectionStatus);

  if (query.sortField !== "updatedAt") {
    params.set("sortField", query.sortField);
  }

  if (query.sortDirection !== "desc") {
    params.set("sortDirection", query.sortDirection);
  }

  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== adminInventoryPageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  return params;
}

export function buildAdminVehicleListingHref(
  query: AdminVehicleListQuery,
  page = query.page,
) {
  const params = createAdminVehicleListingSearchParams({ ...query, page });
  const queryString = params.toString();

  return queryString
    ? `${adminRoutes.vehicles}?${queryString}`
    : adminRoutes.vehicles;
}

function parseWithInvalidFieldsRemoved(candidate: Record<string, unknown>) {
  const sanitized = { ...candidate };

  for (let attempt = 0; attempt <= adminQueryKeys.length; attempt += 1) {
    const result = adminVehicleListQuerySchema.safeParse(sanitized);

    if (result.success) return result.data;

    let replacedField = false;

    for (const issue of result.error.issues) {
      const field = issue.path[0];

      if (typeof field !== "string" || !(field in sanitized)) continue;

      if (field === "pageSize") sanitized.pageSize = adminInventoryPageSize;
      else delete sanitized[field];

      replacedField = true;
    }

    if (!replacedField) break;
  }

  return adminVehicleListQuerySchema.parse({
    pageSize: adminInventoryPageSize,
  });
}

function getSingleValue(value: string | string[] | undefined) {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return normalized || undefined;
}

function setParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (value !== undefined) params.set(key, String(value));
}
