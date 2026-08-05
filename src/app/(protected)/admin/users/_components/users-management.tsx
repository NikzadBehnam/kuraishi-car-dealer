"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Ban,
  Eye,
  KeyRound,
  MoreHorizontal,
  Search,
  UserCog,
  Users,
} from "lucide-react";

import type {
  AdminActivityEvent,
  AdminLead,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  AdminVehicle,
} from "@/types/admin";
import { adminRoutes } from "@/config/admin-routes.config";
import { routeBuilders } from "@/config/routes.config";
import { formatCurrency, formatMileage } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const roleLabels: Record<AdminUserRole, string> = {
  client: "Client",
  admin: "Admin",
  staff: "Staff",
};

const statusLabels: Record<AdminUserStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  invited: "Invited",
};

const userTabClassName =
  "min-h-9 flex-1 basis-[7.5rem] bg-secondary px-3 text-xs sm:flex-none sm:text-sm";

const date = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function UsersManagement({
  users,
  vehicles,
  leads,
  activityEvents,
}: {
  users: AdminUser[];
  vehicles: AdminVehicle[];
  leads: AdminLead[];
  activityEvents: AdminActivityEvent[];
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminUserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminUserStatus>(
    "all",
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");

    return users
      .filter((user) => roleFilter === "all" || user.role === roleFilter)
      .filter(
        (user) => statusFilter === "all" || user.status === statusFilter,
      )
      .filter((user) => {
        if (!normalizedQuery) return true;

        return [user.name, user.email, user.phone ?? "", user.role, user.status]
          .join(" ")
          .toLocaleLowerCase("de")
          .includes(normalizedQuery);
      })
      .toSorted((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  }, [query, roleFilter, statusFilter, users]);

  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? null;

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">User management</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              UI-only account overview for clients, staff, and admins.
            </p>
          </div>
          <Button
            type="button"
            variant="accent"
            className="w-full rounded-[var(--radius-sm)] sm:w-auto"
            onClick={() => toast.info("Invite user is UI-only.")}
          >
            <Users />
            Invite user
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_10rem_10rem]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users by name, email, phone, role"
              aria-label="Search users"
              className="bg-background pl-9"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(value) =>
              setRoleFilter(value as "all" | AdminUserRole)
            }
          >
            <SelectTrigger aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as "all" | AdminUserStatus)
            }
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="min-w-0 overflow-hidden rounded-[var(--radius-sm)]">
        {filteredUsers.length ? (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3">User</TableHead>
                    <TableHead className="px-3">Phone</TableHead>
                    <TableHead className="px-3">Role</TableHead>
                    <TableHead className="px-3">Status</TableHead>
                    <TableHead className="px-3">Registered</TableHead>
                    <TableHead className="px-3">Last login</TableHead>
                    <TableHead className="px-3 text-right">
                      Favourites
                    </TableHead>
                    <TableHead className="px-3 text-right">Inquiries</TableHead>
                    <TableHead className="w-12 px-3 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <UserTableRow
                      key={user.id}
                      user={user}
                      onOpen={() => setSelectedUserId(user.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid min-w-0 lg:hidden">
              {filteredUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onOpen={() => setSelectedUserId(user.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyUsersState />
        )}
      </Card>

      <UserDetailSheet
        user={selectedUser}
        vehicles={vehicles}
        leads={leads}
        activityEvents={activityEvents}
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      />
    </div>
  );
}

function UserTableRow({
  user,
  onOpen,
}: {
  user: AdminUser;
  onOpen: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="min-w-60 px-3">
        <UserIdentity user={user} />
      </TableCell>
      <TableCell className="px-3 text-sm">
        {user.phone ?? "Not provided"}
      </TableCell>
      <TableCell className="px-3">
        <RoleBadge role={user.role} />
      </TableCell>
      <TableCell className="px-3">
        <StatusBadge status={user.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap px-3 text-xs font-bold text-muted-foreground">
        {formatDate(user.registeredAt)}
      </TableCell>
      <TableCell className="whitespace-nowrap px-3 text-xs font-bold text-muted-foreground">
        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
      </TableCell>
      <TableCell className="px-3 text-right font-bold">
        {user.favouritesVehicleIds.length}
      </TableCell>
      <TableCell className="px-3 text-right font-bold">
        {user.inquiryIds.length}
      </TableCell>
      <TableCell className="px-3 text-right">
        <UserActions user={user} onOpen={onOpen} />
      </TableCell>
    </TableRow>
  );
}

function UserCard({ user, onOpen }: { user: AdminUser; onOpen: () => void }) {
  return (
    <article className="grid gap-3 border-b p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} />
        <UserActions user={user} onOpen={onOpen} />
      </div>
      <div className="flex flex-wrap gap-2">
        <RoleBadge role={user.role} />
        <StatusBadge status={user.status} />
      </div>
      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <span>Registered {formatDate(user.registeredAt)}</span>
        <span>
          Last login {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
        </span>
        <span>{user.favouritesVehicleIds.length} favourites</span>
        <span>{user.inquiryIds.length} inquiries</span>
      </div>
    </article>
  );
}

function UserDetailSheet({
  user,
  vehicles,
  leads,
  activityEvents,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  vehicles: AdminVehicle[];
  leads: AdminLead[];
  activityEvents: AdminActivityEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!user) return null;

  const savedVehicles = vehicles.filter((vehicle) =>
    user.favouritesVehicleIds.includes(vehicle.id),
  );
  const comparedVehicles = vehicles.filter((vehicle) =>
    user.comparisonVehicleIds.includes(vehicle.id),
  );
  const inquiries = leads.filter((lead) => user.inquiryIds.includes(lead.id));
  const valuations = leads.filter((lead) =>
    user.valuationLeadIds.includes(lead.id),
  );
  const events = activityEvents
    .filter((event) => event.actorUserId === user.id)
    .toSorted((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(46rem,calc(100vw-1rem))] overflow-hidden p-0"
      >
        <ScrollArea className="h-full">
          <div className="grid min-w-0 gap-5 p-4 pt-12 sm:p-5 sm:pr-12">
            <SheetHeader>
              <div className="flex flex-wrap gap-2">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
              <SheetTitle>{user.name}</SheetTitle>
              <SheetDescription>
                Registered {formatDate(user.registeredAt)}.{" "}
                {user.lastLoginAt
                  ? `Last login ${formatDateTime(user.lastLoginAt)}.`
                  : "No login recorded."}
              </SheetDescription>
            </SheetHeader>

            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[var(--radius-sm)]"
                onClick={() => toast.info("View profile is UI-only.")}
              >
                <Eye />
                View profile
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[var(--radius-sm)]"
                onClick={() => toast.info("Reset password is UI-only.")}
              >
                <KeyRound />
                Reset password
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[var(--radius-sm)]"
                onClick={() => toast.info("Change role is UI-only.")}
              >
                <UserCog />
                Change role
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full rounded-[var(--radius-sm)]"
                onClick={() => toast.info("Disable account is UI-only.")}
              >
                <Ban />
                Disable account
              </Button>
            </div>

            <Tabs defaultValue="profile" className="min-w-0">
              <div className="min-w-0 rounded-[var(--radius-sm)] border bg-surface p-2">
                <TabsList className="flex h-auto min-h-0 w-full flex-wrap items-stretch justify-start gap-1 bg-transparent p-0">
                  <TabsTrigger className={userTabClassName} value="profile">
                    Profile
                  </TabsTrigger>
                  <TabsTrigger className={userTabClassName} value="vehicles">
                    Vehicles
                  </TabsTrigger>
                  <TabsTrigger className={userTabClassName} value="inquiries">
                    Inquiries
                  </TabsTrigger>
                  <TabsTrigger className={userTabClassName} value="valuations">
                    Valuations
                  </TabsTrigger>
                  <TabsTrigger className={userTabClassName} value="activity">
                    Activity
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="profile">
                <DetailSection title="Profile info">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <Info label="Name" value={user.name} />
                    <Info label="Email" value={user.email} />
                    <Info label="Phone" value={user.phone ?? "Not provided"} />
                    <Info label="Role" value={roleLabels[user.role]} />
                    <Info label="Status" value={statusLabels[user.status]} />
                    <Info
                      label="Sessions"
                      value={String(user.totalSessions)}
                    />
                  </div>
                  {user.notes && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-sm leading-6 text-muted-foreground">
                        {user.notes}
                      </p>
                    </>
                  )}
                </DetailSection>
              </TabsContent>

              <TabsContent value="vehicles">
                <DetailSection title="Saved vehicles">
                  <VehicleList vehicles={savedVehicles} empty="No saved vehicles." />
                  <Separator className="my-4" />
                  <h4 className="text-sm font-extrabold">
                    Comparison vehicles
                  </h4>
                  <div className="mt-3">
                    <VehicleList
                      vehicles={comparedVehicles}
                      empty="No comparison vehicles."
                    />
                  </div>
                </DetailSection>
              </TabsContent>

              <TabsContent value="inquiries">
                <DetailSection title="Inquiries">
                  <LeadList leads={inquiries} empty="No inquiries recorded." />
                </DetailSection>
              </TabsContent>

              <TabsContent value="valuations">
                <DetailSection title="Valuation requests">
                  <LeadList
                    leads={valuations}
                    empty="No valuation requests recorded."
                  />
                </DetailSection>
              </TabsContent>

              <TabsContent value="activity">
                <DetailSection title="Activity timeline">
                  {events.length ? (
                    <div className="grid gap-4">
                      {events.map((event) => (
                        <TimelineItem key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <EmptyInline text="No activity recorded for this user." />
                  )}
                </DetailSection>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function UserIdentity({ user }: { user: AdminUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-10">
        <AvatarFallback className="bg-accent text-accent-foreground">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-extrabold">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

function UserActions({ user, onOpen }: { user: AdminUser; onOpen: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-[var(--radius-sm)]"
          aria-label={`Open actions for ${user.name}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpen}>
          <Eye />
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Reset password is UI-only.")}>
          <KeyRound />
          Reset password
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Change role is UI-only.")}>
          <UserCog />
          Change role
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => toast.info("Disable account is UI-only.")}
        >
          <Ban />
          Disable account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function VehicleList({
  vehicles,
  empty,
}: {
  vehicles: AdminVehicle[];
  empty: string;
}) {
  if (!vehicles.length) return <EmptyInline text={empty} />;

  return (
    <div className="grid gap-3">
      {vehicles.map((vehicle) => (
        <Link
          key={vehicle.id}
          href={routeBuilders.vehicleDetails(vehicle.slug)}
          className="grid gap-2 rounded-[var(--radius-sm)] border bg-background p-3 transition-colors hover:bg-surface-muted sm:grid-cols-[1fr_auto]"
        >
          <span className="min-w-0">
            <span className="block truncate font-extrabold">
              {vehicle.make} {vehicle.model}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {vehicle.stockNumber} - {vehicle.variant}
            </span>
          </span>
          <span className="text-sm font-bold text-muted-foreground">
            {formatCurrency(vehicle.price)}
          </span>
          <span className="text-xs text-muted-foreground sm:col-span-2">
            {formatMileage(vehicle.mileage)} - {vehicle.location}
          </span>
        </Link>
      ))}
    </div>
  );
}

function LeadList({ leads, empty }: { leads: AdminLead[]; empty: string }) {
  if (!leads.length) return <EmptyInline text={empty} />;

  return (
    <div className="grid gap-3">
      {leads.map((lead) => (
        <Link
          key={lead.id}
          href={adminRoutes.leads}
          className="rounded-[var(--radius-sm)] border bg-background p-3 transition-colors hover:bg-surface-muted"
        >
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
              {lead.source}
            </Badge>
            <Badge className="bg-accent/10 text-accent">{lead.status}</Badge>
          </div>
          <p className="mt-3 font-extrabold">{lead.customerName}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {lead.message}
          </p>
        </Link>
      ))}
    </div>
  );
}

function TimelineItem({ event }: { event: AdminActivityEvent }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3">
      <span className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
        <Activity className="size-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-extrabold">{event.summary}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {event.targetLabel}
        </span>
        <span className="mt-1 block text-xs font-bold text-muted-foreground">
          {formatDateTime(event.occurredAt)}
        </span>
      </span>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[var(--radius-sm)] border bg-background p-4">
      <h3 className="text-sm font-extrabold">{title}</h3>
      <Separator className="my-3" />
      {children}
    </section>
  );
}

function RoleBadge({ role }: { role: AdminUserRole }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        role === "admin" && "bg-info/10 text-info",
        role === "staff" && "bg-success/10 text-success",
      )}
    >
      {roleLabels[role]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: AdminUserStatus }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        status === "active" && "bg-success/10 text-success",
        status === "suspended" && "bg-destructive/10 text-destructive",
        status === "invited" && "bg-accent/10 text-accent",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function EmptyUsersState() {
  return (
    <div className="grid min-h-72 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
          <Users className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">No users found</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Change the role, status, or search filters to review more mocked user
          accounts.
        </p>
      </div>
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return (
    <p className="rounded-[var(--radius-sm)] border bg-surface p-4 text-sm font-semibold text-muted-foreground">
      {text}
    </p>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string) {
  return date.format(new Date(value));
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
