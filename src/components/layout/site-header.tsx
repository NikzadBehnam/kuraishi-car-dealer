"use client";
import Link from "next/link";
import { CarFront, Heart, Menu, X } from "lucide-react";
import { useState } from "react";
import { commonContent } from "@/content/de/common";
import { mainNavigation } from "@/config/navigation.config";
import { routes } from "@/config/routes.config";
import { useVehicleState } from "@/components/providers/vehicle-state-provider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { favourites } = useVehicleState();
  return (
    <header className="glass sticky top-0 z-50 h-[var(--header-height)] border-b">
      <div className="site-container flex h-full items-center gap-8">
        <Link
          className="w-[clamp(8.5rem,14vw,11rem)] shrink-0"
          href={routes.home}
          aria-label="Kuraishi Autohandel – Startseite"
        >
          <BrandLogo priority />
        </Link>
        <nav
          aria-label="Hauptnavigation"
          className="hidden flex-1 items-center gap-6 lg:flex"
        >
          {mainNavigation.map((item) => (
            <Link
              className="hover:text-accent text-sm font-semibold"
              key={item.href}
              href={item.href}
            >
              {commonContent.navigation[item.labelKey]}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon">
            <Link
              aria-label={`${commonContent.navigation.favourites}: ${favourites.size} Fahrzeuge`}
              href={routes.favourites}
            >
              <Heart className="size-5" />
              <span className="bg-accent absolute -mt-8 ml-7 rounded-full px-1.5 text-[.65rem] text-white">
                {favourites.size}
              </span>
            </Link>
          </Button>
          <Button
            asChild
            variant="accent"
            className="hidden rounded-[var(--radius-sm)] sm:inline-flex"
          >
            <Link href={routes.vehicles}>
              <CarFront />
              {commonContent.actions.findVehicle}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          aria-label="Mobile Navigation"
          className="bg-surface absolute inset-x-0 top-full grid gap-2 border-b p-4 shadow-lg lg:hidden"
        >
          {mainNavigation.map((item) => (
            <Link
              onClick={() => setOpen(false)}
              className="hover:bg-muted rounded-md px-4 py-3 font-semibold"
              key={item.href}
              href={item.href}
            >
              {commonContent.navigation[item.labelKey]}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
