import { adminActivityEvents } from "@/data/admin";
import { ActivityAudit } from "./_components/activity-audit";

export default function AdminActivityPage() {
  return <ActivityAudit events={adminActivityEvents} />;
}
