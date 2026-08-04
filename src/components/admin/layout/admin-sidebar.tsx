"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarFront } from "lucide-react";

import {
  adminNavigation,
  adminRoutes,
} from "@/config/admin-routes.config";
import { cn } from "@/lib/utils";

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[5.25rem] grid gap-3">
        <div className="rounded-[var(--radius-sm)] border bg-surface p-3">
        <div className="mb-3 flex items-center gap-3 border-b pb-3">
            <span className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground">
              <CarFront className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold">
                Kuraishi Admin
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Operations workspace
              </span>
            </span>
          </div>
          <nav aria-label="Admin navigation">
            <AdminNavigationList pathname={pathname} onNavigate={onNavigate} />
          </nav>
        </div>
        <AdminIdentityCard />
      </div>
    </aside>
  );
}

export function AdminMobileSidebar({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] gap-4">
      <div className="flex items-center gap-3 border-b pb-4">
        <span className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground">
          <CarFront className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-extrabold">Kuraishi Admin</span>
          <span className="block text-xs text-muted-foreground">
            Operations workspace
          </span>
        </span>
      </div>
      <nav aria-label="Admin mobile navigation" className="grid content-start">
        <AdminNavigationList pathname={pathname} onNavigate={onNavigate} />
      </nav>
      <AdminIdentityCard compact />
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
              "flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-bold transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function AdminIdentityCard({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="Current admin"
      className={cn(
        "rounded-[var(--radius-sm)] border bg-surface",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">
          KA
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-extrabold">
            Kuraishi Admin
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Operations Manager
          </span>
        </span>
      </div>
    </section>
  );
}
