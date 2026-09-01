export type VerificationCallbackState =
  | {
      description: string;
      status: "success";
      title: string;
    }
  | {
      description: string;
      status: "error";
      title: string;
    };

type SearchParams = Record<string, string | string[] | undefined>;

export function getEmailFromSearchParams(searchParams: SearchParams) {
  const email = searchParams.email;

  return typeof email === "string" ? email : "";
}

export function getVerificationCallbackState(
  searchParams: SearchParams,
): VerificationCallbackState {
  const error = searchParams.error;

  if (typeof error === "string" && error.length > 0) {
    return {
      description:
        "The verification link is invalid or expired. Request a fresh link and try again.",
      status: "error",
      title: "Verification link expired",
    };
  }

  return {
    description:
      "Your email address is verified. You can continue to the login page.",
    status: "success",
    title: "Email verified",
  };
}

export function getVerificationPendingMessage(email: string) {
  if (!email) {
    return "Enter your email address to request another verification link.";
  }

  return `We sent a verification link to ${email}.`;
}
