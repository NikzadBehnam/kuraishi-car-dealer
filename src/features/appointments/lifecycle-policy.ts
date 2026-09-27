import type { AppointmentStatus } from "./constants.ts";

const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionAppointmentStatus(
  currentStatus: AppointmentStatus,
  nextStatus: AppointmentStatus,
) {
  return (
    currentStatus === nextStatus ||
    allowedTransitions[currentStatus].includes(nextStatus)
  );
}

export function resolveAppointmentLifecycleDates(
  current: {
    cancelledAt: Date | null;
    completedAt: Date | null;
    confirmedAt: Date | null;
  },
  status: AppointmentStatus,
  now: Date,
) {
  return {
    cancelledAt: status === "cancelled" ? (current.cancelledAt ?? now) : null,
    completedAt: status === "completed" ? (current.completedAt ?? now) : null,
    confirmedAt:
      status === "confirmed" || status === "completed"
        ? (current.confirmedAt ?? now)
        : null,
  };
}
