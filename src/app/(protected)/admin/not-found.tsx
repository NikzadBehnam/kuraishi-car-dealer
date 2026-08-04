import Link from "next/link";
import { Gauge } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <section className="rounded-[var(--radius-sm)] border bg-surface p-8 text-center">
      <p className="eyebrow">Admin 404</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
        Admin page not found
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        The requested admin UI screen has not been created yet.
      </p>
      <Button
        asChild
        variant="accent"
        className="mt-6 rounded-[var(--radius-sm)]"
      >
        <Link href="/admin">
          <Gauge />
          Back to dashboard
        </Link>
      </Button>
    </section>
  );
}
