"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BadgeCheck, Eye, LoaderCircle, Save } from "lucide-react";
import { useRef, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type DefaultValues,
  type SubmitErrorHandler,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { StaffInventoryVehicleDTO } from "@/types/inventory";
import { adminRoutes } from "@/config/admin-routes.config";
import { useVehiclePhotos, VehiclePhotosField } from "./vehicle-photos-field";
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from "../_schemas/vehicle-form.schema";
import {
  parseOptionalNumber,
  toCreateVehicleDraftPayload,
  toPublishVehiclePayload,
  toUpdateVehiclePayload,
} from "../_schemas/vehicle-form-payload";
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

const apiErrorResponseSchema = z.object({ error: z.string() });

const createVehicleResponseSchema = z.strictObject({
  vehicleId: z.string().min(1),
  version: z.number().int().positive(),
  photoIds: z.array(z.string()),
});
const publishVehicleResponseSchema = createVehicleResponseSchema.extend({
  created: z.boolean(),
});
const updateVehicleResponseSchema = createVehicleResponseSchema.extend({
  withdrawn: z.boolean(),
});

async function readApiResponse<T extends z.ZodType>(
  response: Response,
  schema: T,
): Promise<z.infer<T>> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    const error = apiErrorResponseSchema.safeParse(payload);
    throw new Error(
      error.success ? error.data.error : `Request failed (${response.status}).`,
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("The server returned an invalid response.");
  }
  return parsed.data;
}

const defaultValues: VehicleFormValues = {
  make: "",
  model: "",
  variant: "",
  stockNumber: "",
  slug: "",
  description: "",
  price: undefined,
  marginEstimate: undefined,
  firstRegistration: "",
  mileage: undefined,
  powerKw: undefined,
  fuelType: undefined,
  transmissionType: undefined,
  bodyType: undefined,
  exteriorColor: "",
  location: "",
  condition: undefined,
  ownerCount: undefined,
  vinLastSix: "",
  consumption: undefined,
  consumptionUnit: undefined,
  co2Emission: undefined,
  featuresText: "",
  labelsText: "",
  photoIds: [],
  status: "draft",
  inspectionStatus: "pending",
  isFeatured: false,
  isAvailable: false,
};

const formTabClassName =
  "min-h-9 flex-1 basis-[8.5rem] bg-secondary px-3 text-xs sm:flex-none sm:text-sm";

export function VehicleForm({
  mode,
  vehicle,
}: {
  mode: "create" | "edit";
  vehicle?: StaffInventoryVehicleDTO;
}) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle ? toFormValues(vehicle) : defaultValues,
  });

  const [tab, setTab] = useState("basics");
  const requestInFlight = useRef(false);
  const [navigating, setNavigating] = useState(false);
  const inspectionStatus = useWatch({ control, name: "inspectionStatus" });
  const photos = useVehiclePhotos(
    vehicle?.id,
    vehicle?.photoIds ?? [],
    (ids) => {
      setValue("photoIds", ids, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
  );
  const isUploading = photos.progress !== null;

  const busy = isSubmitting || isUploading || navigating;
  const showValidationError: SubmitErrorHandler<VehicleFormValues> = (
    issues,
  ) => {
    toast.error(
      Object.values(issues).find(({ message }) => message)?.message ??
        "Check the highlighted vehicle fields.",
    );
  };
  const submit = async (values: VehicleFormValues, preview = false) => {
    if (requestInFlight.current || isUploading) return;
    const payload =
      mode === "create"
        ? toCreateVehicleDraftPayload(values)
        : vehicle
          ? toUpdateVehiclePayload(values, vehicle.id, vehicle.version)
          : null;
    if (!payload) {
      toast.error("Vehicle details are unavailable.");
      return;
    }

    requestInFlight.current = true;
    try {
      const response = await fetch("/api/admin/vehicles", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readApiResponse(
        response,
        mode === "create"
          ? createVehicleResponseSchema
          : updateVehicleResponseSchema,
      );
      photos.markSaved();
      toast.success(
        "withdrawn" in result && result.withdrawn
          ? "Vehicle saved as a draft and removed from public listings."
          : mode === "create"
            ? "Vehicle draft saved."
            : "Vehicle updated.",
      );
      setNavigating(true);
      if (preview) {
        window.location.assign(
          `${adminRoutes.vehicles}/${encodeURIComponent(result.vehicleId)}/preview`,
        );
      } else {
        router.push(adminRoutes.vehicles);
      }
    } catch (error) {
      requestInFlight.current = false;
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save vehicle changes.",
      );
    }
  };

  const canPublish = mode === "create" || vehicle?.status === "draft";

  const publish = async (values: VehicleFormValues) => {
    if (requestInFlight.current || isUploading) return;
    if (values.inspectionStatus !== "passed") {
      setTab("publishing");
      toast.error("Set Inspection to Passed before publishing.");
      return;
    }
    if (mode === "edit" && (!vehicle || vehicle.status !== "draft")) {
      toast.error("Only a draft vehicle can be published from this form.");
      return;
    }

    const target =
      mode === "edit" && vehicle
        ? { vehicleId: vehicle.id, expectedVersion: vehicle.version }
        : undefined;
    const payload = toPublishVehiclePayload(values, target);

    requestInFlight.current = true;
    try {
      const response = await fetch("/api/admin/vehicles/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readApiResponse(
        response,
        publishVehicleResponseSchema,
      );
      photos.markSaved();
      toast.success(result.created ? "Vehicle published." : "Draft published.");
      setNavigating(true);
      router.push(adminRoutes.vehicles);
    } catch (error) {
      requestInFlight.current = false;
      toast.error(
        error instanceof Error ? error.message : "Could not publish vehicle.",
      );
    }
  };

  const title = mode === "create" ? "Add vehicle" : "Edit vehicle";

  return (
    <form
      onSubmit={(event) =>
        handleSubmit((values) => submit(values), showValidationError)(event)
      }
      className="grid min-w-0 gap-4"
    >
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
                {mode === "create"
                  ? "Draft save and publish"
                  : vehicle?.status === "draft"
                    ? "Draft edit and publish"
                    : "Edit saving enabled"}
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === "create"
                ? "Save an incomplete draft, or publish a complete listing with at least one photo."
                : vehicle?.status === "draft"
                  ? "Save draft changes, or publish the complete listing once Inspection is set to Passed."
                  : "Update vehicle details, photos, and applicable publishing settings."}
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col">
            {vehicle ? (
              <Button
                asChild
                variant="outline"
                className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              >
                <Link
                  href={`${adminRoutes.vehicles}/${encodeURIComponent(vehicle.id)}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye />
                  Preview saved version
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              disabled={busy}
              onClick={(event) =>
                handleSubmit(
                  (values) => submit(values, true),
                  showValidationError,
                )(event)
              }
            >
              {isSubmitting || navigating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Eye />
              )}
              Save and preview
            </Button>
            {mode === "create" && (
              <Button
                type="submit"
                variant="outline"
                className="w-full rounded-[var(--radius-sm)] sm:w-auto"
                disabled={busy}
              >
                <Save />
                Save draft
              </Button>
            )}
            {mode === "edit" && (
              <Button
                type="submit"
                variant="accent"
                className="w-full rounded-[var(--radius-sm)] sm:w-auto"
                disabled={busy}
              >
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <BadgeCheck />
                )}
                Update
              </Button>
            )}
            {canPublish && (
              <Button
                type="button"
                variant="accent"
                className="w-full rounded-[var(--radius-sm)] sm:w-auto"
                disabled={busy}
                onClick={(event) =>
                  handleSubmit(publish, showValidationError)(event)
                }
              >
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <BadgeCheck />
                )}
                Publish
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
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
            <TabsTrigger className={formTabClassName} value="photos">
              Photos
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
                <Input
                  {...register("slug")}
                  disabled={
                    Boolean(vehicle?.publishedAt) ||
                    ["published", "reserved", "sold"].includes(
                      vehicle?.status ?? "",
                    )
                  }
                />
              </Field>
              <Field label="Location" error={errors.location?.message}>
                <Input {...register("location")} />
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
                  min="0.01"
                  step="0.01"
                  {...register("price", { setValueAs: parseOptionalNumber })}
                />
              </Field>
              <Field
                label="Margin estimate"
                error={errors.marginEstimate?.message}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register("marginEstimate", {
                    setValueAs: parseOptionalNumber,
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
                <Input type="month" {...register("firstRegistration")} />
              </Field>
              <Field label="Mileage" error={errors.mileage?.message}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  {...register("mileage", { setValueAs: parseOptionalNumber })}
                />
              </Field>
              <Field label="Power kW" error={errors.powerKw?.message}>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register("powerKw", { setValueAs: parseOptionalNumber })}
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
                  min="0"
                  step="1"
                  {...register("ownerCount", {
                    setValueAs: parseOptionalNumber,
                  })}
                />
              </Field>
              <Field label="Consumption" error={errors.consumption?.message}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register("consumption", {
                    setValueAs: parseOptionalNumber,
                  })}
                />
              </Field>
              <SelectField
                label="Consumption unit"
                name="consumptionUnit"
                control={control}
                error={errors.consumptionUnit?.message}
                items={[
                  ["l_per_100_km", "L / 100 km"],
                  ["kwh_per_100_km", "kWh / 100 km"],
                ]}
              />
              <Field label="CO2 emission" error={errors.co2Emission?.message}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  {...register("co2Emission", {
                    setValueAs: parseOptionalNumber,
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

        <TabsContent value="photos">
          <Panel
            title="Photos"
            description="Add, reorder, or remove photos. The first photo is the cover. Changes are saved with the vehicle."
          >
            <VehiclePhotosField field={photos} disabled={busy} />
          </Panel>
        </TabsContent>

        <TabsContent value="publishing">
          <Panel
            title="Publishing"
            description={
              canPublish
                ? "Publishing is a separate action from saving a draft and enforces a complete listing, a passed inspection, and at least one photo."
                : "Use the vehicle list for status changes. Changing inspection can withdraw a public listing."
            }
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <SelectField
                label="Status"
                name="status"
                control={control}
                error={errors.status?.message}
                disabled
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
                disabled={busy}
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
                    label={
                      canPublish ? "Feature on publish" : "Featured vehicle"
                    }
                    description={
                      canPublish
                        ? "Save this choice with the draft. It takes effect only after publication."
                        : "Show this vehicle in featured sections while it is published."
                    }
                    checked={field.value}
                    disabled={
                      busy ||
                      (!canPublish && vehicle?.status !== "published") ||
                      (vehicle?.status === "published" &&
                        inspectionStatus !== "passed")
                    }
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                )}
              />
              <Controller
                control={control}
                name="isAvailable"
                render={({ field }) => (
                  <CheckboxField
                    label="Available"
                    description="Availability is derived from the vehicle's lifecycle status."
                    checked={field.value}
                    disabled
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                )}
              />
            </div>
            {(vehicle?.status === "published" ||
              vehicle?.status === "reserved") &&
              inspectionStatus !== "passed" && (
                <p role="status" className="mt-4 text-sm">
                  Saving this inspection status moves the vehicle to Draft and
                  removes it from public listings.
                </p>
              )}
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
  disabled = false,
  items,
}: {
  label: string;
  name: keyof VehicleFormValues;
  control: ReturnType<typeof useForm<VehicleFormValues>>["control"];
  error?: string;
  disabled?: boolean;
  items: Array<[string, string]>;
}) {
  return (
    <Field label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value == null ? "" : String(field.value)}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
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
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="bg-background flex min-h-24 min-w-0 items-start gap-3 rounded-[var(--radius-sm)] border p-4">
      <Checkbox
        checked={checked}
        className="shrink-0"
        disabled={disabled}
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

function toFormValues(
  vehicle: StaffInventoryVehicleDTO,
): DefaultValues<VehicleFormValues> {
  return {
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant ?? undefined,
    stockNumber: vehicle.stockNumber,
    slug: vehicle.slug,
    description: vehicle.description ?? undefined,
    price: vehicle.price === null ? undefined : Number(vehicle.price),
    marginEstimate:
      vehicle.marginEstimate === null
        ? undefined
        : Number(vehicle.marginEstimate),
    firstRegistration: vehicle.firstRegistration ?? undefined,
    mileage: vehicle.mileage ?? undefined,
    powerKw: vehicle.powerKw ?? undefined,
    fuelType: vehicle.fuelType ?? undefined,
    transmissionType: vehicle.transmissionType ?? undefined,
    bodyType: vehicle.bodyType ?? undefined,
    exteriorColor: vehicle.exteriorColor ?? undefined,
    location: vehicle.location ?? undefined,
    condition: vehicle.condition ?? undefined,
    ownerCount: vehicle.ownerCount ?? undefined,
    vinLastSix: vehicle.vinLastSix ?? undefined,
    consumption: vehicle.consumption ?? undefined,
    consumptionUnit: vehicle.consumptionUnit ?? undefined,
    co2Emission: vehicle.co2Emission ?? undefined,
    featuresText: vehicle.features.join("\n"),
    labelsText: vehicle.labels.join("\n"),
    status: vehicle.status,
    inspectionStatus: vehicle.inspectionStatus,
    isFeatured:
      vehicle.status === "draft"
        ? vehicle.featureOnPublish
        : vehicle.isFeatured,
    isAvailable: vehicle.status === "published",
    photoIds: vehicle.photoIds ?? [],
  };
}
