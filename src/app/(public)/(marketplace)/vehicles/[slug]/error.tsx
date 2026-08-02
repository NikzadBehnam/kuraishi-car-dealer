"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { publicRoutes } from "@/config/routes.config";

export default function VehicleDetailsError({ reset }: { reset: () => void }) {
  return (
    <div className="site-container py-24 text-center">
      <h1 className="page-title">
        Fahrzeugdetails konnten nicht geladen werden
      </h1>
      <p className="text-muted-foreground mt-4">
        Bitte versuchen Sie es erneut.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Button onClick={reset}>Erneut versuchen</Button>
        <Button asChild variant="outline">
          <Link href={publicRoutes.vehicles}>Zur Fahrzeugübersicht</Link>
        </Button>
      </div>
    </div>
  );
}
