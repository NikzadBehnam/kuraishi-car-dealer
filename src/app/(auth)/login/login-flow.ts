import type { LoginFormValues } from "../_schemas/auth.schema";

export const defaultLoginRedirectPath = "/";
export const postLogoutRedirectPath = "/";

export type CredentialLoginRequest = {
  callbackURL: string;
  email: string;
  password: string;
  rememberMe: boolean;
};

type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
};

export type CredentialLoginErrorState = {
  canResendVerification: boolean;
  message: string;
};

export function buildCredentialLoginRequest(
  values: LoginFormValues,
  callbackURL: string,
): CredentialLoginRequest {
  return {
    callbackURL: getSafeAuthCallbackPath(callbackURL),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    rememberMe: values.remember,
  };
}

export function getSafeAuthCallbackPath(
  value: string | string[] | undefined,
  fallback = defaultLoginRedirectPath,
) {
  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return fallback;
  }

  let parsed: URL;

  try {
    parsed = new URL(value, "https://kuraishi.local");
  } catch {
    return fallback;
  }

  if (
    parsed.origin !== "https://kuraishi.local" ||
    parsed.pathname === "/login" ||
    parsed.pathname.startsWith("/api/auth")
  ) {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function getCredentialLoginErrorState(
  error: AuthClientError,
): CredentialLoginErrorState {
  if (isUnverifiedEmailError(error)) {
    return {
      canResendVerification: true,
      message: "Please verify your email address before logging in.",
    };
  }

  if (error.status === 429) {
    return {
      canResendVerification: false,
      message: "Please wait before trying again.",
    };
  }

  return {
    canResendVerification: false,
    message: "We could not sign you in. Check your email and password.",
  };
}

function isUnverifiedEmailError(error: AuthClientError) {
  return (
    error.code === "EMAIL_NOT_VERIFIED" ||
    error.message === "Email not verified"
  );
}
