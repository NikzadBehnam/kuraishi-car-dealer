"use client";

import Link from "next/link";
import { CarFront, Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
import { adminRoutes } from "@/config/admin-routes.config";
import { authClient } from "@/lib/auth-client";

export function AdminTopBar({ dealershipName }: { dealershipName: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  // UX only: the account-creation page and action re-check the role on the server.
  const displayName = session?.user.name ?? "Account";
  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";
  const isMaster = session?.user.role === "admin";

  const signOut = async () => {
    const { error } = await authClient.signOut();

    if (error) {
      toast.error(error.message || "Sign out failed. Please try again.");
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="bg-surface/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[92rem] min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
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
            <AdminMobileSidebar
              dealershipName={dealershipName}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <Link
          href={adminRoutes.dashboard}
          className="flex min-w-0 items-center gap-3"
          aria-label={`${dealershipName} admin dashboard`}
        >
          <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)]">
            <CarFront className="size-5" aria-hidden="true" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-extrabold">
              {dealershipName} Admin
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              Dealership operations
            </span>
          </span>
        </Link>

        <form
          action={adminRoutes.vehicles}
          method="get"
          role="search"
          aria-label="Search inventory"
          className="relative ml-auto hidden w-full max-w-sm md:block"
        >
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="search"
            maxLength={100}
            autoComplete="off"
            aria-label="Search inventory"
            placeholder="Search inventory"
            className="bg-background h-9 pl-9"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="bg-background hover:bg-surface-muted flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1.5 transition-colors focus-visible:outline-none"
                aria-label="Open admin account menu"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left leading-tight lg:grid">
                  <span className="text-xs font-extrabold">{displayName}</span>
                  <span className="text-muted-foreground text-[0.68rem]">
                    {isMaster ? "Administrator" : "User"}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="text-foreground block">{displayName}</span>
                <span className="mt-1 block font-semibold">
                  {session?.user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isMaster ? (
                <DropdownMenuItem asChild>
                  <Link href={adminRoutes.newAccount}>Create account</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={signOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
