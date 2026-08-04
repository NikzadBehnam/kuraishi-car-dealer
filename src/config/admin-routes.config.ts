import {
  Activity,
  CalendarDays,
  Gauge,
  Images,
  Inbox,
  Settings,
  CarFront,
  Users,
  type LucideIcon,
} from "lucide-react";

export const adminRoutes = {
  dashboard: "/admin",
  vehicles: "/admin/vehicles",
  leads: "/admin/leads",
  appointments: "/admin/appointments",
  users: "/admin/users",
  activity: "/admin/activity",
  media: "/admin/media",
  settings: "/admin/settings",
} as const;

export interface AdminNavigationItem {
  label: string;
  description: string;
  href: (typeof adminRoutes)[keyof typeof adminRoutes];
  Icon: LucideIcon;
}

export const adminNavigation: AdminNavigationItem[] = [
  {
    label: "Dashboard",
    description: "Operational overview for the dealership.",
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
    description: "Review inquiries, valuations, and contact requests.",
    href: adminRoutes.leads,
    Icon: Inbox,
  },
  {
    label: "Appointments",
    description: "Track test drives, consultations, and callbacks.",
    href: adminRoutes.appointments,
    Icon: CalendarDays,
  },
  {
    label: "Users",
    description: "Inspect client accounts and account activity.",
    href: adminRoutes.users,
    Icon: Users,
  },
  {
    label: "Activity",
    description: "Audit user, lead, and inventory events.",
    href: adminRoutes.activity,
    Icon: Activity,
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
