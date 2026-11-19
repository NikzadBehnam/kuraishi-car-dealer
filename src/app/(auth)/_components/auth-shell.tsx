import Link from "next/link";
import { ArrowLeft, CarFront, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site.config";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(26rem,1fr)] lg:px-8">
        <section className="bg-surface hidden min-w-0 flex-col justify-between rounded-[var(--radius-sm)] border p-6 lg:flex">
          <div>
            <Link
              href="/"
              className="focus-visible:ring-ring inline-flex items-center gap-3 rounded-[var(--radius-sm)] focus-visible:ring-1 focus-visible:outline-none"
            >
              <span className="bg-primary text-primary-foreground grid size-11 place-items-center rounded-[var(--radius-sm)]">
                <CarFront className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-extrabold">
                  {siteConfig.brandName}
                </span>
                <span className="text-muted-foreground block text-xs">
                  Client account access
                </span>
              </span>
            </Link>
          </div>

          <div className="max-w-md">
            <div className="bg-secondary text-primary mb-5 grid size-12 place-items-center rounded-[var(--radius-sm)]">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </div>
            <p className="text-muted-foreground text-sm font-bold tracking-[0.18em] uppercase">
              Future account workspace
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
              Manage comparisons and inquiries from one place.
            </h1>
            <p className="text-muted-foreground mt-4 text-sm leading-6">
              This is a UI-only authentication surface prepared for the later
              client and admin auth phase. No credentials are checked yet.
            </p>
          </div>

          <div className="text-muted-foreground grid gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-success size-2 rounded-full" />
              Mock forms only
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-info size-2 rounded-full" />
              Dark mode ready
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col">
          <header className="flex min-w-0 items-center justify-between gap-3 py-3">
            <Button
              asChild
              variant="ghost"
              className="rounded-[var(--radius-sm)]"
            >
              <Link href="/">
                <ArrowLeft />
                Home
              </Link>
            </Button>
            <ThemeToggle />
          </header>

          <div className="grid flex-1 place-items-center py-6">
            <Card className="admin-content-enter w-full max-w-[31rem] min-w-0 rounded-[var(--radius-sm)] p-5 sm:p-6">
              <div className="mb-6">
                <div className="mb-5 flex items-center gap-3 lg:hidden">
                  <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-[var(--radius-sm)]">
                    <CarFront className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">
                      {siteConfig.brandName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      Client account access
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase">
                  {eyebrow}
                </p>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
                  {title}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {description}
                </p>
              </div>
              {children}
              <div className="text-muted-foreground mt-6 border-t pt-5 text-sm">
                {footer}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
