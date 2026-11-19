import type { Prisma } from "../generated/prisma/client.ts";

import { getAdminInquirySearchTerms } from "./admin-inquiry-validation.ts";

export function getAdminInquiryWhere(search: string): Prisma.InquiryWhereInput {
  const terms = getAdminInquirySearchTerms(search);
  if (terms.length === 0) return {};

  return {
    AND: terms.map((term) => ({
      OR: [
        { customerName: { contains: term, mode: "insensitive" } },
        { customerEmail: { contains: term, mode: "insensitive" } },
        { customerPhone: { contains: term, mode: "insensitive" } },
        { message: { contains: term, mode: "insensitive" } },
        { vehicleTitleSnapshot: { contains: term, mode: "insensitive" } },
        {
          vehicle: {
            is: {
              OR: [
                { make: { contains: term, mode: "insensitive" } },
                { model: { contains: term, mode: "insensitive" } },
                { variant: { contains: term, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    })),
  };
}
