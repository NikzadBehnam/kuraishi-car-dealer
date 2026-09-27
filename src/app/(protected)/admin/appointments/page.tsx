import { redirect } from "next/navigation";

import {
  buildAdminAppointmentBoardHref,
  parseAdminAppointmentBoardSearchParams,
} from "@/features/appointments/admin-board-search-params.ts";
import { getAdminAppointmentBoard } from "@/features/appointments/server/admin-queries.ts";

import { AppointmentsBoard } from "./_components/appointments-board";

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const boardQuery = parseAdminAppointmentBoardSearchParams(params);
  const result = await getAdminAppointmentBoard(boardQuery);
  const lastPage = Math.max(1, result.appointments.totalPages);

  if (boardQuery.appointments.page > lastPage) {
    redirect(buildAdminAppointmentBoardHref(boardQuery, lastPage));
  }

  return (
    <AppointmentsBoard
      key={buildAdminAppointmentBoardHref(boardQuery)}
      boardQuery={boardQuery}
      initialLeadId={getSingleValue(params.leadId)}
      result={result}
    />
  );
}

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
