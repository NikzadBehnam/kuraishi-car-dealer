import { adminRoutes } from "../../config/admin-routes.config.ts";
import {
  adminMediaListQuerySchema,
  type AdminMediaListQuery,
} from "./schemas.ts";

export type AdminMediaSearchParams = Record<
  string,
  string | string[] | undefined
>;

const mediaQueryKeys = ["page", "pageSize", "search", "type", "usage"] as const;
const adminMediaPageSize = 12;

export function parseAdminMediaListingSearchParams(
  searchParams: AdminMediaSearchParams,
): AdminMediaListQuery {
  const candidate: Record<string, unknown> = {
    pageSize:
      getSingleValue(searchParams.pageSize) ?? String(adminMediaPageSize),
  };

  for (const key of mediaQueryKeys) {
    if (key === "pageSize") continue;

    const value = getSingleValue(searchParams[key]);
    if (value !== undefined) candidate[key] = value;
  }

  return parseWithInvalidFieldsRemoved(candidate);
}

export function createAdminMediaListingSearchParams(
  query: AdminMediaListQuery,
) {
  const params = new URLSearchParams();

  setParam(params, "search", query.search);
  setParam(params, "type", query.type);
  setParam(params, "usage", query.usage);

  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== adminMediaPageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  return params;
}

export function buildAdminMediaListingHref(
  query: AdminMediaListQuery,
  page = query.page,
) {
  const params = createAdminMediaListingSearchParams({ ...query, page });
  const queryString = params.toString();

  return queryString
    ? `${adminRoutes.media}?${queryString}`
    : adminRoutes.media;
}

function parseWithInvalidFieldsRemoved(candidate: Record<string, unknown>) {
  const sanitized = { ...candidate };

  for (let attempt = 0; attempt <= mediaQueryKeys.length; attempt += 1) {
    const result = adminMediaListQuerySchema.safeParse(sanitized);

    if (result.success) return result.data;

    let replacedField = false;

    for (const issue of result.error.issues) {
      const field = issue.path[0];

      if (typeof field !== "string" || !(field in sanitized)) continue;

      if (field === "pageSize") sanitized.pageSize = adminMediaPageSize;
      else delete sanitized[field];

      replacedField = true;
    }

    if (!replacedField) break;
  }

  return adminMediaListQuerySchema.parse({ pageSize: adminMediaPageSize });
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
