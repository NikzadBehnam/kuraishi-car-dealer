"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Controller,
  useForm,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { toast } from "sonner";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/app/(auth)/_schemas/auth.schema";
import {
  buildCredentialRegistrationRequest,
  buildVerificationPendingURL,
  getBrowserPreferredLanguage,
  getCredentialRegistrationErrorMessage,
} from "@/app/(auth)/register/registration-flow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      consent: false,
    },
  });

  const submit = async (values: RegisterFormValues) => {
    setSubmitError(null);

    const request = buildCredentialRegistrationRequest(values);
    const preferredLanguage = getBrowserPreferredLanguage();
    const { error } = await authClient.signUp.email(request, {
      headers: preferredLanguage
        ? {
            "accept-language": preferredLanguage,
          }
        : undefined,
    });

    if (error) {
      const message = getCredentialRegistrationErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
      return;
    }

    toast.success("Check your email for a verification link.");
    router.push(buildVerificationPendingURL(request.email));
  };

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit(submit)}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <AuthField
          id="register-first-name"
          label="First name"
          error={errors.firstName?.message}
        >
          <Input
            id="register-first-name"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            {...register("firstName")}
          />
        </AuthField>
        <AuthField
          id="register-last-name"
          label="Last name"
          error={errors.lastName?.message}
        >
          <Input
            id="register-last-name"
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            {...register("lastName")}
          />
        </AuthField>
      </div>

      <AuthField
        id="register-email"
        label="Email"
        error={errors.email?.message}
      >
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </AuthField>

      <AuthField
        id="register-phone"
        label="Phone"
        error={errors.phone?.message}
      >
        <Input
          id="register-phone"
          type="tel"
          autoComplete="tel"
          placeholder="+43"
          aria-invalid={!!errors.phone}
          {...register("phone")}
        />
      </AuthField>

      <AuthField
        id="register-password"
        label="Password"
        error={errors.password?.message}
      >
        <PasswordInput
          id="register-password"
          show={showPassword}
          autoComplete="new-password"
          ariaInvalid={!!errors.password}
          registerProps={register("password")}
          onToggle={() => setShowPassword((value) => !value)}
        />
      </AuthField>

      <AuthField
        id="register-confirm-password"
        label="Confirm password"
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="register-confirm-password"
          show={showPassword}
          autoComplete="new-password"
          ariaInvalid={!!errors.confirmPassword}
          registerProps={register("confirmPassword")}
          onToggle={() => setShowPassword((value) => !value)}
        />
      </AuthField>

      <Controller
        name="consent"
        control={control}
        render={({ field }) => (
          <div className="grid gap-2">
            <label className="flex min-w-0 items-start gap-3 rounded-[var(--radius-sm)] border bg-background p-3 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <span className="min-w-0 text-muted-foreground">
                I agree to create a client account and accept the terms for
                storing my profile details.
              </span>
            </label>
            {errors.consent ? (
              <p className="text-sm font-semibold text-destructive">
                {errors.consent.message}
              </p>
            ) : null}
          </div>
        )}
      />

      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
      >
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
        {isSubmitting ? "Creating account" : "Create account"}
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
