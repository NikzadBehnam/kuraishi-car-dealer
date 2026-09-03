import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminUnauthorized } from "@/app/(protected)/admin/_components/admin-unauthorized";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { getAdminAuthorizationForCurrentRequest } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authorization = await getAdminAuthorizationForCurrentRequest();

  if (authorization.status === "anonymous") {
    redirect(authorization.loginPath);
  }

  if (authorization.status === "forbidden") {
    return <AdminUnauthorized />;
  }

  return <AdminShell>{children}</AdminShell>;
}
