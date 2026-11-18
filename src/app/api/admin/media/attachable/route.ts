import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import { listAttachableMediaAssets } from "@/lib/media-attachments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "24");

  try {
    return Response.json(await listAttachableMediaAssets({ page, pageSize }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid media page." },
        { status: 400 },
      );
    }

    console.error("Attachable media query failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not load attachable media." },
      { status: 500 },
    );
  }
}
