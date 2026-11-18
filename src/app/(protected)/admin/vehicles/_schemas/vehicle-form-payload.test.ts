import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { VehicleFormValues } from "./vehicle-form.schema.ts";
import {
  parseOptionalNumber,
  toCreateVehicleDraftPayload,
  toPublishVehiclePayload,
  toUpdateVehiclePayload,
} from "./vehicle-form-payload.ts";

function formValues(
  overrides: Partial<VehicleFormValues> = {},
): VehicleFormValues {
  return {
    make: "  Volvo ",
    model: " V60 ",
    variant: "  Plus  ",
    stockNumber: " KA-123 ",
    slug: " volvo-v60 ",
    description: "  Estate vehicle  ",
    price: 35990.5,
    marginEstimate: 2500,
    firstRegistration: "2024-06",
    mileage: 12000,
    powerKw: 145,
    fuelType: "petrol",
    transmissionType: "automatic",
    bodyType: "wagon",
    exteriorColor: "  Silver ",
    location: " Wien ",
    condition: "used",
    ownerCount: 1,
    vinLastSix: " AB1234 ",
    consumption: 6.4,
    consumptionUnit: "l_per_100_km",
    co2Emission: 145,
    featuresText: "  Heated seats  \n\n Panoramic roof \r\n",
    labelsText: "  Premium  \n  Low mileage ",
    mediaAssetIds: ["asset-1", "asset-2"],
    status: "published",
    inspectionStatus: "passed",
    isFeatured: true,
    isAvailable: true,
    ...overrides,
  };
}

describe("vehicle form draft payload", () => {
  it("trims text, serializes decimals, and normalizes line-separated lists", () => {
    const payload = toCreateVehicleDraftPayload(formValues());

    assert.deepEqual(payload, {
      stockNumber: "KA-123",
      slug: "volvo-v60",
      make: "Volvo",
      model: "V60",
      variant: "Plus",
      description: "Estate vehicle",
      location: "Wien",
      exteriorColor: "Silver",
      condition: "used",
      price: "35990.5",
      marginEstimate: "2500",
      firstRegistration: "2024-06",
      mileage: 12000,
      powerKw: "145",
      ownerCount: 1,
      vinLastSix: "AB1234",
      fuelType: "petrol",
      transmissionType: "automatic",
      bodyType: "wagon",
      consumption: "6.4",
      consumptionUnit: "l_per_100_km",
      co2Emission: 145,
      features: ["Heated seats", "Panoramic roof"],
      labels: ["Premium", "Low mileage"],
      mediaAssetIds: ["asset-1", "asset-2"],
    });
  });

  it("preserves blank optional values as null instead of zero or empty text", () => {
    const values = formValues({
      variant: " ",
      description: "",
      price: undefined,
      marginEstimate: undefined,
      firstRegistration: "",
      mileage: undefined,
      powerKw: undefined,
      exteriorColor: " ",
      location: "",
      ownerCount: undefined,
      vinLastSix: "",
      consumption: undefined,
      consumptionUnit: "l_per_100_km",
      co2Emission: undefined,
      featuresText: " \n ",
      labelsText: "",
    });
    const payload = toCreateVehicleDraftPayload(values);

    assert.equal(payload.price, null);
    assert.equal(payload.marginEstimate, null);
    assert.equal(payload.firstRegistration, null);
    assert.equal(payload.mileage, null);
    assert.equal(payload.powerKw, null);
    assert.equal(payload.ownerCount, null);
    assert.equal(payload.consumption, null);
    assert.equal(payload.consumptionUnit, null);
    assert.equal(payload.co2Emission, null);
    assert.equal(payload.variant, null);
    assert.equal(payload.exteriorColor, null);
    assert.equal(payload.location, null);
    assert.deepEqual(payload.features, []);
    assert.deepEqual(payload.labels, []);
    assert.equal("status" in payload, false);
    assert.equal("inspectionStatus" in payload, false);
    assert.equal("isFeatured" in payload, false);
    assert.equal("isAvailable" in payload, false);
  });

  it("adds the target ID and expected version without accepting lifecycle changes", () => {
    const payload = toUpdateVehiclePayload(
      formValues({
        status: "sold",
        inspectionStatus: "failed",
        isFeatured: true,
      }),
      "vehicle-123",
      7,
    );

    assert.equal(payload.vehicleId, "vehicle-123");
    assert.equal(payload.expectedVersion, 7);
    assert.equal("status" in payload, false);
    assert.equal("inspectionStatus" in payload, false);
    assert.equal("isFeatured" in payload, false);
    assert.equal("isAvailable" in payload, false);
  });

  it("uses a separate publish payload with explicit inspection confirmation", () => {
    const createPayload = toPublishVehiclePayload(formValues(), true);
    const updatePayload = toPublishVehiclePayload(formValues(), true, {
      vehicleId: "vehicle-123",
      expectedVersion: 7,
    });

    assert.equal(createPayload.confirmInspectionPassed, true);
    assert.equal("vehicleId" in createPayload, false);
    assert.equal(updatePayload.vehicleId, "vehicle-123");
    assert.equal(updatePayload.expectedVersion, 7);
    for (const payload of [createPayload, updatePayload]) {
      assert.equal("status" in payload, false);
      assert.equal("inspectionStatus" in payload, false);
      assert.equal("isFeatured" in payload, false);
      assert.equal("isAvailable" in payload, false);
    }
  });

  it("parses blank optional numeric inputs without creating a zero", () => {
    assert.equal(parseOptionalNumber(""), undefined);
    assert.equal(parseOptionalNumber("0"), 0);
    assert.equal(parseOptionalNumber("12.5"), 12.5);
    assert.equal(Number.isNaN(parseOptionalNumber("invalid")), true);
  });
});
