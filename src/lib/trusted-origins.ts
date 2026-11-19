import { siteConfig } from "../config/site.config.ts";

const productionOrigin = siteConfig.canonicalOrigin;

export function getTrustedOrigins(
  isProduction = process.env.NODE_ENV === "production",
) {
  return [productionOrigin, ...(isProduction ? [] : ["http://localhost:3000"])];
}

export function isTrustedOrigin(
  origin: string | null,
  isProduction = process.env.NODE_ENV === "production",
): boolean {
  if (!origin) {
    return false;
  }

  try {
    return (
      new URL(origin).origin === origin &&
      getTrustedOrigins(isProduction).includes(origin)
    );
  } catch {
    return false;
  }
}
