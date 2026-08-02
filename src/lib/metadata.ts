import type { Metadata } from "next";

import { siteConfig } from "@/config/site.config";

export function createPublicMetadata(
  title: string,
  description: string,
  publicPath: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: publicPath },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: publicPath,
      locale: "de_DE",
      type: "website",
    },
  };
}
