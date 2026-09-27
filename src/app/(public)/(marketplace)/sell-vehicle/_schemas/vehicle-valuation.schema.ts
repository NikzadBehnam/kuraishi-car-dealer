import { z } from "zod";

import {
  valuationAccidentHistories,
  valuationConditions,
  valuationServiceHistories,
} from "@/features/leads/constants";
import { isValuationFirstRegistrationInFuture } from "@/features/leads/public-valuation-policy";

export const vehicleValuationSchema = z.object({
  accidentHistory: z.enum(valuationAccidentHistories),
  condition: z.enum(valuationConditions),
  consent: z
    .boolean()
    .refine(Boolean, "Bitte stimmen Sie der Datenverarbeitung zu."),
  email: z
    .string()
    .trim()
    .pipe(z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein.")),
  firstRegistration: z
    .string()
    .regex(
      /^(19[5-9]\d|20\d{2})-(0[1-9]|1[0-2])$/,
      "Bitte geben Sie eine gültige Erstzulassung an.",
    )
    .refine(
      (value) => !isValuationFirstRegistrationInFuture(value),
      "Die Erstzulassung darf nicht in der Zukunft liegen.",
    ),
  make: z.string().trim().min(1, "Bitte geben Sie die Marke an.").max(80),
  mileage: z
    .number()
    .int("Bitte geben Sie einen ganzen Kilometerstand an.")
    .min(0, "Bitte geben Sie einen gültigen Kilometerstand an.")
    .max(2_000_000, "Bitte prüfen Sie den Kilometerstand."),
  model: z.string().trim().min(1, "Bitte geben Sie das Modell an.").max(80),
  name: z.string().trim().min(2, "Bitte geben Sie Ihren Namen ein.").max(120),
  phone: z.string().trim().max(32).optional(),
  serviceHistory: z.enum(valuationServiceHistories),
  website: z.string().max(0).optional(),
});

export type VehicleValuationValues = z.infer<typeof vehicleValuationSchema>;
