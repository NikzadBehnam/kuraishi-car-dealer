"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Bell, CarFront, Menu, Search, X } from "lucide-react";
import { useState } from "react";

import { AdminMobileSidebar } from "@/components/admin/layout/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminRoutes } from "@/config/admin-routes.config";

export function AdminTopBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[92rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-[var(--radius-sm)] lg:hidden"
              aria-label="Open admin navigation"
            >
              <Menu />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#06101f]/50 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-[90] w-[min(22rem,calc(100vw-2rem))] border-r bg-surface p-4 shadow-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
              <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
              <Dialog.Description className="sr-only">
                Navigate between admin workspace sections.
              </Dialog.Description>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 rounded-[var(--radius-sm)]"
                  aria-label="Close admin navigation"
                >
                  <X />
                </Button>
              </Dialog.Close>
              <AdminMobileSidebar onNavigate={() => setOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Link
          href={adminRoutes.dashboard}
          className="flex min-w-0 items-center gap-3"
          aria-label="Kuraishi admin dashboard"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground">
            <CarFront className="size-5" aria-hidden="true" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-extrabold">
              Kuraishi Admin
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Dealership operations
            </span>
          </span>
        </Link>

        <div className="relative ml-auto hidden w-full max-w-sm md:block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search admin workspace"
            placeholder="Search admin workspace"
            className="h-9 bg-background pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-[var(--radius-sm)]"
            aria-label="Notifications"
          >
            <Bell />
          </Button>
          <ThemeToggle />
          <div className="hidden items-center gap-2 rounded-[var(--radius-sm)] border bg-background px-2.5 py-1.5 lg:flex">
            <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-extrabold text-accent-foreground">
              KA
            </span>
            <span className="grid leading-tight">
              <span className="text-xs font-extrabold">Kuraishi Admin</span>
              <span className="text-[0.68rem] text-muted-foreground">
                Operations Manager
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
