import type { Instrumentation } from "next";

import { reportServerError } from "@/lib/server-error-reporting";

export const onRequestError: Instrumentation.onRequestError = (
  _error,
  _request,
  context,
) => {
  reportServerError({
    event: "unhandled_request",
    routerKind: context.routerKind,
    routeType: context.routeType,
  });
};
