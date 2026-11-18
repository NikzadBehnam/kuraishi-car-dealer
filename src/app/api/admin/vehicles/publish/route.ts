import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import {
  InventoryMutationError,
  publishVehicle,
} from "@/lib/inventory-mutations";
import { InventoryPolicyError } from "@/lib/inventory-lifecycle";
import { isTrustedOrigin } from "@/lib/trusted-origins";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    const result = await publishVehicle(input);
    return Response.json(result, {
      status: result.created ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid vehicle details." },
        { status: 400 },
      );
    }
    if (
      error instanceof InventoryMutationError ||
      error instanceof InventoryPolicyError
    ) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Vehicle publication failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not publish the vehicle." },
      { status: 500 },
    );
  }
}
