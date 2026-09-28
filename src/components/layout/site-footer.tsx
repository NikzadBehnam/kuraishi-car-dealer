import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { DealershipQrCode } from "@/components/layout/dealership-qr-code";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { routes } from "@/config/routes.config";
import { siteConfig } from "@/config/site.config";

const vehicleLinks = [
  ["Alle Fahrzeuge", routes.vehicles],
  ["Merkliste", routes.favourites],
  ["Vergleich", routes.comparison],
] as const;

const companyLinks = [
  ["Fahrzeug verkaufen", routes.sellVehicle],
  ["Service", routes.services],
  ["Über uns", routes.about],
  ["Kontakt", routes.contact],
] as const;

const legalLinks = [
  ["Datenschutz", routes.privacy],
  ["Nutzungsbedingungen", routes.terms],
  ["Impressum", routes.imprint],
  ["Cookie-Einstellungen", routes.cookies],
] as const;

const socialLinks = [
  { label: "Instagram", href: siteConfig.social.instagram, icon: "instagram" },
  { label: "Facebook", href: siteConfig.social.facebook, icon: "facebook" },
  { label: "LinkedIn", href: siteConfig.social.linkedin, icon: "linkedin" },
  { label: "YouTube", href: siteConfig.social.youtube, icon: "youtube" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[#0c192b] text-[#c9d3df]">
      <div className="site-container py-10 sm:py-14">
        <section className="footer-reveal grid gap-7 rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.045] p-5 sm:p-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)] lg:items-center">
          <div>
            <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
              Kuraishi Newsletter
            </p>
            <h2 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">
              Neue Fahrzeuge direkt in Ihr Postfach.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#aebbc9]">
              Erhalten Sie ausgewählte Angebote und Neuigkeiten. Klar,
              gelegentlich und jederzeit abbestellbar.
            </p>
          </div>
          <NewsletterForm />
        </section>

        <div className="mt-10 grid gap-10 border-b border-white/10 pb-10 sm:mt-12 sm:pb-12 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div>
            <Link href={routes.home} aria-label="Kuraishi Startseite">
              <BrandLogo
                variant="full"
                tone="dark"
                className="w-full max-w-[15rem] transition-transform duration-500 ease-out hover:scale-[1.01]"
              />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6">
              {siteConfig.description}
            </p>
            <address className="mt-5 grid gap-3 text-sm not-italic">
              <ContactLink href={siteConfig.mapUrl} icon={MapPin} external>
                {siteConfig.address.street}, {siteConfig.address.postalCode}{" "}
                {siteConfig.address.city}
              </ContactLink>
              <ContactLink
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                icon={Phone}
              >
                {siteConfig.contact.phone}
              </ContactLink>
              <ContactLink
                href={`mailto:${siteConfig.contact.email}`}
                icon={Mail}
              >
                {siteConfig.contact.email}
              </ContactLink>
            </address>
          </div>

          <FooterGroup title="Fahrzeuge" links={vehicleLinks} />
          <FooterGroup title="Unternehmen" links={companyLinks} />
          <DealershipQrCode />
        </div>

        <div className="flex flex-col gap-6 pt-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            {socialLinks.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${label} von Kuraishi öffnen`}
                className="group grid size-10 place-items-center rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.04] text-[#c9d3df] transition-[color,background-color,border-color,transform] duration-500 ease-out hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 hover:text-white"
              >
                <SocialIcon kind={icon} />
              </a>
            ))}
          </div>

          <nav
            aria-label="Rechtliche Links"
            className="flex flex-wrap gap-x-5 gap-y-2 text-xs"
          >
            {legalLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-7 border-t border-white/10 pt-6 text-xs text-[#8fa0b2]">
          © {new Date().getFullYear()} {siteConfig.name}. Alle Fahrzeugangaben
          sind unverbindlich.
        </p>
      </div>
    </footer>
  );
}

function SocialIcon({ kind }: { kind: (typeof socialLinks)[number]["icon"] }) {
  const className =
    "size-[1.1rem] fill-current transition-transform duration-500 ease-out group-hover:scale-105";

  if (kind === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 2.16c3.2 0 3.58.02 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.67 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92A82.4 82.4 0 0 1 2.16 12c0-3.2.02-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23A82.4 82.4 0 0 1 12 2.16Zm0-2.16C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.63 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.36-2.63-6.78-6.98-6.98C15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" />
      </svg>
    );
  }

  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07Z" />
      </svg>
    );
  }

  if (kind === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V8.99h3.41v1.57h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.28 2.37 4.28 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V8.99H7.1v11.46ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
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
    <nav aria-label={title}>
      <h2 className="text-sm font-extrabold text-white">{title}</h2>
      <div className="mt-4 grid gap-3 text-sm">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="group flex w-fit items-center gap-2 transition-colors hover:text-white"
          >
            <span className="h-px w-0 bg-[var(--accent)] transition-all duration-200 group-hover:w-3" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function ContactLink({
  href,
  icon: Icon,
  external = false,
  children,
}: {
  href: string;
  icon: typeof MapPin;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group flex w-fit items-start gap-3 transition-colors hover:text-white"
    >
      <Icon
        className="text-accent mt-0.5 size-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110"
        aria-hidden="true"
      />
      <span>{children}</span>
    </a>
  );
}
