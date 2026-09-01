import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { Button } from "@/components/ui/button";

import { getVerificationCallbackState } from "../verification-flow";

export const metadata: Metadata = {
  title: "Email verification",
};

export default async function VerifyEmailCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = getVerificationCallbackState(params);
  const isSuccess = state.status === "success";

  return (
    <AuthShell
      eyebrow="Email verification"
      title={state.title}
      description={state.description}
      footer={
        <p>
          Need another link?{" "}
          <Link
            className="font-bold text-primary hover:underline"
            href="/verify-email"
          >
            Request verification
          </Link>
        </p>
      }
    >
      <div className="grid gap-4">
        <div
          className={`grid size-12 place-items-center rounded-[var(--radius-sm)] ${
            isSuccess
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
          aria-hidden="true"
        >
          {isSuccess ? (
            <CircleCheck className="size-6" />
          ) : (
            <CircleAlert className="size-6" />
          )}
        </div>
        <Button
          asChild
          variant={isSuccess ? "accent" : "outline"}
          className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
        >
          <Link href={isSuccess ? "/login" : "/verify-email"}>
            {isSuccess ? "Continue to login" : "Request a new link"}
          </Link>
        </Button>
      </div>
    </AuthShell>
  );
}
