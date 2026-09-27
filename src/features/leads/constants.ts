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

export type LeadSource = (typeof leadSources)[number];
export type LeadStatus = (typeof leadStatuses)[number];
export type LeadPriority = (typeof leadPriorities)[number];
export type LeadSortField = (typeof leadSortFields)[number];
