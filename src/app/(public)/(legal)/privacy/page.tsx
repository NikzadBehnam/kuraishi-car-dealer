import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { getInquiryPrivacyNotice } from "@/content/de/inquiry-privacy";
import { getInquiryIntakePolicy } from "@/lib/inquiry-intake-policy";
import { createPublicMetadata } from "@/lib/metadata";
import { LegalPage } from "../_components/legal-page";
export async function generateMetadata() {
  return createPublicMetadata(
    "Datenschutz",
    "Informationen zum Datenschutz.",
    publicRoutes.privacy,
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ version?: string | string[] }>;
}) {
  const { version } = await searchParams;
  if (Array.isArray(version)) notFound();
  const notice = getInquiryPrivacyNotice(version);
  if (!notice) notFound();
  const { mode } = getInquiryIntakePolicy((await headers()).get("host"));
  const approved =
    process.env.INQUIRY_APPROVED_NOTICE_VERSION === notice.version;
  if (!approved && mode !== "synthetic") {
    if (version !== undefined) notFound();
    return <LegalPage title="Datenschutz" />;
  }
  const { controller } = notice;

  return (
    <>
      <PageHeader
        title="Datenschutz"
        description="Informationen zur Verarbeitung Ihrer Anfragen"
        breadcrumb="Datenschutz"
      />
      <div className="site-container py-10">
        <Card className="max-w-4xl gap-6 p-7">
          {!approved && (
            <p className="rounded-md bg-[#fff4ee] p-4 text-[#873414] dark:bg-orange-950/50 dark:text-orange-200">
              <strong>Entwurf – nicht freigegeben.</strong> Rechtsgrundlagen,
              Datenschutzkontakt, Auftragsverarbeitung, Drittlandtransfers und
              Löschfristen sind fachlich zu prüfen und vom Autohaus freizugeben.
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            Fassung: {notice.version}
          </p>
          <section className="grid gap-3">
            <h2 className="section-title text-2xl">
              Verantwortlicher und Kontakt
            </h2>
            <address className="not-italic">
              {controller.name}
              <br />
              {controller.address}
              <br />
              <a className="underline" href={`mailto:${controller.email}`}>
                {controller.email}
              </a>
            </address>
          </section>
          {notice.sections.map(({ title, paragraphs }) => (
            <section className="grid gap-3" key={title}>
              <h2 className="section-title text-2xl">{title}</h2>
              {paragraphs.map((text) => (
                <p key={text} className="text-muted-foreground leading-7">
                  {text}
                </p>
              ))}
            </section>
          ))}
          <p>
            <a className="underline" href="https://dsb.gv.at/">
              Österreichische Datenschutzbehörde
            </a>
          </p>
          <p className="text-muted-foreground text-sm">
            Wortlaut der Kenntnisnahme: „{notice.text}“
          </p>
        </Card>
      </div>
    </>
  );
}
