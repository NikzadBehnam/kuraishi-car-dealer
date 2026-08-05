"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  FileText,
  Images,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import type {
  AdminMediaAsset,
  AdminMediaType,
  AdminMediaUsage,
  AdminUser,
  AdminVehicle,
} from "@/types/admin";
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

export function MediaLibrary({
  assets,
  users,
  vehicles,
}: {
  assets: AdminMediaAsset[];
  users: AdminUser[];
  vehicles: AdminVehicle[];
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");

    return assets
      .filter((asset) => typeFilter === "all" || asset.type === typeFilter)
      .filter((asset) => usageFilter === "all" || asset.usage === usageFilter)
      .filter((asset) => {
        if (!normalizedQuery) return true;
        const vehicle = getVehicle(asset, vehicles);

        return [
          asset.title,
          asset.filename,
          asset.alt,
          asset.type,
          asset.usage,
          vehicle?.make ?? "",
          vehicle?.model ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("de")
          .includes(normalizedQuery);
      })
      .toSorted((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [assets, query, typeFilter, usageFilter, vehicles]);

  const activeAsset =
    assets.find((asset) => asset.id === activeAssetId) ?? null;
  const selectedCount = selectedIds.size;

  const toggleSelected = (assetId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  };

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Media library</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              UI-only asset management for vehicle images, brand files, and
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
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search filename, title, usage, vehicle"
              aria-label="Search media"
              className="bg-background pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TypeFilter)}
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
            onValueChange={(value) => setUsageFilter(value as UsageFilter)}
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

      <button
        type="button"
        className="grid min-h-44 place-items-center rounded-[var(--radius-sm)] border border-dashed bg-surface p-6 text-center transition-colors hover:bg-surface-muted focus-visible:outline-none"
        onClick={() => toast.info("Dropzone upload is UI-only.")}
      >
        <span>
          <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
            <Upload className="size-6" aria-hidden="true" />
          </span>
          <span className="mt-4 block font-extrabold">
            Drop media files here
          </span>
          <span className="mt-2 block text-sm leading-6 text-muted-foreground">
            Mock upload area for future media storage integration.
          </span>
        </span>
      </button>

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
              onClick={() => toast.info("Bulk download is UI-only.")}
            >
              <Download />
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => toast.info("Bulk delete is UI-only.")}
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

      {filteredAssets.length ? (
        <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredAssets.map((asset) => (
            <MediaAssetCard
              key={asset.id}
              asset={asset}
              vehicle={getVehicle(asset, vehicles)}
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
        vehicle={activeAsset ? getVehicle(activeAsset, vehicles) : undefined}
        uploadedBy={activeAsset ? getUploader(activeAsset, users) : undefined}
        open={!!activeAsset}
        onOpenChange={(open) => {
          if (!open) setActiveAssetId(null);
        }}
      />
    </div>
  );
}

function MediaAssetCard({
  asset,
  vehicle,
  selected,
  onSelectedChange,
  onOpen,
}: {
  asset: AdminMediaAsset;
  vehicle?: AdminVehicle;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[var(--radius-sm)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md",
        selected && "border-accent ring-2 ring-accent/20",
      )}
    >
      <div className="relative aspect-[4/3] bg-secondary">
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
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {asset.filename}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TypeBadge type={asset.type} />
          <UsageBadge usage={asset.usage} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs text-muted-foreground">
            {vehicle
              ? `${vehicle.make} ${vehicle.model}`
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
  vehicle,
  uploadedBy,
  open,
  onOpenChange,
}: {
  asset: AdminMediaAsset | null;
  vehicle?: AdminVehicle;
  uploadedBy?: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          <div className="overflow-hidden rounded-[var(--radius-sm)] border bg-background">
            <div className="relative aspect-[4/3]">
              <MediaPreview asset={asset} />
            </div>
          </div>
          <section className="rounded-[var(--radius-sm)] border bg-background p-4">
            <h3 className="text-sm font-extrabold">Asset details</h3>
            <Separator className="my-3" />
            <div className="grid gap-3 text-sm">
              <Info label="Type" value={typeLabels[asset.type]} />
              <Info label="Usage" value={usageLabels[asset.usage]} />
              <Info label="Dimensions" value={formatDimensions(asset)} />
              <Info label="Size" value={`${integer.format(asset.sizeKb)} KB`} />
              <Info
                label="Used by"
                value={
                  vehicle
                    ? `${vehicle.make} ${vehicle.model}`
                    : usageLabels[asset.usage]
                }
              />
              <Info
                label="Uploaded by"
                value={uploadedBy?.name ?? asset.uploadedByUserId}
              />
              <Info label="Uploaded" value={formatDateTime(asset.uploadedAt)} />
            </div>
          </section>
        </div>

        <DialogFooter className="[&>button]:w-full sm:[&>button]:w-auto">
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            onClick={() => toast.info("Copy URL is UI-only.")}
          >
            <Copy />
            Copy URL
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            onClick={() => toast.info("Download is UI-only.")}
          >
            <Download />
            Download
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-[var(--radius-sm)]"
            onClick={() => toast.info("Delete is UI-only.")}
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
      <div className="grid size-full place-items-center bg-background p-6 text-center">
        <span>
          <FileText className="mx-auto size-10 text-muted-foreground" />
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
    <div className="grid min-h-72 place-items-center rounded-[var(--radius-sm)] border bg-surface p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
          <Images className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">No media assets found</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Change the search, type, or usage filters to review more mocked media
          records.
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
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function getVehicle(asset: AdminMediaAsset, vehicles: AdminVehicle[]) {
  return asset.usedByVehicleId
    ? vehicles.find((vehicle) => vehicle.id === asset.usedByVehicleId)
    : undefined;
}

function getUploader(asset: AdminMediaAsset, users: AdminUser[]) {
  return users.find((user) => user.id === asset.uploadedByUserId);
}

function formatDimensions(asset: AdminMediaAsset) {
  return asset.width && asset.height
    ? `${integer.format(asset.width)} x ${integer.format(asset.height)}`
    : "Not available";
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
