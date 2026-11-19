"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoaderCircle, Send } from "lucide-react";
import {
  contactFormSchema,
  type ContactFormValues,
} from "../_schemas/contact-form.schema";
import { formContent } from "@/content/de/forms";
import { dealershipDate } from "@/lib/business-date";
import { inquiryAppointmentTypes } from "@/lib/inquiry-validation";
import { inquiryPrivacyNotice } from "@/content/de/inquiry-privacy";
import { publicRoutes, routeBuilders } from "@/config/routes.config";
import type { PublicVehicleInquiryDTO } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export function ContactForm({
  enabled,
  vehicle,
  contextError,
  appointmentType,
}: {
  enabled: boolean;
  vehicle: PublicVehicleInquiryDTO | null;
  contextError: string | null;
  appointmentType: ContactFormValues["appointmentType"];
}) {
  const [submitted, setSubmitted] = useState(false);
  const [website, setWebsite] = useState("");
  const retry = useRef<{ fingerprint: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      appointmentType,
      phone: "",
      preferredDate: "",
      message: "",
      consent: false,
    },
  });
  const submit = async (fields: ContactFormValues) => {
    if (!enabled || contextError) {
      toast.error(contextError ?? formContent.unavailable);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const payload = {
        fields,
        vehicleSlug: vehicle?.slug ?? null,
        website,
        privacyNoticeVersion: inquiryPrivacyNotice.version,
      };
      const fingerprint = JSON.stringify(payload);
      if (retry.current?.fingerprint !== fingerprint) {
        retry.current = { fingerprint, key: crypto.randomUUID() };
      }
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestId: retry.current.key }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const failure = z.object({ error: z.string() }).safeParse(result);
        toast.error(
          failure.success
            ? failure.data.error
            : "Ihre Anfrage konnte nicht gespeichert werden.",
        );
        return;
      }
      z.strictObject({ ok: z.literal(true) }).parse(result);
      setSubmitted(true);
      toast.success(
        "Ihre Anfrage wurde gespeichert. Ein Wunschtermin ist noch nicht bestätigt.",
      );
    } catch {
      toast.error(
        "Ihre Anfrage konnte nicht bestätigt werden. Bitte versuchen Sie es mit unveränderten Angaben erneut.",
      );
    } finally {
      inFlight.current = false;
    }
  };
  if (submitted) {
    return (
      <div className="py-12 text-center" role="status">
        <h2 className="section-title">{formContent.successTitle}</h2>
        <p className="text-muted-foreground mt-3">
          {formContent.successDescription}
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          Ihr Wunschtermin ist eine Anfrage, keine bestätigte Buchung.
        </p>
      </div>
    );
  }
  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="grid gap-5"
    >
      {!enabled ? (
        <p
          className="text-muted-foreground rounded-xl border p-4 text-sm"
          role="status"
        >
          {formContent.unavailable}
        </p>
      ) : null}
      {contextError ? (
        <div
          role="alert"
          className="text-destructive grid gap-2 rounded-xl border p-4 text-sm"
        >
          <p>{contextError}</p>
          <Link href={publicRoutes.contact} className="underline">
            Allgemeine Anfrage starten
          </Link>
        </div>
      ) : vehicle ? (
        <div className="grid gap-2 rounded-xl border p-4 text-sm">
          <p>
            Fahrzeug:{" "}
            <Link
              href={routeBuilders.vehicleDetails(vehicle.slug)}
              className="font-bold underline"
            >
              {vehicle.make} {vehicle.model} {vehicle.variant}
            </Link>
          </p>
          {vehicle.inquiryType === "informational" ? (
            <p>
              Dieses Fahrzeug ist reserviert. Ihre Anfrage dient der
              Statusinformation, nicht einer Buchung.
            </p>
          ) : null}
          <Link href={publicRoutes.contact} className="underline">
            Ohne Fahrzeugbezug anfragen
          </Link>
        </div>
      ) : null}
      <div
        className="absolute -left-[10000px] size-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <fieldset
        disabled={isSubmitting || !enabled || Boolean(contextError)}
        className="grid min-w-0 gap-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="appointment-type"
            label={formContent.appointmentType}
            error={errors.appointmentType?.message}
          >
            <Controller
              name="appointmentType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="appointment-type"
                    aria-invalid={!!errors.appointmentType}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inquiryAppointmentTypes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            id="preferred-date"
            label={formContent.preferredDate}
            error={errors.preferredDate?.message}
          >
            <Controller
              name="preferredDate"
              control={control}
              render={({ field }) => (
                <div className="grid gap-2">
                  <DatePicker
                    id="preferred-date"
                    className="focus-visible:outline-none!"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.preferredDate}
                    minDate={new Date(`${dealershipDate()}T00:00:00`)}
                    placeholder="Wunschtermin auswählen"
                  />
                  {field.value ? (
                    <button
                      type="button"
                      className="text-muted-foreground text-left text-sm underline"
                      onClick={() => field.onChange("")}
                    >
                      Wunschtermin entfernen
                    </button>
                  ) : null}
                </div>
              )}
            />
          </Field>
          <Field
            id="contact-phone"
            label={formContent.phone}
            error={errors.phone?.message}
          >
            <input
              id="contact-phone"
              className="control focus-visible:outline-none!"
              type="tel"
              autoComplete="tel"
              maxLength={32}
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          </Field>
          <Field
            id="contact-name"
            label={formContent.name}
            error={errors.name?.message}
          >
            <input
              id="contact-name"
              className="control focus-visible:outline-none!"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </Field>
          <Field
            id="contact-email"
            label={formContent.email}
            error={errors.email?.message}
          >
            <input
              id="contact-email"
              className="control focus-visible:outline-none!"
              type="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>
        </div>
        <Field
          id="contact-message"
          label={formContent.message}
          error={errors.message?.message}
        >
          <textarea
            id="contact-message"
            className="control focus-visible:outline-none!"
            rows={5}
            {...register("message")}
          />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input
            className="mt-1 size-4 focus-visible:outline-none!"
            type="checkbox"
            {...register("consent")}
          />
          <span>{formContent.consent}</span>
        </label>
        {errors.consent && (
          <p className="text-destructive text-sm">{errors.consent.message}</p>
        )}
        <Button
          variant="accent"
          disabled={isSubmitting || !enabled || Boolean(contextError)}
          className="w-full justify-center rounded-[var(--radius-sm)] focus-visible:outline-none!"
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Send />}
          {isSubmitting
            ? "Wird gespeichert …"
            : enabled
              ? "Anfrage senden"
              : "Anfrage senden (noch nicht verfügbar)"}
        </Button>
      </fieldset>
    </form>
  );
}
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="text-destructive text-sm">{error}</span>}
    </div>
  );
}
