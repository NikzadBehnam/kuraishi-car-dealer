"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const pageSize = 8;

export function VehicleInventoryTable({
  vehicles,
  total,
  filters,
}: {
  vehicles: StaffInventoryVehicleDTO[];
  total: number;
  filters: StaffInventoryFilters;
}) {
  const [query, setQuery] = useState(filters.search);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const sort: SortState = { key: filters.sort, direction: filters.direction };
  const statusFilter = filters.status ?? "all";
  const pageCount = Math.max(1, Math.ceil(vehicles.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedVehicles = vehicles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const visibleIds = paginatedVehicles.map((vehicle) => vehicle.id);
  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const selectedCount = selectedIds.size;

  useEffect(() => {
    if (query === filters.search) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParamsString);
      if (query.trim()) params.set("search", query.trim());
      else params.delete("search");
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters.search, pathname, query, router, searchParamsString]);

  const updateSearchParams = (
    updates: Partial<
      Record<"search" | "status" | "sort" | "direction", string | null>
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
    setPage(1);
  };

  const updateStatusFilter = (value: string) => {
    setPage(1);
    updateSearchParams({ status: value === "all" ? null : value });
  };

  const toggleSort = (key: SortKey) => {
    const direction =
      sort.key === key && sort.direction === "asc" ? "desc" : "asc";
    setPage(1);
    updateSearchParams({
      sort: key === "lastUpdatedAt" ? null : key,
      direction:
        key === "lastUpdatedAt" && direction === "desc" ? null : direction,
    });
  };

  const toggleVehicle = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  return (
    <div className="grid min-w-0 gap-4">
      <section className="bg-surface min-w-0 rounded-[var(--radius-sm)] border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Inventory table</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Database inventory with client-side controls for the loaded
              records.
            </p>
            {total > vehicles.length && (
              <p
                className="text-warning mt-1 text-sm font-semibold"
                role="status"
              >
                Showing the first {vehicles.length} of {total} vehicles.
                Server-side pagination is not available yet.
              </p>
            )}
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
          <p className="text-sm font-bold">
            {selectedCount} vehicle{selectedCount === 1 ? "" : "s"} selected
          </p>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => mockBulkAction("Archive", selectedCount)}
            >
              <Archive />
              Archive
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => mockBulkAction("Mark sold", selectedCount)}
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
            {paginatedVehicles.length ? (
              paginatedVehicles.map((vehicle) => (
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
                    <VehicleRowActions vehicle={vehicle} />
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
              {paginatedVehicles.length}
            </strong>{" "}
            of <strong className="text-foreground">{vehicles.length}</strong>{" "}
            vehicles
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              className="rounded-[var(--radius-sm)]"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <span className="text-center text-sm font-bold">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              className="rounded-[var(--radius-sm)]"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
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

function VehicleRowActions({ vehicle }: { vehicle: StaffInventoryVehicleDTO }) {
  const title = `${vehicle.make} ${vehicle.model}`;

  return (
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
        <DropdownMenuItem asChild>
          <Link href={routeBuilders.vehicleDetails(vehicle.slug)}>
            <Eye />
            View public page
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${adminRoutes.vehicles}/${vehicle.id}/edit`}>
            <FilePenLine />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => mockRowAction("Duplicate", title)}>
          <Copy />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => mockRowAction("Mark sold", title)}>
          <BadgeCheck />
          Mark sold
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => mockRowAction("Archive", title)}>
          <Archive />
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

function mockRowAction(action: string, title: string) {
  toast.info(`${action} is UI-only for ${title}.`);
}

function mockBulkAction(action: string, count: number) {
  toast.info(`${action} is UI-only for ${count} selected vehicles.`);
}
