"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  useEffect(() => {
    queueMicrotask(() => {
      setFavourites(
        new Set(
          JSON.parse(
            localStorage.getItem("kuraishi-favourites") ?? "[]",
          ) as string[],
        ),
      );
      setComparison(
        new Set(
          JSON.parse(
            localStorage.getItem("kuraishi-comparison") ?? "[]",
          ) as string[],
        ),
      );
    });
  }, []);
  const toggleFavourite = useCallback(
    (id: string) =>
      setFavourites((current) => {
        const next = new Set(current);
        if (next.delete(id))
          toast.success("Fahrzeug wurde aus der Merkliste entfernt.");
        else {
          next.add(id);
          toast.success("Fahrzeug wurde zur Merkliste hinzugefügt.");
        }
        localStorage.setItem("kuraishi-favourites", JSON.stringify([...next]));
        return next;
      }),
    [],
  );
  const toggleComparison = useCallback(
    (id: string) =>
      setComparison((current) => {
        const next = new Set(current);
        if (next.delete(id))
          toast.success("Fahrzeug wurde aus dem Vergleich entfernt.");
        else if (next.size >= 3) {
          toast.error("Maximal drei Fahrzeuge können verglichen werden.");
          return current;
        } else {
          next.add(id);
          toast.success("Fahrzeug wurde zum Vergleich hinzugefügt.");
        }
        localStorage.setItem("kuraishi-comparison", JSON.stringify([...next]));
        return next;
      }),
    [],
  );
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
