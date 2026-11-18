import type { VehicleFormValues } from "./vehicle-form.schema";

export function parseOptionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

function nullableText(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function nullableDecimal(value: number | undefined) {
  return value === undefined ? null : String(value);
}

function splitLines(value: string | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function toCreateVehicleDraftPayload(values: VehicleFormValues) {
  return {
    stockNumber: values.stockNumber.trim(),
    slug: values.slug.trim(),
    make: values.make.trim(),
    model: values.model.trim(),
    variant: nullableText(values.variant),
    description: nullableText(values.description),
    location: nullableText(values.location),
    exteriorColor: nullableText(values.exteriorColor),
    condition: values.condition ?? null,
    price: nullableDecimal(values.price),
    marginEstimate: nullableDecimal(values.marginEstimate),
    firstRegistration: nullableText(values.firstRegistration),
    mileage: values.mileage ?? null,
    powerKw: nullableDecimal(values.powerKw),
    ownerCount: values.ownerCount ?? null,
    vinLastSix: nullableText(values.vinLastSix),
    fuelType: values.fuelType ?? null,
    transmissionType: values.transmissionType ?? null,
    bodyType: values.bodyType ?? null,
    consumption: nullableDecimal(values.consumption),
    consumptionUnit:
      values.consumption === undefined
        ? null
        : (values.consumptionUnit ?? null),
    co2Emission: values.co2Emission ?? null,
    features: splitLines(values.featuresText),
    labels: splitLines(values.labelsText),
    mediaAssetIds: values.mediaAssetIds,
  };
}

export function toUpdateVehiclePayload(
  values: VehicleFormValues,
  vehicleId: string,
  expectedVersion: number,
) {
  return {
    ...toCreateVehicleDraftPayload(values),
    vehicleId,
    expectedVersion,
  };
}

export function toPublishVehiclePayload(
  values: VehicleFormValues,
  confirmInspectionPassed: boolean,
  target?: { vehicleId: string; expectedVersion: number },
) {
  return {
    ...toCreateVehicleDraftPayload(values),
    confirmInspectionPassed,
    ...(target ?? {}),
  };
}
