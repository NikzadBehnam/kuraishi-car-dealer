import type { Metadata } from "next";

import { getPublicDealershipSettings } from "@/lib/dealership-settings";

export async function createPublicMetadata(
  title: string,
  description: string,
  publicPath: string,
): Promise<Metadata> {
  const settings = await getPublicDealershipSettings();
  return {
    title,
    description,
    alternates: { canonical: publicPath },
    openGraph: {
      title: `${title} | ${settings.shortName}`,
      description,
      url: publicPath,
      locale: "de_DE",
      type: "website",
    },
  };
}
