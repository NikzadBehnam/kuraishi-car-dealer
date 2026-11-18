import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import {
  createMediaUploadIntents,
  MediaUploadError,
} from "@/lib/media-uploads";
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
    return Response.json(await createMediaUploadIntents(input), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid upload details." },
        { status: 400 },
      );
    }
    if (error instanceof MediaUploadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Media upload preparation failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not prepare the media upload." },
      { status: 500 },
    );
  }
}
