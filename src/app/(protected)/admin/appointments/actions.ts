"use server";

import { revalidatePath } from "next/cache";

import { adminRoutes } from "@/config/admin-routes.config";
import {
  createAppointment,
  rescheduleAppointment,
  transitionAppointmentStatus,
} from "@/features/appointments/server/commands";

export async function createAppointmentAction(input: unknown) {
  const result = await createAppointment(input);
  if (result.ok) revalidateAppointmentPaths();
  return result;
}

export async function rescheduleAppointmentAction(input: unknown) {
  const result = await rescheduleAppointment(input);
  if (result.ok) revalidateAppointmentPaths();
  return result;
}

export async function transitionAppointmentStatusAction(input: unknown) {
  const result = await transitionAppointmentStatus(input);
  if (result.ok) revalidateAppointmentPaths();
  return result;
}

function revalidateAppointmentPaths() {
  revalidatePath(adminRoutes.appointments);
  revalidatePath(adminRoutes.leads);
}
