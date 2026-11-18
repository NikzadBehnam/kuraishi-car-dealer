"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  BadgeCheck,
  Eye,
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type DefaultValues } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { StaffInventoryVehicleDTO } from "@/types/inventory";
import { adminRoutes } from "@/config/admin-routes.config";
import { MAX_MEDIA_FILES_PER_REQUEST } from "@/lib/media-upload-validation";
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from "../_schemas/vehicle-form.schema";
import {
  parseOptionalNumber,
  toCreateVehicleDraftPayload,
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

const uploadIntentResponseSchema = z.strictObject({
  uploads: z.array(
    z.strictObject({
      uploadId: z.string().uuid(),
      url: z.string().url(),
      method: z.literal("POST"),
      fields: z.record(z.string(), z.string()),
    }),
  ),
  cleanup: z.strictObject({
    scanned: z.number(),
    cleaned: z.number(),
    failed: z.number(),
  }),
});

const completedUploadResponseSchema = z.strictObject({
  asset: z.strictObject({
    id: z.string(),
    title: z.string(),
    originalFilename: z.string(),
    verifiedMimeType: z.enum(["image/jpeg", "image/png"]),
    sizeBytes: z.number(),
    uploadedAt: z.string(),
  }),
  cleanupPending: z.boolean(),
});

const cancellationResponseSchema = z.strictObject({
  cancelled: z.boolean(),
  cleanupPending: z.boolean(),
});

const attachableAssetsResponseSchema = z.strictObject({
  assets: z.array(
    z.strictObject({
      id: z.string(),
      title: z.string(),
      filename: z.string(),
      altText: z.string().nullable(),
      sizeBytes: z.number(),
      uploadedAt: z.string(),
      previewUrl: z.string().url(),
    }),
  ),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
});

const apiErrorResponseSchema = z.object({ error: z.string() });

const createVehicleResponseSchema = z.strictObject({
  vehicleId: z.string().min(1),
  version: z.number().int().positive(),
  mediaAssetIds: z.array(z.string()),
});

const vehicleMediaAssetsResponseSchema = z.strictObject({
  assets: z.array(
    z.strictObject({
      id: z.string(),
      title: z.string(),
      altText: z.string().nullable(),
      previewUrl: z.string().url(),
    }),
  ),
});

type UploadIntent = z.infer<
  typeof uploadIntentResponseSchema
>["uploads"][number];
type AttachableAsset = z.infer<
  typeof attachableAssetsResponseSchema
>["assets"][number];
type VehicleMediaItem = {
  key: string;
  mediaAssetId: string | null;
  previewUrl: string | null;
  title: string;
  altText: string;
};

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
  mediaAssetIds: [],
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

  const [mediaItems, setMediaItems] = useState<VehicleMediaItem[]>(() =>
    (vehicle?.mediaAssetIds ?? []).map((mediaAssetId, index) => ({
      key: mediaAssetId,
      mediaAssetId,
      previewUrl: null,
      title: `Image ${index + 1}`,
      altText: "",
    })),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetLoadError, setAssetLoadError] = useState("");
  const [attachableAssets, setAttachableAssets] = useState<AttachableAsset[]>(
    [],
  );
  const [assetPage, setAssetPage] = useState(1);
  const [hasMoreAssets, setHasMoreAssets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const vehicleId = vehicle?.id;

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (mode !== "edit" || !vehicleId) return;

    let active = true;
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/media`,
          { cache: "no-store" },
        );
        const result = await readApiResponse(
          response,
          vehicleMediaAssetsResponseSchema,
        );
        if (!active) return;

        const assetsById = new Map(
          result.assets.map((asset) => [asset.id, asset]),
        );
        setMediaItems((current) =>
          current.map((item) => {
            const asset = item.mediaAssetId
              ? assetsById.get(item.mediaAssetId)
              : undefined;
            return asset
              ? {
                  ...item,
                  previewUrl: asset.previewUrl,
                  title: asset.title,
                  altText: asset.altText ?? "",
                }
              : item;
          }),
        );
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load vehicle images.",
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [mode, vehicleId]);

  const setOrderedMediaItems = (items: VehicleMediaItem[]) => {
    setMediaItems(items);
    setValue(
      "mediaAssetIds",
      items.flatMap((item) => (item.mediaAssetId ? [item.mediaAssetId] : [])),
      { shouldDirty: true, shouldTouch: true, shouldValidate: true },
    );
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (files.length > MAX_MEDIA_FILES_PER_REQUEST) {
      toast.error(
        `Upload no more than ${MAX_MEDIA_FILES_PER_REQUEST} images at a time.`,
      );
      return;
    }
    if (mediaItems.length + files.length > 20) {
      toast.error("A vehicle can have at most 20 images.");
      return;
    }

    setIsUploading(true);
    let uploads: UploadIntent[] = [];
    const completedUploadIds = new Set<string>();
    const uploadedItems: VehicleMediaItem[] = [];
    let cleanupPending = false;

    try {
      const intentResponse = await fetch("/api/admin/media/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((file) => ({
            originalFilename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            type: "image",
          })),
        }),
      });
      const intentResult = await readApiResponse(
        intentResponse,
        uploadIntentResponseSchema,
      );
      uploads = intentResult.uploads;
      if (uploads.length !== files.length) {
        throw new Error("The server returned an incomplete upload batch.");
      }
      if (intentResult.cleanup.failed > 0) {
        toast.info(
          "Some expired uploads still need cleanup; the new uploads can continue.",
        );
      }

      for (const [index, upload] of uploads.entries()) {
        const formData = new FormData();
        for (const [name, value] of Object.entries(upload.fields)) {
          formData.set(name, value);
        }
        formData.set("file", files[index], files[index].name);
        const storageResponse = await fetch(upload.url, {
          method: upload.method,
          body: formData,
        });
        if (!storageResponse.ok) {
          throw new Error(
            `Storage rejected ${files[index].name} (${storageResponse.status}).`,
          );
        }

        const completionResponse = await fetch(
          "/api/admin/media/uploads/complete",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId: upload.uploadId }),
          },
        );
        const completion = await readApiResponse(
          completionResponse,
          completedUploadResponseSchema,
        );
        completedUploadIds.add(upload.uploadId);
        cleanupPending ||= completion.cleanupPending;
        const previewUrl = URL.createObjectURL(files[index]);
        objectUrlsRef.current.add(previewUrl);
        uploadedItems.push({
          key: completion.asset.id,
          mediaAssetId: completion.asset.id,
          previewUrl,
          title: completion.asset.title,
          altText: "",
        });
      }

      setOrderedMediaItems([...mediaItems, ...uploadedItems]);
      if (cleanupPending) {
        toast.info(
          "Upload completed; staging-object cleanup is pending a later cleanup retry.",
        );
      }
      toast.success(
        "Images uploaded as private assets. They will be attached when the vehicle is saved.",
      );
    } catch (error) {
      for (const [index, upload] of uploads.entries()) {
        if (completedUploadIds.has(upload.uploadId)) continue;
        try {
          const cancellationResponse = await fetch(
            "/api/admin/media/uploads/cancel",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uploadId: upload.uploadId }),
            },
          );
          if (cancellationResponse.status === 409) {
            const file = files[index];
            if (!file) {
              cleanupPending = true;
              continue;
            }
            try {
              const retryResponse = await fetch(
                "/api/admin/media/uploads/complete",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ uploadId: upload.uploadId }),
                },
              );
              const retry = await readApiResponse(
                retryResponse,
                completedUploadResponseSchema,
              );
              completedUploadIds.add(upload.uploadId);
              cleanupPending ||= retry.cleanupPending;
              const previewUrl = URL.createObjectURL(file);
              objectUrlsRef.current.add(previewUrl);
              uploadedItems.push({
                key: retry.asset.id,
                mediaAssetId: retry.asset.id,
                previewUrl,
                title: retry.asset.title,
                altText: "",
              });
            } catch (recoveryError) {
              cleanupPending = true;
              console.error(
                "Could not reconcile an interrupted media upload.",
                {
                  uploadId: upload.uploadId,
                  errorType:
                    recoveryError instanceof Error
                      ? recoveryError.name
                      : "UnknownError",
                },
              );
            }
            continue;
          }
          const cancellation = await readApiResponse(
            cancellationResponse,
            cancellationResponseSchema,
          );
          cleanupPending ||= cancellation.cleanupPending;
        } catch (cleanupError) {
          cleanupPending = true;
          console.error("Could not cancel an incomplete media upload.", {
            uploadId: upload.uploadId,
            errorType:
              cleanupError instanceof Error
                ? cleanupError.name
                : "UnknownError",
          });
        }
      }

      if (uploadedItems.length > 0) {
        setOrderedMediaItems([...mediaItems, ...uploadedItems]);
        toast.info(
          `${uploadedItems.length} image(s) were uploaded and remain unattached.`,
        );
      }
      if (cleanupPending) {
        toast.info(
          "Some upload cleanup failed and will be retried during a later upload or cleanup sweep.",
        );
      }
      toast.error(
        error instanceof Error ? error.message : "The image upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const loadAttachableAssets = async (page: number, replace = false) => {
    setIsLoadingAssets(true);
    setAssetLoadError("");
    try {
      const response = await fetch(
        `/api/admin/media/attachable?page=${page}&pageSize=24`,
        { cache: "no-store" },
      );
      const result = await readApiResponse(
        response,
        attachableAssetsResponseSchema,
      );
      setAttachableAssets((current) =>
        replace ? result.assets : [...current, ...result.assets],
      );
      setAssetPage(result.page);
      setHasMoreAssets(result.hasMore);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not load attachable images.";
      setAssetLoadError(message);
      toast.error(message);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const submit = async (values: VehicleFormValues) => {
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

    try {
      const response = await fetch("/api/admin/vehicles", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await readApiResponse(response, createVehicleResponseSchema);
      toast.success(
        mode === "create" ? "Vehicle draft saved." : "Vehicle updated.",
      );
      router.push(adminRoutes.vehicles);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save vehicle changes.",
      );
    }
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
                {mode === "create"
                  ? "Draft saving enabled"
                  : "Edit saving enabled"}
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === "create"
                ? "New vehicles are saved as drafts. Publishing is not available yet."
                : "Saving updates vehicle details and images without changing its lifecycle state."}
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
            {mode === "create" && (
              <Button
                type="submit"
                variant="outline"
                className="w-full rounded-[var(--radius-sm)] sm:w-auto"
                disabled={isSubmitting || isUploading}
              >
                <Save />
                Save draft
              </Button>
            )}
            <Button
              type={mode === "create" ? "button" : "submit"}
              variant="accent"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              disabled={mode === "create" || isSubmitting || isUploading}
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

        <TabsContent value="media">
          <Panel
            title="Media"
            description="Uploads become private assets immediately. Selected image IDs stay ordered and are attached when the vehicle is saved. Removing an image detaches it without deleting the asset; attaching it does not approve public access."
          >
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="grid min-w-0 content-start gap-3">
                <div className="bg-background grid min-h-56 place-items-center rounded-[var(--radius-sm)] border border-dashed p-6 text-center">
                  <div>
                    <span className="bg-secondary text-primary mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)]">
                      {isUploading ? (
                        <LoaderCircle
                          className="size-6 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Upload className="size-6" aria-hidden="true" />
                      )}
                    </span>
                    <span className="mt-4 block font-extrabold">
                      Upload vehicle images
                    </span>
                    <span className="text-muted-foreground mt-2 block text-sm">
                      JPEG or PNG, up to 10 MiB each; five files per upload and
                      20 images per vehicle.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      disabled={isUploading || mediaItems.length >= 20}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose images
                    </Button>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      className="sr-only"
                      aria-label="Upload vehicle images"
                      onChange={(event) => {
                        const files = Array.from(
                          event.currentTarget.files ?? [],
                        );
                        event.currentTarget.value = "";
                        void uploadFiles(files);
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={isAssetPickerOpen}
                  aria-controls="attachable-media-assets"
                  disabled={isUploading}
                  onClick={() => {
                    const shouldOpen = !isAssetPickerOpen;
                    setIsAssetPickerOpen(shouldOpen);
                    if (shouldOpen && attachableAssets.length === 0) {
                      void loadAttachableAssets(1, true);
                    }
                  }}
                >
                  {isAssetPickerOpen
                    ? "Hide existing images"
                    : "Choose existing image"}
                </Button>
                {isAssetPickerOpen && (
                  <div
                    id="attachable-media-assets"
                    className="bg-background grid min-w-0 gap-3 rounded-[var(--radius-sm)] border p-3"
                    aria-live="polite"
                  >
                    {isLoadingAssets && (
                      <p className="text-muted-foreground text-sm">
                        Loading images…
                      </p>
                    )}
                    {assetLoadError && (
                      <p role="alert" className="text-destructive text-sm">
                        {assetLoadError}
                      </p>
                    )}
                    {attachableAssets
                      .filter(
                        (asset) =>
                          !mediaItems.some(
                            (item) => item.mediaAssetId === asset.id,
                          ),
                      )
                      .map((asset) => (
                        <div
                          key={asset.id}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <div className="bg-secondary relative size-16 shrink-0 overflow-hidden rounded border">
                            <Image
                              fill
                              sizes="4rem"
                              src={asset.previewUrl}
                              alt={asset.altText ?? asset.title}
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">
                              {asset.title}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {asset.filename}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={mediaItems.length >= 20}
                            onClick={() => {
                              setOrderedMediaItems([
                                ...mediaItems,
                                {
                                  key: asset.id,
                                  mediaAssetId: asset.id,
                                  previewUrl: asset.previewUrl,
                                  title: asset.title,
                                  altText: asset.altText ?? "",
                                },
                              ]);
                            }}
                          >
                            Attach
                          </Button>
                        </div>
                      ))}
                    {!isLoadingAssets &&
                      !assetLoadError &&
                      attachableAssets.every((asset) =>
                        mediaItems.some(
                          (item) => item.mediaAssetId === asset.id,
                        ),
                      ) && (
                        <p className="text-muted-foreground text-sm">
                          No unselected images are available on this page.
                        </p>
                      )}
                    {hasMoreAssets && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isLoadingAssets}
                        onClick={() => void loadAttachableAssets(assetPage + 1)}
                      >
                        Load more images
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {mediaItems.map((item, index) => {
                  const attachedPosition = item.mediaAssetId
                    ? mediaItems
                        .slice(0, index + 1)
                        .filter((candidate) => candidate.mediaAssetId).length
                    : null;
                  return (
                    <div
                      key={item.key}
                      className="bg-background overflow-hidden rounded-[var(--radius-sm)] border"
                    >
                      <div className="bg-secondary relative aspect-[4/3]">
                        {item.previewUrl ? (
                          <Image
                            fill
                            sizes="(max-width: 768px) 50vw, 18rem"
                            src={item.previewUrl}
                            alt={item.altText || item.title}
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div
                            role="img"
                            aria-label={`${item.title} preview unavailable`}
                            className="text-muted-foreground grid h-full place-items-center gap-2 p-3 text-center text-xs"
                          >
                            <ImagePlus className="size-6" aria-hidden="true" />
                            {item.title}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2">
                        <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
                          {attachedPosition === 1
                            ? "Cover"
                            : `Image ${attachedPosition ?? index + 1}`}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Move image ${index + 1} up`}
                            disabled={index === 0 || isUploading}
                            onClick={() => {
                              const reordered = [...mediaItems];
                              [reordered[index - 1], reordered[index]] = [
                                reordered[index],
                                reordered[index - 1],
                              ];
                              setOrderedMediaItems(reordered);
                            }}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Move image ${index + 1} down`}
                            disabled={
                              index === mediaItems.length - 1 || isUploading
                            }
                            onClick={() => {
                              const reordered = [...mediaItems];
                              [reordered[index], reordered[index + 1]] = [
                                reordered[index + 1],
                                reordered[index],
                              ];
                              setOrderedMediaItems(reordered);
                            }}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove image ${index + 1} from vehicle`}
                            disabled={isUploading}
                            onClick={() => {
                              if (item.previewUrl?.startsWith("blob:")) {
                                URL.revokeObjectURL(item.previewUrl);
                                objectUrlsRef.current.delete(item.previewUrl);
                              }
                              setOrderedMediaItems(
                                mediaItems.filter(
                                  (candidate) => candidate.key !== item.key,
                                ),
                              );
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {mediaItems.length === 0 && (
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
            description={
              mode === "create"
                ? "New vehicles are created as drafts. These settings are not applied during draft creation."
                : "Lifecycle state and quality gates are managed separately; saving vehicle details does not change them."
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
                disabled
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
                    disabled
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
    isFeatured: vehicle.isFeatured,
    isAvailable: vehicle.status === "published",
    mediaAssetIds: vehicle.mediaAssetIds ?? [],
  };
}
