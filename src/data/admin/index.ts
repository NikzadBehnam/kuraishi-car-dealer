import { vehicles } from "@/data/vehicles";
import type {
  AdminLead,
  AdminMediaAsset,
  AdminVehicle,
  AdminVehicleStatus,
} from "@/types/admin";

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
    views: 240 + index * 37,
    inquiries: index % 6,
    marginEstimate: 1800 + index * 145,
  };
});

export const adminLeads: AdminLead[] = [
  {
    id: "lead-1",
    source: "test-drive",
    status: "new",
    priority: "urgent",
    customerName: "Daniel Berger",
    customerEmail: "daniel.berger@example.com",
    customerPhone: "+43 699 100 44 11",
    vehicleId: "1",
    createdAt: "2026-08-04T07:55:00.000Z",
    updatedAt: "2026-08-04T07:55:00.000Z",
    preferredDate: "2026-08-06T10:00:00.000Z",
    message: "Interested in a test drive and financing options.",
    notesCount: 0,
  },
  {
    id: "lead-3",
    source: "contact",
    status: "qualified",
    priority: "medium",
    customerName: "Elena Fischer",
    customerEmail: "elena.fischer@example.com",
    customerPhone: "+43 699 100 55 22",
    vehicleId: "3",
    createdAt: "2026-08-02T17:05:00.000Z",
    updatedAt: "2026-08-03T09:48:00.000Z",
    appointmentType: "Beratung",
    preferredDate: "2026-08-07T13:30:00.000Z",
    message: "Needs a family SUV with warranty and winter tires.",
    notesCount: 3,
  },
  {
    id: "lead-4",
    source: "callback",
    status: "closed",
    priority: "low",
    customerName: "Lukas Steiner",
    customerEmail: "lukas.steiner@example.com",
    customerPhone: "+43 699 100 77 44",
    vehicleId: "8",
    createdAt: "2026-07-31T08:25:00.000Z",
    updatedAt: "2026-08-01T12:12:00.000Z",
    message: "Callback completed. Customer will visit showroom next month.",
    notesCount: 1,
  },
  {
    id: "lead-5",
    source: "contact",
    status: "lost",
    priority: "medium",
    customerName: "Martin Hoffmann",
    customerEmail: "martin.hoffmann@example.com",
    customerPhone: "+43 699 100 66 33",
    vehicleId: "5",
    createdAt: "2026-07-28T10:18:00.000Z",
    updatedAt: "2026-07-29T16:30:00.000Z",
    message: "Customer selected another dealer due to delivery timing.",
    notesCount: 2,
  },
];

export const adminMediaAssets: AdminMediaAsset[] = [
  ...adminVehicles.slice(0, 6).map((vehicle, index) => ({
    id: `media-${index + 1}`,
    type: "image" as const,
    usage: "vehicle" as const,
    title: `${vehicle.make} ${vehicle.model} hero image`,
    filename: `${vehicle.slug}-hero.webp`,
    url: vehicle.images[0],
    alt: `${vehicle.make} ${vehicle.model} ${vehicle.variant}`,
    sizeKb: 420 + index * 32,
    width: 1400,
    height: 934,
    usedByVehicleId: vehicle.id,
    uploadedAt: vehicle.lastUpdatedAt,
  })),
  {
    id: "media-brand-1",
    type: "brand",
    usage: "brand",
    title: "Kuraishi full logo light",
    filename: "kuraishi-full-light.png",
    url: "/images/brand/kuraishi-full-light.png",
    alt: "Kuraishi Autohandel full logo",
    sizeKb: 228,
    width: 1305,
    height: 304,
    uploadedAt: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "media-doc-1",
    type: "document",
    usage: "legal",
    title: "Placeholder privacy document",
    filename: "privacy-placeholder.pdf",
    url: "#",
    alt: "Privacy placeholder document",
    sizeKb: 96,
    uploadedAt: "2026-07-14T10:30:00.000Z",
  },
];
