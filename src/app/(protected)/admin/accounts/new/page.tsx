import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { adminRoutes } from "@/config/admin-routes.config";
import { getSession, isMasterAdmin } from "@/lib/session";
import { CreateAccountForm } from "./create-account-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function NewAccountPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!isMasterAdmin(session.user.role)) {
    redirect(adminRoutes.dashboard);
  }

  return (
    <section className="mx-auto grid w-full max-w-xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-extrabold">Create account</h1>
        <p className="text-sm text-muted-foreground">
          New accounts get the regular user role. Share the password with the
          person yourself; they cannot reset it on their own.
        </p>
      </header>
      <CreateAccountForm />
    </section>
  );
}
