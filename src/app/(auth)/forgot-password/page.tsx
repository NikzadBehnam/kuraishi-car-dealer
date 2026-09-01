import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset your password"
      description="Enter your email address and we will send password reset instructions if the account can be reset."
      footer={
        <p>
          Remember your password?{" "}
          <Link className="font-bold text-primary hover:underline" href="/login">
            Return to login
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
