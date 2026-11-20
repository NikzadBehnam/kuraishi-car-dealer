import { areDependenciesReady } from "@/lib/server-readiness";
import { createReadinessResponse } from "@/lib/health-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return createReadinessResponse(await areDependenciesReady());
}
