import {
  Gauge,
  Inbox,
  Settings,
  CarFront,
  type LucideIcon,
} from "lucide-react";

export const adminRoutes = {
  dashboard: "/admin",
  vehicles: "/admin/vehicles",
  leads: "/admin/leads",
  settings: "/admin/settings",
  newAccount: "/admin/accounts/new",
} as const;

export interface AdminNavigationItem {
  label: string;
  description?: string;
  href: (typeof adminRoutes)[keyof typeof adminRoutes];
  Icon: LucideIcon;
}

export const adminNavigation: AdminNavigationItem[] = [
  {
    label: "Dashboard",
    href: adminRoutes.dashboard,
    Icon: Gauge,
  },
  {
    label: "Vehicles",
    description: "Manage vehicle inventory and publishing states.",
    href: adminRoutes.vehicles,
    Icon: CarFront,
  },
  {
    label: "Leads",
    description: "Review inquiries and contact requests.",
    href: adminRoutes.leads,
    Icon: Inbox,
  },
  {
    label: "Settings",
    description: "Configure dealership UI settings.",
    href: adminRoutes.settings,
    Icon: Settings,
  },
];

export function getAdminNavigationItem(pathname: string) {
  return (
    adminNavigation.find((item) =>
      item.href === adminRoutes.dashboard
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? adminNavigation[0]
  );
}
