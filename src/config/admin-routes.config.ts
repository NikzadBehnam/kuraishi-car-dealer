import {
  Gauge,
  Images,
  Inbox,
  Settings,
  CarFront,
  type LucideIcon,
} from "lucide-react";

export const adminRoutes = {
  dashboard: "/admin",
  vehicles: "/admin/vehicles",
  leads: "/admin/leads",
  media: "/admin/media",
  settings: "/admin/settings",
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
    label: "Media",
    description: "Organize vehicle imagery and dealership assets.",
    href: adminRoutes.media,
    Icon: Images,
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
