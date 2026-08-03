import { Globe, MapPin, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "./_components/contact-form";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site.config";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Kontakt & Termin",
  "Persönliche Beratung und Terminvereinbarung bei Kuraishi Autohandel.",
  publicRoutes.contact,
);
export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Kontakt & Termin"
        description="Wir beraten Sie persönlich – auf dem Kanal, der für Sie passt."
        breadcrumb="Kontakt"
      />
      <div className="site-container grid gap-0 py-10 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="rounded-t-[15px] rounded-b-none border-b-0 p-7 lg:rounded-l-[15px] lg:rounded-r-none lg:border-r-0 lg:border-b">
          <h2 className="section-title text-3xl">Termin anfragen</h2>
          <div className="mt-7">
            <ContactForm />
          </div>
        </Card>
        <Card className="bg-brand-panel text-brand-panel-foreground rounded-t-none rounded-b-[15px] border-t-0 p-7 lg:rounded-l-none lg:rounded-r-[15px] lg:border-t lg:border-l-0">
          <h2 className="section-title text-3xl">{siteConfig.name}</h2>
          <div className="text-brand-panel-muted mt-6 grid gap-4">
            <p className="flex gap-2">
              <MapPin className="size-5" />
              {siteConfig.address.street}, {siteConfig.address.postalCode}{" "}
              {siteConfig.address.city}, {siteConfig.address.country}
            </p>
            <p className="flex gap-2">
              <Phone className="size-5" />
              {siteConfig.contact.phone}
            </p>
            <p className="flex gap-2">
              <Mail className="size-5" />
              <a href={`mailto:${siteConfig.contact.email}`}>
                {siteConfig.contact.email}
              </a>
            </p>
            <p className="flex gap-2">
              <Globe className="size-5" />
              <a href={siteConfig.url}>www.kuraishi-autohandel.at</a>
            </p>
          </div>
          <div className="mt-7 grid min-h-60 place-items-center rounded-xl bg-white/8 font-bold">
            Standort Wien · Route planen
          </div>
        </Card>
      </div>
    </>
  );
}
