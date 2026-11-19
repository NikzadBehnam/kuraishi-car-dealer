import type { ReactNode } from "react";

import { AdminBreadcrumbs } from "@/components/admin/layout/admin-breadcrumbs";
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";
import { AdminTopBar } from "@/components/admin/layout/admin-top-bar";

export function AdminShell({
  children,
  dealershipName,
}: {
  children: ReactNode;
  dealershipName: string;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <AdminTopBar dealershipName={dealershipName} />
      <div className="mx-auto grid w-full max-w-[92rem] min-w-0 gap-5 px-3 py-4 sm:px-6 sm:py-5 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:px-8">
        <AdminSidebar dealershipName={dealershipName} />
        <main className="min-w-0 overflow-x-hidden">
          <AdminBreadcrumbs />
          <div className="admin-content-enter mt-5 min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
