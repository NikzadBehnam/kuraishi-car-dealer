"use client";

import { useState } from "react";
import {
  CalendarIcon,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const months = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

type MonthPickerProps = {
  id?: string;
  className?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
};

export function MonthPicker({
  id,
  className,
  value,
  onChange,
  placeholder = "Monat auswählen",
  invalid,
  disabled,
  minYear = 1950,
  maxYear = new Date().getFullYear(),
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"months" | "years">("months");
  const [selectedYear, selectedMonth] = value
    ? value.split("-").map(Number)
    : [];
  const [visibleYear, setVisibleYear] = useState(
    selectedYear || Math.min(new Date().getFullYear(), maxYear),
  );
  const currentMonth = new Date().getMonth() + 1;
  const yearPageStart = Math.floor(visibleYear / 12) * 12;
  const yearPageEnd = Math.min(yearPageStart + 11, maxYear);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          data-empty={!value}
          className={cn(
            "control justify-start rounded-sm px-3 text-left font-normal hover:translate-y-0",
            "data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="text-muted-foreground size-4" />
          {value ? `${months[selectedMonth - 1]} ${selectedYear}` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start" collisionPadding={16}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 min-h-0"
            disabled={
              view === "months"
                ? visibleYear <= minYear
                : yearPageStart <= minYear
            }
            aria-label={
              view === "months" ? "Vorheriges Jahr" : "Vorherige Jahre"
            }
            onClick={() =>
              setVisibleYear((year) => year - (view === "months" ? 1 : 12))
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 min-w-28 hover:translate-y-0"
            aria-label={
              view === "months" ? "Jahr auswählen" : "Monate anzeigen"
            }
            aria-expanded={view === "years"}
            onClick={() =>
              setView((current) => (current === "months" ? "years" : "months"))
            }
          >
            <CalendarRange className="size-4" />
            {view === "months"
              ? visibleYear
              : `${Math.max(yearPageStart, minYear)}–${yearPageEnd}`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 min-h-0"
            disabled={
              view === "months"
                ? visibleYear >= maxYear
                : yearPageEnd >= maxYear
            }
            aria-label={view === "months" ? "Nächstes Jahr" : "Nächste Jahre"}
            onClick={() =>
              setVisibleYear((year) => year + (view === "months" ? 1 : 12))
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1" role="grid">
          {view === "months"
            ? months.map((month, index) => {
                const monthNumber = index + 1;
                const isSelected =
                  selectedYear === visibleYear && selectedMonth === monthNumber;
                const isFuture =
                  visibleYear === maxYear && monthNumber > currentMonth;

                return (
                  <Button
                    key={month}
                    type="button"
                    variant={isSelected ? "accent" : "ghost"}
                    size="sm"
                    className="min-h-9 px-2 hover:translate-y-0"
                    disabled={isFuture}
                    aria-pressed={isSelected}
                    onClick={() => {
                      onChange(
                        `${visibleYear}-${String(monthNumber).padStart(2, "0")}`,
                      );
                      setOpen(false);
                    }}
                  >
                    {month}
                  </Button>
                );
              })
            : Array.from(
                { length: 12 },
                (_, index) => yearPageStart + index,
              ).map((year) => {
                const unavailable = year < minYear || year > maxYear;
                return (
                  <Button
                    key={year}
                    type="button"
                    variant={year === visibleYear ? "accent" : "ghost"}
                    size="sm"
                    className="min-h-9 px-2 hover:translate-y-0"
                    disabled={unavailable}
                    aria-pressed={year === visibleYear}
                    onClick={() => {
                      setVisibleYear(year);
                      setView("months");
                    }}
                  >
                    {year}
                  </Button>
                );
              })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
