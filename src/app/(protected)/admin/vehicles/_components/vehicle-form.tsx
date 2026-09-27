"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { adminRoutes } from "@/config/admin-routes.config";
import type { AdminVehicleDetailDto } from "@/features/vehicles/dto";
import type { VehicleWriteInput } from "@/features/vehicles/schemas";
import { createVehicleAction, updateVehicleAction } from "../actions";
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from "../_schemas/vehicle-form.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const defaultValues: VehicleFormValues = {
  make: "",
  model: "",
  variant: "",
  stockNumber: "KA-",
  slug: "",
  description: "",
  price: 0,
  marginEstimate: 0,
  firstRegistration: "",
  mileage: 0,
  powerKw: 1,
  fuelType: "petrol",
  transmissionType: "automatic",
  bodyType: "suv",
  exteriorColor: "",
  condition: "used",
  ownerCount: 1,
  vinLastSix: "",
  consumption: undefined,
  co2Emission: undefined,
  featuresText: "",
  labelsText: "",
  status: "draft",
  inspectionStatus: "pending",
  isFeatured: false,
};

const formTabClassName =
  "min-h-9 flex-1 basis-[8.5rem] bg-secondary px-3 text-xs sm:flex-none sm:text-sm";

type VehicleFormProps =
  | { mode: "create"; vehicle?: never }
  | { mode: "edit"; vehicle: AdminVehicleDetailDto };

export function VehicleForm(props: VehicleFormProps) {
  const { mode } = props;
  const vehicle = mode === "edit" ? props.vehicle : undefined;
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle ? toFormValues(vehicle) : defaultValues,
  });

  const submit = async (values: VehicleFormValues) => {
    const input = toVehicleWriteInput(values);
    const result =
      mode === "create"
        ? await createVehicleAction(input)
        : await updateVehicleAction({ id: vehicle.id, vehicle: input });

    if (!result.ok) {
      applyServerFieldErrors(result.error.fieldErrors, setError);
      toast.error(result.error.message);
      return;
    }

    toast.success(
      `${values.make || "Vehicle"} ${mode === "create" ? "created" : "updated"}.`,
    );
    router.push(adminRoutes.vehicles);
    router.refresh();
  };

  const saveDraft = handleSubmit((values) =>
    submit({ ...values, status: "draft" }),
  );

  const title = mode === "create" ? "Add vehicle" : "Edit vehicle";

  return (
    <form onSubmit={handleSubmit(submit)} className="grid min-w-0 gap-4">
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-[var(--radius-sm)]"
              >
                <Link href={adminRoutes.vehicles}>
                  <ArrowLeft />
                  Back
                </Link>
              </Button>
              <Badge className="bg-success/10 text-success">
                Database-backed
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Vehicle details are validated and saved to the inventory database.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => toast.info("Preview is UI-only in this phase.")}
            >
              <Eye />
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={saveDraft}
              disabled={isSubmitting}
            >
              <Save />
              Save draft
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <BadgeCheck />
              )}
              {mode === "create" ? "Create vehicle" : "Update vehicle"}
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="basics" className="min-w-0">
        <div className="bg-surface min-w-0 rounded-[var(--radius-sm)] border p-2">
          <TabsList className="flex h-auto min-h-0 w-full flex-wrap items-stretch justify-start gap-1 bg-transparent p-0">
            <TabsTrigger className={formTabClassName} value="basics">
              Basics
            </TabsTrigger>
            <TabsTrigger className={formTabClassName} value="pricing">
              Pricing
            </TabsTrigger>
            <TabsTrigger className={formTabClassName} value="technical">
              Technical details
            </TabsTrigger>
            <TabsTrigger className={formTabClassName} value="features">
              Features
            </TabsTrigger>
            <TabsTrigger className={formTabClassName} value="media">
              Media
            </TabsTrigger>
            <TabsTrigger className={formTabClassName} value="publishing">
              Publishing
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basics">
          <Panel title="Basics" description="Core listing identity and copy.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Make" error={errors.make?.message}>
                <Input {...register("make")} />
              </Field>
              <Field label="Model" error={errors.model?.message}>
                <Input {...register("model")} />
              </Field>
              <Field label="Variant" error={errors.variant?.message}>
                <Input {...register("variant")} />
              </Field>
              <Field label="Stock number" error={errors.stockNumber?.message}>
                <Input {...register("stockNumber")} />
              </Field>
              <Field label="Slug" error={errors.slug?.message}>
                <Input {...register("slug")} />
              </Field>
              <Field
                label="Exterior color"
                error={errors.exteriorColor?.message}
              >
                <Input {...register("exteriorColor")} />
              </Field>
              <SelectField
                label="Condition"
                name="condition"
                control={control}
                error={errors.condition?.message}
                items={[
                  ["used", "Used"],
                  ["demonstrator", "Demonstrator"],
                  ["annual", "Annual car"],
                ]}
              />
            </div>
            <Field label="Description" error={errors.description?.message}>
              <Textarea rows={5} {...register("description")} />
            </Field>
          </Panel>
        </TabsContent>

        <TabsContent value="pricing">
          <Panel
            title="Pricing"
            description="Commercial values for admin review."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Price" error={errors.price?.message}>
                <Input
                  type="number"
                  step="0.01"
                  {...register("price", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Margin estimate"
                error={errors.marginEstimate?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  {...register("marginEstimate", {
                    setValueAs: optionalNumberValue,
                  })}
                />
              </Field>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="technical">
          <Panel
            title="Technical details"
            description="Specifications shown in vehicle detail views."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field
                label="First registration"
                error={errors.firstRegistration?.message}
              >
                <Input
                  placeholder="2024-01"
                  {...register("firstRegistration")}
                />
              </Field>
              <Field label="Mileage" error={errors.mileage?.message}>
                <Input
                  type="number"
                  {...register("mileage", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Power kW" error={errors.powerKw?.message}>
                <Input
                  type="number"
                  {...register("powerKw", { valueAsNumber: true })}
                />
              </Field>
              <Field label="VIN last six" error={errors.vinLastSix?.message}>
                <Input maxLength={6} {...register("vinLastSix")} />
              </Field>
              <SelectField
                label="Fuel"
                name="fuelType"
                control={control}
                error={errors.fuelType?.message}
                items={[
                  ["petrol", "Petrol"],
                  ["diesel", "Diesel"],
                  ["electric", "Electric"],
                  ["hybrid", "Hybrid"],
                ]}
              />
              <SelectField
                label="Transmission"
                name="transmissionType"
                control={control}
                error={errors.transmissionType?.message}
                items={[
                  ["automatic", "Automatic"],
                  ["manual", "Manual"],
                ]}
              />
              <SelectField
                label="Body type"
                name="bodyType"
                control={control}
                error={errors.bodyType?.message}
                items={[
                  ["suv", "SUV"],
                  ["compact", "Compact"],
                  ["sedan", "Sedan"],
                  ["wagon", "Wagon"],
                  ["van", "Van"],
                  ["sports", "Sports"],
                ]}
              />
              <Field label="Owners" error={errors.ownerCount?.message}>
                <Input
                  type="number"
                  {...register("ownerCount", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Consumption" error={errors.consumption?.message}>
                <Input
                  type="number"
                  step="0.1"
                  {...register("consumption", {
                    setValueAs: optionalNumberValue,
                  })}
                />
              </Field>
              <Field label="CO2 emission" error={errors.co2Emission?.message}>
                <Input
                  type="number"
                  {...register("co2Emission", {
                    setValueAs: optionalNumberValue,
                  })}
                />
              </Field>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="features">
          <Panel title="Features" description="One feature or label per line.">
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <Field label="Features" error={errors.featuresText?.message}>
                <Textarea rows={9} {...register("featuresText")} />
              </Field>
              <Field label="Labels" error={errors.labelsText?.message}>
                <Textarea rows={9} {...register("labelsText")} />
              </Field>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="media">
          <Panel title="Media" description="Mock image upload and ordering UI.">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <button
                type="button"
                className="bg-background hover:bg-surface-muted grid min-h-56 place-items-center rounded-[var(--radius-sm)] border border-dashed p-6 text-center transition-colors focus-visible:outline-none"
                onClick={() => toast.info("Upload is UI-only in this phase.")}
              >
                <span>
                  <span className="bg-secondary text-primary mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)]">
                    <Upload className="size-6" aria-hidden="true" />
                  </span>
                  <span className="mt-4 block font-extrabold">
                    Drop vehicle images here
                  </span>
                  <span className="text-muted-foreground mt-2 block text-sm">
                    Mock upload zone for future media integration.
                  </span>
                </span>
              </button>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(vehicle?.images ?? []).map((image, index) => (
                  <div
                    key={image.id}
                    className="bg-background overflow-hidden rounded-[var(--radius-sm)] border"
                  >
                    <div className="bg-secondary relative aspect-[4/3]">
                      <Image
                        fill
                        sizes="(max-width: 768px) 50vw, 18rem"
                        src={image.url}
                        alt={image.altText}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
                        Image {index + 1}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Reorder image"
                          onClick={() => toast.info("Reorder is UI-only.")}
                        >
                          <GripVertical />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove image"
                          onClick={() => toast.info("Remove is UI-only.")}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!vehicle?.images.length && (
                  <div className="bg-background grid min-h-44 place-items-center rounded-[var(--radius-sm)] border p-5 text-center">
                    <span>
                      <ImagePlus className="text-muted-foreground mx-auto size-8" />
                      <span className="mt-3 block text-sm font-bold">
                        No images yet
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="publishing">
          <Panel
            title="Publishing"
            description="Visibility, workflow state, and quality gates."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <SelectField
                label="Status"
                name="status"
                control={control}
                error={errors.status?.message}
                items={[
                  ["draft", "Draft"],
                  ["available", "Available"],
                  ["reserved", "Reserved"],
                  ["sold", "Sold"],
                  ["archived", "Archived"],
                ]}
              />
              <SelectField
                label="Inspection"
                name="inspectionStatus"
                control={control}
                error={errors.inspectionStatus?.message}
                items={[
                  ["pending", "Pending"],
                  ["in_progress", "In progress"],
                  ["passed", "Passed"],
                  ["failed", "Failed"],
                ]}
              />
              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <CheckboxField
                    label="Featured vehicle"
                    description="Show this vehicle in highlighted admin and public sections."
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                )}
              />
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </form>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <div>
        <h3 className="text-base font-extrabold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <Separator className="my-4" />
      <div className="grid min-w-0 gap-4">{children}</div>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label>{label}</Label>
      {children}
      {error && (
        <p className="text-destructive text-sm font-semibold">{error}</p>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  control,
  error,
  items,
}: {
  label: string;
  name: keyof VehicleFormValues;
  control: ReturnType<typeof useForm<VehicleFormValues>>["control"];
  error?: string;
  items: Array<[string, string]>;
}) {
  return (
    <Field label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={String(field.value)} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map(([value, itemLabel]) => (
                <SelectItem key={value} value={value}>
                  {itemLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

function CheckboxField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="bg-background flex min-h-24 min-w-0 items-start gap-3 rounded-[var(--radius-sm)] border p-4">
      <Checkbox
        checked={checked}
        className="shrink-0"
        onCheckedChange={onCheckedChange}
      />
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{label}</span>
        <span className="text-muted-foreground mt-1 block text-sm leading-6">
          {description}
        </span>
      </span>
    </label>
  );
}

function toFormValues(vehicle: AdminVehicleDetailDto): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    stockNumber: vehicle.stockNumber,
    slug: vehicle.slug,
    description: vehicle.description,
    price: vehicle.priceCents / 100,
    marginEstimate:
      vehicle.marginEstimateCents === null
        ? undefined
        : vehicle.marginEstimateCents / 100,
    firstRegistration: vehicle.firstRegistration,
    mileage: vehicle.mileage,
    powerKw: vehicle.powerKw,
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType,
    bodyType: vehicle.bodyType,
    exteriorColor: vehicle.exteriorColor,
    condition: vehicle.condition,
    ownerCount: vehicle.ownerCount,
    vinLastSix: vehicle.vinLastSix,
    consumption: vehicle.consumption ?? undefined,
    co2Emission: vehicle.co2Emission ?? undefined,
    featuresText: vehicle.features.join("\n"),
    labelsText: vehicle.labels.join("\n"),
    status: vehicle.status,
    inspectionStatus: vehicle.inspectionStatus,
    isFeatured: vehicle.isFeatured,
  };
}

function toVehicleWriteInput(values: VehicleFormValues): VehicleWriteInput {
  return {
    bodyType: values.bodyType,
    co2Emission: values.co2Emission ?? null,
    condition: values.condition,
    consumption: values.consumption ?? null,
    description: values.description,
    exteriorColor: values.exteriorColor,
    features: splitLines(values.featuresText),
    firstRegistration: values.firstRegistration,
    fuelType: values.fuelType,
    inspectionStatus: values.inspectionStatus,
    isFeatured: values.isFeatured,
    labels: splitLines(values.labelsText ?? ""),
    make: values.make,
    marginEstimateCents:
      values.marginEstimate === undefined
        ? null
        : Math.round(values.marginEstimate * 100),
    mileage: values.mileage,
    model: values.model,
    ownerCount: values.ownerCount,
    powerKw: values.powerKw,
    priceCents: Math.round(values.price * 100),
    slug: values.slug,
    status: values.status,
    stockNumber: values.stockNumber,
    transmissionType: values.transmissionType,
    variant: values.variant,
    vinLastSix: values.vinLastSix,
  };
}

function splitLines(value: string) {
  return value.split(/\r?\n/gu).map((line) => line.trim());
}

function optionalNumberValue(value: string) {
  return value === "" ? undefined : Number(value);
}

const serverFieldNames: Partial<Record<string, keyof VehicleFormValues>> = {
  features: "featuresText",
  labels: "labelsText",
  marginEstimateCents: "marginEstimate",
  priceCents: "price",
  stockNumber: "stockNumber",
  slug: "slug",
};

function applyServerFieldErrors(
  fieldErrors: Record<string, string[]> | undefined,
  setError: ReturnType<typeof useForm<VehicleFormValues>>["setError"],
) {
  if (!fieldErrors) return;

  for (const [serverField, messages] of Object.entries(fieldErrors)) {
    const formField =
      serverFieldNames[serverField] ??
      (serverField in defaultValues
        ? (serverField as keyof VehicleFormValues)
        : undefined);

    if (formField && messages[0]) {
      setError(formField, { message: messages[0], type: "server" });
    }
  }
}
