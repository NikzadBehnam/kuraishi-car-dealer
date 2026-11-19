import { vehicles } from "@/data/vehicles";
import type { AdminVehicle, AdminVehicleStatus } from "@/types/admin";

const statusCycle: AdminVehicleStatus[] = [
  "published",
  "published",
  "reserved",
  "draft",
  "sold",
  "archived",
];

export const adminVehicles: AdminVehicle[] = vehicles.map((vehicle, index) => {
  const status = statusCycle[index % statusCycle.length];
  const publishedAt =
    status === "published" || status === "reserved" || status === "sold"
      ? `2026-07-${String((index % 18) + 4).padStart(2, "0")}T09:30:00.000Z`
      : undefined;

  return {
    ...vehicle,
    status,
    stockNumber: `KA-${String(2600 + index)}`,
    inspectionStatus:
      status === "draft"
        ? "in_progress"
        : status === "archived"
          ? "pending"
          : "passed",
    acquisitionDate: `2026-06-${String((index % 22) + 1).padStart(2, "0")}`,
    publishedAt,
    reservedUntil:
      status === "reserved" ? "2026-08-09T17:00:00.000Z" : undefined,
    soldAt: status === "sold" ? "2026-07-28T13:20:00.000Z" : undefined,
    lastUpdatedAt: `2026-08-${String((index % 4) + 1).padStart(2, "0")}T1${index % 10}:15:00.000Z`,
    vinLastSix: String(730000 + index * 137).slice(-6),
    ownerCount: (index % 3) + 1,
    marginEstimate: 1800 + index * 145,
  };
});
