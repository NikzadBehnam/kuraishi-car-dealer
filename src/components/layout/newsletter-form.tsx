"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/config/routes.config";

export function NewsletterForm() {
  const [email, setEmail] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.success("Vielen Dank! Ihre Anmeldung wurde vorgemerkt.");
    setEmail("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-2"
      aria-label="Newsletter"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <span className="sr-only">E-Mail-Adresse</span>
          <Mail
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#8fa0b2]"
            aria-hidden="true"
          />
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ihre E-Mail-Adresse"
            className="footer-newsletter-input border-white/15 bg-[#0c192b] pl-11 text-white shadow-none placeholder:text-[#8fa0b2]"
          />
        </label>
        <Button type="submit" variant="accent" className="group">
          Anmelden
          <ArrowRight
            className="transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Button>
      </div>
      <p className="text-[0.68rem] leading-5 text-[#8fa0b2]">
        Mit der Anmeldung akzeptieren Sie unsere{" "}
        <Link
          href={routes.privacy}
          className="underline underline-offset-2 transition-colors hover:text-white"
        >
          Datenschutzbestimmungen
        </Link>
        .
      </p>
    </form>
  );
}
