import { redirect } from "next/navigation";

import {
  buildAdminLeadListingHref,
  parseAdminLeadListingSearchParams,
} from "@/features/leads/admin-listing-search-params.ts";
import { listAdminLeads } from "@/features/leads/server/admin-queries.ts";

import { LeadsInbox } from "./_components/leads-inbox";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseAdminLeadListingSearchParams(await searchParams);
  const result = await listAdminLeads(query);
  const lastPage = Math.max(1, result.totalPages);

  if (query.page > lastPage) {
    redirect(buildAdminLeadListingHref(query, lastPage));
  }

  return (
    <LeadsInbox
      key={buildAdminLeadListingHref(query)}
      query={query}
      result={result}
    />
  );
}
