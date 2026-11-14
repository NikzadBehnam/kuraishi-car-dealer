"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import {
  createAccountSchema,
  type CreateAccountFormValues,
} from "@/app/(auth)/_schemas/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAccountAction } from "./actions";

export function CreateAccountForm() {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const submit = async (values: CreateAccountFormValues) => {
    const result = await createAccountAction(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Account created for ${values.email}.`);
    reset();
  };

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit(submit)}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <AuthField
          id="account-first-name"
          label="First name"
          error={errors.firstName?.message}
        >
          <Input
            id="account-first-name"
            autoComplete="off"
            aria-invalid={!!errors.firstName}
            {...register("firstName")}
          />
        </AuthField>
        <AuthField
          id="account-last-name"
          label="Last name"
          error={errors.lastName?.message}
        >
          <Input
            id="account-last-name"
            autoComplete="off"
            aria-invalid={!!errors.lastName}
            {...register("lastName")}
          />
        </AuthField>
      </div>

      <AuthField id="account-email" label="Email" error={errors.email?.message}>
        <Input
          id="account-email"
          type="email"
          autoComplete="off"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </AuthField>

      <AuthField
        id="account-password"
        label="Initial password"
        error={errors.password?.message}
      >
        <div className="relative min-w-0">
          <Input
            id="account-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
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

      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting}
        className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
      >
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
        {isSubmitting ? "Creating account" : "Create account"}
      </Button>
    </form>
  );
}
