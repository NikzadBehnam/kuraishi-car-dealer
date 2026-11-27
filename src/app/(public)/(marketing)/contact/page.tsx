import { Globe, MapPin, Phone, Mail, Navigation } from "lucide-react";
import { headers } from "next/headers";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "./_components/contact-form";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { getPublicDealershipSettings } from "@/lib/dealership-settings";
import { getDealershipPhones } from "@/lib/dealership-phones";
import { createPublicMetadata } from "@/lib/metadata";
import { getPublicVehicleForInquiry } from "@/lib/inventory-queries";
import { getInquiryIntakePolicy } from "@/lib/inquiry-intake-policy";
import {
  inquiryServiceTopics,
  inquiryServiceTopicSchema,
} from "@/lib/inquiry-service-topics";
import {
  inquiryAppointmentTypes,
  inquiryContactParamsSchema,
} from "@/lib/inquiry-validation";

export async function generateMetadata() {
  return createPublicMetadata(
    "Kontakt & Termin",
    "Persönliche Beratung und Terminvereinbarung beim Autohaus.",
    publicRoutes.contact,
  );
}
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const settings = await getPublicDealershipSettings();
  const { mode } = getInquiryIntakePolicy((await headers()).get("host"));
  const parsed = inquiryContactParamsSchema.safeParse(await searchParams);
  const service = parsed.success ? parsed.data.service : undefined;
  const topic = inquiryServiceTopicSchema.safeParse(service);
  const appointmentType = topic.success
    ? inquiryServiceTopics[topic.data].appointmentType
    : (inquiryAppointmentTypes.find((type) => type === service) ?? "Beratung");
  const vehicle =
    parsed.success && parsed.data.vehicle
      ? await getPublicVehicleForInquiry(parsed.data.vehicle)
      : null;
  const contextError = !parsed.success
    ? "Der Anfrage-Link ist ungültig. Bitte starten Sie eine allgemeine Anfrage."
    : parsed.data.vehicle && !vehicle
      ? "Das angefragte Fahrzeug ist nicht mehr verfügbar. Sie können stattdessen eine allgemeine Anfrage stellen."
      : null;
  return (
    <>
      <PageHeader
        title="Kontakt & Termin"
        description="Wir beraten Sie persönlich – auf dem Kanal, der für Sie passt."
        breadcrumb="Kontakt"
      />
      <div className="site-container grid grid-cols-1 gap-0 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
        <Card className="min-w-0 rounded-t-[15px] rounded-b-none border-b-0 p-4 sm:p-7 lg:rounded-l-[15px] lg:rounded-r-none lg:border-r-0 lg:border-b">
          <h2 className="section-title text-3xl">Termin anfragen</h2>
          <div className="mt-7">
            <ContactForm
              key={JSON.stringify([vehicle?.slug, service, contextError])}
              mode={mode}
              vehicle={vehicle}
              contextError={contextError}
              appointmentType={appointmentType}
              initialServiceTopic={topic.success ? topic.data : undefined}
            />
          </div>
        </Card>
        <Card className="bg-brand-panel text-brand-panel-foreground min-w-0 rounded-t-none rounded-b-[15px] border-t-0 p-4 wrap-anywhere sm:p-7 lg:rounded-l-none lg:rounded-r-[15px] lg:border-t lg:border-l-0">
          <h2 className="section-title text-3xl">{settings.name}</h2>
          <div className="text-brand-panel-muted mt-6 grid gap-4">
            <p className="flex gap-2">
              <MapPin className="size-5 shrink-0" aria-hidden="true" />
              {settings.street}, {settings.postalCode} {settings.city},{" "}
              {settings.country}
            </p>
            {getDealershipPhones(settings).map(({ label, number }) => (
              <p key={number} className="flex gap-2">
                <Phone className="size-5 shrink-0" aria-hidden="true" />
                <a href={`tel:${number}`}>{label}</a>
              </p>
            ))}
            <p className="flex gap-2">
              <Mail className="size-5 shrink-0" aria-hidden="true" />
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </p>
            <p className="flex gap-2">
              <Globe className="size-5 shrink-0" aria-hidden="true" />
              <a href={settings.websiteUrl} target="_blank" rel="noreferrer">
                {settings.websiteUrl}
              </a>
            </p>
          </div>
          {settings.mapUrl.trim() ? (
            <a
              href={settings.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-[var(--radius-sm)] border border-white/20 bg-white/8 px-4 py-2 font-bold hover:bg-white/15"
            >
              <Navigation className="size-4 shrink-0" aria-hidden="true" />
              Route planen
            </a>
          ) : null}
        </Card>
      </div>
    </>
  );
}
