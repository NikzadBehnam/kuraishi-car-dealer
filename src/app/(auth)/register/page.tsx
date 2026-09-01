import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import {
  AuthMethodDivider,
  GoogleAuthButton,
} from "@/app/(auth)/_components/google-auth-button";
import { getSafeAuthCallbackPath } from "@/app/(auth)/login/login-flow";
import { RegisterForm } from "@/app/(auth)/register/register-form";

export const metadata: Metadata = {
  title: "Register",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackURL = getSafeAuthCallbackPath(params.callbackURL);

  return (
    <AuthShell
      eyebrow="Register"
      title="Create your client account"
      description="Prepare a client profile for future saved vehicles, comparisons, valuations, and inquiries."
      footer={
        <p>
          Already registered?{" "}
          <Link className="font-bold text-primary hover:underline" href="/login">
            Login
          </Link>
        </p>
      }
    >
      <div className="mb-4 grid gap-4">
        <GoogleAuthButton callbackURL={callbackURL} />
        <AuthMethodDivider />
      </div>
      <RegisterForm />
    </AuthShell>
  );
}
