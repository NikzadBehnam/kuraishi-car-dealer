import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import {
  InventoryMutationError,
  transitionVehicleLifecycle,
  vehicleLifecycleMutationSchema,
} from "@/lib/inventory-mutations";
import { InventoryPolicyError } from "@/lib/inventory-lifecycle";
import { isTrustedOrigin } from "@/lib/trusted-origins";

export const runtime = "nodejs";

const lifecycleBodySchema = vehicleLifecycleMutationSchema.omit({
  vehicleId: true,
});

export async function POST(
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
    const body = lifecycleBodySchema.parse(input);
    const result = await transitionVehicleLifecycle({
      vehicleId: id,
      ...body,
    });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid lifecycle request." },
        { status: 400 },
      );
    }
    if (
      error instanceof InventoryMutationError ||
      error instanceof InventoryPolicyError
    ) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Vehicle lifecycle change failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not update the vehicle status." },
      { status: 500 },
    );
  }
}
