import { parseArgs } from "node:util";

import {
  importInventoryFixtures,
  inventoryFixtureInputSchema,
} from "./inventory-fixtures.ts";
import { createInventoryTestDatabase } from "./inventory-test-client.ts";

const { values } = parseArgs({
  options: {
    "actor-id": { type: "string" },
    "dealer-id": { type: "string" },
    "acquired-on": { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
const input = inventoryFixtureInputSchema.parse({
  actorId: values["actor-id"],
  dealerId: values["dealer-id"],
  acquiredOn: values["acquired-on"],
  mode: values.apply ? "apply" : "preview",
});
const { prisma } = createInventoryTestDatabase();
try {
  const result = await prisma.$transaction(
    (tx) => importInventoryFixtures(tx, input),
    { isolationLevel: "Serializable", timeout: 60000 },
  );
  console.log(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
