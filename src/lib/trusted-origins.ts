import { siteConfig } from "../config/site.config.ts";

const productionOrigin = siteConfig.canonicalOrigin;
const previewOriginPattern =
  /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/;

export function isVercelPreview(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env.VERCEL === "1" && env.VERCEL_ENV === "preview";
}

export function getTrustedOrigins(
  isProduction = process.env.NODE_ENV === "production",
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (isVercelPreview(env)) {
    const origin =
      env.BETTER_AUTH_PREVIEW_USE_DEPLOYMENT_URL === "true"
        ? env.VERCEL_URL && `https://${env.VERCEL_URL}`
        : env.BETTER_AUTH_URL;
    return origin && previewOriginPattern.test(origin) ? [origin] : [];
  }

  return [productionOrigin, ...(isProduction ? [] : ["http://localhost:3000"])];
}

export function isTrustedOrigin(
  origin: string | null,
  isProduction = process.env.NODE_ENV === "production",
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  if (!origin) {
    return false;
  }

  try {
    return (
      new URL(origin).origin === origin &&
      getTrustedOrigins(isProduction, env).includes(origin)
    );
  } catch {
    return false;
  }
}
