import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import { listVehicleMediaAssets } from "@/lib/media-attachments";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return Response.json(await listVehicleMediaAssets(id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid vehicle ID." },
        { status: 400 },
      );
    }

    console.error("Vehicle media query failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not load vehicle images." },
      { status: 500 },
    );
  }
}
