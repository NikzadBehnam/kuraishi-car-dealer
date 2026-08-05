import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { RegisterForm } from "@/app/(auth)/register/register-form";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
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
      <RegisterForm />
    </AuthShell>
  );
}
