"use client";

import {
  createElement,
  type FormEventHandler,
  type PropsWithChildren,
  useSyncExternalStore,
} from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function CredentialForm({
  children,
  onSubmit,
}: PropsWithChildren<{
  onSubmit: FormEventHandler<HTMLFormElement>;
}>) {
  // Keep the native form inert until the client submit handler is attached.
  const ready = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

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
