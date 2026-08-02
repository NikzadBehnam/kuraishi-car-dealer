import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <section aria-label="Rechtliche Informationen">{children}</section>;
}
