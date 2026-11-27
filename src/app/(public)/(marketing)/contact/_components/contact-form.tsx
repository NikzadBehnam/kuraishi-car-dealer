"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import {
  contactFormSchema,
  type ContactFormValues,
} from "../_schemas/contact-form.schema";
import { formContent } from "@/content/de/forms";
import { dealershipDate } from "@/lib/business-date";
import { inquiryAppointmentTypes } from "@/lib/inquiry-validation";
import {
  inquiryServiceTopics,
  type InquiryServiceTopic,
} from "@/lib/inquiry-service-topics";
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
  initialServiceTopic,
}: {
  enabled: boolean;
  vehicle: PublicVehicleInquiryDTO | null;
  contextError: string | null;
  appointmentType: ContactFormValues["appointmentType"];
  initialServiceTopic?: InquiryServiceTopic;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [serviceTopic, setServiceTopic] = useState(initialServiceTopic);
  const retry = useRef<{ fingerprint: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
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
    if (!enabled || contextError || inFlight.current) return;
    inFlight.current = true;
    setSubmissionError(null);
    try {
      const payload = {
        fields,
        vehicleSlug: vehicle?.slug ?? null,
        serviceTopic,
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
      if (!response.ok) {
        if ([400, 409, 429].includes(response.status)) {
          const failure = z
            .object({ error: z.string() })
            .safeParse(await response.json());
          if (failure.success) {
            setSubmissionError(failure.data.error);
            return;
          }
        }
        setSubmissionError(
          "Ihre Anfrage konnte derzeit nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        );
        return;
      }
      z.strictObject({ ok: z.literal(true) }).parse(await response.json());
      reset();
      retry.current = null;
      setWebsite("");
      setSubmitted(true);
    } catch {
      setSubmissionError(
        "Wir konnten den Eingang Ihrer Anfrage nicht bestätigen. Bitte versuchen Sie es mit unveränderten Angaben erneut.",
      );
    } finally {
      inFlight.current = false;
    }
  };
  if (submitted) {
    return (
      <div className="py-12 text-center">
        <h3
          className="section-title"
          tabIndex={-1}
          ref={(heading) => heading?.focus()}
        >
          {formContent.successTitle}
        </h3>
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
      ) : (
        <p className="text-muted-foreground rounded-xl border p-4 text-sm">
          Nur für Testanfragen. Verwenden Sie fiktive Angaben und eine
          E-Mail-Adresse wie test@example.invalid. Geben Sie keine echten
          personenbezogenen Daten ein.
        </p>
      )}
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
      {!contextError && serviceTopic && (
        <p className="rounded-xl border p-4 text-sm">
          Servicethema:{" "}
          <strong>{inquiryServiceTopics[serviceTopic].title}</strong>
        </p>
      )}
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="appointment-type"
            label={formContent.appointmentType}
            error={errors.appointmentType?.message}
          >
            <Controller
              name="appointmentType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    if (
                      serviceTopic &&
                      value !==
                        inquiryServiceTopics[serviceTopic].appointmentType
                    ) {
                      setServiceTopic(undefined);
                    }
                    field.onChange(value);
                  }}
                >
                  <SelectTrigger
                    id="appointment-type"
                    ref={field.ref}
                    className="max-w-full min-w-0"
                    aria-required
                    {...validationProps(
                      "appointment-type",
                      errors.appointmentType?.message,
                    )}
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
                <div className="grid min-w-0 gap-2">
                  <DatePicker
                    id="preferred-date"
                    triggerRef={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    {...validationProps(
                      "preferred-date",
                      errors.preferredDate?.message,
                    )}
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
              className="control min-w-0"
              type="tel"
              autoComplete="tel"
              maxLength={32}
              {...validationProps("contact-phone", errors.phone?.message)}
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
              className="control min-w-0"
              autoComplete="name"
              aria-required
              {...validationProps("contact-name", errors.name?.message)}
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
              className="control min-w-0"
              type="email"
              autoComplete="email"
              aria-required
              {...validationProps("contact-email", errors.email?.message)}
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
            className="control min-w-0"
            rows={5}
            {...validationProps(
              "contact-message",
              errors.message?.message,
              "contact-message-limit",
            )}
            {...register("message")}
          />
          <p
            id="contact-message-limit"
            className="text-muted-foreground text-sm"
          >
            Bis zu 1.000 Zeichen.
          </p>
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input
            className="aria-invalid:outline-destructive mt-1 size-4 shrink-0 aria-invalid:outline"
            type="checkbox"
            aria-required
            {...validationProps("contact-consent", errors.consent?.message)}
            {...register("consent")}
          />
          <span>{formContent.consent}</span>
        </label>
        {errors.consent && (
          <p id="contact-consent-error" className="text-destructive text-sm">
            {errors.consent.message}
          </p>
        )}
        <div>
          <div role="alert" className="text-destructive text-sm">
            {submissionError ? (
              <p className="mb-3">
                {submissionError} Ihre Angaben bleiben im Formular erhalten.
              </p>
            ) : null}
          </div>
          <Button
            variant="accent"
            disabled={isSubmitting || !enabled || Boolean(contextError)}
            className="h-auto min-h-11 w-full justify-center rounded-[var(--radius-sm)] whitespace-normal"
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Send />
            )}
            {isSubmitting
              ? "Wird gespeichert …"
              : enabled
                ? "Anfrage senden"
                : "Anfrage senden (noch nicht verfügbar)"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
function validationProps(id: string, error?: string, hint?: string) {
  return {
    "aria-invalid": Boolean(error),
    "aria-describedby":
      [hint, error ? `${id}-error` : undefined].filter(Boolean).join(" ") ||
      undefined,
  };
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
    <div className="field min-w-0">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </span>
      )}
    </div>
  );
}
