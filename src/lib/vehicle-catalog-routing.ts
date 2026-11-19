import { publicRoutes } from "../config/routes.config.ts";

export function buildPublicCatalogSearchHref(
  query: string,
  currentSearchParams: string,
) {
  const searchParams = new URLSearchParams(currentSearchParams);
  const normalizedQuery = query.trim();

  if (normalizedQuery) {
    searchParams.set("q", normalizedQuery);
  } else {
    searchParams.delete("q");
  }
  searchParams.delete("page");

  const search = searchParams.toString();
  return search ? `${publicRoutes.vehicles}?${search}` : publicRoutes.vehicles;
}

export function buildPublicCatalogPageHref(query: string, page: number) {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new RangeError("Catalog page must be a positive safe integer.");
  }

  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }
  if (page > 1) {
    searchParams.set("page", String(page));
  }

  const search = searchParams.toString();
  return search ? `${publicRoutes.vehicles}?${search}` : publicRoutes.vehicles;
}
