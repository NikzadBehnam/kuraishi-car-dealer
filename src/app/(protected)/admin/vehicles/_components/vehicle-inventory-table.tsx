"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  CarFront,
  Copy,
  Eye,
  FilePenLine,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import type { StaffInventoryVehicleDTO } from "@/types/inventory";
import type { StaffInventoryFilters } from "@/lib/inventory-validation";
import { adminRoutes } from "@/config/admin-routes.config";
import { routeBuilders } from "@/config/routes.config";
import {
  formatCurrency,
  formatFuelType,
  formatMileage,
} from "@/lib/formatters";
import { getPublicVehicleVisibility } from "@/lib/inventory-policy";
import {
  inventorySelectionSchema,
  MAX_INVENTORY_SELECTION_SIZE,
} from "@/lib/inventory-validation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminVehicleStatus = StaffInventoryVehicleDTO["status"];
type SortKey = StaffInventoryFilters["sort"];
type SortDirection = StaffInventoryFilters["direction"];

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const statusLabels: Record<AdminVehicleStatus, string> = {
  draft: "Draft",
  published: "Published",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived",
};

const dateTime = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const lifecycleMutationResponseSchema = z.strictObject({
  vehicleId: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(["published", "reserved", "sold", "archived"]),
  soldAt: z.string().datetime({ offset: true }).nullable(),
  changed: z.boolean(),
});
const lifecycleMutationErrorSchema = z.strictObject({ error: z.string() });
const duplicateMutationResponseSchema = z.strictObject({
  vehicleId: z.string().min(1),
  version: z.number().int().positive(),
  stockNumber: z.string().min(1),
  slug: z.string().min(1),
});
const deleteMutationResponseSchema = z.strictObject({
  vehicleId: z.string().min(1),
  deleted: z.literal(true),
});
const bulkLifecycleResponseSchema = z.strictObject({
  status: z.enum(["sold", "archived"]),
  succeeded: z.array(
    z.strictObject({
      vehicleId: z.string().min(1),
      changed: z.boolean(),
    }),
  ),
  failed: z.array(
    z.strictObject({
      vehicleId: z.string().min(1),
      error: z.string(),
    }),
  ),
});

export function VehicleInventoryTable({
  vehicles,
  total,
  page,
  pageSize,
  totalPages,
  filters,
}: {
  vehicles: StaffInventoryVehicleDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: StaffInventoryFilters;
}) {
  const [query, setQuery] = useState(filters.search);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"sold" | "archived" | null>(
    null,
  );
  const [bulkActionPending, setBulkActionPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<z.infer<
    typeof bulkLifecycleResponseSchema
  > | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const sort: SortState = { key: filters.sort, direction: filters.direction };
  const statusFilter = filters.status ?? "all";
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const visibleIds = vehicles.map((vehicle) => vehicle.id);
  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const selectedCount = selectedIds.size;
  const bulkChangedCount =
    bulkResult?.succeeded.filter(({ changed }) => changed).length ?? 0;
  const bulkUnchangedCount =
    (bulkResult?.succeeded.length ?? 0) - bulkChangedCount;

  useEffect(() => {
    if (query === filters.search) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParamsString);
      if (query.trim()) params.set("search", query.trim());
      else params.delete("search");
      params.delete("page");
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters.search, pathname, query, router, searchParamsString]);

  const updateSearchParams = (
    updates: Partial<
      Record<"search" | "status" | "sort" | "direction" | "page", string | null>
    >,
  ) => {
    const params = new URLSearchParams(searchParamsString);
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const updateSearch = (value: string) => {
    setQuery(value);
    setSelectedIds(new Set());
  };

  const updateStatusFilter = (value: string) => {
    setSelectedIds(new Set());
    updateSearchParams({
      page: null,
      status: value === "all" ? null : value,
    });
  };

  const toggleSort = (key: SortKey) => {
    const direction =
      sort.key === key && sort.direction === "asc" ? "desc" : "asc";
    updateSearchParams({
      page: null,
      sort: key === "lastUpdatedAt" ? null : key,
      direction:
        key === "lastUpdatedAt" && direction === "desc" ? null : direction,
    });
  };

  const updatePage = (nextPage: number) => {
    updateSearchParams({ page: nextPage === 1 ? null : String(nextPage) });
  };

  const removeDeletedVehicleFromSelection = (vehicleId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(vehicleId);
      return next;
    });
  };

  const openBulkAction = (action: "sold" | "archived") => {
    const selection = inventorySelectionSchema.safeParse({
      ids: [...selectedIds],
    });
    if (!selection.success) {
      toast.error(
        selection.error.issues[0]?.message ??
          "The selected vehicle IDs are invalid. Clear the selection and try again.",
      );
      return;
    }
    setBulkResult(null);
    setBulkAction(action);
  };

  const closeBulkAction = () => {
    setBulkAction(null);
    setBulkResult(null);
  };

  const confirmBulkAction = async () => {
    if (!bulkAction || bulkActionPending) return;
    const selection = inventorySelectionSchema.safeParse({
      ids: [...selectedIds],
    });
    if (!selection.success) {
      toast.error(
        selection.error.issues[0]?.message ??
          "The selected vehicle IDs are invalid. Clear the selection and try again.",
      );
      return;
    }

    setBulkActionPending(true);
    try {
      const response = await fetch("/api/admin/vehicles/bulk-lifecycle", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selection.data.ids,
          status: bulkAction,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsedError = lifecycleMutationErrorSchema.safeParse(payload);
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Could not update the selected vehicles.",
        );
      }

      const result = bulkLifecycleResponseSchema.parse(payload);
      if (result.status !== bulkAction) {
        throw new Error("The server returned an unexpected lifecycle result.");
      }
      const succeededIds = new Set(
        result.succeeded.map(({ vehicleId }) => vehicleId),
      );
      setSelectedIds((current) => {
        const remaining = new Set(current);
        succeededIds.forEach((id) => remaining.delete(id));
        return remaining;
      });
      setBulkResult(result);
      if (succeededIds.size > 0) router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the selected vehicles.",
      );
    } finally {
      setBulkActionPending(false);
    }
  };

  const toggleVehicle = (id: string, checked: boolean) => {
    if (checked && !selectedIds.has(id)) {
      if (selectedIds.size >= MAX_INVENTORY_SELECTION_SIZE) {
        toast.error(
          `Select no more than ${MAX_INVENTORY_SELECTION_SIZE} vehicles at a time.`,
        );
        return;
      }
      setSelectedIds(new Set(selectedIds).add(id));
      return;
    }
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
  };

  const toggleVisible = (checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      const additions = visibleIds.filter((id) => !next.has(id));
      if (next.size + additions.length > MAX_INVENTORY_SELECTION_SIZE) {
        toast.error(
          `Select no more than ${MAX_INVENTORY_SELECTION_SIZE} vehicles at a time.`,
        );
        return;
      }
      additions.forEach((id) => next.add(id));
    } else {
      visibleIds.forEach((id) => next.delete(id));
    }
    setSelectedIds(next);
  };

  return (
    <div className="grid min-w-0 gap-4">
      <section className="bg-surface min-w-0 rounded-[var(--radius-sm)] border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Inventory table</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Search, filters, sorting and pagination are applied to database
              inventory.
            </p>
          </div>
          <Button
            asChild
            variant="accent"
            className="w-full rounded-[var(--radius-sm)] sm:w-auto"
          >
            <Link href={`${adminRoutes.vehicles}/new`}>
              <Plus />
              Add vehicle
            </Link>
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search stock number, make, model, variant, location"
              aria-label="Search vehicles"
              className="bg-background pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={updateStatusFilter}>
            <SelectTrigger aria-label="Filter by vehicle status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {selectedCount > 0 && (
        <section className="bg-surface grid min-w-0 gap-3 rounded-[var(--radius-sm)] border p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">
              {selectedCount} vehicle{selectedCount === 1 ? "" : "s"} selected
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Selection carries across pages; changing search or status clears
              it.
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => openBulkAction("archived")}
            >
              <Archive />
              Archive
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => openBulkAction("sold")}
            >
              <BadgeCheck />
              Mark sold
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => setSelectedIds(new Set())}
            >
              <Trash2 />
              Clear selection
            </Button>
          </div>
        </section>
      )}

      <section className="bg-surface min-w-0 overflow-hidden rounded-[var(--radius-sm)] border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-3">
                <Checkbox
                  aria-label="Select visible vehicles"
                  checked={
                    allVisibleSelected
                      ? true
                      : someVisibleSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) => toggleVisible(checked === true)}
                />
              </TableHead>
              <TableHead className="w-20 px-3">Image</TableHead>
              <SortableHead
                label="Title"
                sortKey="title"
                currentSort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Price"
                sortKey="price"
                currentSort={sort}
                onSort={toggleSort}
                align="right"
              />
              <SortableHead
                label="Mileage"
                sortKey="mileage"
                currentSort={sort}
                onSort={toggleSort}
              />
              <TableHead className="px-3">Fuel</TableHead>
              <SortableHead
                label="Status"
                sortKey="status"
                currentSort={sort}
                onSort={toggleSort}
              />
              <TableHead className="px-3">Featured</TableHead>
              <SortableHead
                label="Location"
                sortKey="location"
                currentSort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Updated"
                sortKey="lastUpdatedAt"
                currentSort={sort}
                onSort={toggleSort}
              />
              <TableHead className="w-12 px-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length ? (
              vehicles.map((vehicle) => (
                <TableRow
                  key={vehicle.id}
                  data-state={selectedIds.has(vehicle.id) ? "selected" : ""}
                >
                  <TableCell className="px-3">
                    <Checkbox
                      aria-label={`Select ${vehicle.make} ${vehicle.model}`}
                      checked={selectedIds.has(vehicle.id)}
                      onCheckedChange={(checked) =>
                        toggleVehicle(vehicle.id, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="bg-secondary text-muted-foreground grid h-12 w-16 place-items-center overflow-hidden rounded-[var(--radius-sm)]">
                      <CarFront className="size-6" aria-hidden="true" />
                    </div>
                  </TableCell>
                  <TableCell className="min-w-64 px-3">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">
                        {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {vehicle.stockNumber} - {vehicle.variant ?? "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-right font-extrabold">
                    {vehicle.price === null
                      ? "—"
                      : formatCurrency(Number(vehicle.price))}
                  </TableCell>
                  <TableCell className="px-3">
                    {vehicle.mileage === null
                      ? "—"
                      : formatMileage(vehicle.mileage)}
                  </TableCell>
                  <TableCell className="px-3">
                    {vehicle.fuelType === null
                      ? "—"
                      : formatFuelType(vehicle.fuelType)}
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusBadge status={vehicle.status} />
                  </TableCell>
                  <TableCell className="px-3">
                    {vehicle.isFeatured ? (
                      <Badge className="bg-success/10 text-success">
                        Featured
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs font-bold">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3">
                    {vehicle.location ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-3 text-xs font-bold whitespace-nowrap">
                    {formatDateTime(vehicle.updatedAt)}
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <VehicleRowActions
                      vehicle={vehicle}
                      onDeleted={() =>
                        removeDeletedVehicleFromSelection(vehicle.id)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="p-8 text-center">
                  <div className="mx-auto grid max-w-sm justify-items-center gap-3">
                    <span className="bg-secondary text-primary grid size-12 place-items-center rounded-[var(--radius-sm)]">
                      <CarFront className="size-6" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-extrabold">No vehicles found</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Adjust the search or status filter to show more
                        inventory records.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="grid gap-3 border-t p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Showing{" "}
            <strong className="text-foreground">
              {start}-{end}
            </strong>{" "}
            of <strong className="text-foreground">{total}</strong> vehicles
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              className="rounded-[var(--radius-sm)]"
              disabled={page === 1}
              onClick={() => updatePage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span className="text-center text-sm font-bold">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              className="rounded-[var(--radius-sm)]"
              disabled={page === totalPages}
              onClick={() => updatePage(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={bulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !bulkActionPending) closeBulkAction();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkResult
                ? "Bulk lifecycle results"
                : bulkAction === "sold"
                  ? `Mark ${selectedCount} vehicles sold?`
                  : `Archive ${selectedCount} vehicles?`}
            </DialogTitle>
            <DialogDescription>
              {bulkResult
                ? `${bulkChangedCount} updated, ${bulkUnchangedCount} already in the requested status, and ${bulkResult.failed.length} failed. Successful IDs were removed from the selection; failed IDs remain selected.`
                : `Each vehicle is processed independently. A failed or stale vehicle will not block other updates. You can select up to ${MAX_INVENTORY_SELECTION_SIZE} vehicles.`}
            </DialogDescription>
          </DialogHeader>
          {bulkResult && (
            <ul className="max-h-64 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border p-3 text-sm">
              {bulkResult.succeeded.map(({ vehicleId, changed }) => (
                <li key={vehicleId}>
                  <span className="font-semibold">{vehicleId}</span>
                  {changed
                    ? ` — ${bulkResult.status === "sold" ? "marked sold" : "archived"}`
                    : ` — already ${bulkResult.status}`}
                </li>
              ))}
              {bulkResult.failed.map(({ vehicleId, error }) => (
                <li key={vehicleId} className="text-destructive">
                  <span className="font-semibold">{vehicleId}</span> — {error}
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            {bulkResult ? (
              <Button type="button" onClick={closeBulkAction}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={bulkActionPending}
                  onClick={closeBulkAction}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={bulkActionPending}
                  onClick={() => void confirmBulkAction()}
                >
                  {bulkActionPending
                    ? "Processing…"
                    : bulkAction === "sold"
                      ? "Mark sold"
                      : "Archive vehicles"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  currentSort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentSort.key === sortKey;
  const Icon = active
    ? currentSort.direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead className={cn("px-3", align === "right" && "text-right")}>
      <button
        type="button"
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] font-bold focus-visible:outline-none",
          align === "right" && "justify-end",
        )}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </TableHead>
  );
}

function VehicleRowActions({
  vehicle,
  onDeleted,
}: {
  vehicle: StaffInventoryVehicleDTO;
  onDeleted: () => void;
}) {
  const title = `${vehicle.make} ${vehicle.model}`;
  const [lifecycleAction, setLifecycleAction] = useState<
    "published" | "reserved" | "sold" | "archived" | null
  >(null);
  const [isChangingLifecycle, setIsChangingLifecycle] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const hasPublicDetailPage = getPublicVehicleVisibility({
    status: vehicle.status,
    inspectionStatus: vehicle.inspectionStatus,
    isFeatured: vehicle.isFeatured,
  }).detail;

  const confirmLifecycleAction = async () => {
    if (!lifecycleAction || isChangingLifecycle) return;
    setIsChangingLifecycle(true);
    try {
      const response = await fetch(
        `/api/admin/vehicles/${encodeURIComponent(vehicle.id)}/lifecycle`,
        {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: vehicle.version,
            status: lifecycleAction,
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsedError = lifecycleMutationErrorSchema.safeParse(payload);
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Could not update the vehicle status.",
        );
      }

      const result = lifecycleMutationResponseSchema.parse(payload);
      if (result.status !== lifecycleAction) {
        throw new Error("The server returned an unexpected vehicle status.");
      }
      setLifecycleAction(null);
      if (result.changed) {
        if (result.status === "sold") toast.success("Vehicle marked sold.");
        else if (result.status === "archived")
          toast.success("Vehicle archived.");
        else if (result.status === "reserved")
          toast.success("Vehicle reserved.");
        else toast.success("Reservation released. Vehicle is available again.");
      } else {
        if (result.status === "sold")
          toast.info("This vehicle is already sold.");
        else if (result.status === "archived")
          toast.info("This vehicle is already archived.");
        else if (result.status === "reserved")
          toast.info("This vehicle is already reserved.");
        else toast.info("This vehicle is already published.");
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the vehicle status.",
      );
    } finally {
      setIsChangingLifecycle(false);
    }
  };

  const confirmDuplicate = async () => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      const response = await fetch(
        `/api/admin/vehicles/${encodeURIComponent(vehicle.id)}/duplicate`,
        {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedVersion: vehicle.version }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsedError = lifecycleMutationErrorSchema.safeParse(payload);
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Could not duplicate the vehicle.",
        );
      }

      const duplicate = duplicateMutationResponseSchema.parse(payload);
      setIsDuplicateDialogOpen(false);
      toast.success(
        `${duplicate.stockNumber} created as a draft without images.`,
      );
      router.push(
        `${adminRoutes.vehicles}/${encodeURIComponent(duplicate.vehicleId)}/edit`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not duplicate the vehicle.",
      );
    } finally {
      setIsDuplicating(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/vehicles/${encodeURIComponent(vehicle.id)}`,
        {
          method: "DELETE",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: vehicle.version,
            confirmPermanently: true,
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsedError = lifecycleMutationErrorSchema.safeParse(payload);
        throw new Error(
          parsedError.success
            ? parsedError.data.error
            : "Could not delete the vehicle.",
        );
      }

      const result = deleteMutationResponseSchema.parse(payload);
      if (result.vehicleId !== vehicle.id) {
        throw new Error("The server returned an unexpected vehicle.");
      }
      setIsDeleteDialogOpen(false);
      onDeleted();
      toast.success(
        `${vehicle.stockNumber} deleted. Its media assets remain in the Media Library.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete the vehicle.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-[var(--radius-sm)]"
            aria-label={`Open actions for ${title}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>{vehicle.stockNumber}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hasPublicDetailPage ? (
            <DropdownMenuItem asChild>
              <Link
                href={routeBuilders.vehicleDetails(
                  encodeURIComponent(vehicle.slug),
                )}
              >
                <Eye />
                View public page
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link
                href={`${adminRoutes.vehicles}/${encodeURIComponent(vehicle.id)}/preview`}
              >
                <Eye />
                Staff-only preview
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`${adminRoutes.vehicles}/${vehicle.id}/edit`}>
              <FilePenLine />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsDuplicateDialogOpen(true)}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          {vehicle.status === "draft" && vehicle.publishedAt === null && (
            <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)}>
              <Trash2 />
              Delete permanently
            </DropdownMenuItem>
          )}
          {["published", "reserved"].includes(vehicle.status) && (
            <DropdownMenuItem onSelect={() => setLifecycleAction("sold")}>
              <BadgeCheck />
              Mark sold
            </DropdownMenuItem>
          )}
          {vehicle.status === "published" && (
            <DropdownMenuItem onSelect={() => setLifecycleAction("reserved")}>
              <CalendarDays />
              Mark reserved
            </DropdownMenuItem>
          )}
          {vehicle.status === "reserved" && (
            <DropdownMenuItem onSelect={() => setLifecycleAction("published")}>
              <CalendarDays />
              Release reservation
            </DropdownMenuItem>
          )}
          {vehicle.status !== "archived" && (
            <DropdownMenuItem onSelect={() => setLifecycleAction("archived")}>
              <Archive />
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={lifecycleAction !== null}
        onOpenChange={(open) => {
          if (!open && !isChangingLifecycle) setLifecycleAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lifecycleAction === "sold"
                ? `Mark ${title} as sold?`
                : lifecycleAction === "archived"
                  ? `Archive ${title}?`
                  : lifecycleAction === "reserved"
                    ? `Mark ${title} as reserved?`
                    : `Release ${title}'s reservation?`}
            </DialogTitle>
            <DialogDescription>
              {lifecycleAction === "sold"
                ? "This records the completed sale, clears any reservation, removes the vehicle from active stock, and keeps its sold detail page available."
                : lifecycleAction === "archived"
                  ? "This removes the vehicle from public pages without permanently deleting it. Its history is retained; restore it to Draft before republishing."
                  : lifecycleAction === "reserved"
                    ? "This removes the vehicle from available stock and clears Featured placement. No automatic expiry is set; staff must release the reservation."
                    : "This makes the vehicle available again. Featured placement is not restored automatically."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isChangingLifecycle}
              onClick={() => setLifecycleAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                lifecycleAction === "sold" || lifecycleAction === "archived"
                  ? "destructive"
                  : "primary"
              }
              disabled={isChangingLifecycle}
              onClick={() => void confirmLifecycleAction()}
            >
              {isChangingLifecycle
                ? "Saving…"
                : lifecycleAction === "sold"
                  ? "Mark sold"
                  : lifecycleAction === "archived"
                    ? "Archive vehicle"
                    : lifecycleAction === "reserved"
                      ? "Reserve vehicle"
                      : "Release reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDuplicateDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDuplicating) setIsDuplicateDialogOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate {title} as a draft?</DialogTitle>
            <DialogDescription>
              This creates a draft with a new stock number and URL, copies the
              vehicle details, and clears its VIN, sale, reservation, and
              publication state. Images are not copied; add images in the editor
              before publishing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDuplicating}
              onClick={() => setIsDuplicateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDuplicating}
              onClick={() => void confirmDuplicate()}
            >
              {isDuplicating ? "Creating…" : "Create draft copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setIsDeleteDialogOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {title} permanently?</DialogTitle>
            <DialogDescription>
              This permanently removes the never-published draft and its status
              history. Attached media assets remain in the Media Library.
              Previously published vehicles cannot be deleted, and linked
              records are never deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete draft permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({ status }: { status: AdminVehicleStatus }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        status === "published" && "bg-success/10 text-success",
        status === "reserved" && "bg-warning/10 text-warning",
        status === "sold" && "bg-info/10 text-info",
        status === "draft" && "bg-accent/10 text-accent",
        status === "archived" && "bg-muted text-muted-foreground dark:bg-muted",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
