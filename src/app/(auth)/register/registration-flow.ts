import type { RegisterFormValues } from "../_schemas/auth.schema";

export const verificationPendingPath = "/verify-email";
export const verificationCallbackPath = "/verify-email/callback";

export type CredentialRegistrationRequest = {
  callbackURL: string;
  consent: true;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  password: string;
  phone?: string;
};

type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
};

export function buildCredentialRegistrationRequest(
  values: RegisterFormValues,
): CredentialRegistrationRequest {
  const firstName = normalizeText(values.firstName);
  const lastName = normalizeText(values.lastName);
  const phone = normalizeText(values.phone ?? "");

  return {
    callbackURL: verificationCallbackPath,
    consent: true,
    email: normalizeEmail(values.email),
    firstName,
    lastName,
    name: composeDisplayName(firstName, lastName),
    password: values.password,
    ...(phone ? { phone } : {}),
  };
}

export function buildVerificationPendingURL(email: string) {
  const params = new URLSearchParams({
    email: normalizeEmail(email),
  });

  return `${verificationPendingPath}?${params.toString()}`;
}

export function composeDisplayName(firstName: string, lastName: string) {
  return `${normalizeText(firstName)} ${normalizeText(lastName)}`.trim();
}

export function getBrowserPreferredLanguage() {
  if (typeof navigator === "undefined") {
    return null;
  }

  return navigator.languages?.[0] ?? navigator.language ?? null;
}

export function getCredentialRegistrationErrorMessage(error: AuthClientError) {
  if (error.status === 429) {
    return "Please wait before trying again.";
  }

  if (error.message === "Consent is required for account creation.") {
    return error.message;
  }

  return "We could not complete registration. Check the details and try again.";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
