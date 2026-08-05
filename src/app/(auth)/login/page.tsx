import type { Metadata } from "next";
import Link from "next/link";

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
      <LoginForm />
    </AuthShell>
  );
}
