import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { routeBuilders } from "@/config/routes.config";
import { listPublicVehicleMediaAssets } from "@/lib/media-attachments";
import { resolvePublicVehicleDetail } from "@/lib/inventory-queries";

import { InventoryVehicleDetail } from "./_components/inventory-vehicle-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await resolvePublicVehicleDetail(slug);
  if (detail.kind !== "visible") {
    return {
      title: "Fahrzeug nicht gefunden",
      robots: { index: false, follow: false },
    };
  }

  const { vehicle } = detail;
  const canonical = routeBuilders.vehicleDetails(vehicle.slug);
  return {
    title: `${vehicle.make} ${vehicle.model}`,
    description:
      vehicle.description ??
      `${vehicle.make} ${vehicle.model} bei ${vehicle.dealerName}.`,
    alternates: { canonical },
    openGraph: { url: canonical },
  };
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await resolvePublicVehicleDetail(slug);
  if (detail.kind !== "visible") notFound();

  const { assets } = await listPublicVehicleMediaAssets(detail.vehicle.id);
  return (
    <InventoryVehicleDetail
      vehicle={detail.vehicle}
      images={assets.map(({ previewUrl }) => previewUrl)}
    />
  );
}
