import {
  Activity,
  CalendarDays,
  Gauge,
  Images,
  Inbox,
  Settings,
  Shield,
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
  href: (typeof adminRoutes)[keyof typeof adminRoutes];
  Icon: LucideIcon;
}

export const adminNavigation: AdminNavigationItem[] = [
  { label: "Dashboard", href: adminRoutes.dashboard, Icon: Gauge },
  { label: "Vehicles", href: adminRoutes.vehicles, Icon: Shield },
  { label: "Leads", href: adminRoutes.leads, Icon: Inbox },
  {
    label: "Appointments",
    href: adminRoutes.appointments,
    Icon: CalendarDays,
  },
  { label: "Users", href: adminRoutes.users, Icon: Users },
  { label: "Activity", href: adminRoutes.activity, Icon: Activity },
  { label: "Media", href: adminRoutes.media, Icon: Images },
  { label: "Settings", href: adminRoutes.settings, Icon: Settings },
];
