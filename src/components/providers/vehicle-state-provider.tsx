"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { inventoryIdSchema } from "@/lib/inventory-validation";
import {
  MAX_COMPARISON_VEHICLES,
  parseComparisonStorage,
} from "@/lib/vehicle-comparison-storage";

interface VehicleState {
  comparison: Set<string>;
  ready: boolean;
  toggleComparison: (id: string) => void;
  removeComparisonItems: (ids: string[]) => void;
  clearComparison: () => void;
}

const STORAGE_KEY = "kuraishi-comparison";
const Context = createContext<VehicleState | null>(null);

function isBrowserStorageError(error: unknown): error is DOMException {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "SecurityError" || error.name === "QuotaExceededError")
  );
}

export function VehicleStateProvider({ children }: { children: ReactNode }) {
  const [comparison, setComparison] = useState(new Set<string>());
  const [ready, setReady] = useState(false);
  const comparisonRef = useRef(comparison);

  const commitComparison = useCallback((next: Set<string>) => {
    comparisonRef.current = next;
    setComparison(next);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return true;
    } catch (error) {
      if (!isBrowserStorageError(error)) {
        throw error;
      }
      toast.error(
        "Die Vergleichsauswahl ist nur für diese Sitzung verfügbar; der Browser erlaubt keine Speicherung.",
      );
      return false;
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      let restored = new Set<string>();

      try {
        const stored = parseComparisonStorage(
          localStorage.getItem(STORAGE_KEY),
        );
        restored = new Set(stored.ids);
        if (stored.needsRewrite) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.ids));
          toast.message(
            "Ungültige oder veraltete Vergleichsauswahl wurde bereinigt.",
          );
        }
      } catch (error) {
        if (!isBrowserStorageError(error)) {
          throw error;
        }
        toast.error(
          "Die gespeicherte Vergleichsauswahl konnte nicht geladen werden.",
        );
      }

      comparisonRef.current = restored;
      setComparison(restored);
      setReady(true);
    });
  }, []);

  const toggleComparison = useCallback(
    (id: string) => {
      if (!ready) {
        toast.message("Die gespeicherte Vergleichsauswahl wird noch geladen.");
        return;
      }

      if (!inventoryIdSchema.safeParse(id).success) {
        toast.error("Dieses Fahrzeug kann nicht verglichen werden.");
        return;
      }

      const next = new Set(comparisonRef.current);
      const removed = next.delete(id);

      if (!removed && next.size >= MAX_COMPARISON_VEHICLES) {
        toast.error("Maximal drei Fahrzeuge können verglichen werden.");
        return;
      }

      if (!removed) {
        next.add(id);
      }

      if (commitComparison(next)) {
        toast.success(
          removed
            ? "Fahrzeug wurde aus dem Vergleich entfernt."
            : "Fahrzeug wurde zum Vergleich hinzugefügt.",
        );
      }
    },
    [commitComparison, ready],
  );

  const removeComparisonItems = useCallback(
    (ids: string[]) => {
      const removedIds = new Set(ids);
      const current = comparisonRef.current;
      const next = new Set([...current].filter((id) => !removedIds.has(id)));
      if (next.size === current.size) {
        return;
      }

      if (commitComparison(next)) {
        toast.message(
          "Nicht mehr vergleichbare Fahrzeuge wurden aus der Auswahl entfernt.",
        );
      }
    },
    [commitComparison],
  );

  const clearComparison = useCallback(() => {
    if (comparisonRef.current.size === 0) {
      return;
    }

    if (commitComparison(new Set())) {
      toast.success("Alle Fahrzeuge wurden aus dem Vergleich entfernt.");
    }
  }, [commitComparison]);

  const value = useMemo(
    () => ({
      comparison,
      ready,
      toggleComparison,
      removeComparisonItems,
      clearComparison,
    }),
    [
      comparison,
      ready,
      toggleComparison,
      removeComparisonItems,
      clearComparison,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useVehicleState() {
  const value = useContext(Context);
  if (!value) {
    throw new Error("useVehicleState must be used within VehicleStateProvider");
  }
  return value;
}
