"use client";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="site-container py-24 text-center">
      <h1 className="page-title">Etwas ist schiefgelaufen</h1>
      <p className="text-muted-foreground mt-4">
        Die Seite konnte nicht vollständig geladen werden.
      </p>
      <Button className="mt-6" onClick={reset}>
        <RotateCcw />
        Erneut versuchen
      </Button>
    </div>
  );
}
