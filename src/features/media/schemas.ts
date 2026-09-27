import { z } from "zod";

import {
  idListSchema,
  optionalSearchSchema,
  paginationQueryShape,
} from "../shared/schemas.ts";
import { adminMediaTypes, adminMediaUsages } from "./constants.ts";

export const adminMediaListQuerySchema = z.object({
  ...paginationQueryShape,
  search: optionalSearchSchema,
  type: z.enum(adminMediaTypes).optional(),
  usage: z.enum(adminMediaUsages).optional(),
});

export const deleteMediaAssetsCommandSchema = z.object({
  ids: idListSchema,
});

export type AdminMediaListQuery = z.infer<typeof adminMediaListQuerySchema>;
export type DeleteMediaAssetsCommand = z.infer<
  typeof deleteMediaAssetsCommandSchema
>;
