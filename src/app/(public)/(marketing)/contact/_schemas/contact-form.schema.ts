import { z } from "zod";

import { appointmentTypes } from "@/features/appointments/constants";

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Bitte geben Sie Ihren Namen ein.").max(120),
  email: z
    .string()
    .trim()
    .pipe(z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein.")),
  phone: z.string().trim().max(32).optional(),
  appointmentType: z.enum(appointmentTypes),
  preferredDate: z.string().min(1, "Bitte wählen Sie einen Wunschtermin."),
  message: z
    .string()
    .max(1000, "Die Nachricht darf höchstens 1.000 Zeichen enthalten."),
  consent: z
    .boolean()
    .refine(Boolean, "Bitte stimmen Sie der Datenverarbeitung zu."),
  website: z.string().max(0).optional(),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;
