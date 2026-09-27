"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
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

import { adminRoutes } from "@/config/admin-routes.config";
import { routeBuilders } from "@/config/routes.config";
import {
  createAdminVehicleListingSearchParams,
  buildAdminVehicleListingHref,
} from "@/features/vehicles/admin-listing-search-params";
import type {
  AdminVehicleSortField,
  VehicleStatus,
} from "@/features/vehicles/constants";
import type { AdminVehicleListItemDto } from "@/features/vehicles/dto";
import type { AdminVehicleListQuery } from "@/features/vehicles/schemas";
import type { PaginatedResult } from "@/features/shared/pagination";
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

const statusLabels: Record<VehicleStatus, string> = {
  draft: "Draft",
  available: "Available",
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

export function VehicleInventoryTable({
  query,
  result,
}: {
  query: AdminVehicleListQuery;
  result: PaginatedResult<AdminVehicleListItemDto>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query.search ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleIds = result.items.map((vehicle) => vehicle.id);
  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const selectedCount = selectedIds.size;

  const navigate = (params: URLSearchParams) => {
    const queryString = params.toString();
    const href = queryString
      ? `${adminRoutes.vehicles}?${queryString}`
      : adminRoutes.vehicles;

    startTransition(() => router.push(href));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = createAdminVehicleListingSearchParams(query);
    const normalizedSearch = searchValue.trim();

    if (normalizedSearch) params.set("search", normalizedSearch);
    else params.delete("search");

    params.delete("page");
    navigate(params);
  };

  const updateStatusFilter = (value: string) => {
    const params = createAdminVehicleListingSearchParams(query);

    if (value === "all") params.delete("status");
    else params.set("status", value);

    params.delete("page");
    navigate(params);
  };

  const toggleSort = (sortField: AdminVehicleSortField) => {
    const params = createAdminVehicleListingSearchParams(query);
    const sortDirection =
      query.sortField === sortField && query.sortDirection === "asc"
        ? "desc"
        : "asc";

    params.set("sortField", sortField);
    params.set("sortDirection", sortDirection);
    params.delete("page");
    navigate(params);
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
    <div className={cn("grid min-w-0 gap-4", isPending && "opacity-70")}>
      <section className="bg-surface min-w-0 rounded-[var(--radius-sm)] border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Inventory table</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Search and review the current inventory from the vehicle database.
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
          <form className="flex min-w-0 gap-2" onSubmit={submitSearch}>
            <div className="relative min-w-0 flex-1">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search vehicle or stock number"
                aria-label="Search vehicles"
                className="bg-background pl-9"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="rounded-[var(--radius-sm)]"
              disabled={isPending}
            >
              Search
            </Button>
          </form>
          <Select
            value={query.status ?? "all"}
            onValueChange={updateStatusFilter}
            disabled={isPending}
          >
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
                label="Vehicle"
                sortField="make"
                query={query}
                onSort={toggleSort}
              />
              <SortableHead
                label="Price"
                sortField="priceCents"
                query={query}
                onSort={toggleSort}
                align="right"
              />
              <SortableHead
                label="Mileage"
                sortField="mileage"
                query={query}
                onSort={toggleSort}
              />
              <TableHead className="px-3">Fuel</TableHead>
              <SortableHead
                label="Status"
                sortField="status"
                query={query}
                onSort={toggleSort}
              />
              <TableHead className="px-3">Featured</TableHead>
              <SortableHead
                label="Updated"
                sortField="updatedAt"
                query={query}
                onSort={toggleSort}
              />
              <TableHead className="w-12 px-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length ? (
              result.items.map((vehicle) => (
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
                    <VehicleCoverImage vehicle={vehicle} />
                  </TableCell>
                  <TableCell className="min-w-64 px-3">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">
                        {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {vehicle.stockNumber} - {vehicle.variant}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-right font-extrabold">
                    {formatCurrency(vehicle.priceCents / 100)}
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
                      <span className="text-muted-foreground text-xs font-bold">
                        No
                      </span>
                    )}
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
                <TableCell colSpan={10} className="p-8 text-center">
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
            <strong className="text-foreground">{result.items.length}</strong>{" "}
            of <strong className="text-foreground">{result.total}</strong>{" "}
            vehicles
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
            {result.hasPreviousPage ? (
              <Button
                asChild
                variant="outline"
                className="rounded-[var(--radius-sm)]"
              >
                <Link
                  href={buildAdminVehicleListingHref(query, query.page - 1)}
                >
                  Previous
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-[var(--radius-sm)]"
                disabled
              >
                Previous
              </Button>
            )}
            <span className="text-center text-sm font-bold">
              Page {result.page} of {Math.max(1, result.totalPages)}
            </span>
            {result.hasNextPage ? (
              <Button
                asChild
                variant="outline"
                className="rounded-[var(--radius-sm)]"
              >
                <Link
                  href={buildAdminVehicleListingHref(query, query.page + 1)}
                >
                  Next
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-[var(--radius-sm)]"
                disabled
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SortableHead({
  label,
  sortField,
  query,
  onSort,
  align = "left",
}: {
  label: string;
  sortField: AdminVehicleSortField;
  query: AdminVehicleListQuery;
  onSort: (sortField: AdminVehicleSortField) => void;
  align?: "left" | "right";
}) {
  const active = query.sortField === sortField;
  const Icon = active
    ? query.sortDirection === "asc"
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
        onClick={() => onSort(sortField)}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </TableHead>
  );
}

function VehicleCoverImage({ vehicle }: { vehicle: AdminVehicleListItemDto }) {
  return (
    <div className="bg-secondary text-muted-foreground relative grid h-12 w-16 place-items-center overflow-hidden rounded-[var(--radius-sm)]">
      {vehicle.coverImage ? (
        <Image
          fill
          sizes="4rem"
          src={vehicle.coverImage.url}
          alt={vehicle.coverImage.altText}
          className="object-cover"
        />
      ) : (
        <CarFront className="size-5" aria-hidden="true" />
      )}
    </div>
  );
}

function VehicleRowActions({ vehicle }: { vehicle: AdminVehicleListItemDto }) {
  const title = `${vehicle.make} ${vehicle.model}`;
  const hasPublicPage =
    vehicle.status === "available" || vehicle.status === "reserved";

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
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{vehicle.stockNumber}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasPublicPage ? (
          <DropdownMenuItem asChild>
            <Link href={routeBuilders.vehicleDetails(vehicle.slug)}>
              <Eye />
              View public page
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <Eye />
            Public page unavailable
          </DropdownMenuItem>
        )}
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

function StatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        status === "available" && "bg-success/10 text-success",
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
