import { PageHeader } from "@/components/layout/page-header";
import { ComparisonTable } from "./_components/vehicle-comparison-table";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Fahrzeugvergleich",
  "Bis zu drei Fahrzeuge direkt miteinander vergleichen.",
  publicRoutes.comparison,
);
export default function ComparisonPage() {
  return (
    <>
      <PageHeader
        title="Fahrzeugvergleich"
        description="Vergleichen Sie bis zu drei Fahrzeuge direkt miteinander."
        breadcrumb="Fahrzeugvergleich"
      />
      <div className="site-container py-10">
        <ComparisonTable />
      </div>
    </>
  );
}
