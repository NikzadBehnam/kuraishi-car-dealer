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
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(26rem,1fr)] lg:px-8">
        <section className="hidden min-w-0 flex-col justify-between rounded-[var(--radius-sm)] border bg-surface p-6 lg:flex">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span className="grid size-11 place-items-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground">
                <CarFront className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-extrabold">
                  {siteConfig.shortName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Client account access
                </span>
              </span>
            </Link>
          </div>

          <div className="max-w-md">
            <div className="mb-5 grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Future account workspace
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
              Manage saved vehicles, comparisons, and inquiries from one place.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              This is a UI-only authentication surface prepared for the later
              client and admin auth phase. No credentials are checked yet.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              Mock forms only
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-info" />
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
            <Card className="w-full min-w-0 max-w-[31rem] rounded-[var(--radius-sm)] p-5 sm:p-6">
              <div className="mb-6">
                <div className="mb-5 flex items-center gap-3 lg:hidden">
                  <span className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground">
                    <CarFront className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">
                      {siteConfig.shortName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Client account access
                    </p>
                  </div>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {eyebrow}
                </p>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
                  {title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
              {children}
              <div className="mt-6 border-t pt-5 text-sm text-muted-foreground">
                {footer}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
