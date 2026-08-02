import { z } from "zod";
export const contactFormSchema = z.object({
  name: z.string().min(2, "Bitte geben Sie Ihren Namen ein."),
  email: z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  phone: z.string().optional(),
  appointmentType: z.string().min(1, "Bitte wählen Sie eine Terminart."),
  preferredDate: z.string().min(1, "Bitte wählen Sie einen Wunschtermin."),
  message: z
    .string()
    .max(1000, "Die Nachricht darf höchstens 1.000 Zeichen enthalten."),
  consent: z
    .boolean()
    .refine(Boolean, "Bitte stimmen Sie der Datenverarbeitung zu."),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;
