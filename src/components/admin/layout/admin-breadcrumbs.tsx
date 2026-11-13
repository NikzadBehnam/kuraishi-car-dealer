"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home, Inbox, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  adminRoutes,
  getAdminNavigationItem,
} from "@/config/admin-routes.config";

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const activeItem = getAdminNavigationItem(pathname);
  const isDashboard = pathname === adminRoutes.dashboard;

  return (
    <section className="min-w-0 rounded-[var(--radius-sm)] border bg-surface px-4 py-3 sm:px-5">
      <nav
        aria-label="Admin breadcrumb"
        className="flex flex-wrap items-center gap-1 text-xs font-bold text-muted-foreground"
      >
        <Link
          href={adminRoutes.dashboard}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Home className="size-3.5" aria-hidden="true" />
          Admin
        </Link>
        {activeItem.href !== adminRoutes.dashboard && (
          <>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-foreground">
              {activeItem.label}
            </span>
          </>
        )}
      </nav>
      <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
            {activeItem.label}
          </h1>
          {activeItem.description && (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {activeItem.description}
            </p>
          )}
        </div>
        {isDashboard && (
          <div className="grid w-full gap-2 sm:flex sm:w-auto">
            <Button
              asChild
              variant="accent"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
            >
              <Link href={`${adminRoutes.vehicles}/new`}>
                <Plus />
                Add vehicle
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
            >
              <Link href={adminRoutes.leads}>
                <Inbox />
                Review leads
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
