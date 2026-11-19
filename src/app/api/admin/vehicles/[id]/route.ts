import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import {
  deleteDraftVehicle,
  deleteVehicleMutationSchema,
  InventoryMutationError,
} from "@/lib/inventory-mutations";
import { revalidateInventoryViews } from "@/lib/inventory-cache";
import { isTrustedOrigin } from "@/lib/trusted-origins";

export const runtime = "nodejs";

const deleteBodySchema = deleteVehicleMutationSchema.omit({
  vehicleId: true,
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isTrustedOrigin(request.headers.get("origin"))) {
    return Response.json(
      { error: "Untrusted request origin." },
      { status: 403 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const body = deleteBodySchema.parse(input);
    const result = await deleteDraftVehicle({ vehicleId: id, ...body });
    revalidateInventoryViews();
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid deletion request." },
        { status: 400 },
      );
    }
    if (error instanceof InventoryMutationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Vehicle deletion failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not delete the vehicle." },
      { status: 500 },
    );
  }
}
