import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { createPublicMetadata } from "@/lib/metadata";
import { routeBuilders } from "@/config/routes.config";
import {
  getRelatedVehicles,
  resolvePublicVehicleDetail,
} from "@/lib/inventory-queries";
import {
  listPublicVehicleCardImages,
  listPublicVehiclePhotos,
} from "@/lib/vehicle-photos";

import { InventoryVehicleDetail } from "./_components/inventory-vehicle-detail";
import VehicleDetailsLoading from "./_components/vehicle-details-loading";

export const dynamic = "force-dynamic";
const resolveDetail = cache(resolvePublicVehicleDetail);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await resolveDetail(slug);
  if (detail.kind !== "visible") {
    return {
      title: "Fahrzeug nicht gefunden",
      description: null,
      openGraph: null,
      robots: { index: false, follow: false },
    };
  }

  const { vehicle } = detail;
  const canonical = routeBuilders.vehicleDetails(vehicle.slug);
  const title = `${vehicle.make} ${vehicle.model}`;
  const description =
    vehicle.description ??
    `${vehicle.make} ${vehicle.model} bei ${vehicle.dealer.name}.`;
  const photos = await listPublicVehiclePhotos(vehicle.id);
  const baseMetadata = await createPublicMetadata(
    title,
    description,
    canonical,
  );
  return {
    ...baseMetadata,
    openGraph: {
      ...baseMetadata.openGraph,
      images: photos[0]
        ? [
            {
              url: photos[0].previewUrl,
              alt: photos[0].altText?.trim() || title,
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
  // Decide visibility before any loading fallback can commit the HTTP status.
  const detail = await resolveDetail(slug);
  if (detail.kind !== "visible") notFound();

  return (
    <Suspense fallback={<VehicleDetailsLoading />}>
      <VisibleVehicleDetail vehicle={detail.vehicle} />
    </Suspense>
  );
}

async function VisibleVehicleDetail({
  vehicle,
}: {
  vehicle: Extract<
    Awaited<ReturnType<typeof resolveDetail>>,
    { kind: "visible" }
  >["vehicle"];
}) {
  const [photos, candidates] = await Promise.all([
    listPublicVehiclePhotos(vehicle.id),
    getRelatedVehicles({ id: vehicle.id, limit: 3 }),
  ]);
  const relatedVehicles = candidates ?? [];
  const relatedImages = await listPublicVehicleCardImages(
    relatedVehicles.map(({ id }) => id),
  );
  return (
    <InventoryVehicleDetail
      vehicle={vehicle}
      images={photos.map(({ id, altText, previewUrl }, index) => ({
        id,
        title: `Fahrzeugfoto ${index + 1}`,
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
