import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Services",
  "Services rund um Fahrzeugkauf, Fahrzeugankauf und Werkstatt.",
  publicRoutes.services,
);
const services = [
  "Inzahlungnahme",
  "Fahrzeugankauf",
  "Garantie",
  "Versicherung",
  "Zulassungsservice",
  "Werkstatt",
];
export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Services"
        description="Alles rund um Ihr Fahrzeug – persönlich aus einer Hand."
        breadcrumb="Services"
      />
      <div className="site-container grid gap-4 py-10 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => (
          <Card className="rounded-none p-6" key={index}>
            <p className="eyebrow">0{index + 1}</p>
            <h2 className="mt-3 text-xl font-extrabold">{service}</h2>
            <p className="text-muted-foreground mt-3">
              Verlässlich organisiert, transparent erklärt und individuell auf
              Ihre Bedürfnisse abgestimmt.
            </p>
            <Link
              className="text-accent mt-5 inline-flex items-center gap-2 font-bold"
              href={publicRoutes.contact}
            >
              Mehr erfahren <ArrowRight className="size-4" />
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
