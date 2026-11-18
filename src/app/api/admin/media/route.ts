import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import { deleteAdminMediaAssets } from "@/lib/admin-media-deletions";
import { listAdminMediaAssets } from "@/lib/admin-media-queries";
import { isTrustedOrigin } from "@/lib/trusted-origins";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return Response.json(await listAdminMediaAssets(query), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid media query." },
        { status: 400 },
      );
    }

    console.error("Media library query failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not load media assets." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
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
    return Response.json(await deleteAdminMediaAssets(input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid media selection." },
        { status: 400 },
      );
    }

    console.error("Media deletion request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not delete the selected media." },
      { status: 500 },
    );
  }
}
