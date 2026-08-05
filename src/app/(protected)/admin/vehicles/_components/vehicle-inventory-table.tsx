"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
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

import type { AdminVehicle, AdminVehicleStatus } from "@/types/admin";
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

type SortKey =
  | "title"
  | "price"
  | "mileage"
  | "status"
  | "location"
  | "lastUpdatedAt";

type SortDirection = "asc" | "desc";

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
}: {
  vehicles: AdminVehicle[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminVehicleStatus>(
    "all",
  );
  const [sort, setSort] = useState<SortState>({
    key: "lastUpdatedAt",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");
    const filtered = vehicles.filter((vehicle) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          vehicle.stockNumber,
          vehicle.make,
          vehicle.model,
          vehicle.variant,
          vehicle.location,
        ]
          .join(" ")
          .toLocaleLowerCase("de")
          .includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" || vehicle.status === statusFilter;

      return matchesQuery && matchesStatus;
    });

    return filtered.toSorted((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      const valueA = getSortValue(a, sort.key);
      const valueB = getSortValue(b, sort.key);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return (valueA - valueB) * direction;
      }

      return String(valueA).localeCompare(String(valueB), "de") * direction;
    });
  }, [query, sort, statusFilter, vehicles]);

  const pageCount = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedVehicles = filteredVehicles.slice(
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

  const updateSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value as "all" | AdminVehicleStatus);
    setPage(1);
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
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
      <section className="min-w-0 rounded-[var(--radius-sm)] border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Inventory table</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mocked admin inventory with client-side controls for UI review.
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
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search title, stock number, location"
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
        <section className="grid min-w-0 gap-3 rounded-[var(--radius-sm)] border bg-surface p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
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

      <section className="min-w-0 overflow-hidden rounded-[var(--radius-sm)] border bg-surface">
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
                    <div className="relative h-12 w-16 overflow-hidden rounded-[var(--radius-sm)] bg-secondary">
                      <Image
                        fill
                        sizes="4rem"
                        src={vehicle.images[0]}
                        alt=""
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="min-w-64 px-3">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">
                        {vehicle.make} {vehicle.model}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {vehicle.stockNumber} - {vehicle.variant}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-right font-extrabold">
                    {formatCurrency(vehicle.price)}
                  </TableCell>
                  <TableCell className="px-3">
                    {formatMileage(vehicle.mileage)}
                  </TableCell>
                  <TableCell className="px-3">
                    {formatFuelType(vehicle.fuelType)}
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
                      <span className="text-xs font-bold text-muted-foreground">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3">{vehicle.location}</TableCell>
                  <TableCell className="whitespace-nowrap px-3 text-xs font-bold text-muted-foreground">
                    {formatDateTime(vehicle.lastUpdatedAt)}
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
                    <span className="grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
                      <CarFront className="size-6" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-extrabold">No vehicles found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Adjust the search or status filter to show more mock
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
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <strong className="text-foreground">
              {paginatedVehicles.length}
            </strong>{" "}
            of{" "}
            <strong className="text-foreground">
              {filteredVehicles.length}
            </strong>{" "}
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
              onClick={() =>
                setPage((value) => Math.min(pageCount, value + 1))
              }
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
          "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] font-bold hover:text-foreground focus-visible:outline-none",
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

function VehicleRowActions({ vehicle }: { vehicle: AdminVehicle }) {
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
        status === "archived" &&
          "bg-muted text-muted-foreground dark:bg-muted",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function getSortValue(vehicle: AdminVehicle, key: SortKey) {
  if (key === "title") return `${vehicle.make} ${vehicle.model}`;
  if (key === "price") return vehicle.price;
  if (key === "mileage") return vehicle.mileage;
  if (key === "status") return vehicle.status;
  if (key === "location") return vehicle.location;
  return vehicle.lastUpdatedAt;
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
