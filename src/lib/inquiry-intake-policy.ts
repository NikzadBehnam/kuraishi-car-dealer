import { siteConfig } from "../config/site.config.ts";
import { inquiryPrivacyNotice } from "../content/de/inquiry-privacy.ts";
import { inquiryTestModeEnabled } from "./inquiry-validation.ts";

type Environment = Readonly<Record<string, string | undefined>>;
export type InquiryIntakeMode = "off" | "synthetic" | "live";
export type EnabledInquiryIntakeMode = Exclude<InquiryIntakeMode, "off">;
type Policy =
  | { mode: "off" }
  | { mode: EnabledInquiryIntakeMode; origin: string; secret: string };

export function getInquiryIntakePolicy(
  host: string | null,
  env: Environment = process.env,
): Policy {
  const off = { mode: "off" } as const;
  const { INQUIRY_TEST_MODE: test, INQUIRY_LIVE_MODE: live } = env;
  if (
    [test, live].some(
      (flag) => flag !== undefined && flag !== "true" && flag !== "false",
    )
  ) {
    return off;
  }
  const secret = env.INQUIRY_HASH_SECRET;
  if (!secret || secret.length < 32 || /\s/.test(secret)) return off;

  if (live === "true") {
    const origin = siteConfig.canonicalOrigin;
    return test !== "true" &&
      env.NODE_ENV === "production" &&
      env.VERCEL === "1" &&
      env.VERCEL_ENV === "production" &&
      env.INQUIRY_APPROVED_NOTICE_VERSION === inquiryPrivacyNotice.version &&
      (env.INQUIRY_EMAIL_MODE === undefined ||
        env.INQUIRY_EMAIL_MODE === "disabled") &&
      host === new URL(origin).host
      ? { mode: "live", origin, secret }
      : off;
  }

  if (!inquiryTestModeEnabled(env)) return off;
  if (env.VERCEL === "1") {
    return env.VERCEL_URL &&
      /^[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL) &&
      host === env.VERCEL_URL
      ? { mode: "synthetic", origin: `https://${env.VERCEL_URL}`, secret }
      : off;
  }
  return host === "localhost:3000"
    ? { mode: "synthetic", origin: "http://localhost:3000", secret }
    : off;
}
