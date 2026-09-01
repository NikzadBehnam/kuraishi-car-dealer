import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import {
  forgotPasswordPath,
  getResetPasswordPageState,
} from "@/app/(auth)/forgot-password/password-recovery-flow";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reset password",
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = getResetPasswordPageState(params);

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Choose a new password"
      description="Create a new password for your Kuraishi client account."
      footer={
        <p>
          Need a fresh link?{" "}
          <Link
            className="font-bold text-primary hover:underline"
            href={forgotPasswordPath}
          >
            Request password reset
          </Link>
        </p>
      }
    >
      {state.status === "ready" ? (
        <ResetPasswordForm token={state.token} />
      ) : (
        <div role="alert" className="grid gap-4">
          <div
            className="grid size-12 place-items-center rounded-[var(--radius-sm)] bg-destructive/10 text-destructive"
            aria-hidden="true"
          >
            <CircleAlert className="size-6" />
          </div>
          <p className="text-sm font-semibold text-destructive">
            {state.message}
          </p>
          <Button
            asChild
            variant="outline"
            className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
          >
            <Link href={forgotPasswordPath}>Request a new link</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
