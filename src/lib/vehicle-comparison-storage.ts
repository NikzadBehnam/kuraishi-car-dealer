import {
  inventoryIdSchema,
  MAX_PUBLIC_COMPARISON_SELECTION_SIZE,
} from "./inventory-validation.ts";

export const MAX_COMPARISON_VEHICLES = MAX_PUBLIC_COMPARISON_SELECTION_SIZE;

export function parseComparisonStorage(raw: string | null): {
  ids: string[];
  needsRewrite: boolean;
} {
  if (raw === null) {
    return { ids: [], needsRewrite: false };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ids: [], needsRewrite: true };
    }
    throw error;
  }

  if (!Array.isArray(value)) {
    return { ids: [], needsRewrite: true };
  }

  const ids: string[] = [];
  let needsRewrite = false;

  for (const candidate of value) {
    const parsedId = inventoryIdSchema.safeParse(candidate);
    if (!parsedId.success || ids.includes(parsedId.data)) {
      needsRewrite = true;
      continue;
    }
    if (ids.length === MAX_COMPARISON_VEHICLES) {
      needsRewrite = true;
      continue;
    }
    ids.push(parsedId.data);
  }

  if (ids.length !== value.length) {
    needsRewrite = true;
  }

  return { ids, needsRewrite };
}
