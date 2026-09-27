export const leadSources = [
  "contact",
  "valuation",
  "test-drive",
  "callback",
] as const;

export const leadStatuses = [
  "new",
  "contacted",
  "qualified",
  "closed",
  "lost",
] as const;

export const leadPriorities = ["low", "medium", "high", "urgent"] as const;

export const leadSortFields = [
  "createdAt",
  "updatedAt",
  "priority",
  "status",
] as const;

export const currentLeadConsentVersion = "2026-09-27";

export const publicLeadRateLimit = {
  maximumSubmissions: 3,
  windowMinutes: 15,
} as const;

export const valuationConditions = ["very_good", "good", "wear"] as const;

export const valuationAccidentHistories = [
  "accident_free",
  "repaired_damage",
] as const;

export const valuationServiceHistories = ["complete", "partial"] as const;

export type LeadSource = (typeof leadSources)[number];
export type LeadStatus = (typeof leadStatuses)[number];
export type LeadPriority = (typeof leadPriorities)[number];
export type LeadSortField = (typeof leadSortFields)[number];
export type ValuationCondition = (typeof valuationConditions)[number];
export type ValuationAccidentHistory =
  (typeof valuationAccidentHistories)[number];
export type ValuationServiceHistory =
  (typeof valuationServiceHistories)[number];
