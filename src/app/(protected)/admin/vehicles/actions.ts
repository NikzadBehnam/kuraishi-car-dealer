"use server";

import { revalidatePath } from "next/cache";

import { adminRoutes } from "@/config/admin-routes.config";
import {
  internalRoutes,
  publicRoutes,
  routeBuilders,
} from "@/config/routes.config";
import {
  bulkTransitionVehicleLifecycle,
  createVehicle,
  duplicateVehicle,
  transitionVehicleLifecycle,
  updateVehicle,
} from "@/features/vehicles/server/commands";

export async function createVehicleAction(input: unknown) {
  const result = await createVehicle(input);

  if (result.ok) revalidateVehiclePaths(result.data.slug);

  return result;
}

export async function updateVehicleAction(input: unknown) {
  const result = await updateVehicle(input);

  if (result.ok) {
    revalidateVehiclePaths(result.data.slug);

    if (result.data.previousSlug) {
      revalidatePath(routeBuilders.vehicleDetails(result.data.previousSlug));
      revalidatePath(
        routeBuilders.internalVehicleDetails(result.data.previousSlug),
      );
    }
  }

  return result;
}

export async function transitionVehicleLifecycleAction(input: unknown) {
  const result = await transitionVehicleLifecycle(input);

  if (result.ok) revalidateVehiclePaths(result.data.slug);

  return result;
}

export async function bulkTransitionVehicleLifecycleAction(input: unknown) {
  const result = await bulkTransitionVehicleLifecycle(input);

  if (result.ok) {
    revalidateVehicleCollectionPaths();

    for (const vehicle of result.data.items) {
      revalidateVehicleDetailPaths(vehicle.slug);
    }
  }

  return result;
}

export async function duplicateVehicleAction(input: unknown) {
  const result = await duplicateVehicle(input);

  if (result.ok) revalidateVehiclePaths(result.data.slug);

  return result;
}

function revalidateVehiclePaths(slug: string) {
  revalidateVehicleCollectionPaths();
  revalidateVehicleDetailPaths(slug);
}

function revalidateVehicleCollectionPaths() {
  revalidatePath(adminRoutes.vehicles);
  revalidatePath(publicRoutes.home);
  revalidatePath(publicRoutes.vehicles);
  revalidatePath(internalRoutes.vehicles);
  revalidatePath("/sitemap.xml");
}

function revalidateVehicleDetailPaths(slug: string) {
  revalidatePath(routeBuilders.vehicleDetails(slug));
  revalidatePath(routeBuilders.internalVehicleDetails(slug));
}
