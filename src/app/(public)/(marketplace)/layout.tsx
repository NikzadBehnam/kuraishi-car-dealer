import Link from "next/link";
import type { ReactNode } from "react";

import { publicRoutes } from "@/config/routes.config";

const marketplaceNavigation = [
  ["Alle Fahrzeuge", publicRoutes.vehicles],
  ["Merkliste", publicRoutes.favourites],
  ["Vergleich", publicRoutes.comparison],
] as const;

export default function MarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <nav aria-label="Fahrzeugmarkt" className="bg-surface border-b">
        <div className="site-container flex gap-5 overflow-x-auto py-3 text-sm font-semibold">
          {marketplaceNavigation.map(([label, href]) => (
            <Link
              className="hover:text-accent whitespace-nowrap"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  );
}
