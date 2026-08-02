import { MapPin, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "./_components/contact-form";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site.config";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Kontakt & Termin",
  "Persönliche Beratung und Terminvereinbarung bei Autowelt Rhein.",
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
      <div className="site-container grid gap-6 py-10 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="rounded-[15px] p-7">
          <h2 className="section-title text-3xl">Termin anfragen</h2>
          <div className="mt-7">
            <ContactForm />
          </div>
        </Card>
        <Card className="rounded-[15px] p-7">
          <h2 className="section-title text-3xl">{siteConfig.name}</h2>
          <div className="text-muted-foreground mt-6 grid gap-4">
            <p className="flex gap-2">
              <MapPin className="size-5" />
              {siteConfig.address.street}, {siteConfig.address.postalCode}{" "}
              {siteConfig.address.city}
            </p>
            <p className="flex gap-2">
              <Phone className="size-5" />
              {siteConfig.contact.phone}
            </p>
            <p className="flex gap-2">
              <Mail className="size-5" />
              {siteConfig.contact.email}
            </p>
          </div>
          <div className="bg-secondary mt-7 grid min-h-60 place-items-center rounded-xl font-bold">
            Standort Düsseldorf · Route planen
          </div>
        </Card>
      </div>
    </>
  );
}
