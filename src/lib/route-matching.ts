import { publicRoutes } from "@/config/routes.config";

export function isExactRoute(pathname: string, route: string): boolean {
  return pathname === route;
}

export function isNestedRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isVehicleDetailsRoute(pathname: string): boolean {
  return (
    pathname.startsWith(`${publicRoutes.vehicles}/`) &&
    pathname !== publicRoutes.vehicles
  );
}

export function isAccountRoute(pathname: string): boolean {
  return pathname === "/konto" || pathname.startsWith("/konto/");
}

export function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
