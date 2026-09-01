import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { getSafeAuthCallbackPath } from "@/app/(auth)/login/login-flow";
import { getServerAuthSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Login",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackURL = getSafeAuthCallbackPath(params.callbackURL);
  const session = await getServerAuthSession();

  if (session) {
    redirect(callbackURL);
  }

  return (
    <AuthShell
      eyebrow="Login"
      title="Welcome back"
      description="Access the future client area for saved vehicles, comparisons, and inquiries."
      footer={
        <p>
          No account yet?{" "}
          <Link className="font-bold text-primary hover:underline" href="/register">
            Create one
          </Link>
        </p>
      }
    >
      <LoginForm callbackURL={callbackURL} />
    </AuthShell>
  );
}
