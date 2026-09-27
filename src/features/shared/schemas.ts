import { z } from "zod";

export const domainFieldLimits = {
  bulkIds: 50,
  email: 254,
  id: 191,
  message: 2_000,
  name: 120,
  pageSize: 100,
  phone: 32,
  search: 120,
  shortText: 160,
} as const;

export const paginationDefaults = {
  page: 1,
  pageSize: 20,
} as const;

export const sortDirections = ["asc", "desc"] as const;

export const sortDirectionSchema = z.enum(sortDirections);

export const resourceIdSchema = z
  .cuid("Resource ID must be a valid CUID.")
  .max(domainFieldLimits.id);

export const userIdSchema = z
  .string()
  .trim()
  .min(1, "User ID is required.")
  .max(domainFieldLimits.id);

export const paginationQueryShape = {
  page: z.coerce.number().int().min(1).default(paginationDefaults.page),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(domainFieldLimits.pageSize)
    .default(paginationDefaults.pageSize),
} as const;

export const paginationQuerySchema = z.object(paginationQueryShape);

export const normalizedNameSchema = z
  .string()
  .transform(normalizeWhitespace)
  .pipe(z.string().min(2).max(domainFieldLimits.name));

export const normalizedEmailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.email().max(domainFieldLimits.email));

export const optionalPhoneSchema = z.preprocess(
  normalizeOptionalText,
  z.string().max(domainFieldLimits.phone).optional(),
);

export const optionalSearchSchema = z.preprocess(
  normalizeOptionalText,
  z.string().max(domainFieldLimits.search).optional(),
);

export const optionalMessageSchema = z.preprocess(
  normalizeOptionalMultilineText,
  z.string().max(domainFieldLimits.message).optional(),
);

export const booleanQuerySchema = z.preprocess((value) => {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return value;
}, z.boolean());

export const idListSchema = z
  .array(resourceIdSchema)
  .min(1)
  .max(domainFieldLimits.bulkIds)
  .transform((ids) => Array.from(new Set(ids)));

export function optionalNormalizedTextSchema(maxLength: number) {
  return z.preprocess(
    normalizeOptionalText,
    z.string().max(maxLength).optional(),
  );
}

export function normalizedTextSchema(maxLength: number, minLength = 1) {
  return z
    .string()
    .transform(normalizeWhitespace)
    .pipe(z.string().min(minLength).max(maxLength));
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

export function normalizeEmail(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

export function normalizeSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

export function normalizeMultilineText(value: string) {
  return value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

export function normalizeStringList(values: Iterable<string>) {
  const normalized = Array.from(values, normalizeWhitespace).filter(Boolean);

  return Array.from(new Set(normalized));
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return value;

  return normalizeWhitespace(value) || undefined;
}

function normalizeOptionalMultilineText(value: unknown) {
  if (typeof value !== "string") return value;

  return normalizeMultilineText(value) || undefined;
}
