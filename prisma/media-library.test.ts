import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";

import { AuthorizationError } from "../src/lib/auth-access.ts";
import { Prisma } from "../src/generated/prisma/client.ts";
import { createMediaTestDatabase } from "./media-test-client.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const rollback = new Error("Roll back isolated media library test data.");
const actorId = randomUUID();

let adminAllowed = true;
let dbMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;
let mediaQueries: typeof import("../src/lib/admin-media-queries.ts");

function runPrisma(args: string[]) {
  const result = spawnSync(
    process.execPath,
    ["node_modules\\prisma\\build\\index.js", ...args],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DIRECT_URL: connectionString,
        DATABASE_URL: connectionString,
      },
    },
  );
  if (result.error) {
    throw result.error;
  }
  const output = `${result.stdout}\n${result.stderr}`.replaceAll(
    connectionString,
    "<redacted media-test URL>",
  );
  assert.equal(result.status, 0, `${args.join(" ")} failed:\n${output}`);
}

async function withMediaLibraryFixtures(
  verify: (
    tx: Prisma.TransactionClient,
    ids: {
      attachedImageId: string;
      unusedImageId: string;
      brandId: string;
      legalDocumentId: string;
      vehicleId: string;
    },
  ) => Promise<void>,
) {
  await assert.rejects(
    prisma.$transaction(
      async (tx) => {
        const dealer = await tx.dealer.create({
          data: { id: randomUUID(), name: "Media library query test" },
        });
        await tx.user.create({
          data: {
            id: actorId,
            name: "Media library query test",
            email: `${actorId}@example.invalid`,
          },
        });
        const vehicleId = randomUUID();
        await tx.vehicle.create({
          data: {
            id: vehicleId,
            slug: `toyota-corolla-${vehicleId}`,
            stockNumber: `TEST-${vehicleId.toUpperCase()}`,
            make: "Toyota",
            model: "Corolla",
            dealerId: dealer.id,
            createdById: actorId,
            updatedById: actorId,
            acquisitionDate: new Date("2026-01-01T00:00:00.000Z"),
          },
        });

        async function createAsset({
          type,
          title,
          filename,
          altText,
          uploadedAt,
          attached,
          publicRead = false,
          width,
          height,
        }: {
          type: "image" | "document" | "brand";
          title: string;
          filename: string;
          altText: string | null;
          uploadedAt: Date;
          attached?: boolean;
          publicRead?: boolean;
          width?: number;
          height?: number;
        }) {
          const id = randomUUID();
          await tx.mediaAsset.create({
            data: {
              id,
              objectKey: `tests/${id}.${type === "document" ? "pdf" : "png"}`,
              bucketAccess: publicRead ? "public_read" : "private",
              type,
              title,
              originalFilename: filename,
              altText,
              verifiedMimeType:
                type === "document" ? "application/pdf" : "image/png",
              sizeBytes: BigInt(2048),
              ...(width === undefined ? {} : { width }),
              ...(height === undefined ? {} : { height }),
              uploadedAt,
              uploadedById: actorId,
              ...(publicRead
                ? {
                    publicApprovedAt: uploadedAt,
                    publicApprovedById: actorId,
                  }
                : {}),
              ...(attached
                ? {
                    vehicleAttachment: {
                      create: { vehicleId, position: 0 },
                    },
                  }
                : {}),
            },
          });
          return id;
        }

        const attachedImageId = await createAsset({
          type: "image",
          title: "Aster family sedan",
          filename: "family-sedan.webp",
          altText: "Blue hatchback side view",
          uploadedAt: new Date("2026-03-04T00:00:00.000Z"),
          attached: true,
          width: 1400,
          height: 900,
        });
        const unusedImageId = await createAsset({
          type: "image",
          title: "Winter wheel set",
          filename: "winter-wheel-set.webp",
          altText: "Alloy wheel",
          uploadedAt: new Date("2026-03-03T00:00:00.000Z"),
        });
        const brandId = await createAsset({
          type: "brand",
          title: "Kuraishi brand mark",
          filename: "kuraishi-mark.png",
          altText: "Kuraishi logo",
          uploadedAt: new Date("2026-03-02T00:00:00.000Z"),
          publicRead: true,
        });
        const legalDocumentId = await createAsset({
          type: "document",
          title: "Privacy policy source",
          filename: "privacy-policy.pdf",
          altText: null,
          uploadedAt: new Date("2026-03-01T00:00:00.000Z"),
        });

        await verify(tx, {
          attachedImageId,
          unusedImageId,
          brandId,
          legalDocumentId,
          vehicleId,
        });
        throw rollback;
      },
      { timeout: 60000 },
    ),
    (error: unknown) => error === rollback,
  );
}

describe(
  "admin media library query on isolated Neon resources",
  {
    concurrency: false,
  },
  () => {
    before(async () => {
      runPrisma(["migrate", "deploy"]);
      runPrisma([
        "migrate",
        "diff",
        "--from-config-datasource",
        "--to-schema",
        "prisma\\schema.prisma",
        "--exit-code",
      ]);

      dbMock = mock.module("../src/lib/db.ts", {
        namedExports: { prisma },
      });
      sessionMock = mock.module("../src/lib/session.ts", {
        namedExports: {
          requireAdmin: async () => {
            if (!adminAllowed) {
              throw new AuthorizationError(
                403,
                "Administrator access required.",
              );
            }
          },
        },
      });
      mediaQueries = await import("../src/lib/admin-media-queries.ts");
    });

    after(async () => {
      dbMock?.restore();
      sessionMock?.restore();
      await prisma.$disconnect();
    });

    it("requires administrator access before querying media", async () => {
      adminAllowed = false;
      try {
        for (const query of [
          () => mediaQueries.listAdminMediaAssets({}),
          () => mediaQueries.queryMediaLibraryAssets(prisma, {}),
        ]) {
          await assert.rejects(
            query(),
            (error: unknown) =>
              error instanceof AuthorizationError && error.status === 403,
          );
        }
      } finally {
        adminAllowed = true;
      }
    });

    it("searches titles, filenames, alt text, type, usage, and attached vehicles", async () => {
      await withMediaLibraryFixtures(async (tx, ids) => {
        const searches = [
          ["Aster", ids.attachedImageId],
          ["winter-wheel", ids.unusedImageId],
          ["Blue hatchback", ids.attachedImageId],
          ["Toyota Corolla", ids.attachedImageId],
          ["brand", ids.brandId],
          ["legal", ids.legalDocumentId],
          ["unused", ids.unusedImageId],
        ] as const;

        for (const [search, expectedId] of searches) {
          const result = await mediaQueries.queryMediaLibraryAssets(tx, {
            search,
            pageSize: 100,
          });
          assert.deepEqual(
            result.assets.map((asset) => asset.id),
            [expectedId],
            `search "${search}"`,
          );
        }

        const attached = await mediaQueries.queryMediaLibraryAssets(tx, {
          search: "Toyota Corolla",
        });
        assert.equal(attached.assets[0]?.sizeKb, 2);
        assert.equal(attached.assets[0]?.width, 1400);
        assert.equal(attached.assets[0]?.height, 900);
        assert.equal(
          attached.assets[0]?.uploadedAt,
          "2026-03-04T00:00:00.000Z",
        );
        assert.deepEqual(attached.assets[0]?.usedByVehicle, {
          id: ids.vehicleId,
          make: "Toyota",
          model: "Corolla",
        });
      });
    });

    it("combines type and usage filters and paginates with a stable order", async () => {
      await withMediaLibraryFixtures(async (tx, ids) => {
        const filters = [
          [{ type: "image" }, [ids.attachedImageId, ids.unusedImageId]],
          [{ type: "document" }, [ids.legalDocumentId]],
          [{ usage: "vehicle" }, [ids.attachedImageId]],
          [{ usage: "brand" }, [ids.brandId]],
          [{ usage: "legal" }, [ids.legalDocumentId]],
          [{ usage: "unused" }, [ids.unusedImageId]],
          [{ type: "image", usage: "vehicle" }, [ids.attachedImageId]],
        ] as const;

        for (const [filter, expectedIds] of filters) {
          const result = await mediaQueries.queryMediaLibraryAssets(tx, {
            ...filter,
            pageSize: 100,
          });
          assert.deepEqual(
            result.assets.map((asset) => asset.id),
            expectedIds,
          );
        }

        const firstPage = await mediaQueries.queryMediaLibraryAssets(tx, {
          page: 1,
          pageSize: 2,
        });
        const secondPage = await mediaQueries.queryMediaLibraryAssets(tx, {
          page: 2,
          pageSize: 2,
        });
        assert.deepEqual(
          firstPage.assets.map((asset) => asset.id),
          [ids.attachedImageId, ids.unusedImageId],
        );
        assert.deepEqual(
          secondPage.assets.map((asset) => asset.id),
          [ids.brandId, ids.legalDocumentId],
        );
        assert.equal(firstPage.hasMore, true);
        assert.equal(secondPage.hasMore, false);
      });
    });
  },
);
