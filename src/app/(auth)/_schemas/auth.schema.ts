import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(2, "Enter your first name."),
    lastName: z.string().min(2, "Enter your last name."),
    email: z.email("Enter a valid email address."),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z
      .string()
      .min(8, "Confirm your password with at least 8 characters."),
    consent: z
      .boolean()
      .refine(Boolean, "Consent is required for account creation."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z
      .string()
      .min(8, "Confirm your password with at least 8 characters."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
