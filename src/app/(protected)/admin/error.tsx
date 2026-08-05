"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="rounded-[var(--radius-sm)] border bg-surface p-8 text-center">
      <p className="eyebrow">Admin error</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
        Admin area could not load
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        This UI-only admin section is available, but this view failed to render.
        Try loading it again.
      </p>
      <Button
        type="button"
        className="mt-6 rounded-[var(--radius-sm)]"
        onClick={reset}
      >
        <RotateCcw />
        Try again
      </Button>
    </section>
  );
}
