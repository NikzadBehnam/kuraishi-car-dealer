import { routes } from "./routes.config";
export const mainNavigation = [
  { labelKey: "vehicles", href: routes.vehicles },
  { labelKey: "services", href: routes.services },
  { labelKey: "about", href: routes.about },
  { labelKey: "contact", href: routes.contact },
] as const;
