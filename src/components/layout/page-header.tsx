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
    <div className="bg-surface border-b py-12">
      <div className="site-container">
        {breadcrumb && (
          <nav
            aria-label="Brotkrümelnavigation"
            className="text-muted-foreground mb-4 text-sm"
          >
            <Link className="hover:text-foreground" href={publicRoutes.home}>
              Startseite
            </Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{breadcrumb}</span>
          </nav>
        )}
        <h1 className="page-title">{title}</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl">{description}</p>
      </div>
    </div>
  );
}
