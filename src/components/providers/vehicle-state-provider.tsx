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
interface VehicleState {
  comparison: Set<string>;
  toggleComparison: (id: string) => void;
}
const Context = createContext<VehicleState | null>(null);
export function VehicleStateProvider({ children }: { children: ReactNode }) {
  const [comparison, setComparison] = useState(new Set<string>());
  const comparisonRef = useRef(comparison);

  useEffect(() => {
    queueMicrotask(() => {
      const storedComparison = new Set(
        JSON.parse(
          localStorage.getItem("kuraishi-comparison") ?? "[]",
        ) as string[],
      );

      comparisonRef.current = storedComparison;
      setComparison(storedComparison);
    });
  }, []);
  const toggleComparison = useCallback((id: string) => {
    const next = new Set(comparisonRef.current);
    const removed = next.delete(id);

    if (!removed && next.size >= 3) {
      toast.error("Maximal drei Fahrzeuge können verglichen werden.");
      return;
    }

    if (!removed) next.add(id);

    comparisonRef.current = next;
    setComparison(next);
    localStorage.setItem("kuraishi-comparison", JSON.stringify([...next]));
    toast.success(
      removed
        ? "Fahrzeug wurde aus dem Vergleich entfernt."
        : "Fahrzeug wurde zum Vergleich hinzugefügt.",
    );
  }, []);
  const value = useMemo(
    () => ({ comparison, toggleComparison }),
    [comparison, toggleComparison],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useVehicleState() {
  const value = useContext(Context);
  if (!value)
    throw new Error("useVehicleState must be used within VehicleStateProvider");
  return value;
}
