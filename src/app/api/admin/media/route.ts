import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import { listAdminMediaAssets } from "@/lib/admin-media-queries";

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
