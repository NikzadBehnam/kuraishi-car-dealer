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
  favourites: Set<string>;
  comparison: Set<string>;
  toggleFavourite: (id: string) => void;
  toggleComparison: (id: string) => void;
}
const Context = createContext<VehicleState | null>(null);
export function VehicleStateProvider({ children }: { children: ReactNode }) {
  const [favourites, setFavourites] = useState(new Set<string>());
  const [comparison, setComparison] = useState(new Set<string>());
  const favouritesRef = useRef(favourites);
  const comparisonRef = useRef(comparison);

  useEffect(() => {
    queueMicrotask(() => {
      const storedFavourites = new Set(
        JSON.parse(
          localStorage.getItem("kuraishi-favourites") ?? "[]",
        ) as string[],
      );
      const storedComparison = new Set(
        JSON.parse(
          localStorage.getItem("kuraishi-comparison") ?? "[]",
        ) as string[],
      );

      favouritesRef.current = storedFavourites;
      comparisonRef.current = storedComparison;
      setFavourites(storedFavourites);
      setComparison(storedComparison);
    });
  }, []);
  const toggleFavourite = useCallback((id: string) => {
    const next = new Set(favouritesRef.current);
    const removed = next.delete(id);

    if (!removed) next.add(id);

    favouritesRef.current = next;
    setFavourites(next);
    localStorage.setItem("kuraishi-favourites", JSON.stringify([...next]));
    toast.success(
      removed
        ? "Fahrzeug wurde aus der Merkliste entfernt."
        : "Fahrzeug wurde zur Merkliste hinzugefügt.",
    );
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
    () => ({ favourites, comparison, toggleFavourite, toggleComparison }),
    [favourites, comparison, toggleFavourite, toggleComparison],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useVehicleState() {
  const value = useContext(Context);
  if (!value)
    throw new Error("useVehicleState must be used within VehicleStateProvider");
  return value;
}
