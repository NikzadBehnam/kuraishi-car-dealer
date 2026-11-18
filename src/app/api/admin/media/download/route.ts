import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth-access";
import {
  downloadAdminMediaAssets,
  MediaDownloadError,
} from "@/lib/admin-media-downloads";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ids = new URL(request.url).searchParams.getAll("id");
    return await downloadAdminMediaAssets(ids);
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
    if (error instanceof MediaDownloadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Media download request failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not download the selected media." },
      { status: 500 },
    );
  }
}
