import { getSafeAuthCallbackPath } from "../login/login-flow.ts";

export const googleAuthProvider = "google";

export type GoogleAuthRequest = {
  callbackURL: string;
  provider: typeof googleAuthProvider;
};

type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
};

export function buildGoogleAuthRequest(
  callbackURL: string | string[] | undefined,
): GoogleAuthRequest {
  return {
    callbackURL: getSafeAuthCallbackPath(callbackURL),
    provider: googleAuthProvider,
  };
}

export function getGoogleAuthErrorMessage(error: AuthClientError) {
  if (error.code === "account_not_linked") {
    return "Sign in with the method already connected to this email, then link Google from your account.";
  }

  if (error.status === 429) {
    return "Please wait before trying again.";
  }

  return "We could not start Google sign-in. Try again shortly.";
}
