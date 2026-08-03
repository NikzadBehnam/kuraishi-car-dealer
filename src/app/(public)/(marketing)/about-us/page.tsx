import Image from "next/image";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Über uns",
  "Automobilkompetenz aus Wien – seit 1998.",
  publicRoutes.about,
);
export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="Über uns"
        description="Automobilkompetenz aus Wien – seit 1998."
        breadcrumb="Über uns"
      />
      <div className="site-container grid gap-8 py-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Unsere Geschichte</p>
          <h2 className="section-title mt-3">
            Fahrzeuge sind unser Beruf. Vertrauen ist unser Antrieb.
          </h2>
          <p className="text-muted-foreground mt-5 leading-7">
            Kuraishi Autohandel steht für sorgfältig ausgewählte Fahrzeuge,
            faire Beratung und verlässlichen Service. Unser Team begleitet Sie
            vom ersten Gespräch bis weit über die Fahrzeugübergabe hinaus.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[
              ["Erfahrung", "über 25 Jahre"],
              ["Bewertung", "4,9 von 5"],
              ["Fahrzeuge jährlich", "über 800"],
              ["Team", "32 Fachleute"],
            ].map(([label, value]) => (
              <Card className="rounded-[15px] p-4" key={label}>
                <span className="text-muted-foreground text-xs">{label}</span>
                <strong className="block">{value}</strong>
              </Card>
            ))}
          </div>
        </div>
        <div className="relative min-h-112 overflow-hidden rounded-[15px]">
          <Image
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            src="https://images.unsplash.com/photo-1727893344848-2ec8eba4bacd?auto=format&fit=crop&w=1200&q=82"
            alt="Showroom von Kuraishi Autohandel"
          />
        </div>
      </div>
    </>
  );
}
