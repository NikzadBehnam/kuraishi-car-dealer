import { serveVehiclePhoto } from "@/lib/vehicle-photos";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  return serveVehiclePhoto((await params).photoId, "staff");
}
