import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CarFront, ChevronRight } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { adminNavigation } from "@/config/admin-routes.config";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-surface/95 backdrop-blur">
        <div className="site-container flex h-16 items-center gap-5">
          <Link
            href="/admin"
            className="w-[clamp(8.5rem,14vw,11rem)] shrink-0"
            aria-label="Kuraishi Admin Dashboard"
          >
            <BrandLogo priority />
          </Link>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground md:flex">
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="font-bold text-foreground">Admin</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button
              asChild
              variant="accent"
              className="hidden rounded-[var(--radius-sm)] sm:inline-flex"
            >
              <Link href="/admin/vehicles">
                <CarFront />
                Inventory
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="site-container grid gap-6 py-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[5.5rem] lg:self-start">
          <nav
            aria-label="Admin navigation"
            className="flex gap-2 overflow-x-auto rounded-[var(--radius-sm)] border bg-surface p-2 lg:grid"
          >
            {adminNavigation.map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-10 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
