import type {
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
} from "../_schemas/auth.schema";

export const forgotPasswordPath = "/forgot-password";
export const resetPasswordPath = "/reset-password";
export const passwordResetSuccessLoginPath = "/login?passwordReset=success";
export const neutralPasswordResetRequestMessage =
  "If an account can be reset, a password reset link will arrive shortly.";

type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

export type ResetPasswordPageState =
  | {
      status: "ready";
      token: string;
    }
  | {
      message: string;
      status: "invalid";
    };

export function buildPasswordResetRequest(values: ForgotPasswordFormValues) {
  return {
    email: values.email.trim().toLowerCase(),
    redirectTo: resetPasswordPath,
  };
}

export function buildResetPasswordRequest(
  values: ResetPasswordFormValues,
  token: string,
) {
  return {
    newPassword: values.password,
    token,
  };
}

export function getForgotPasswordErrorMessage(error: AuthClientError) {
  if (error.status === 429) {
    return "Please wait before requesting another reset link.";
  }

  return "We could not process the request right now. Try again shortly.";
}

export function getResetPasswordErrorMessage(error: AuthClientError) {
  if (error.status === 429) {
    return "Please wait before trying again.";
  }

  return "This reset link is invalid, expired, or has already been used.";
}

export function getResetPasswordPageState(
  searchParams: SearchParams,
): ResetPasswordPageState {
  if (hasResetTokenError(searchParams.error)) {
    return {
      message: "This reset link is invalid or expired. Request a fresh link.",
      status: "invalid",
    };
  }

  const token = getScalarParam(searchParams.token);

  if (!token) {
    return {
      message: "This reset link is missing a token. Request a fresh link.",
      status: "invalid",
    };
  }

  return {
    status: "ready",
    token,
  };
}

export function hasPasswordResetSuccess(searchParams: SearchParams) {
  return searchParams.passwordReset === "success";
}

function hasResetTokenError(error: string | string[] | undefined) {
  return typeof error === "string" && error.length > 0;
}

function getScalarParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
