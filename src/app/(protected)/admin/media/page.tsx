import { redirect } from "next/navigation";

import {
  buildAdminMediaListingHref,
  parseAdminMediaListingSearchParams,
} from "@/features/media/admin-listing-search-params.ts";
import { listAdminMediaAssets } from "@/features/media/server/admin-queries.ts";

import { MediaLibrary } from "./_components/media-library";

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseAdminMediaListingSearchParams(await searchParams);
  const result = await listAdminMediaAssets(query);
  const lastPage = Math.max(1, result.totalPages);

  if (query.page > lastPage) {
    redirect(buildAdminMediaListingHref(query, lastPage));
  }

  return (
    <MediaLibrary
      key={buildAdminMediaListingHref(query)}
      query={query}
      result={result}
    />
  );
}
