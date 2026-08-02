"use client";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export function FinancingCalculator() {
  const [price, setPrice] = useState(39900);
  const [downPayment, setDownPayment] = useState(5000);
  const [months, setMonths] = useState(48);
  const rate = useMemo(() => {
    const interest = 0.0549 / 12;
    return (
      ((price - downPayment) * interest * Math.pow(1 + interest, months)) /
      (Math.pow(1 + interest, months) - 1)
    );
  }, [price, downPayment, months]);
  return (
    <div className="grid gap-5">
      <label className="field">
        Fahrzeugpreis
        <input
          className="control"
          type="number"
          value={price}
          onChange={(event) => setPrice(Number(event.target.value))}
        />
      </label>
      <label className="field">
        Anzahlung
        <input
          className="control"
          type="number"
          value={downPayment}
          onChange={(event) => setDownPayment(Number(event.target.value))}
        />
      </label>
      <div className="field">
        <span>Laufzeit</span>
        <Select
          value={String(months)}
          onValueChange={(value) => setMonths(Number(value))}
        >
          <SelectTrigger aria-label="Laufzeit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="36">36 Monate</SelectItem>
            <SelectItem value="48">48 Monate</SelectItem>
            <SelectItem value="60">60 Monate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="bg-primary rounded-xl p-6 text-white">
        <span className="text-sm text-[#c9d3df]">
          Unverbindliche Beispielrate
        </span>
        <strong className="mt-2 block text-3xl">
          {formatCurrency(Math.round(rate))} mtl.
        </strong>
        <small>Effektiver Jahreszins 5,49 % · kein Kreditangebot</small>
      </div>
    </div>
  );
}
