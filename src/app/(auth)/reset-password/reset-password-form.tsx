"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, RotateCcwKey } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/app/(auth)/_schemas/auth.schema";
import {
  buildResetPasswordRequest,
  getResetPasswordErrorMessage,
  passwordResetSuccessLoginPath,
} from "@/app/(auth)/forgot-password/password-recovery-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      confirmPassword: "",
      password: "",
    },
  });

  const submit = async (values: ResetPasswordFormValues) => {
    setSubmitError(null);

    const { error } = await authClient.resetPassword(
      buildResetPasswordRequest(values, token),
    );

    if (error) {
      const message = getResetPasswordErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
      return;
    }

    toast.success("Password updated. Log in with your new password.");
    router.refresh();
    router.push(passwordResetSuccessLoginPath);
  };

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit(submit)}>
      <AuthField
        id="reset-password"
        label="New password"
        error={errors.password?.message}
      >
        <PasswordInput
          id="reset-password"
          show={showPassword}
          autoComplete="new-password"
          ariaInvalid={!!errors.password}
          registerProps={register("password")}
          onToggle={() => setShowPassword((value) => !value)}
        />
      </AuthField>

      <AuthField
        id="reset-confirm-password"
        label="Confirm new password"
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="reset-confirm-password"
          show={showPassword}
          autoComplete="new-password"
          ariaInvalid={!!errors.confirmPassword}
          registerProps={register("confirmPassword")}
          onToggle={() => setShowPassword((value) => !value)}
        />
      </AuthField>

      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
      >
        {isSubmitting ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <RotateCcwKey />
        )}
        {isSubmitting ? "Updating password" : "Update password"}
      </Button>

      {submitError ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {submitError}
        </p>
      ) : null}
    </form>
  );
}

type PasswordInputProps = {
  id: string;
  show: boolean;
  autoComplete: string;
  ariaInvalid: boolean;
  registerProps: UseFormRegisterReturn;
  onToggle: () => void;
};

function PasswordInput({
  id,
  show,
  autoComplete,
  ariaInvalid,
  registerProps,
  onToggle,
}: PasswordInputProps) {
  return (
    <div className="relative min-w-0">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        className="pr-10"
        aria-invalid={ariaInvalid}
        {...registerProps}
      />
      <button
        type="button"
        className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={onToggle}
      >
        {show ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
