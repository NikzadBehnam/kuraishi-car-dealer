import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getPublicDealershipSettings } from "@/lib/dealership-settings";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicDealershipSettings();
  return {
    title: {
      default: settings.shortName,
      template: `%s | ${settings.shortName}`,
    },
    description: settings.description,
    openGraph: {
      title: settings.shortName,
      description: settings.description,
      locale: "de_AT",
    },
  };
}

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getPublicDealershipSettings();
  return (
    <>
      <SiteHeader dealershipName={settings.name} />
      <main id="main-content">{children}</main>
      <SiteFooter settings={settings} />
    </>
  );
}
