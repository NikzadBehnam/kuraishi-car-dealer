"use client";

import { useState } from "react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
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
  className?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  triggerRef?: React.Ref<HTMLButtonElement>;
  minDate?: Date;
};

export function DatePicker({
  id,
  className,
  value,
  onChange,
  placeholder = "Datum auswählen",
  disabled,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
  triggerRef,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  const currentYear = (minDate ?? new Date()).getFullYear();
  const minYear = currentYear;
  const maxYear = currentYear + 3;
  const [visibleMonth, setVisibleMonth] = useState(
    selected ?? minDate ?? new Date(),
  );
  const [view, setView] = useState<"calendar" | "months" | "years">("calendar");
  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const firstAllowedMonth = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    : new Date(minYear, 0, 1);
  const lastAllowedMonth = new Date(maxYear, 11, 1);
  const monthStart = startOfMonth(visibleMonth);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && monthStart < firstAllowedMonth) {
          setVisibleMonth(firstAllowedMonth);
        }
        if (!nextOpen) setView("calendar");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          ref={triggerRef}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          data-empty={!selected}
          className={cn(
            "control h-auto min-h-9 min-w-0 justify-start rounded-[var(--radius-sm)] px-3 text-left font-normal whitespace-normal hover:translate-y-0",
            "data-[empty=true]:text-muted-foreground",
            className,
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
                disabled={monthStart <= firstAllowedMonth}
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
                  className="min-h-9 px-2 hover:translate-y-0"
                  aria-label="Monat auswählen"
                  onClick={() => setView("months")}
                >
                  {months[visibleMonthIndex]}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 px-2 hover:translate-y-0"
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
                disabled={monthStart >= lastAllowedMonth}
                aria-label="Nächster Monat"
                onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Calendar
              mode="single"
              locale={de}
              today={minDate}
              labels={{
                labelDayButton: (date, { today, selected }) =>
                  `${today ? "Heute, " : ""}${format(date, "PPPP", { locale: de })}${selected ? ", ausgewählt" : ""}`,
              }}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              captionLayout="label"
              className="pt-1 [--cell-size:min(2.25rem,calc((100vw_-_4rem)/7))]"
              classNames={{ month_caption: "hidden", nav: "hidden" }}
              startMonth={firstAllowedMonth}
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
          <div className="w-72 max-w-full p-3">
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
                className="min-h-9 px-2 hover:translate-y-0"
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
            <div className="grid grid-cols-3 gap-1">
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
                    className="min-h-9 px-2 hover:translate-y-0"
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
          <div className="w-72 max-w-full p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mb-3 w-full hover:translate-y-0"
              onClick={() => setView("calendar")}
            >
              Kalender anzeigen
            </Button>
            <div className="grid grid-cols-2 gap-1">
              {Array.from(
                { length: maxYear - minYear + 1 },
                (_, index) => minYear + index,
              ).map((year) => (
                <Button
                  key={year}
                  type="button"
                  variant={year === visibleYear ? "accent" : "ghost"}
                  size="sm"
                  className="min-h-9 px-2 hover:translate-y-0"
                  aria-pressed={year === visibleYear}
                  autoFocus={year === visibleYear}
                  onClick={() => {
                    const target = new Date(year, visibleMonthIndex);
                    setVisibleMonth(
                      target < firstAllowedMonth ? firstAllowedMonth : target,
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
