import { z } from "zod";
export const vehicleValuationSchema = z.object({
  make: z.string().min(1, "Bitte geben Sie die Marke an."),
  model: z.string().min(1, "Bitte geben Sie das Modell an."),
  firstRegistration: z.string().min(1, "Bitte geben Sie die Erstzulassung an."),
  mileage: z
    .number()
    .min(0, "Bitte geben Sie einen gültigen Kilometerstand an."),
  email: z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein.").optional(),
});
