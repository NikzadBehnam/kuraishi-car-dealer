"use client";

import { LoaderCircle, MailPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  getBrowserPreferredLanguage,
  verificationCallbackPath,
} from "@/app/(auth)/register/registration-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const resendEmailSchema = z.email("Enter a valid email address.");

type ResendVerificationFormProps = {
  initialEmail: string;
};

export function ResendVerificationForm({
  initialEmail,
}: ResendVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const parsedEmail = resendEmailSchema.safeParse(email.trim());

    if (!parsedEmail.success) {
      setError(parsedEmail.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }

    setIsSubmitting(true);

    const preferredLanguage = getBrowserPreferredLanguage();
    const result = await authClient.sendVerificationEmail(
      {
        callbackURL: verificationCallbackPath,
        email: parsedEmail.data.toLowerCase(),
      },
      {
        headers: preferredLanguage
          ? {
              "accept-language": preferredLanguage,
            }
          : undefined,
      },
    );

    setIsSubmitting(false);

    if (result.error) {
      const nextError =
        result.error.status === 429
          ? "Please wait before requesting another link."
          : "We could not send a new verification link. Try again shortly.";
      setError(nextError);
      toast.error(nextError);
      return;
    }

    const nextMessage =
      "If an eligible account exists, a fresh verification link will arrive shortly.";
    setMessage(nextMessage);
    toast.success(nextMessage);
  };

  return (
    <form noValidate className="mt-5 grid gap-3" onSubmit={submit}>
      <label
        className="text-sm font-bold text-foreground"
        htmlFor="resend-verification-email"
      >
        Email
      </label>
      <Input
        id="resend-verification-email"
        type="email"
        autoComplete="email"
        value={email}
        aria-invalid={!!error}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
      >
        {isSubmitting ? <LoaderCircle className="animate-spin" /> : <MailPlus />}
        {isSubmitting ? "Sending link" : "Resend verification link"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm font-semibold text-success">
          {message}
        </p>
      ) : null}
    </form>
  );
}
