import type {
  ValuationAccidentHistory,
  ValuationCondition,
  ValuationServiceHistory,
} from "./constants.ts";

const conditionDescriptions: Record<ValuationCondition, string> = {
  good: "Good",
  very_good: "Very good",
  wear: "Signs of use",
};

const accidentHistoryDescriptions: Record<ValuationAccidentHistory, string> = {
  accident_free: "Accident-free",
  repaired_damage: "Repaired damage",
};

const serviceHistoryDescriptions: Record<ValuationServiceHistory, string> = {
  complete: "Complete",
  partial: "Partial",
};

export function parseValuationFirstRegistration(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

export function isValuationFirstRegistrationInFuture(
  value: string,
  now = new Date(),
) {
  const currentMonth = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0")}`;

  return value > currentMonth;
}

export function describeValuationCondition(value: ValuationCondition) {
  return conditionDescriptions[value];
}

export function describeValuationAccidentHistory(
  value: ValuationAccidentHistory,
) {
  return accidentHistoryDescriptions[value];
}

export function describeValuationServiceHistory(
  value: ValuationServiceHistory,
) {
  return serviceHistoryDescriptions[value];
}

export function buildValuationLeadMessage(make: string, model: string) {
  return `Vehicle valuation requested for ${make} ${model}.`;
}
