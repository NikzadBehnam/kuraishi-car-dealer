export const publicRoutes = {
  home: "/",
  vehicles: "/fahrzeuge",
  vehicleSearch: "/fahrzeugsuche",
  favourites: "/merkliste",
  comparison: "/fahrzeugvergleich",
  sellVehicle: "/fahrzeug-verkaufen",
  services: "/services",
  about: "/ueber-uns",
  contact: "/kontakt",
  imprint: "/impressum",
  privacy: "/datenschutz",
  terms: "/agb",
  cookies: "/cookie-einstellungen",
} as const;

export const internalRoutes = {
  home: "/",
  vehicles: "/vehicles",
  vehicleSearch: "/vehicle-search",
  favourites: "/favourites",
  comparison: "/vehicle-comparison",
  sellVehicle: "/sell-vehicle",
  services: "/services",
  about: "/about-us",
  contact: "/contact",
  imprint: "/imprint",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookie-settings",
} as const;

export const routeBuilders = {
  vehicleDetails: (slug: string) => `${publicRoutes.vehicles}/${slug}`,
  internalVehicleDetails: (slug: string) =>
    `${internalRoutes.vehicles}/${slug}`,
} as const;

export const localizedRouteMappings = Object.entries(publicRoutes)
  .filter(([, publicPath]) => publicPath !== "/")
  .map(([key, publicPath]) => ({
    key: key as keyof typeof publicRoutes,
    publicPath,
    internalPath: internalRoutes[key as keyof typeof internalRoutes],
  }));

export const routes = publicRoutes;
