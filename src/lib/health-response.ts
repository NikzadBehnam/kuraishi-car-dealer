export function createReadinessResponse(ready: boolean): Response {
  return Response.json(
    { status: ready ? "ok" : "unavailable" },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
