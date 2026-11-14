import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/layout/admin-shell";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Validates the session against the database; a cookie alone is not enough.
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
