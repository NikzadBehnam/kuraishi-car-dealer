import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminMediaListingHref,
  parseAdminMediaListingSearchParams,
} from "./admin-listing-search-params.ts";
import { buildDefaultMediaTitle, toAdminMediaAssetDto } from "./mappers.ts";
import {
  adminMediaListQuerySchema,
  deleteMediaAssetsCommandSchema,
} from "./schemas.ts";

describe("admin media contracts", () => {
  it("parses allowlisted filters and bounded pagination", () => {
    assert.deepEqual(
      adminMediaListQuerySchema.parse({
        page: "2",
        pageSize: "12",
        search: "  Audi   image ",
        type: "image",
        usage: "vehicle",
      }),
      {
        page: 2,
        pageSize: 12,
        search: "Audi image",
        type: "image",
        usage: "vehicle",
      },
    );
    assert.equal(
      adminMediaListQuerySchema.safeParse({ usage: "brand" }).success,
      false,
    );
  });

  it("removes invalid URL fields and builds a canonical listing URL", () => {
    const query = parseAdminMediaListingSearchParams({
      page: "invalid",
      type: "executable",
      usage: "unused",
    });

    assert.deepEqual(query, {
      page: 1,
      pageSize: 12,
      usage: "unused",
    });
    assert.equal(
      buildAdminMediaListingHref({ ...query, page: 2 }),
      "/admin/media?usage=unused&page=2",
    );
  });

  it("deduplicates bounded bulk deletion identifiers", () => {
    const firstId = "cm12345678901234567890123";
    const secondId = "cm22345678901234567890123";

    assert.deepEqual(
      deleteMediaAssetsCommandSchema.parse({
        ids: [firstId, firstId, secondId],
      }).ids,
      [firstId, secondId],
    );
  });

  it("maps database records without leaking BigInt values", () => {
    const dto = toAdminMediaAssetDto({
      id: "cm12345678901234567890123",
      provider: "uploadthing",
      providerAssetId: "file-key",
      url: "https://test-app.ufs.sh/f/file-key",
      originalFilename: "audi-front.webp",
      mimeType: "image/webp",
      sizeBytes: 1_234_567n,
      width: null,
      height: null,
      title: "Audi front",
      altText: null,
      createdAt: new Date("2026-09-27T12:00:00.000Z"),
      updatedAt: new Date("2026-09-27T12:00:00.000Z"),
      vehicle: null,
      uploadedBy: null,
    });

    assert.equal(dto.sizeBytes, "1234567");
    assert.equal(dto.type, "image");
    assert.equal(dto.usage, "unused");
    assert.equal(dto.altText, "Audi front");
  });

  it("derives a readable bounded title from the original filename", () => {
    assert.equal(
      buildDefaultMediaTitle("audi-a6_front-view.webp"),
      "audi a6 front view",
    );
    assert.equal(buildDefaultMediaTitle(".webp"), "Untitled image");
    assert.equal(buildDefaultMediaTitle(`${"a".repeat(200)}.jpg`).length, 160);
  });
});
