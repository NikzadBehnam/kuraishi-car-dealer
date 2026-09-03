import { authRoles } from "./roles.ts";

export const currentTermsVersion = "2026-09-01";

const formOnlySignupFields = [
  "confirmPassword",
  "consent",
  "remember",
] as const;
const serverOwnedSignupFields = [
  "id",
  "role",
  "banned",
  "banReason",
  "banExpires",
  "emailVerified",
  "termsAcceptedAt",
  "termsVersion",
] as const;

type SignupPolicyResult =
  | {
      body: Record<string, unknown>;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

type PublicUserAccessDefaults<T extends Record<string, unknown>> = Omit<
  T,
  "banExpires" | "banReason" | "banned" | "role"
> & {
  banExpires: null;
  banReason: null;
  banned: boolean;
  role: typeof authRoles.customer;
};

type PublicCredentialSignupDefaults<T extends Record<string, unknown>> =
  PublicUserAccessDefaults<T> & {
    termsAcceptedAt: Date;
    termsVersion: string;
  };

export function preparePublicCredentialSignupBody(
  body: unknown,
  acceptedAt = new Date(),
): SignupPolicyResult {
  if (!isRecord(body)) {
    return {
      error: "Invalid registration request.",
      ok: false,
    };
  }

  if (body.consent !== true) {
    return {
      error: "Consent is required for account creation.",
      ok: false,
    };
  }

  const firstName = normalizeRequiredText(body.firstName);
  const lastName = normalizeRequiredText(body.lastName);

  if (!firstName || !lastName) {
    return {
      error: "First name and last name are required.",
      ok: false,
    };
  }

  const sanitizedBody = { ...body };

  for (const key of [...formOnlySignupFields, ...serverOwnedSignupFields]) {
    delete sanitizedBody[key];
  }

  sanitizedBody.firstName = firstName;
  sanitizedBody.lastName = lastName;
  sanitizedBody.name = `${firstName} ${lastName}`;
  sanitizedBody.termsAcceptedAt = acceptedAt;
  sanitizedBody.termsVersion = currentTermsVersion;

  const phone = normalizeOptionalText(body.phone);

  if (phone) {
    sanitizedBody.phone = phone;
  } else {
    delete sanitizedBody.phone;
  }

  return {
    body: sanitizedBody,
    ok: true,
  };
}

export function applyPublicCredentialSignupUserDefaults<
  T extends Record<string, unknown>,
>(user: T, acceptedAt = new Date()): PublicCredentialSignupDefaults<T> {
  return {
    ...applyPublicUserAccessDefaults(user),
    termsAcceptedAt: acceptedAt,
    termsVersion: currentTermsVersion,
  };
}

export function applyPublicUserAccessDefaults<
  T extends Record<string, unknown>,
>(user: T): PublicUserAccessDefaults<T> {
  return {
    ...user,
    role: authRoles.customer,
    banned: false,
    banReason: null,
    banExpires: null,
  } as PublicUserAccessDefaults<T>;
}

export function applyTrustedOrPublicUserAccessDefaults<
  T extends Record<string, unknown>,
>(user: T): T | PublicUserAccessDefaults<T> {
  if (isAuthRole(user.role)) {
    return user;
  }

  return applyPublicUserAccessDefaults(user);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeRequiredText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length >= 2 ? normalized : null;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized || null;
}

function isAuthRole(value: unknown) {
  return (
    value === authRoles.admin ||
    value === authRoles.staff ||
    value === authRoles.customer
  );
}
