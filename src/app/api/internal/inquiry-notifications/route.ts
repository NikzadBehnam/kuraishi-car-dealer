import { handleInquiryNotificationWorkerRequest } from "@/lib/inquiry-notification-worker-http";
import { processDueInquiryNotifications } from "@/lib/inquiry-notification-delivery";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleInquiryNotificationWorkerRequest(request, () =>
    processDueInquiryNotifications(),
  );
}
