import Link from "next/link";
import { siteConfig } from "@/config/site.config";
import { routes } from "@/config/routes.config";
import { BrandLogo } from "@/components/brand-logo";
export function SiteFooter() {
  return (
    <footer className="mt-20 bg-[#0c192b] py-14 text-[#c9d3df]">
      <div className="site-container grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLogo
            variant="full"
            tone="dark"
            className="w-full max-w-[15rem]"
          />
          <p className="mt-4">{siteConfig.tagline}</p>
          <p className="mt-4 text-sm">
            {siteConfig.address.street}
            <br />
            {siteConfig.address.postalCode} {siteConfig.address.city}
            <br />
            {siteConfig.address.country}
            <br />
            {siteConfig.contact.phone}
            <br />
            <a href={`mailto:${siteConfig.contact.email}`}>
              {siteConfig.contact.email}
            </a>
            <br />
            <a href={siteConfig.url}>www.kuraishi-autohandel.at</a>
          </p>
        </div>
        <FooterGroup
          title="Fahrzeuge"
          links={[
            ["Alle Fahrzeuge", routes.vehicles],
            ["Erweiterte Suche", routes.vehicleSearch],
            ["Merkliste", routes.favourites],
            ["Vergleich", routes.comparison],
          ]}
        />
        <FooterGroup
          title="Service"
          links={[
            ["Inzahlungnahme", routes.sellVehicle],
            ["Kontakt", routes.contact],
          ]}
        />
        <FooterGroup
          title="Rechtliches"
          links={[
            ["Impressum", routes.imprint],
            ["Datenschutz", routes.privacy],
            ["AGB", routes.terms],
            ["Cookie-Einstellungen", routes.cookies],
          ]}
        />
      </div>
      <div className="site-container mt-10 border-t border-white/10 pt-6 text-xs">
        © 2026 {siteConfig.name}. Alle Fahrzeugangaben sind unverbindlich.
      </div>
    </footer>
  );
}
function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <h2 className="font-bold text-white">{title}</h2>
      <div className="mt-3 grid gap-2 text-sm">
        {links.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
