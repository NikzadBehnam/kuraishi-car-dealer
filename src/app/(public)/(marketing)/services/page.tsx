import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
import { inquiryServiceTopics } from "@/lib/inquiry-service-topics";

export async function generateMetadata() {
  return createPublicMetadata(
    "Services",
    "Services rund um Fahrzeugkauf, Fahrzeugankauf und Werkstatt.",
    publicRoutes.services,
  );
}
export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Services"
        description="Alles rund um Ihr Fahrzeug – persönlich aus einer Hand."
        breadcrumb="Services"
      />
      <div className="site-container grid gap-4 py-10 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(inquiryServiceTopics).map(([id, service], index) => (
          <Card className="rounded-none p-6" key={id}>
            <p className="eyebrow">0{index + 1}</p>
            <h2 className="mt-3 text-xl font-extrabold">{service.title}</h2>
            <p className="text-muted-foreground mt-3">
              Senden Sie eine Anfrage zu diesem Thema. Dadurch wird kein Termin
              bestätigt.
            </p>
            <Link
              className="text-accent mt-5 inline-flex items-center gap-2 font-bold"
              href={`${publicRoutes.contact}?service=${id}`}
            >
              Anfrage senden <ArrowRight className="size-4" />
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
