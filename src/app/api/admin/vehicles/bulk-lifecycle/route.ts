import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import {
  bulkTransitionVehicles,
  InventoryMutationError,
} from "@/lib/inventory-mutations";
import { revalidateInventoryViews } from "@/lib/inventory-cache";
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
    const result = await bulkTransitionVehicles(input);
    if (result.succeeded.some(({ changed }) => changed)) {
      revalidateInventoryViews();
    }
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: error.issues[0]?.message ?? "Invalid bulk lifecycle request.",
        },
        { status: 400 },
      );
    }
    if (error instanceof InventoryMutationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Bulk vehicle lifecycle request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not update the selected vehicles." },
      { status: 500 },
    );
  }
}
