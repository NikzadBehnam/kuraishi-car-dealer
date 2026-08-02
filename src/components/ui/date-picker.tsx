"use client";

import { useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

type DatePickerProps = {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  minDate?: Date;
};

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Datum auswählen",
  disabled,
  invalid,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  const currentYear = new Date().getFullYear();
  const minYear = currentYear;
  const maxYear = currentYear + 3;
  const [visibleMonth, setVisibleMonth] = useState(selected ?? new Date());
  const [view, setView] = useState<"calendar" | "months" | "years">("calendar");
  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const yearPageStart = Math.floor(visibleYear / 12) * 12;
  const yearPageEnd = Math.min(yearPageStart + 11, maxYear);
  const firstAllowedMonth = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    : new Date(minYear, 0, 1);
  const lastAllowedMonth = new Date(maxYear, 11, 1);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setView("calendar");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          data-empty={!selected}
          className={cn(
            "control h-12 justify-start rounded-[var(--radius-sm)] px-3 text-left font-normal hover:translate-y-0",
            "data-[empty=true]:text-muted-foreground",
          )}
        >
          <CalendarIcon className="text-muted-foreground size-4" />
          {selected ? format(selected, "PPP", { locale: de }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
        align="start"
        collisionPadding={16}
      >
        {view === "calendar" ? (
          <>
            <div className="flex items-center justify-between gap-1 px-3 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-0"
                disabled={visibleMonth <= firstAllowedMonth}
                aria-label="Vorheriger Monat"
                onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 min-w-20 hover:translate-y-0"
                  aria-label="Monat auswählen"
                  onClick={() => setView("months")}
                >
                  {months[visibleMonthIndex]}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 min-w-20 hover:translate-y-0"
                  aria-label="Jahr auswählen"
                  onClick={() => setView("years")}
                >
                  {visibleYear}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-0"
                disabled={visibleMonth >= lastAllowedMonth}
                aria-label="Nächster Monat"
                onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Calendar
              mode="single"
              locale={de}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              captionLayout="label"
              className="pt-1"
              classNames={{ month_caption: "hidden", nav: "hidden" }}
              startMonth={new Date(minYear, 0)}
              endMonth={new Date(maxYear, 11)}
              selected={selected}
              disabled={minDate ? { before: minDate } : undefined}
              onSelect={(date) => {
                onChange(date ? format(date, "yyyy-MM-dd") : "");
                if (date) setOpen(false);
              }}
              autoFocus
            />
          </>
        ) : view === "months" ? (
          <div className="w-72 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-0"
                disabled={visibleYear <= minYear}
                aria-label="Vorheriges Jahr"
                onClick={() =>
                  setVisibleMonth(
                    (month) =>
                      new Date(month.getFullYear() - 1, month.getMonth()),
                  )
                }
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 min-w-28 hover:translate-y-0"
                aria-label="Jahr auswählen"
                onClick={() => setView("years")}
              >
                {visibleYear}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-0"
                disabled={visibleYear >= maxYear}
                aria-label="Nächstes Jahr"
                onClick={() =>
                  setVisibleMonth(
                    (month) =>
                      new Date(month.getFullYear() + 1, month.getMonth()),
                  )
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1" role="grid">
              {months.map((month, index) => {
                const candidate = new Date(visibleYear, index, 1);
                const unavailable =
                  candidate < firstAllowedMonth || candidate > lastAllowedMonth;
                return (
                  <Button
                    key={month}
                    type="button"
                    variant={index === visibleMonthIndex ? "accent" : "ghost"}
                    size="sm"
                    className="min-h-10 px-2 hover:translate-y-0"
                    disabled={unavailable}
                    aria-pressed={index === visibleMonthIndex}
                    onClick={() => {
                      setVisibleMonth(new Date(visibleYear, index, 1));
                      setView("calendar");
                    }}
                  >
                    {month}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-72 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-0"
                disabled={yearPageStart <= minYear}
                aria-label="Vorherige Jahre"
                onClick={() =>
                  setVisibleMonth(
                    (month) =>
                      new Date(month.getFullYear() - 12, month.getMonth()),
                  )
                }
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 min-w-28 hover:translate-y-0"
                aria-label="Kalender anzeigen"
                onClick={() => setView("calendar")}
              >
                {Math.max(yearPageStart, minYear)}–{yearPageEnd}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-0"
                disabled={yearPageEnd >= maxYear}
                aria-label="Nächste Jahre"
                onClick={() =>
                  setVisibleMonth(
                    (month) =>
                      new Date(month.getFullYear() + 12, month.getMonth()),
                  )
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1" role="grid">
              {Array.from(
                { length: 12 },
                (_, index) => yearPageStart + index,
              ).map((year) => (
                <Button
                  key={year}
                  type="button"
                  variant={year === visibleYear ? "accent" : "ghost"}
                  size="sm"
                  className="min-h-10 px-2 hover:translate-y-0"
                  disabled={year < minYear || year > maxYear}
                  aria-pressed={year === visibleYear}
                  onClick={() => {
                    setVisibleMonth(
                      (month) => new Date(year, month.getMonth()),
                    );
                    setView("calendar");
                  }}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
