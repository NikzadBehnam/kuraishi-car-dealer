import { adminLeads, adminVehicles } from "@/data/admin";
import { LeadsInbox } from "./_components/leads-inbox";

export default function AdminLeadsPage() {
  return (
    <LeadsInbox
      leads={adminLeads}
      vehicles={adminVehicles}
    />
  );
}
