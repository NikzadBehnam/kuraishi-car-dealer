"use client";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="de">
      <body>
        <main
          style={{
            padding: "4rem",
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          <h1>Ein unerwarteter Fehler ist aufgetreten</h1>
          <p>Bitte laden Sie die Seite erneut.</p>
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" /> Erneut versuchen
          </Button>
        </main>
      </body>
    </html>
  );
}
