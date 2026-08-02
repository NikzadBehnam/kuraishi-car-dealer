"use client";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  contactFormSchema,
  type ContactFormValues,
} from "../_schemas/contact-form.schema";
import { formContent } from "@/content/de/forms";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      appointmentType: "Probefahrt",
      message: "",
      consent: false,
    },
  });
  const submit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    setSubmitted(true);
    toast.success("Ihre Anfrage wurde erfolgreich gesendet.");
  };
  if (submitted)
    return (
      <div className="py-16 text-center" role="status">
        <div className="text-success text-5xl">✓</div>
        <h2 className="section-title mt-5">{formContent.successTitle}</h2>
        <p className="text-muted-foreground mt-3">
          {formContent.successDescription}
        </p>
      </div>
    );
  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="appointment-type"
          label={formContent.appointmentType}
          error={errors.appointmentType?.message}
        >
          <select
            id="appointment-type"
            className="control"
            {...register("appointmentType")}
          >
            <option>Probefahrt</option>
            <option>Beratung</option>
            <option>Finanzierung</option>
            <option>Fahrzeugbewertung</option>
            <option>Werkstatt</option>
            <option>Rückruf</option>
          </select>
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
              <DatePicker
                id="preferred-date"
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.preferredDate}
                minDate={new Date()}
                placeholder="Wunschtermin auswählen"
              />
            )}
          />
        </Field>
        <Field
          id="contact-name"
          label={formContent.name}
          error={errors.name?.message}
        >
          <input
            id="contact-name"
            className="control"
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
            className="control"
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
          className="control"
          rows={5}
          {...register("message")}
        />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input
          className="mt-1 size-4"
          type="checkbox"
          {...register("consent")}
        />
        <span>{formContent.consent}</span>
      </label>
      {errors.consent && (
        <p className="text-destructive text-sm">{errors.consent.message}</p>
      )}
      <Button variant="accent" disabled={isSubmitting}>
        {isSubmitting ? "Wird gesendet …" : "Anfrage senden"}
      </Button>
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
