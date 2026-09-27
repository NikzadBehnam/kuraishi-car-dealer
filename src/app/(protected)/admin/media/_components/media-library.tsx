"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type DragEvent,
  type FormEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  FileText,
  Images,
  LoaderCircle,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { adminRoutes } from "@/config/admin-routes.config";
import {
  buildAdminMediaListingHref,
  createAdminMediaListingSearchParams,
} from "@/features/media/admin-listing-search-params";
import type {
  AdminMediaType,
  AdminMediaUsage,
} from "@/features/media/constants";
import { mediaUploadLimits } from "@/features/media/constants";
import type { AdminMediaAssetDto } from "@/features/media/dto";
import type { AdminMediaListQuery } from "@/features/media/schemas";
import type { PaginatedResult } from "@/features/shared/pagination";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { deleteMediaAssetsAction } from "../actions";

type TypeFilter = "all" | AdminMediaType;
type UsageFilter = "all" | AdminMediaUsage;

const typeLabels: Record<AdminMediaType, string> = {
  image: "Image",
  document: "Document",
};

const usageLabels: Record<AdminMediaUsage, string> = {
  vehicle: "Vehicle",
  unused: "Unused",
};

const dateTime = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const integer = new Intl.NumberFormat("de-DE");

export function MediaLibrary({
  query,
  result,
}: {
  query: AdminMediaListQuery;
  result: PaginatedResult<AdminMediaAssetDto>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query.search ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<{
    ids: string[];
    label: string;
  } | null>(null);
  const { startUpload, isUploading } = useUploadThing("mediaLibraryImages", {
    onClientUploadComplete: (uploadedFiles) => {
      const uploadedCount = uploadedFiles.length;

      toast.success(
        `${uploadedCount} image${uploadedCount === 1 ? "" : "s"} uploaded.`,
      );
      router.refresh();
    },
    onUploadError: (error) => {
      toast.error(error.message || "The image upload failed.");
    },
  });

  const assets = result.items;
  const activeAsset =
    assets.find((asset) => asset.id === activeAssetId) ?? null;
  const selectedAssets = assets.filter((asset) => selectedIds.has(asset.id));
  const selectedCount = selectedIds.size;
  const selectionContainsProtectedAsset = selectedAssets.some(
    (asset) => asset.usage === "vehicle" || asset.provider !== "uploadthing",
  );
  const isBusy = isPending || isUploading;

  const navigate = (params: URLSearchParams) => {
    const queryString = params.toString();
    const href = queryString
      ? `${adminRoutes.media}?${queryString}`
      : adminRoutes.media;

    startTransition(() => router.push(href));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = createAdminMediaListingSearchParams(query);
    const normalizedSearch = searchValue.trim();

    if (normalizedSearch) params.set("search", normalizedSearch);
    else params.delete("search");

    params.delete("page");
    navigate(params);
  };

  const updateFilter = (
    key: "type" | "usage",
    value: TypeFilter | UsageFilter,
  ) => {
    const params = createAdminMediaListingSearchParams(query);

    if (value === "all") params.delete(key);
    else params.set(key, value);

    params.delete("page");
    navigate(params);
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);

    if (files.length === 0) return;

    if (files.length > mediaUploadLimits.maxFileCount) {
      toast.error(
        `Select no more than ${mediaUploadLimits.maxFileCount} images at once.`,
      );
      return;
    }

    await startUpload(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isBusy) return;
    void uploadFiles(event.dataTransfer.files);
  };

  const toggleSelected = (assetId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  };

  const deleteRequestedAssets = () => {
    if (!deleteRequest) return;

    startTransition(async () => {
      const deleteResult = await deleteMediaAssetsAction({
        ids: deleteRequest.ids,
      });

      if (!deleteResult.ok) {
        toast.error(deleteResult.error.message);
        return;
      }

      setDeleteRequest(null);
      setActiveAssetId(null);
      setSelectedIds(new Set());
      toast.success(
        `${deleteResult.data.deletedCount} asset${deleteResult.data.deletedCount === 1 ? "" : "s"} deleted.`,
      );
      router.refresh();
    });
  };

  return (
    <div className={cn("grid min-w-0 gap-4", isBusy && "opacity-80")}>
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Media library</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              UploadThing assets backed by the application media database.
            </p>
          </div>
          <Button
            type="button"
            variant="accent"
            className="w-full rounded-[var(--radius-sm)] sm:w-auto"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Upload />
            )}
            {isUploading ? "Uploading…" : "Upload images"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <form
          className="mt-4 grid gap-3 md:grid-cols-[1fr_10rem_10rem]"
          onSubmit={submitSearch}
        >
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search filename, title, or vehicle"
              aria-label="Search media"
              className="bg-background pr-20 pl-9"
            />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="absolute top-1/2 right-1 h-7 min-h-7 -translate-y-1/2"
              disabled={isBusy}
            >
              Search
            </Button>
          </div>
          <Select
            value={query.type ?? "all"}
            onValueChange={(value) => updateFilter("type", value as TypeFilter)}
            disabled={isBusy}
          >
            <SelectTrigger aria-label="Filter media type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={query.usage ?? "all"}
            onValueChange={(value) =>
              updateFilter("usage", value as UsageFilter)
            }
            disabled={isBusy}
          >
            <SelectTrigger aria-label="Filter media usage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All usage</SelectItem>
              {Object.entries(usageLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
      </Card>

      <div
        role="button"
        tabIndex={0}
        className={cn(
          "bg-surface hover:bg-surface-muted grid min-h-44 place-items-center rounded-[var(--radius-sm)] border border-dashed p-6 text-center transition-colors focus-visible:outline-none",
          isBusy && "pointer-events-none",
        )}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span>
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
            {isUploading ? "Uploading images…" : "Drop images here"}
          </span>
          <span className="text-muted-foreground mt-2 block text-sm leading-6">
            Up to {mediaUploadLimits.maxFileCount} images per upload, maximum{" "}
            {mediaUploadLimits.maxFileSize} each.
          </span>
        </span>
      </div>

      {selectedCount > 0 && (
        <Card className="grid min-w-0 gap-3 rounded-[var(--radius-sm)] p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">
              {selectedCount} asset{selectedCount === 1 ? "" : "s"} selected
            </p>
            {selectionContainsProtectedAsset && (
              <p className="text-muted-foreground mt-1 text-xs">
                Vehicle-linked or non-UploadThing assets cannot be deleted here.
              </p>
            )}
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              disabled={selectionContainsProtectedAsset || isBusy}
              onClick={() =>
                setDeleteRequest({
                  ids: Array.from(selectedIds),
                  label: `${selectedCount} selected asset${selectedCount === 1 ? "" : "s"}`,
                })
              }
            >
              <Trash2 />
              Delete
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => setSelectedIds(new Set())}
              disabled={isBusy}
            >
              Clear
            </Button>
          </div>
        </Card>
      )}

      {assets.length ? (
        <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {assets.map((asset) => (
            <MediaAssetCard
              key={asset.id}
              asset={asset}
              selected={selectedIds.has(asset.id)}
              onSelectedChange={(checked) => toggleSelected(asset.id, checked)}
              onOpen={() => setActiveAssetId(asset.id)}
            />
          ))}
        </section>
      ) : (
        <EmptyMediaState
          hasFilters={Boolean(query.search || query.type || query.usage)}
        />
      )}

      <MediaPagination query={query} result={result} />

      <MediaAssetDialog
        asset={activeAsset}
        open={Boolean(activeAsset)}
        onDelete={(asset) =>
          setDeleteRequest({ ids: [asset.id], label: asset.title })
        }
        onOpenChange={(open) => {
          if (!open) setActiveAssetId(null);
        }}
      />

      <Dialog
        open={Boolean(deleteRequest)}
        onOpenChange={(open) => {
          if (!open && !isPending) setDeleteRequest(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete media permanently?</DialogTitle>
            <DialogDescription>
              {deleteRequest?.label} will be removed from UploadThing and the
              media database. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="[&>button]:w-full sm:[&>button]:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setDeleteRequest(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={deleteRequestedAssets}
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaAssetCard({
  asset,
  selected,
  onSelectedChange,
  onOpen,
}: {
  asset: AdminMediaAssetDto;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[var(--radius-sm)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md",
        selected && "border-accent ring-accent/20 ring-2",
      )}
    >
      <div className="bg-secondary relative aspect-[4/3]">
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(checked === true)}
            aria-label={`Select ${asset.title}`}
            className="bg-surface"
          />
        </div>
        <MediaPreview asset={asset} />
      </div>
      <div className="grid gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold">{asset.title}</p>
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {asset.originalFilename}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TypeBadge type={asset.type} />
          <UsageBadge usage={asset.usage} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground truncate text-xs">
            {asset.vehicle
              ? `${asset.vehicle.make} ${asset.vehicle.model}`
              : formatDimensions(asset)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[var(--radius-sm)]"
            onClick={onOpen}
          >
            Details
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MediaAssetDialog({
  asset,
  open,
  onDelete,
  onOpenChange,
}: {
  asset: AdminMediaAssetDto | null;
  open: boolean;
  onDelete: (asset: AdminMediaAssetDto) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!asset) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(asset.url);
      toast.success("Media URL copied.");
    } catch {
      toast.error("The media URL could not be copied.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={asset.type} />
            <UsageBadge usage={asset.usage} />
          </div>
          <DialogTitle>{asset.title}</DialogTitle>
          <DialogDescription>{asset.originalFilename}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="bg-background overflow-hidden rounded-[var(--radius-sm)] border">
            <div className="relative aspect-[4/3]">
              <MediaPreview asset={asset} />
            </div>
          </div>
          <section className="bg-background rounded-[var(--radius-sm)] border p-4">
            <h3 className="text-sm font-extrabold">Asset details</h3>
            <Separator className="my-3" />
            <div className="grid gap-3 text-sm">
              <Info label="Type" value={typeLabels[asset.type]} />
              <Info label="Usage" value={usageLabels[asset.usage]} />
              <Info label="Dimensions" value={formatDimensions(asset)} />
              <Info label="Size" value={formatFileSize(asset.sizeBytes)} />
              <Info
                label="Used by"
                value={
                  asset.vehicle
                    ? `${asset.vehicle.make} ${asset.vehicle.model} (${asset.vehicle.stockNumber})`
                    : "Not attached"
                }
              />
              <Info
                label="Uploaded by"
                value={asset.uploadedBy?.name ?? "Unknown user"}
              />
              <Info label="Uploaded" value={formatDateTime(asset.createdAt)} />
            </div>
          </section>
        </div>

        <DialogFooter className="[&>a]:w-full sm:[&>a]:w-auto [&>button]:w-full sm:[&>button]:w-auto">
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            onClick={copyUrl}
          >
            <Copy />
            Copy URL
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-[var(--radius-sm)]"
          >
            <a
              href={asset.url}
              download={asset.originalFilename}
              target="_blank"
              rel="noreferrer"
            >
              <Download />
              Download
            </a>
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-[var(--radius-sm)]"
            disabled={
              asset.usage === "vehicle" || asset.provider !== "uploadthing"
            }
            title={
              asset.usage === "vehicle"
                ? "Detach this image from its vehicle before deleting it."
                : asset.provider !== "uploadthing"
                  ? "This asset is not managed by UploadThing."
                  : undefined
            }
            onClick={() => onDelete(asset)}
          >
            <Trash2 />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MediaPreview({ asset }: { asset: AdminMediaAssetDto }) {
  if (asset.type === "document") {
    return (
      <div className="bg-background grid size-full place-items-center p-6 text-center">
        <span>
          <FileText className="text-muted-foreground mx-auto size-10" />
          <span className="mt-3 block text-sm font-extrabold">
            Document asset
          </span>
        </span>
      </div>
    );
  }

  return (
    <Image
      fill
      sizes="(max-width: 768px) 50vw, 20rem"
      src={asset.url}
      alt={asset.altText}
      className="object-cover"
    />
  );
}

function MediaPagination({
  query,
  result,
}: {
  query: AdminMediaListQuery;
  result: PaginatedResult<AdminMediaAssetDto>;
}) {
  return (
    <Card className="grid gap-3 rounded-[var(--radius-sm)] p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Showing{" "}
        <strong className="text-foreground">{result.items.length}</strong> of{" "}
        <strong className="text-foreground">{result.total}</strong> assets
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
        {result.hasPreviousPage ? (
          <Button asChild variant="outline">
            <Link href={buildAdminMediaListingHref(query, query.page - 1)}>
              Previous
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled>
            Previous
          </Button>
        )}
        <span className="text-center text-sm font-bold">
          Page {result.page} of {Math.max(1, result.totalPages)}
        </span>
        {result.hasNextPage ? (
          <Button asChild variant="outline">
            <Link href={buildAdminMediaListingHref(query, query.page + 1)}>
              Next
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled>
            Next
          </Button>
        )}
      </div>
    </Card>
  );
}

function EmptyMediaState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-surface grid min-h-72 place-items-center rounded-[var(--radius-sm)] border p-8 text-center">
      <div className="max-w-sm">
        <span className="bg-secondary text-primary mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)]">
          <Images className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">No media assets found</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {hasFilters
            ? "Change the search or filters to show more media assets."
            : "Upload the first image to start the media library."}
        </p>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: AdminMediaType }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        type === "image" && "bg-success/10 text-success",
      )}
    >
      {typeLabels[type]}
    </Badge>
  );
}

function UsageBadge({ usage }: { usage: AdminMediaUsage }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        usage === "vehicle" && "bg-accent/10 text-accent",
      )}
    >
      {usageLabels[usage]}
    </Badge>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-bold">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatDimensions(asset: AdminMediaAssetDto) {
  return asset.width && asset.height
    ? `${integer.format(asset.width)} × ${integer.format(asset.height)}`
    : "Not available";
}

function formatFileSize(sizeBytes: string) {
  const bytes = Number(sizeBytes);

  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
  }

  return `${integer.format(Math.ceil(bytes / 1_024))} KB`;
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
