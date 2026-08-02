"use client";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleValuationSchema } from "../_schemas/vehicle-valuation.schema";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
type Values = z.infer<typeof vehicleValuationSchema>;
export function ValuationForm() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const {
    register,
    control,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(vehicleValuationSchema) });
  if (done)
    return (
      <div className="py-14 text-center">
        <div className="text-success text-5xl">✓</div>
        <h2 className="section-title mt-4">Bewertung angefragt</h2>
        <p className="text-muted-foreground mt-3">
          Wir prüfen Ihre Angaben und melden uns persönlich bei Ihnen.
        </p>
      </div>
    );
  return (
    <form onSubmit={handleSubmit(() => setDone(true))}>
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
              className="control"
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
              className="control"
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
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.firstRegistration}
                  placeholder="Monat und Jahr auswählen"
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
              className="control"
              {...register("mileage", { valueAsNumber: true })}
            />
          </Field>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-5">
          <Field id="vehicle-condition" label="Zustand">
            <select id="vehicle-condition" className="control">
              <option>Sehr gut</option>
              <option>Gut</option>
              <option>Gebrauchsspuren</option>
            </select>
          </Field>
          <Field id="accident-history" label="Unfallhistorie">
            <select id="accident-history" className="control">
              <option>Unfallfrei</option>
              <option>Reparierter Schaden</option>
            </select>
          </Field>
          <Field id="service-history" label="Servicehistorie">
            <select id="service-history" className="control">
              <option>Lückenlos</option>
              <option>Teilweise</option>
            </select>
          </Field>
        </div>
      )}
      {step === 3 && (
        <Field
          id="valuation-email"
          label="E-Mail"
          error={errors.email?.message}
        >
          <input
            id="valuation-email"
            type="email"
            className="control"
            {...register("email")}
          />
        </Field>
      )}
      <div className="mt-7 flex justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((value) => value - 1)}
        >
          Zurück
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            variant="accent"
            onClick={async () => {
              const valid =
                step !== 1 ||
                (await trigger([
                  "make",
                  "model",
                  "firstRegistration",
                  "mileage",
                ]));
              if (valid) setStep((value) => value + 1);
            }}
          >
            Weiter
          </Button>
        ) : (
          <Button type="submit" variant="accent">
            Bewertung anfragen
          </Button>
        )}
      </div>
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
