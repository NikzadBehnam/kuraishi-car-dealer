"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/app/(auth)/_schemas/auth.schema";
import {
  buildPasswordResetRequest,
  getForgotPasswordErrorMessage,
  neutralPasswordResetRequestMessage,
} from "@/app/(auth)/forgot-password/password-recovery-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const submit = async (values: ForgotPasswordFormValues) => {
    setResultMessage(null);
    setSubmitError(null);

    const { error } = await authClient.requestPasswordReset(
      buildPasswordResetRequest(values),
    );

    if (error) {
      const message = getForgotPasswordErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setResultMessage(neutralPasswordResetRequestMessage);
    toast.success(neutralPasswordResetRequestMessage);
  };

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit(submit)}>
      <AuthField
        id="forgot-password-email"
        label="Email"
        error={errors.email?.message}
      >
        <Input
          id="forgot-password-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </AuthField>

      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
      >
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Mail />}
        {isSubmitting ? "Sending reset link" : "Send reset link"}
      </Button>

      {submitError ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {submitError}
        </p>
      ) : null}
      {resultMessage ? (
        <p role="status" className="text-sm font-semibold text-success">
          {resultMessage}
        </p>
      ) : null}
    </form>
  );
}
