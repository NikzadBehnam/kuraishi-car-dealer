import Link from "next/link";

import { publicRoutes } from "@/config/routes.config";

export function PageHeader({
  title,
  description,
  breadcrumb,
}: {
  title: string;
  description: string;
  breadcrumb?: string;
}) {
  return (
    <div className="bg-surface border-b py-5 sm:py-6">
      <div className="site-container">
        {breadcrumb && (
          <nav
            aria-label="Brotkrümelnavigation"
            className="text-muted-foreground mb-2 text-sm"
          >
            <Link className="hover:text-foreground" href={publicRoutes.home}>
              Startseite
            </Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{breadcrumb}</span>
          </nav>
        )}
        <h1
          className="font-[family-name:var(--font-heading)] text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl"
        >
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          {description}
        </p>
      </div>
    </div>
  );
}
