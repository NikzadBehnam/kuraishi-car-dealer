import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseComparisonStorage } from "./vehicle-comparison-storage.ts";

describe("vehicle comparison storage", () => {
  it("uses an empty selection when browser storage is absent", () => {
    assert.deepEqual(parseComparisonStorage(null), {
      ids: [],
      needsRewrite: false,
    });
  });

  it("restores a valid selection without rewriting it", () => {
    assert.deepEqual(parseComparisonStorage('["vehicle_1","vehicle_2"]'), {
      ids: ["vehicle_1", "vehicle_2"],
      needsRewrite: false,
    });
  });

  it("recovers from invalid JSON and legacy non-array values", () => {
    assert.deepEqual(parseComparisonStorage("{"), {
      ids: [],
      needsRewrite: true,
    });
    assert.deepEqual(parseComparisonStorage('{"vehicle":"vehicle_1"}'), {
      ids: [],
      needsRewrite: true,
    });
  });

  it("drops invalid and duplicate IDs and caps legacy selections at three", () => {
    assert.deepEqual(
      parseComparisonStorage(
        '["vehicle_1","vehicle_1","../private",3,"vehicle_2","vehicle_3","vehicle_4"]',
      ),
      {
        ids: ["vehicle_1", "vehicle_2", "vehicle_3"],
        needsRewrite: true,
      },
    );
  });
});
