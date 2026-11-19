"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import { publicRoutes } from "@/config/routes.config";
import { MAX_PUBLIC_CATALOG_SEARCH_LENGTH } from "@/lib/inventory-validation";
import { buildPublicCatalogSearchHref } from "@/lib/vehicle-catalog-routing";

export function VehicleCatalogSearchForm({
  query: initialQuery,
}: {
  query: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (query.trim() === queryFromUrl.trim()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const nextHref = buildPublicCatalogSearchHref(query, searchParamsString);
      const currentHref = searchParamsString
        ? `${publicRoutes.vehicles}?${searchParamsString}`
        : publicRoutes.vehicles;
      if (nextHref !== currentHref) {
        router.replace(nextHref, { scroll: false });
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, queryFromUrl, router, searchParamsString]);

  return (
    <div role="search" className="relative flex w-full max-w-sm items-center">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        maxLength={MAX_PUBLIC_CATALOG_SEARCH_LENGTH}
        aria-label={content.search}
        placeholder={content.searchPlaceholder}
        className="bg-surface pr-11 pl-9"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          aria-label={content.clearSearch}
          onClick={() => setQuery("")}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
