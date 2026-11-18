import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import {
  createDraftVehicle,
  InventoryMutationError,
  updateVehicle,
} from "@/lib/inventory-mutations";
import { isTrustedOrigin } from "@/lib/trusted-origins";

export const runtime = "nodejs";

async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }
}

function failureResponse(
  error: unknown,
  fallbackMessage = "Could not save vehicle changes.",
) {
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json(
      { error: error.issues[0]?.message ?? "Invalid vehicle details." },
      { status: 400 },
    );
  }
  if (error instanceof InventoryMutationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("Vehicle save failed.", {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json({ error: fallbackMessage }, { status: 500 });
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request.headers.get("origin"))) {
    return Response.json(
      { error: "Untrusted request origin." },
      { status: 403 },
    );
  }

  const input = await readJson(request);
  if (input instanceof Response) {
    return input;
  }

  try {
    return Response.json(await createDraftVehicle(input), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failureResponse(error, "Could not save the vehicle draft.");
  }
}

export async function PATCH(request: Request) {
  if (!isTrustedOrigin(request.headers.get("origin"))) {
    return Response.json(
      { error: "Untrusted request origin." },
      { status: 403 },
    );
  }

  const input = await readJson(request);
  if (input instanceof Response) {
    return input;
  }

  try {
    return Response.json(await updateVehicle(input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
