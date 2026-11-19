"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarFront } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { adminNavigation, adminRoutes } from "@/config/admin-routes.config";
import { cn } from "@/lib/utils";

export function AdminSidebar({
  onNavigate,
  dealershipName,
}: {
  onNavigate?: () => void;
  dealershipName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[5.25rem] grid gap-3">
        <div className="bg-surface rounded-[var(--radius-sm)] border p-3">
          <div className="mb-3 flex items-center gap-3 border-b pb-3">
            <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-[var(--radius-sm)]">
              <CarFront className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold">
                {dealershipName} Admin
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                Operations workspace
              </span>
            </span>
          </div>
          <nav aria-label="Admin navigation">
            <AdminNavigationList pathname={pathname} onNavigate={onNavigate} />
          </nav>
        </div>
        <AdminIdentityCard dealershipName={dealershipName} />
      </div>
    </aside>
  );
}

export function AdminMobileSidebar({
  onNavigate,
  dealershipName,
}: {
  onNavigate: () => void;
  dealershipName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] gap-4">
      <div className="flex items-center gap-3 border-b pb-4">
        <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-[var(--radius-sm)]">
          <CarFront className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-extrabold">
            {dealershipName} Admin
          </span>
          <span className="text-muted-foreground block text-xs">
            Operations workspace
          </span>
        </span>
      </div>
      <nav aria-label="Admin mobile navigation" className="grid content-start">
        <AdminNavigationList pathname={pathname} onNavigate={onNavigate} />
      </nav>
      <AdminIdentityCard compact dealershipName={dealershipName} />
    </div>
  );
}

function AdminNavigationList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="grid gap-1">
      {adminNavigation.map(({ label, href, Icon }) => {
        const active =
          href === adminRoutes.dashboard
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-bold transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AdminIdentityCard({
  compact = false,
  dealershipName,
}: {
  compact?: boolean;
  dealershipName: string;
}) {
  return (
    <section
      aria-label="Current admin"
      className={cn(
        "bg-surface rounded-[var(--radius-sm)] border",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="bg-accent text-accent-foreground text-sm">
            KA
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-sm font-extrabold">
            {dealershipName} Admin
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            Operations Manager
          </span>
        </span>
      </div>
      {!compact && <Separator className="my-3" />}
      {!compact && (
        <p className="text-muted-foreground text-xs leading-5">
          Mocked identity for the admin UI phase. Authentication will be added
          later.
        </p>
      )}
    </section>
  );
}
