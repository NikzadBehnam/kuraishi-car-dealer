import { AuthorizationError } from "@/lib/auth-access";
import { cleanupExpiredMediaUploadIntents } from "@/lib/media-uploads";
import { isTrustedOrigin } from "@/lib/trusted-origins";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request.headers.get("origin"))) {
    return Response.json(
      { error: "Untrusted request origin." },
      { status: 403 },
    );
  }

  try {
    return Response.json(await cleanupExpiredMediaUploadIntents(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Expired media upload cleanup failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Could not clean up expired media uploads." },
      { status: 500 },
    );
  }
}
