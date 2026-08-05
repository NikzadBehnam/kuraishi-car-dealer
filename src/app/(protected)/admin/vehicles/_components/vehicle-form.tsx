"use client";

import Image from "next/image";
import Link from "next/link";
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

import type { AdminVehicle } from "@/types/admin";
import { adminRoutes } from "@/config/admin-routes.config";
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
  location: "Wien",
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
  isAvailable: true,
};

const formTabClassName =
  "min-h-9 flex-1 basis-[8.5rem] bg-secondary px-3 text-xs sm:flex-none sm:text-sm";

export function VehicleForm({
  mode,
  vehicle,
}: {
  mode: "create" | "edit";
  vehicle?: AdminVehicle;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle ? toFormValues(vehicle) : defaultValues,
  });

  const submit = async (values: VehicleFormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    toast.success(
      `${values.make || "Vehicle"} ${mode === "create" ? "created" : "updated"} in UI-only mode.`,
    );
  };

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
              <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
                UI-only
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete inventory form ready for later backend integration.
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
              onClick={() => toast.info("Draft save is UI-only in this phase.")}
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
              {mode === "create" ? "Publish" : "Update"}
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="basics" className="min-w-0">
        <div className="min-w-0 rounded-[var(--radius-sm)] border bg-surface p-2">
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
              <Field label="Location" error={errors.location?.message}>
                <Input {...register("location")} />
              </Field>
              <Field label="Exterior color" error={errors.exteriorColor?.message}>
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
          <Panel title="Pricing" description="Commercial values for admin review.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Price" error={errors.price?.message}>
                <Input type="number" {...register("price", { valueAsNumber: true })} />
              </Field>
              <Field label="Margin estimate" error={errors.marginEstimate?.message}>
                <Input
                  type="number"
                  {...register("marginEstimate", { valueAsNumber: true })}
                />
              </Field>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="technical">
          <Panel title="Technical details" description="Specifications shown in vehicle detail views.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="First registration" error={errors.firstRegistration?.message}>
                <Input placeholder="2024-01" {...register("firstRegistration")} />
              </Field>
              <Field label="Mileage" error={errors.mileage?.message}>
                <Input type="number" {...register("mileage", { valueAsNumber: true })} />
              </Field>
              <Field label="Power kW" error={errors.powerKw?.message}>
                <Input type="number" {...register("powerKw", { valueAsNumber: true })} />
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
                  {...register("consumption", { valueAsNumber: true })}
                />
              </Field>
              <Field label="CO2 emission" error={errors.co2Emission?.message}>
                <Input
                  type="number"
                  {...register("co2Emission", { valueAsNumber: true })}
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
                className="grid min-h-56 place-items-center rounded-[var(--radius-sm)] border border-dashed bg-background p-6 text-center transition-colors hover:bg-surface-muted focus-visible:outline-none"
                onClick={() => toast.info("Upload is UI-only in this phase.")}
              >
                <span>
                  <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
                    <Upload className="size-6" aria-hidden="true" />
                  </span>
                  <span className="mt-4 block font-extrabold">
                    Drop vehicle images here
                  </span>
                  <span className="mt-2 block text-sm text-muted-foreground">
                    Mock upload zone for future media integration.
                  </span>
                </span>
              </button>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(vehicle?.images ?? []).map((image, index) => (
                  <div
                    key={image}
                    className="overflow-hidden rounded-[var(--radius-sm)] border bg-background"
                  >
                    <div className="relative aspect-[4/3] bg-secondary">
                      <Image
                        fill
                        sizes="(max-width: 768px) 50vw, 18rem"
                        src={image}
                        alt=""
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
                  <div className="grid min-h-44 place-items-center rounded-[var(--radius-sm)] border bg-background p-5 text-center">
                    <span>
                      <ImagePlus className="mx-auto size-8 text-muted-foreground" />
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
          <Panel title="Publishing" description="Visibility, workflow state, and quality gates.">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <SelectField
                label="Status"
                name="status"
                control={control}
                error={errors.status?.message}
                items={[
                  ["draft", "Draft"],
                  ["published", "Published"],
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
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <Controller
                control={control}
                name="isAvailable"
                render={({ field }) => (
                  <CheckboxField
                    label="Available"
                    description="Vehicle can be shown as available in listing UI."
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
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
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
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
    <label className="flex min-h-24 min-w-0 items-start gap-3 rounded-[var(--radius-sm)] border bg-background p-4">
      <Checkbox
        checked={checked}
        className="shrink-0"
        onCheckedChange={onCheckedChange}
      />
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

function toFormValues(vehicle: AdminVehicle): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    stockNumber: vehicle.stockNumber,
    slug: vehicle.slug,
    description: vehicle.description,
    price: vehicle.price,
    marginEstimate: vehicle.marginEstimate,
    firstRegistration: vehicle.firstRegistration,
    mileage: vehicle.mileage,
    powerKw: vehicle.powerKw,
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType,
    bodyType: vehicle.bodyType,
    exteriorColor: vehicle.exteriorColor,
    location: vehicle.location,
    condition: vehicle.condition,
    ownerCount: vehicle.ownerCount,
    vinLastSix: vehicle.vinLastSix,
    consumption: vehicle.consumption,
    co2Emission: vehicle.co2Emission,
    featuresText: vehicle.features.join("\n"),
    labelsText: vehicle.labels.join("\n"),
    status: vehicle.status,
    inspectionStatus: vehicle.inspectionStatus,
    isFeatured: vehicle.isFeatured,
    isAvailable: vehicle.isAvailable,
  };
}
