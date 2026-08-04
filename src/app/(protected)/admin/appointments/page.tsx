import { adminAppointments, adminLeads, adminUsers, adminVehicles } from "@/data/admin";
import { AppointmentsBoard } from "./_components/appointments-board";

export default function AdminAppointmentsPage() {
  return (
    <AppointmentsBoard
      appointments={adminAppointments}
      leads={adminLeads}
      users={adminUsers}
      vehicles={adminVehicles}
    />
  );
}
