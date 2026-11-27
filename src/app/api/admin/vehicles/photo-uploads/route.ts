import { ZodError } from "zod";
import { AuthorizationError } from "@/lib/auth-access";
import { isTrustedOrigin } from "@/lib/trusted-origins";
import {
  cancelPhotoUpload,
  completePhotoUpload,
  createPhotoUploads,
  VehiclePhotoError,
} from "@/lib/vehicle-photo-uploads";

async function handle(
  request: Request,
  operation: (input: unknown) => Promise<unknown>,
) {
  const headers = { "Cache-Control": "no-store" };
  if (!isTrustedOrigin(request.headers.get("origin"))) {
    return Response.json(
      { error: "Untrusted request origin." },
      { status: 403, headers },
    );
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers },
    );
  }
  try {
    const result = await operation(input);
    return result === undefined
      ? new Response(null, { status: 204, headers })
      : Response.json(result, { headers });
  } catch (error) {
    if (
      error instanceof AuthorizationError ||
      error instanceof VehiclePhotoError
    ) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Select up to five JPEG or PNG photos, at most 10 MB each." },
        { status: 400, headers },
      );
    }
    console.error("Vehicle photo upload request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not process the photo upload. Try again." },
      { status: 500, headers },
    );
  }
}

export async function POST(request: Request) {
  return handle(request, createPhotoUploads);
}

export async function PATCH(request: Request) {
  return handle(request, completePhotoUpload);
}

export async function DELETE(request: Request) {
  return handle(request, cancelPhotoUpload);
}
