"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import {
  adminRoutes,
  getAdminNavigationItem,
} from "@/config/admin-routes.config";

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const activeItem = getAdminNavigationItem(pathname);

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
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {activeItem.description}
          </p>
        </div>
      </div>
    </section>
  );
}
