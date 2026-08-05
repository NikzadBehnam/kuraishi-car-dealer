import {
  adminActivityEvents,
  adminLeads,
  adminUsers,
  adminVehicles,
} from "@/data/admin";
import { UsersManagement } from "./_components/users-management";

export default function AdminUsersPage() {
  return (
    <UsersManagement
      users={adminUsers}
      vehicles={adminVehicles}
      leads={adminLeads}
      activityEvents={adminActivityEvents}
    />
  );
}
