import { DashboardOverview } from "./_components/dashboard-overview";
import { getInventoryDashboardSummary } from "@/lib/inventory-queries";

export default async function AdminDashboardPage() {
  const inventorySummary = await getInventoryDashboardSummary();
  return <DashboardOverview inventorySummary={inventorySummary} />;
}
