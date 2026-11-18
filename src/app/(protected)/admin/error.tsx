"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="bg-surface rounded-[var(--radius-sm)] border p-8 text-center">
      <p className="eyebrow">Admin error</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
        Admin area could not load
      </h1>
      <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-6">
        The requested admin data could not be loaded. Check your connection and
        try again. If the problem continues, contact an administrator.
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
