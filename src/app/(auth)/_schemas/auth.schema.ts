import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember: z.boolean(),
});

export const createAccountSchema = z.object({
  firstName: z.string().trim().min(2, "Enter the first name.").max(60),
  lastName: z.string().trim().min(2, "Enter the last name.").max(60),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type CreateAccountFormValues = z.infer<typeof createAccountSchema>;
