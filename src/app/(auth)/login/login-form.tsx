"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import { CredentialForm } from "@/app/(auth)/_components/credential-form";
import {
  loginSchema,
  type LoginFormValues,
} from "@/app/(auth)/_schemas/auth.schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { getSafeReturnPath } from "@/lib/safe-redirect";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    control,
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
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.remember,
      });

      if (error) {
        toast.error(
          error.status === 429
            ? "Too many attempts. Please wait and try again."
            : error.status === 401
              ? "Login failed. Check your email and password."
              : "Could not sign in. Please try again.",
        );
        return;
      }
    } catch {
      toast.error("Could not sign in. Please try again.");
      return;
    }

    router.replace(getSafeReturnPath(searchParams.get("next")));
    router.refresh();
  };

  return (
    <CredentialForm onSubmit={handleSubmit(submit)}>
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
            className="text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] transition-colors focus-visible:ring-1 focus-visible:outline-none"
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
              <span className="text-muted-foreground">
                Remember this device
              </span>
            </label>
          )}
        />
      </div>

      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting}
        className="w-full rounded-[var(--radius-sm)] text-center whitespace-normal"
      >
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : <LogIn />}
        {isSubmitting ? "Signing in" : "Login"}
      </Button>
    </CredentialForm>
  );
}
