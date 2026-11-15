import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Login"
      title="Welcome back"
      description="Sign in to the Kuraishi admin dashboard. Accounts are created by the administrator."
      footer={
        <p>Forgot your password? Contact the administrator.</p>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
