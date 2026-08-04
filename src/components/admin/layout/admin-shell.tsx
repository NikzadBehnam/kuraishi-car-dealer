import type { ReactNode } from "react";

import { AdminBreadcrumbs } from "@/components/admin/layout/admin-breadcrumbs";
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";
import { AdminTopBar } from "@/components/admin/layout/admin-top-bar";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <AdminTopBar />
      <div className="mx-auto grid min-w-0 w-full max-w-[92rem] gap-5 px-3 py-4 sm:px-6 sm:py-5 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:px-8">
        <AdminSidebar />
        <main className="min-w-0 overflow-x-hidden">
          <AdminBreadcrumbs />
          <div className="mt-5 min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
