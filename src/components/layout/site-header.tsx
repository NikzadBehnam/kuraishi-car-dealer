"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { commonContent } from "@/content/de/common";
import { mainNavigation } from "@/config/navigation.config";
import { routes } from "@/config/routes.config";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
export function SiteHeader() {
  const [open, setOpen] = useState(false);
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
