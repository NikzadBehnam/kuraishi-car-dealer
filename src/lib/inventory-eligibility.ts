import "server-only";

import { Prisma } from "../generated/prisma/client.ts";
import { publicInventoryRules } from "./inventory-policy.ts";
import type {
  PublicInventoryRule,
  PublicInventorySurface,
} from "./inventory-policy.ts";

export function getPublicVehicleWhere(
  surface: PublicInventorySurface,
): Prisma.VehicleWhereInput {
  return { OR: publicInventoryRules[surface].map((rule) => ({ ...rule })) };
}

export function getPublicVehicleEligibilitySql(
  surface: PublicInventorySurface,
) {
  const rules: readonly PublicInventoryRule[] = publicInventoryRules[surface];
  return Prisma.sql`(${Prisma.join(
    rules.map((rule) => {
      const conditions = [Prisma.sql`"status"::text = ${rule.status}`];
      if (rule.inspectionStatus !== undefined) {
        conditions.push(
          Prisma.sql`"inspectionStatus"::text = ${rule.inspectionStatus}`,
        );
      }
      if (rule.isFeatured !== undefined) {
        conditions.push(Prisma.sql`"isFeatured" = ${rule.isFeatured}`);
      }
      return Prisma.sql`(${Prisma.join(conditions, " AND ")})`;
    }),
    " OR ",
  )})`;
}
