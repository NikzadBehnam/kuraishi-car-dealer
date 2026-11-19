import { acceptInquiry } from "@/lib/inquiry-intake";
import { handleInquiryRequest } from "@/lib/inquiry-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleInquiryRequest(request, acceptInquiry);
}
