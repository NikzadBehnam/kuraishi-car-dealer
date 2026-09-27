"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formContent } from "@/content/de/forms";

import { submitPublicVehicleValuationAction } from "../actions";
import {
  vehicleValuationSchema,
  type VehicleValuationValues,
} from "../_schemas/vehicle-valuation.schema";

const conditionOptions = [
  { label: "Sehr gut", value: "very_good" },
  { label: "Gut", value: "good" },
  { label: "Gebrauchsspuren", value: "wear" },
] as const;

const accidentHistoryOptions = [
  { label: "Unfallfrei", value: "accident_free" },
  { label: "Reparierter Schaden", value: "repaired_damage" },
] as const;

const serviceHistoryOptions = [
  { label: "Lückenlos", value: "complete" },
  { label: "Teilweise", value: "partial" },
] as const;

export function ValuationForm() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const {
    register,
    control,
    trigger,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleValuationValues>({
    resolver: zodResolver(vehicleValuationSchema),
    defaultValues: {
      accidentHistory: "accident_free",
      condition: "very_good",
      consent: false,
      email: "",
      firstRegistration: "",
      make: "",
      model: "",
      name: "",
      phone: "",
      serviceHistory: "complete",
      website: "",
    },
  });

  const submit = async (values: VehicleValuationValues) => {
    const result = await submitPublicVehicleValuationAction(values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(
        result.error.fieldErrors ?? {},
      )) {
        if (field in values && messages[0]) {
          setError(field as keyof VehicleValuationValues, {
            message: messages[0],
            type: "server",
          });
        }
      }

      toast.error(
        result.error.code === "RATE_LIMITED"
          ? "Bitte warten Sie, bevor Sie eine weitere Bewertung anfragen."
          : "Ihre Bewertungsanfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
      );
      return;
    }

    setDone(true);
    toast.success("Ihre Bewertungsanfrage wurde erfolgreich gesendet.");
  };

  if (done) {
    return (
      <div className="py-14 text-center" role="status">
        <div className="text-success text-5xl">✓</div>
        <h2 className="section-title mt-4">Bewertung angefragt</h2>
        <p className="text-muted-foreground mt-3">
          Wir prüfen Ihre Angaben und melden uns persönlich bei Ihnen.
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <p className="eyebrow">Schritt {step} von 3</p>
      <div className="my-5 flex gap-2">
        {[1, 2, 3].map((value) => (
          <span
            className={`h-1.5 flex-1 rounded-full ${value <= step ? "bg-accent" : "bg-secondary"}`}
            key={value}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="valuation-make" label="Marke" error={errors.make?.message}>
            <input
              id="valuation-make"
              className="control focus-visible:outline-none!"
              aria-invalid={!!errors.make}
              disabled={isSubmitting}
              {...register("make")}
            />
          </Field>
          <Field
            id="valuation-model"
            label="Modell"
            error={errors.model?.message}
          >
            <input
              id="valuation-model"
              className="control focus-visible:outline-none!"
              aria-invalid={!!errors.model}
              disabled={isSubmitting}
              {...register("model")}
            />
          </Field>
          <Field
            id="first-registration"
            label="Erstzulassung"
            error={errors.firstRegistration?.message}
          >
            <Controller
              name="firstRegistration"
              control={control}
              render={({ field }) => (
                <MonthPicker
                  id="first-registration"
                  className="focus-visible:outline-none!"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.firstRegistration}
                  placeholder="Monat und Jahr auswählen"
                  disabled={isSubmitting}
                />
              )}
            />
          </Field>
          <Field
            id="valuation-mileage"
            label="Kilometerstand"
            error={errors.mileage?.message}
          >
            <input
              id="valuation-mileage"
              type="number"
              min={0}
              max={2_000_000}
              className="control focus-visible:outline-none!"
              aria-invalid={!!errors.mileage}
              disabled={isSubmitting}
              {...register("mileage", { valueAsNumber: true })}
            />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-5">
          <Field
            id="vehicle-condition"
            label="Zustand"
            error={errors.condition?.message}
          >
            <Controller
              name="condition"
              control={control}
              render={({ field }) => (
                <SimpleSelect
                  id="vehicle-condition"
                  value={field.value}
                  onValueChange={field.onChange}
                  items={conditionOptions}
                  disabled={isSubmitting}
                  invalid={!!errors.condition}
                />
              )}
            />
          </Field>
          <Field
            id="accident-history"
            label="Unfallhistorie"
            error={errors.accidentHistory?.message}
          >
            <Controller
              name="accidentHistory"
              control={control}
              render={({ field }) => (
                <SimpleSelect
                  id="accident-history"
                  value={field.value}
                  onValueChange={field.onChange}
                  items={accidentHistoryOptions}
                  disabled={isSubmitting}
                  invalid={!!errors.accidentHistory}
                />
              )}
            />
          </Field>
          <Field
            id="service-history"
            label="Servicehistorie"
            error={errors.serviceHistory?.message}
          >
            <Controller
              name="serviceHistory"
              control={control}
              render={({ field }) => (
                <SimpleSelect
                  id="service-history"
                  value={field.value}
                  onValueChange={field.onChange}
                  items={serviceHistoryOptions}
                  disabled={isSubmitting}
                  invalid={!!errors.serviceHistory}
                />
              )}
            />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="valuation-name"
              label="Name"
              error={errors.name?.message}
            >
              <input
                id="valuation-name"
                autoComplete="name"
                className="control focus-visible:outline-none!"
                aria-invalid={!!errors.name}
                disabled={isSubmitting}
                {...register("name")}
              />
            </Field>
            <Field
              id="valuation-email"
              label="E-Mail"
              error={errors.email?.message}
            >
              <input
                id="valuation-email"
                type="email"
                autoComplete="email"
                className="control focus-visible:outline-none!"
                aria-invalid={!!errors.email}
                disabled={isSubmitting}
                {...register("email")}
              />
            </Field>
          </div>
          <Field
            id="valuation-phone"
            label="Telefon (optional)"
            error={errors.phone?.message}
          >
            <input
              id="valuation-phone"
              type="tel"
              autoComplete="tel"
              className="control focus-visible:outline-none!"
              aria-invalid={!!errors.phone}
              disabled={isSubmitting}
              {...register("phone")}
            />
          </Field>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden"
          >
            <label htmlFor="valuation-website">Website</label>
            <input
              id="valuation-website"
              tabIndex={-1}
              autoComplete="off"
              {...register("website")}
            />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              className="mt-1 size-4 focus-visible:outline-none!"
              type="checkbox"
              disabled={isSubmitting}
              {...register("consent")}
            />
            <span>{formContent.consent}</span>
          </label>
          {errors.consent && (
            <p className="text-destructive text-sm">{errors.consent.message}</p>
          )}
        </div>
      )}

      <div className="mt-7 flex gap-2">
        <Button
          className="rounded-r"
          type="button"
          variant="outline"
          disabled={step === 1 || isSubmitting}
          onClick={() => setStep((value) => value - 1)}
        >
          <ArrowLeft />
          Zurück
        </Button>
        {step < 3 ? (
          <Button
            className="rounded-l"
            type="button"
            variant="accent"
            disabled={isSubmitting}
            onClick={async () => {
              const valid = await trigger(
                step === 1
                  ? ["make", "model", "firstRegistration", "mileage"]
                  : ["condition", "accidentHistory", "serviceHistory"],
              );

              if (valid) setStep((value) => value + 1);
            }}
          >
            Weiter
            <ArrowRight />
          </Button>
        ) : (
          <Button
            type="submit"
            variant="accent"
            className="rounded-l"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <ClipboardCheck />
            )}
            {isSubmitting ? "Wird gesendet …" : "Bewertung anfragen"}
          </Button>
        )}
      </div>
    </form>
  );
}

function SimpleSelect({
  id,
  items,
  value,
  onValueChange,
  disabled,
  invalid,
}: {
  id: string;
  items: ReadonlyArray<{ label: string; value: string }>;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
