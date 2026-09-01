"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import {
  AuthMethodDivider,
  GoogleAuthButton,
} from "@/app/(auth)/_components/google-auth-button";
import {
  loginSchema,
  type LoginFormValues,
} from "@/app/(auth)/_schemas/auth.schema";
import { forgotPasswordPath } from "@/app/(auth)/forgot-password/password-recovery-flow";
import {
  buildCredentialLoginRequest,
  getCredentialLoginErrorState,
  type CredentialLoginErrorState,
} from "@/app/(auth)/login/login-flow";
import { buildVerificationPendingURL } from "@/app/(auth)/register/registration-flow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function LoginForm({
  callbackURL,
  passwordResetSuccess = false,
}: {
  callbackURL: string;
  passwordResetSuccess?: boolean;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] =
    useState<CredentialLoginErrorState | null>(null);
  const {
    register,
    control,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const submit = async (values: LoginFormValues) => {
    setSubmitError(null);

    const request = buildCredentialLoginRequest(values, callbackURL);
    const { error } = await authClient.signIn.email(request);

    if (error) {
      const nextError = getCredentialLoginErrorState(error);
      setSubmitError(nextError);
      toast.error(nextError.message);
      return;
    }

    toast.success("Signed in.");
    router.refresh();
    router.push(request.callbackURL);
  };

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit(submit)}>
      {passwordResetSuccess ? (
        <p role="status" className="text-sm font-semibold text-success">
          Password updated. Log in with your new password.
        </p>
      ) : null}

      <GoogleAuthButton callbackURL={callbackURL} />
      <AuthMethodDivider />

      <AuthField id="login-email" label="Email" error={errors.email?.message}>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </AuthField>

      <AuthField
        id="login-password"
        label="Password"
        error={errors.password?.message}
      >
        <div className="relative min-w-0">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="pr-10"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <button
            type="button"
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </AuthField>

      <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
        <Controller
          name="remember"
          control={control}
          render={({ field }) => (
            <label className="flex min-w-0 items-center gap-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <span className="text-muted-foreground">Remember this device</span>
            </label>
          )}
        />
        <Link
          className="shrink-0 font-bold text-primary hover:underline"
          href={forgotPasswordPath}
        >
          Forgot?
        </Link>
      </div>

      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
      >
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : <LogIn />}
        {isSubmitting ? "Signing in" : "Login"}
      </Button>
      {submitError ? (
        <div role="alert" className="grid gap-2 text-sm">
          <p className="font-semibold text-destructive">
            {submitError.message}
          </p>
          {submitError.canResendVerification ? (
            <Link
              className="w-fit font-bold text-primary hover:underline"
              href={buildVerificationPendingURL(getValues("email"))}
            >
              Resend verification email
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
