import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { adminRoutes } from "@/config/admin-routes.config";
import { getAccountCreationPageRedirect } from "@/lib/auth-access";
import { getSession } from "@/lib/session";
import { CreateAccountForm } from "./create-account-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function NewAccountPage() {
  const session = await getSession();
  const redirectTarget = getAccountCreationPageRedirect(session);

  if (redirectTarget === "login") {
    redirect("/login");
  }

  if (redirectTarget === "dashboard") {
    redirect(adminRoutes.dashboard);
  }

  return (
    <section className="mx-auto grid w-full max-w-xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-extrabold">Create account</h1>
        <p className="text-muted-foreground text-sm">
          New accounts get the regular user role. Share the password with the
          person yourself; they cannot reset it on their own.
        </p>
      </header>
      <CreateAccountForm />
    </section>
  );
}
