import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createPublicMetadata } from "@/lib/metadata";
import { routeBuilders } from "@/config/routes.config";
import {
  getRelatedVehicles,
  resolvePublicVehicleDetail,
} from "@/lib/inventory-queries";
import {
  listPublicVehicleCardImages,
  listPublicVehicleMediaAssets,
} from "@/lib/media-attachments";

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
  const title = `${vehicle.make} ${vehicle.model}`;
  const description =
    vehicle.description ??
    `${vehicle.make} ${vehicle.model} bei ${vehicle.dealer.name}.`;
  const { assets } = await listPublicVehicleMediaAssets(vehicle.id);
  const baseMetadata = await createPublicMetadata(
    title,
    description,
    canonical,
  );
  return {
    ...baseMetadata,
    openGraph: {
      ...baseMetadata.openGraph,
      images: assets[0]
        ? [
            {
              url: assets[0].previewUrl,
              alt: assets[0].altText?.trim() || assets[0].title,
            },
          ]
        : [],
    },
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

  const [media, candidates] = await Promise.all([
    listPublicVehicleMediaAssets(detail.vehicle.id),
    getRelatedVehicles({ id: detail.vehicle.id, limit: 3 }),
  ]);
  const relatedVehicles = candidates ?? [];
  const relatedImages = await listPublicVehicleCardImages(
    relatedVehicles.map(({ id }) => id),
  );
  return (
    <InventoryVehicleDetail
      vehicle={detail.vehicle}
      images={media.assets.map(({ id, title, altText, previewUrl }) => ({
        id,
        title,
        altText,
        url: previewUrl,
      }))}
      relatedVehicles={relatedVehicles.map((vehicle) => ({
        vehicle,
        images: relatedImages.get(vehicle.id) ?? [],
      }))}
    />
  );
}
