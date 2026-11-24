import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CredentialForm } from "./credential-form.ts";

test("credential inputs and submit button are inert in the server HTML", () => {
  const markup = renderToStaticMarkup(
    createElement(
      CredentialForm,
      { onSubmit() {} },
      createElement("input", { name: "email", type: "email" }),
      createElement("input", { name: "password", type: "password" }),
      createElement("button", { type: "submit" }, "Submit"),
    ),
  );
  assert.match(markup, /^<form\b[^>]*\bmethod="post"/);
  assert.match(
    markup,
    /<fieldset disabled=""[^>]*>.*name="email".*name="password".*type="submit".*<\/fieldset>/,
  );
  assert.match(markup, /<noscript>Enable JavaScript/);
});
