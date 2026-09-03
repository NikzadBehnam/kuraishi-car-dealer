import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminUnauthorized() {
  return (
    <main className="grid min-h-screen place-items-center overflow-x-hidden bg-background px-4 py-10 text-foreground">
      <section
        aria-labelledby="admin-unauthorized-title"
        className="w-full max-w-md rounded-[var(--radius-sm)] border bg-surface p-6 shadow-sm"
      >
        <div
          className="grid size-12 place-items-center rounded-[var(--radius-sm)] bg-destructive/10 text-destructive"
          aria-hidden="true"
        >
          <ShieldAlert className="size-6" />
        </div>
        <h1
          id="admin-unauthorized-title"
          className="mt-5 text-2xl font-extrabold tracking-tight"
        >
          Administrator access required
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your account is signed in, but it does not have permission to view the
          Kuraishi admin workspace.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            variant="accent"
            className="w-full rounded-[var(--radius-sm)]"
          >
            <Link href="/">Return home</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-[var(--radius-sm)]"
          >
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
