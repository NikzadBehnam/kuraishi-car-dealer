type ServerErrorEvent =
  | {
      event: "unhandled_request";
      routerKind: "Pages Router" | "App Router";
      routeType: "render" | "route" | "action" | "proxy";
    }
  | {
      event: "readiness_failure";
      dependency: "database" | "storage" | "delivery";
    };

export function reportServerError(event: ServerErrorEvent): void {
  if (event.event === "unhandled_request") {
    console.error("Unhandled server request.", {
      event: event.event,
      routerKind: event.routerKind,
      routeType: event.routeType,
    });
    return;
  }

  console.error("Server readiness check failed.", {
    event: event.event,
    dependency: event.dependency,
  });
}
