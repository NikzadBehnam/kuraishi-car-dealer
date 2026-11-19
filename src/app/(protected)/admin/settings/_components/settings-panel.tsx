"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Mail, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AdminDealershipSettingsDTO } from "@/types/dealership-settings";
import type { DealershipSettingsFields } from "@/lib/dealership-settings-validation";
import { cn } from "@/lib/utils";

import { saveDealershipSettingsAction } from "../actions";

const settingsTabClassName =
  "min-h-9 flex-1 basis-[8.5rem] bg-secondary px-3 text-xs sm:flex-none sm:text-sm";

function formValues(
  settings: AdminDealershipSettingsDTO,
): DealershipSettingsFields {
  return {
    name: settings.name,
    shortName: settings.shortName,
    tagline: settings.tagline,
    websiteUrl: settings.websiteUrl,
    description: settings.description,
    phone: settings.phone,
    email: settings.email,
    street: settings.street,
    postalCode: settings.postalCode,
    city: settings.city,
    country: settings.country,
    mapUrl: settings.mapUrl,
  };
}

export function SettingsPanel({
  settings,
}: {
  settings: AdminDealershipSettingsDTO;
}) {
  const router = useRouter();
  const [values, setValues] = useState(() => formValues(settings));
  const [version, setVersion] = useState(settings.version);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof DealershipSettingsFields, string>>
  >({});
  const [conflict, setConflict] = useState<AdminDealershipSettingsDTO | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field: keyof DealershipSettingsFields) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await saveDealershipSettingsAction({
        ...values,
        expectedVersion: version,
      });
      if (!result.ok) {
        if (result.kind === "invalid") {
          setFieldErrors(result.fieldErrors);
        } else if (result.kind === "conflict") {
          setConflict(result.settings);
        }
        toast.error(result.message);
        return;
      }

      setValues(formValues(result.settings));
      setVersion(result.settings.version);
      setFieldErrors({});
      setConflict(null);
      toast.success("Dealership settings saved.");
      router.refresh();
    } catch {
      toast.error("Dealership settings could not be saved. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      {conflict ? (
        <div
          className="border-destructive/50 bg-destructive/5 flex flex-col gap-3 rounded-[var(--radius-sm)] border p-4 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>
            Settings changed in another session. Reload the latest values before
            editing again.
          </p>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setValues(formValues(conflict));
              setVersion(conflict.version);
              setConflict(null);
              setFieldErrors({});
            }}
          >
            <RotateCcw />
            Reload latest settings
          </Button>
        </div>
      ) : null}
      <form className="grid min-w-0 gap-4" onSubmit={handleSubmit} noValidate>
        <Tabs defaultValue="dealership">
          <div className="bg-surface min-w-0 rounded-[var(--radius-sm)] border p-2">
            <TabsList className="flex h-auto min-h-0 w-full flex-wrap items-stretch justify-start gap-1 bg-transparent p-0">
              <TabsTrigger className={settingsTabClassName} value="dealership">
                Dealership
              </TabsTrigger>
              <TabsTrigger className={settingsTabClassName} value="contact">
                Contact
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dealership">
            <SettingsSection
              icon={Building2}
              title="Dealership"
              description="Public identity values for the dealership brand."
            >
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <Field id="name" label="Legal name" error={fieldErrors.name}>
                  <Input
                    id="name"
                    name="name"
                    value={values.name}
                    onChange={updateField("name")}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={
                      fieldErrors.name ? "name-error" : undefined
                    }
                  />
                </Field>
                <Field
                  id="shortName"
                  label="Short name"
                  error={fieldErrors.shortName}
                >
                  <Input
                    id="shortName"
                    name="shortName"
                    value={values.shortName}
                    onChange={updateField("shortName")}
                    aria-invalid={Boolean(fieldErrors.shortName)}
                    aria-describedby={
                      fieldErrors.shortName ? "shortName-error" : undefined
                    }
                  />
                </Field>
                <Field id="tagline" label="Tagline" error={fieldErrors.tagline}>
                  <Input
                    id="tagline"
                    name="tagline"
                    value={values.tagline}
                    onChange={updateField("tagline")}
                    aria-invalid={Boolean(fieldErrors.tagline)}
                    aria-describedby={
                      fieldErrors.tagline ? "tagline-error" : undefined
                    }
                  />
                </Field>
                <Field
                  id="websiteUrl"
                  label="Business website URL"
                  error={fieldErrors.websiteUrl}
                >
                  <div className="grid gap-2">
                    <Input
                      id="websiteUrl"
                      name="websiteUrl"
                      type="url"
                      value={values.websiteUrl}
                      onChange={updateField("websiteUrl")}
                      aria-invalid={Boolean(fieldErrors.websiteUrl)}
                      aria-describedby={
                        fieldErrors.websiteUrl ? "websiteUrl-error" : undefined
                      }
                    />
                    <p className="text-muted-foreground text-xs leading-5">
                      This business link does not change canonical URLs, the
                      sitemap origin, or authentication trusted domains.
                    </p>
                  </div>
                </Field>
                <Field
                  id="description"
                  label="Description"
                  className="md:col-span-2"
                  error={fieldErrors.description}
                >
                  <Textarea
                    id="description"
                    name="description"
                    rows={5}
                    value={values.description}
                    onChange={updateField("description")}
                    aria-invalid={Boolean(fieldErrors.description)}
                    aria-describedby={
                      fieldErrors.description ? "description-error" : undefined
                    }
                  />
                </Field>
              </div>
              <SaveBar
                disabled={isSaving || Boolean(conflict)}
                isSaving={isSaving}
              />
            </SettingsSection>
          </TabsContent>

          <TabsContent value="contact">
            <SettingsSection
              icon={Mail}
              title="Contact"
              description="Contact channels and address information shown across the UI."
            >
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <Field id="phone" label="Phone" error={fieldErrors.phone}>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={values.phone}
                    onChange={updateField("phone")}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={
                      fieldErrors.phone ? "phone-error" : undefined
                    }
                  />
                </Field>
                <Field id="email" label="Email" error={fieldErrors.email}>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={updateField("email")}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? "email-error" : undefined
                    }
                  />
                </Field>
                <Field id="street" label="Street" error={fieldErrors.street}>
                  <Input
                    id="street"
                    name="street"
                    value={values.street}
                    onChange={updateField("street")}
                    aria-invalid={Boolean(fieldErrors.street)}
                    aria-describedby={
                      fieldErrors.street ? "street-error" : undefined
                    }
                  />
                </Field>
                <Field
                  id="postalCode"
                  label="Postal code"
                  error={fieldErrors.postalCode}
                >
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={values.postalCode}
                    onChange={updateField("postalCode")}
                    aria-invalid={Boolean(fieldErrors.postalCode)}
                    aria-describedby={
                      fieldErrors.postalCode ? "postalCode-error" : undefined
                    }
                  />
                </Field>
                <Field id="city" label="City" error={fieldErrors.city}>
                  <Input
                    id="city"
                    name="city"
                    value={values.city}
                    onChange={updateField("city")}
                    aria-invalid={Boolean(fieldErrors.city)}
                    aria-describedby={
                      fieldErrors.city ? "city-error" : undefined
                    }
                  />
                </Field>
                <Field id="country" label="Country" error={fieldErrors.country}>
                  <Input
                    id="country"
                    name="country"
                    value={values.country}
                    onChange={updateField("country")}
                    aria-invalid={Boolean(fieldErrors.country)}
                    aria-describedby={
                      fieldErrors.country ? "country-error" : undefined
                    }
                  />
                </Field>
                <Field
                  id="mapUrl"
                  label="Map URL"
                  className="md:col-span-2"
                  error={fieldErrors.mapUrl}
                >
                  <Input
                    id="mapUrl"
                    name="mapUrl"
                    type="url"
                    value={values.mapUrl}
                    onChange={updateField("mapUrl")}
                    aria-invalid={Boolean(fieldErrors.mapUrl)}
                    aria-describedby={
                      fieldErrors.mapUrl ? "mapUrl-error" : undefined
                    }
                  />
                </Field>
              </div>
              <SaveBar
                disabled={isSaving || Boolean(conflict)}
                isSaving={isSaving}
              />
            </SettingsSection>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
        <span className="bg-secondary text-primary grid size-10 place-items-center rounded-[var(--radius-sm)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold">{title}</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            {description}
          </p>
        </div>
      </div>
      <Separator className="my-4" />
      {children}
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="min-w-0">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SaveBar({
  disabled,
  isSaving,
}: {
  disabled: boolean;
  isSaving: boolean;
}) {
  return (
    <div className="mt-5 flex flex-col border-t pt-4 sm:items-end">
      <Button
        type="submit"
        variant="accent"
        className="w-full max-w-full rounded-[var(--radius-sm)] text-center whitespace-normal sm:w-auto sm:whitespace-nowrap"
        disabled={disabled}
      >
        <Save aria-hidden="true" />
        {isSaving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
