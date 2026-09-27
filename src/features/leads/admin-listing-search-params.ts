import { adminRoutes } from "../../config/admin-routes.config.ts";
import { leadListQuerySchema, type LeadListQuery } from "./schemas.ts";

export type AdminLeadSearchParams = Record<
  string,
  string | string[] | undefined
>;

const adminQueryKeys = [
  "assignedToUserId",
  "page",
  "pageSize",
  "priority",
  "search",
  "sortDirection",
  "sortField",
  "source",
  "status",
] as const;

const adminLeadPageSize = 10;

export function parseAdminLeadListingSearchParams(
  searchParams: AdminLeadSearchParams,
): LeadListQuery {
  const candidate: Record<string, unknown> = {
    pageSize:
      getSingleValue(searchParams.pageSize) ?? String(adminLeadPageSize),
  };

  for (const key of adminQueryKeys) {
    if (key === "pageSize") continue;

    const value = getSingleValue(searchParams[key]);
    if (value !== undefined) candidate[key] = value;
  }

  return parseWithInvalidFieldsRemoved(candidate);
}

export function createAdminLeadListingSearchParams(query: LeadListQuery) {
  const params = new URLSearchParams();

  setParam(params, "search", query.search);
  setParam(params, "status", query.status);
  setParam(params, "source", query.source);
  setParam(params, "priority", query.priority);
  setParam(params, "assignedToUserId", query.assignedToUserId);

  if (query.sortField !== "createdAt") params.set("sortField", query.sortField);
  if (query.sortDirection !== "desc") {
    params.set("sortDirection", query.sortDirection);
  }
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== adminLeadPageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  return params;
}

export function buildAdminLeadListingHref(
  query: LeadListQuery,
  page = query.page,
) {
  const params = createAdminLeadListingSearchParams({ ...query, page });
  const queryString = params.toString();

  return queryString
    ? `${adminRoutes.leads}?${queryString}`
    : adminRoutes.leads;
}

function parseWithInvalidFieldsRemoved(candidate: Record<string, unknown>) {
  const sanitized = { ...candidate };

  for (let attempt = 0; attempt <= adminQueryKeys.length; attempt += 1) {
    const result = leadListQuerySchema.safeParse(sanitized);

    if (result.success) return result.data;

    let replacedField = false;

    for (const issue of result.error.issues) {
      const field = issue.path[0];

      if (typeof field !== "string" || !(field in sanitized)) continue;

      if (field === "pageSize") sanitized.pageSize = adminLeadPageSize;
      else delete sanitized[field];

      replacedField = true;
    }

    if (!replacedField) break;
  }

  return leadListQuerySchema.parse({ pageSize: adminLeadPageSize });
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
