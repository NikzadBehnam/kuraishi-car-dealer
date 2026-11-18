"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Copy,
  Download,
  FileText,
  Images,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import type {
  AdminMediaAsset,
  AdminMediaType,
  AdminMediaUsage,
} from "@/types/admin";
import type { MediaDeletionResult } from "@/lib/media-delete-validation";
import { MAX_MEDIA_SELECTION_ASSETS } from "@/lib/media-selection-validation";
import {
  mediaLibraryErrorSchema,
  mediaLibraryPageSchema,
} from "@/lib/media-library-validation";
import { mediaDeletionResponseSchema } from "@/lib/media-delete-validation";
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

type TypeFilter = "all" | AdminMediaType;
type UsageFilter = "all" | AdminMediaUsage;

const typeLabels: Record<AdminMediaType, string> = {
  image: "Image",
  document: "Document",
  brand: "Brand",
};

const usageLabels: Record<AdminMediaUsage, string> = {
  vehicle: "Vehicle",
  brand: "Brand",
  legal: "Legal",
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
const pageSize = 24;
const mediaApprovalResponseSchema = z.strictObject({
  sourceMediaAssetId: z.string().min(1),
  publicMediaAssetId: z.string().min(1),
  reused: z.boolean(),
});

function getDownloadFilename(
  contentDisposition: string | null,
  fallback: string,
): string {
  const encodedName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedName?.[1]) {
    try {
      return decodeURIComponent(encodedName[1]);
    } catch {
      return fallback;
    }
  }

  const quotedName = contentDisposition?.match(/filename="([^"]+)"/i);
  return quotedName?.[1] ?? fallback;
}

export function MediaLibrary() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [assets, setAssets] = useState<AdminMediaAsset[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deleteResults, setDeleteResults] = useState<
    MediaDeletionResult[] | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [approvalAsset, setApprovalAsset] = useState<AdminMediaAsset | null>(
    null,
  );
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      type: typeFilter,
      usage: usageFilter,
    });

    async function loadAssets() {
      setLoading(true);
      setLoadError(null);
      setAssets([]);
      setActiveAssetId(null);

      try {
        const response = await fetch(`/api/admin/media?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();

        if (!response.ok) {
          const parsedError = mediaLibraryErrorSchema.safeParse(payload);
          throw new Error(
            parsedError.success
              ? parsedError.data.error
              : "Could not load media assets.",
          );
        }

        const result = mediaLibraryPageSchema.parse(payload);
        setAssets(result.assets);
        setHasMore(result.hasMore);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load media assets.",
        );
        setHasMore(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadAssets();
    return () => controller.abort();
  }, [page, retryCount, search, typeFilter, usageFilter]);

  const activeAsset =
    assets.find((asset) => asset.id === activeAssetId) ?? null;
  const selectedCount = selectedIds.size;

  const toggleSelected = (assetId: string, checked: boolean) => {
    if (
      checked &&
      !selectedIds.has(assetId) &&
      selectedIds.size >= MAX_MEDIA_SELECTION_ASSETS
    ) {
      toast.error(
        `Select no more than ${MAX_MEDIA_SELECTION_ASSETS} assets at a time.`,
      );
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  };

  const copyAssetUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Media URL copied.");
    } catch {
      toast.error("Could not copy the media URL.");
    }
  };

  const requestDelete = (ids: string[]) => {
    setDeleteResults(null);
    setDeleteIds(ids);
  };

  const confirmDelete = async () => {
    if (!deleteIds || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/admin/media", {
        method: "DELETE",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deleteIds }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        const parsedError = mediaLibraryErrorSchema.safeParse(payload);
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Could not delete the selected media.",
        );
      }

      const payload: unknown = await response.json();
      const result = mediaDeletionResponseSchema.parse(payload);
      const resolvedIds = new Set(
        result.results
          .filter(
            (item) => item.status === "deleted" || item.status === "not_found",
          )
          .map((item) => item.id),
      );
      setSelectedIds(
        (current) => new Set([...current].filter((id) => !resolvedIds.has(id))),
      );
      if (result.results.some((item) => item.status === "deleted")) {
        setRetryCount((count) => count + 1);
      }
      setDeleteResults(result.results);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete the selected media.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const approvePublicCopy = async () => {
    if (!approvalAsset || approving) return;
    setApproving(true);
    try {
      const response = await fetch("/api/admin/media/approve-public", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId: approvalAsset.id }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsedError = mediaLibraryErrorSchema.safeParse(payload);
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Could not approve this image for public access.",
        );
      }
      const result = mediaApprovalResponseSchema.parse(payload);
      setApprovalAsset(null);
      setPage(1);
      setRetryCount((count) => count + 1);
      toast.success(
        result.reused
          ? "An approved public copy already exists."
          : "Approved public copy created. The private original is unchanged.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not approve this image for public access.",
      );
    } finally {
      setApproving(false);
    }
  };

  const downloadAssets = async (ids: string[]) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      for (const id of ids) params.append("id", id);

      const response = await fetch(`/api/admin/media/download?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        const parsedError = mediaLibraryErrorSchema.safeParse(payload);
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Could not download the selected media.",
        );
      }

      const expectedContentType =
        ids.length === 1 ? "application/octet-stream" : "application/zip";
      if (
        response.headers.get("content-type")?.split(";")[0] !==
        expectedContentType
      ) {
        throw new Error("The server returned an invalid download response.");
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("The selected media download was empty.");
      }
      const filename = getDownloadFilename(
        response.headers.get("content-disposition"),
        ids.length === 1 ? "media-file" : "media-assets.zip",
      );
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      toast.success("Download started.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not download the selected media.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Media library</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Search and filter uploaded vehicle images, brand files, and
              documents.
            </p>
          </div>
          <Button
            type="button"
            variant="accent"
            className="w-full rounded-[var(--radius-sm)] sm:w-auto"
            onClick={() => toast.info("Upload is UI-only in this phase.")}
          >
            <Upload />
            Upload
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_10rem_10rem]">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, filename, alt text, type, usage, vehicle"
              aria-label="Search media"
              className="bg-background pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as TypeFilter);
              setPage(1);
            }}
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
            value={usageFilter}
            onValueChange={(value) => {
              setUsageFilter(value as UsageFilter);
              setPage(1);
            }}
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
        </div>
      </Card>

      {selectedCount > 0 && (
        <Card className="grid min-w-0 gap-3 rounded-[var(--radius-sm)] p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm font-bold">
            {selectedCount} asset{selectedCount === 1 ? "" : "s"} selected
          </p>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              disabled={downloading}
              onClick={() => void downloadAssets([...selectedIds])}
            >
              <Download />
              {downloading ? "Preparing…" : "Download"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              disabled={downloading || deleting}
              onClick={() => requestDelete([...selectedIds])}
            >
              <Trash2 />
              Delete
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </Card>
      )}

      {loadError ? (
        <Card
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] p-4"
        >
          <p className="text-destructive text-sm">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Retry
          </Button>
        </Card>
      ) : loading ? (
        <Card
          aria-live="polite"
          className="text-muted-foreground grid min-h-40 place-items-center rounded-[var(--radius-sm)] p-8 text-sm"
        >
          Loading media assets…
        </Card>
      ) : assets.length ? (
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
        <EmptyMediaState />
      )}

      <MediaAssetDialog
        asset={activeAsset}
        open={!!activeAsset}
        downloading={downloading}
        onOpenChange={(open) => {
          if (!open) setActiveAssetId(null);
        }}
        onCopyUrl={copyAssetUrl}
        onDownload={(asset) => void downloadAssets([asset.id])}
        onApprovePublic={(asset) => {
          setActiveAssetId(null);
          setApprovalAsset(asset);
        }}
        onDelete={(asset) => {
          setActiveAssetId(null);
          requestDelete([asset.id]);
        }}
      />

      <Dialog
        open={approvalAsset !== null}
        onOpenChange={(open) => {
          if (!open && !approving) setApprovalAsset(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create an approved public copy?</DialogTitle>
            <DialogDescription>
              {approvalAsset
                ? `This makes a separate copy of "${approvalAsset.title}" accessible to anyone with its public URL. The private original stays private and unchanged.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={approving}
              onClick={() => setApprovalAsset(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={approving}
              onClick={() => void approvePublicCopy()}
            >
              <ShieldCheck />
              {approving ? "Approving…" : "Create public copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteIds !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteIds(null);
            setDeleteResults(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteResults ? "Deletion results" : "Delete media assets?"}
            </DialogTitle>
            <DialogDescription>
              {deleteResults
                ? "Each selected asset has an individual result below."
                : `${deleteIds?.length ?? 0} asset${deleteIds?.length === 1 ? "" : "s"} will be deleted if unused. Assets attached to a vehicle must be detached or replaced first.`}
            </DialogDescription>
          </DialogHeader>
          {deleteResults && (
            <ul className="grid max-h-64 gap-3 overflow-y-auto">
              {deleteResults.map((item) => (
                <li
                  key={item.id}
                  className="bg-muted/40 rounded-[var(--radius-sm)] p-3 text-sm"
                >
                  <p className="font-bold">{item.filename || item.id}</p>
                  <p className="text-muted-foreground mt-1">
                    {item.status === "in_use"
                      ? "Blocked: in use"
                      : item.status === "not_found"
                        ? "Not found"
                        : item.status === "failed"
                          ? "Failed"
                          : "Deleted"}
                    {" — "}
                    {item.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            {deleteResults ? (
              <Button
                type="button"
                onClick={() => {
                  setDeleteIds(null);
                  setDeleteResults(null);
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteIds(null);
                    setDeleteResults(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => void confirmDelete()}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!loading && !loadError && (
        <nav
          aria-label="Media library pages"
          className="flex items-center justify-between gap-3"
        >
          <p className="text-muted-foreground text-sm">Page {page}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-[var(--radius-sm)]"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-[var(--radius-sm)]"
              disabled={!hasMore}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}

function MediaAssetCard({
  asset,
  selected,
  onSelectedChange,
  onOpen,
}: {
  asset: AdminMediaAsset;
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
            {asset.filename}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TypeBadge type={asset.type} />
          <UsageBadge usage={asset.usage} />
          <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
            {asset.bucketAccess === "public_read" && asset.publicApprovedAt
              ? "Public approved"
              : "Private"}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground truncate text-xs">
            {asset.usedByVehicle
              ? `${asset.usedByVehicle.make} ${asset.usedByVehicle.model}`
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
  downloading,
  onOpenChange,
  onCopyUrl,
  onDownload,
  onApprovePublic,
  onDelete,
}: {
  asset: AdminMediaAsset | null;
  open: boolean;
  downloading: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyUrl: (url: string) => void;
  onDownload: (asset: AdminMediaAsset) => void;
  onApprovePublic: (asset: AdminMediaAsset) => void;
  onDelete: (asset: AdminMediaAsset) => void;
}) {
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={asset.type} />
            <UsageBadge usage={asset.usage} />
          </div>
          <DialogTitle>{asset.title}</DialogTitle>
          <DialogDescription>{asset.filename}</DialogDescription>
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
              <Info
                label="Access"
                value={
                  asset.bucketAccess === "public_read" && asset.publicApprovedAt
                    ? "Public approved"
                    : "Private"
                }
              />
              <Info
                label="Public approval"
                value={
                  asset.publicApprovedAt
                    ? formatDateTime(asset.publicApprovedAt)
                    : "Not approved"
                }
              />
              <Info label="Dimensions" value={formatDimensions(asset)} />
              <Info label="Size" value={`${integer.format(asset.sizeKb)} KB`} />
              <Info
                label="Used by"
                value={
                  asset.usedByVehicle
                    ? `${asset.usedByVehicle.make} ${asset.usedByVehicle.model}`
                    : usageLabels[asset.usage]
                }
              />
              <Info label="Uploaded" value={formatDateTime(asset.uploadedAt)} />
            </div>
          </section>
        </div>

        <DialogFooter className="[&>button]:w-full sm:[&>button]:w-auto">
          {asset.type === "image" && asset.bucketAccess === "private" && (
            <Button
              type="button"
              variant="accent"
              className="rounded-[var(--radius-sm)]"
              onClick={() => onApprovePublic(asset)}
            >
              <ShieldCheck />
              Create public copy
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            onClick={() => void onCopyUrl(asset.url)}
          >
            <Copy />
            Copy URL
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            disabled={downloading}
            onClick={() => onDownload(asset)}
          >
            <Download />
            {downloading ? "Preparing…" : "Download"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-[var(--radius-sm)]"
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

function MediaPreview({ asset }: { asset: AdminMediaAsset }) {
  if (asset.type === "document" || asset.url === "#") {
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
      alt={asset.alt}
      className="object-cover"
    />
  );
}

function EmptyMediaState() {
  return (
    <div className="bg-surface grid min-h-72 place-items-center rounded-[var(--radius-sm)] border p-8 text-center">
      <div className="max-w-sm">
        <span className="bg-secondary text-primary mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)]">
          <Images className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">No media assets found</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Change the search, type, or usage filters to review more media assets.
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
        type === "brand" && "bg-info/10 text-info",
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
        usage === "legal" && "bg-warning/10 text-warning",
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

function formatDimensions(asset: AdminMediaAsset) {
  return asset.width && asset.height
    ? `${integer.format(asset.width)} x ${integer.format(asset.height)}`
    : "Not available";
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
