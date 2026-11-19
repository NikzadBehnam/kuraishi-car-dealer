import Image from "next/image";
import { PageHeader } from "@/components/layout/page-header";
import { publicRoutes } from "@/config/routes.config";
import { getPublicDealershipSettings } from "@/lib/dealership-settings";
import { createPublicMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return createPublicMetadata(
    "Über uns",
    "Informationen zu Kuraishi und den veröffentlichten Fahrzeugangeboten.",
    publicRoutes.about,
  );
}
export default async function AboutPage() {
  const settings = await getPublicDealershipSettings();
  return (
    <>
      <PageHeader
        title="Über uns"
        description="Informationen zu Kuraishi und den veröffentlichten Fahrzeugangeboten."
        breadcrumb="Über uns"
      />
      <div className="site-container grid gap-8 py-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">{settings.name}</p>
          <h2 className="section-title mt-3">
            Fahrzeugangebote und Kontaktmöglichkeiten.
          </h2>
          <p className="text-muted-foreground mt-5 leading-7">
            Auf dieser Website finden Sie die veröffentlichten Fahrzeugangebote.
            Bei Fragen zu einem Fahrzeug können Sie über das Kontaktformular
            eine Anfrage senden.
          </p>
        </div>
        <div className="relative min-h-112 overflow-hidden rounded-[var(--radius-sm)]">
          <Image
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            src="https://images.unsplash.com/photo-1727893344848-2ec8eba4bacd?auto=format&fit=crop&w=1200&q=82"
            alt="Symbolbild eines Showrooms"
          />
        </div>
      </div>
    </>
  );
}
