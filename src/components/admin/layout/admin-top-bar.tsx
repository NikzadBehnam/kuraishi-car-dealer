"use client";

import Link from "next/link";
import { Bell, CarFront, Menu, Search } from "lucide-react";
import { useState } from "react";

import { AdminMobileSidebar } from "@/components/admin/layout/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { adminRoutes } from "@/config/admin-routes.config";

export function AdminTopBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[92rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-[var(--radius-sm)] lg:hidden"
              aria-label="Open admin navigation"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Navigate between admin workspace sections.
            </SheetDescription>
            <AdminMobileSidebar onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

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
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-[var(--radius-sm)]"
                  aria-label="Notifications"
                >
                  <Bell />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden items-center gap-2 rounded-[var(--radius-sm)] border bg-background px-2.5 py-1.5 transition-colors hover:bg-surface-muted focus-visible:outline-none lg:flex"
                aria-label="Open admin account menu"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                    KA
                  </AvatarFallback>
                </Avatar>
                <span className="grid text-left leading-tight">
                  <span className="text-xs font-extrabold">
                    Kuraishi Admin
                  </span>
                  <span className="text-[0.68rem] text-muted-foreground">
                    Operations Manager
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block text-foreground">Kuraishi Admin</span>
                <span className="mt-1 block font-semibold">
                  UI-only account menu
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile preview</DropdownMenuItem>
              <DropdownMenuItem>Admin preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                Sign out unavailable in UI phase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
