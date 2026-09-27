import { adminRoutes } from "../../config/admin-routes.config.ts";
import {
  appointmentListQuerySchema,
  type AppointmentListQuery,
} from "./schemas.ts";

export type AdminAppointmentSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type AdminAppointmentBoardQuery = {
  appointments: AppointmentListQuery;
  selectedDate: string;
};

const queryKeys = [
  "assignedToUserId",
  "page",
  "pageSize",
  "search",
  "sortDirection",
  "sortField",
  "status",
  "type",
  "vehicleId",
] as const;

const appointmentPageSize = 12;

export function parseAdminAppointmentBoardSearchParams(
  searchParams: AdminAppointmentSearchParams,
  now = new Date(),
): AdminAppointmentBoardQuery {
  const candidate: Record<string, unknown> = {
    pageSize:
      getSingleValue(searchParams.pageSize) ?? String(appointmentPageSize),
  };

  for (const key of queryKeys) {
    if (key === "pageSize") continue;
    const value = getSingleValue(searchParams[key]);
    if (value !== undefined) candidate[key] = value;
  }

  const requestedDate = getSingleValue(searchParams.date);

  return {
    appointments: parseWithInvalidFieldsRemoved(candidate),
    selectedDate: isIsoDate(requestedDate)
      ? requestedDate
      : now.toISOString().slice(0, 10),
  };
}

export function createAdminAppointmentBoardSearchParams(
  boardQuery: AdminAppointmentBoardQuery,
) {
  const { appointments: query } = boardQuery;
  const params = new URLSearchParams();

  params.set("date", boardQuery.selectedDate);
  setParam(params, "search", query.search);
  setParam(params, "status", query.status);
  setParam(params, "type", query.type);
  setParam(params, "assignedToUserId", query.assignedToUserId);
  setParam(params, "vehicleId", query.vehicleId);

  if (query.sortField !== "startsAt") params.set("sortField", query.sortField);
  if (query.sortDirection !== "asc") {
    params.set("sortDirection", query.sortDirection);
  }
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== appointmentPageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  return params;
}

export function buildAdminAppointmentBoardHref(
  boardQuery: AdminAppointmentBoardQuery,
  page = boardQuery.appointments.page,
) {
  const params = createAdminAppointmentBoardSearchParams({
    ...boardQuery,
    appointments: { ...boardQuery.appointments, page },
  });

  return `${adminRoutes.appointments}?${params.toString()}`;
}

function parseWithInvalidFieldsRemoved(candidate: Record<string, unknown>) {
  const sanitized = { ...candidate };

  for (let attempt = 0; attempt <= queryKeys.length; attempt += 1) {
    const result = appointmentListQuerySchema.safeParse(sanitized);
    if (result.success) return result.data;

    let replacedField = false;
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field !== "string" || !(field in sanitized)) continue;

      if (field === "pageSize") sanitized.pageSize = appointmentPageSize;
      else delete sanitized[field];
      replacedField = true;
    }

    if (!replacedField) break;
  }

  return appointmentListQuerySchema.parse({ pageSize: appointmentPageSize });
}

function getSingleValue(value: string | string[] | undefined) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function isIsoDate(value: string | undefined): value is string {
  return (
    !!value &&
    /^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/u.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  );
}

function setParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (value !== undefined) params.set(key, String(value));
}
