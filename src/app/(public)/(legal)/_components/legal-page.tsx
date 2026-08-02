import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { legalContent } from "@/content/de/legal-pages";
export function LegalPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader
        title={title}
        description="Rechtliche Informationen"
        breadcrumb={title}
      />
      <div className="site-container py-10">
        <Card className="max-w-4xl p-7">
          <p className="rounded-md bg-[#fff4ee] p-4 text-[#873414] dark:bg-orange-950/50 dark:text-orange-200">
            <strong>Wichtiger Hinweis:</strong> {legalContent.notice}
          </p>
          <h2 className="section-title mt-9 text-3xl">
            {legalContent.sectionTitle}
          </h2>
          <p className="text-muted-foreground mt-4 leading-7">
            {legalContent.body}
          </p>
        </Card>
      </div>
    </>
  );
}
