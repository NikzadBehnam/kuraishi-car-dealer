"use client";

import {
  createElement,
  type FormEventHandler,
  type PropsWithChildren,
} from "react";
import { useHydrated } from "../../../hooks/use-hydrated.ts";

export function CredentialForm({
  children,
  onSubmit,
}: PropsWithChildren<{
  onSubmit: FormEventHandler<HTMLFormElement>;
}>) {
  // Keep the native form inert until the client submit handler is attached.
  const ready = useHydrated();

  return createElement(
    "form",
    { method: "post", noValidate: true, onSubmit },
    createElement(
      "fieldset",
      { disabled: !ready, className: "grid gap-4" },
      children,
    ),
    createElement(
      "noscript",
      null,
      "Enable JavaScript to securely submit this form.",
    ),
  );
}
