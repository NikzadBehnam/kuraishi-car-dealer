import { z } from "zod";

const publicText = (label: string, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(maximum, `${label} is too long.`)
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/.test(value),
      `${label} contains unsupported control characters.`,
    );

const description = z
  .string()
  .trim()
  .min(1, "Description is required.")
  .max(2000, "Description is too long.")
  .refine(
    (value) => !/[\u0000-\u0009\u000b-\u001f\u007f]/.test(value),
    "Description contains unsupported control characters.",
  );

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const secureHttpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(2048, `${label} is too long.`)
    .url(`${label} must be a valid URL.`)
    .refine((value) => {
      const url = parseUrl(value);
      return (
        url !== null &&
        url.protocol === "https:" &&
        !url.username &&
        !url.password
      );
    }, `${label} must use HTTPS and cannot contain credentials.`);

const mapUrl = secureHttpsUrl("Map URL").refine((value) => {
  const url = parseUrl(value);
  if (!url) {
    return false;
  }
  return (
    url.hostname === "maps.google.com" ||
    url.hostname === "maps.app.goo.gl" ||
    ((url.hostname === "google.com" || url.hostname === "www.google.com") &&
      url.pathname.startsWith("/maps"))
  );
}, "Map URL must point to an approved Google Maps host.");

const phone = z
  .string()
  .trim()
  .min(7, "Phone number is too short.")
  .max(32, "Phone number is too long.")
  .regex(/^\+?[0-9][0-9 ()-]*$/, "Enter a valid phone number.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Phone number must contain between 7 and 15 digits.");

export const dealershipSettingsFieldsSchema = z.strictObject({
  name: publicText("Legal name", 200),
  shortName: publicText("Short name", 100),
  legalForm: optionalText(publicText("Legal form", 100)),
  businessActivity: optionalText(publicText("Business activity", 160)),
  tagline: publicText("Tagline", 160),
  websiteUrl: secureHttpsUrl("Website URL"),
  description,
  phone,
  phone2: optionalText(phone),
  phone3: optionalText(phone),
  email: z
    .string()
    .trim()
    .max(254, "Email address is too long.")
    .email("Enter a valid email address."),
  street: publicText("Street", 255),
  postalCode: publicText("Postal code", 32),
  city: publicText("City", 120),
  country: publicText("Country", 120),
  mapUrl: z
    .string()
    .trim()
    .pipe(z.union([mapUrl, z.literal("")])),
});

function optionalText(schema: z.ZodType<string, string>) {
  return z
    .string()
    .trim()
    .pipe(z.union([z.literal(""), schema]))
    .nullable()
    .optional();
}

export const saveDealershipSettingsSchema =
  dealershipSettingsFieldsSchema.extend({
    expectedVersion: z.number().int().min(1).max(2_147_483_647).nullable(),
  });

export type DealershipSettingsFields = z.infer<
  typeof dealershipSettingsFieldsSchema
>;
export type SaveDealershipSettingsInput = z.infer<
  typeof saveDealershipSettingsSchema
>;
