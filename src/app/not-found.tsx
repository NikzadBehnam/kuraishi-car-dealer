import Link from "next/link";
import { House } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="site-container py-24 text-center">
      <p className="eyebrow">Fehler 404</p>
      <h1 className="page-title mt-4">
        Hier ist wohl jemand falsch abgebogen.
      </h1>
      <p className="text-muted-foreground mt-4">
        Die gesuchte Seite ist nicht verfügbar.
      </p>
      <Button
        asChild
        variant="accent"
        className="mt-7 rounded-[var(--radius-sm)]"
      >
        <Link href="/">
          <House />
          Zur Startseite
        </Link>
      </Button>
    </div>
  );
}
