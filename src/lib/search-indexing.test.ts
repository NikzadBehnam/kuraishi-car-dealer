import assert from "node:assert/strict";
import { test } from "node:test";

import { allowsSearchIndexing } from "./search-indexing.ts";

test("optimized local and Preview builds must not enable indexing", () => {
  assert.equal(allowsSearchIndexing({ NODE_ENV: "production" }), false);
  assert.equal(
    allowsSearchIndexing({
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    }),
    false,
  );
});

test("only an actual Vercel Production build enables indexing", () => {
  const vercelProduction = { VERCEL: "1", VERCEL_ENV: "production" };
  assert.equal(allowsSearchIndexing(vercelProduction), false);
  assert.equal(
    allowsSearchIndexing({ ...vercelProduction, NODE_ENV: "production" }),
    true,
  );
});
