import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { ResendVerificationForm } from "@/app/(auth)/verify-email/resend-verification-form";
import {
  getEmailFromSearchParams,
  getVerificationPendingMessage,
} from "@/app/(auth)/verify-email/verification-flow";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = getEmailFromSearchParams(params);

  return (
    <AuthShell
      eyebrow="Verify email"
      title="Check your email"
      description={getVerificationPendingMessage(email)}
      footer={
        <p>
          Already verified?{" "}
          <Link className="font-bold text-primary hover:underline" href="/login">
            Continue to login
          </Link>
        </p>
      }
    >
      <p className="text-sm leading-6 text-muted-foreground">
        The account will not be available for credential login until the email
        address is verified.
      </p>
      <ResendVerificationForm initialEmail={email} />
    </AuthShell>
  );
}
