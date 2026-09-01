"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  buildGoogleAuthRequest,
  getGoogleAuthErrorMessage,
} from "@/app/(auth)/_components/google-auth-flow";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type GoogleAuthButtonProps = {
  callbackURL: string;
  className?: string;
};

export function GoogleAuthButton({
  callbackURL,
  className,
}: GoogleAuthButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const signInWithGoogle = async () => {
    setIsPending(true);
    const { error } = await authClient.signIn.social(
      buildGoogleAuthRequest(callbackURL),
    );

    if (error) {
      setIsPending(false);
      toast.error(getGoogleAuthErrorMessage(error));
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      aria-disabled={isPending}
      className={cn(
        "w-full whitespace-normal rounded-[var(--radius-sm)] text-center",
        className,
      )}
      onClick={signInWithGoogle}
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <span
          className="grid size-4 place-items-center rounded-full border text-[0.68rem] font-extrabold"
          aria-hidden="true"
        >
          G
        </span>
      )}
      Continue with Google
    </Button>
  );
}

export function AuthMethodDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span>or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
