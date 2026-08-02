import { routes } from "./routes.config";
export const mainNavigation = [
  { labelKey: "vehicles", href: routes.vehicles },
  { labelKey: "sellVehicle", href: routes.sellVehicle },
  { labelKey: "financing", href: routes.financing },
  { labelKey: "services", href: routes.services },
  { labelKey: "about", href: routes.about },
  { labelKey: "contact", href: routes.contact },
] as const;
