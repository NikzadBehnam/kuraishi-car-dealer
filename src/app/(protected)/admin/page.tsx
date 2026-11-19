import { DashboardOverview } from "./_components/dashboard-overview";
import { getAdminDashboardMetrics } from "@/lib/admin-dashboard-queries";

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics();
  return <DashboardOverview metrics={metrics} />;
}
