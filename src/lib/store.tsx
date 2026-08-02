import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Business, MoneyLine, StoreShape } from "./types";
import { makeSeedBusinesses, newId } from "./seed";

const KEY = "margin.v1";
const AUTH_KEY = "margin.auth";

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreShape;
      if (Array.isArray(parsed.businesses)) return parsed;
    }
  } catch {
    // fall through to seed
  }
  const seeded = { businesses: makeSeedBusinesses() };
  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

interface StoreApi {
  businesses: Business[];
  addBusiness: (b: Omit<Business, "id" | "income" | "expenses" | "createdAt">) => Business;
  updateBusiness: (id: string, patch: Partial<Business>) => void;
  removeBusiness: (id: string) => void;
  addLine: (bizId: string, side: "income" | "expenses", line: Omit<MoneyLine, "id">) => void;
  updateLine: (bizId: string, side: "income" | "expenses", line: MoneyLine) => void;
  removeLine: (bizId: string, side: "income" | "expenses", lineId: string) => void;
  resetDemo: () => void;
}

const StoreCtx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreShape>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const api = useMemo<StoreApi>(() => {
    const mutate = (fn: (s: StoreShape) => StoreShape) => setState((s) => fn(s));
    const mapBiz = (s: StoreShape, id: string, fn: (b: Business) => Business): StoreShape => ({
      businesses: s.businesses.map((b) => (b.id === id ? fn(b) : b)),
    });

    return {
      businesses: state.businesses,
      addBusiness(partial) {
        const biz: Business = {
          ...partial,
          id: newId("biz"),
          income: [],
          expenses: [],
          createdAt: new Date().toISOString(),
        };
        mutate((s) => ({ businesses: [...s.businesses, biz] }));
        return biz;
      },
      updateBusiness(id, patch) {
        mutate((s) => mapBiz(s, id, (b) => ({ ...b, ...patch })));
      },
      removeBusiness(id) {
        mutate((s) => ({ businesses: s.businesses.filter((b) => b.id !== id) }));
      },
      addLine(bizId, side, line) {
        mutate((s) =>
          mapBiz(s, bizId, (b) => ({ ...b, [side]: [...b[side], { ...line, id: newId("ln") }] })),
        );
      },
      updateLine(bizId, side, line) {
        mutate((s) =>
          mapBiz(s, bizId, (b) => ({
            ...b,
            [side]: b[side].map((l) => (l.id === line.id ? line : l)),
          })),
        );
      },
      removeLine(bizId, side, lineId) {
        mutate((s) =>
          mapBiz(s, bizId, (b) => ({ ...b, [side]: b[side].filter((l) => l.id !== lineId) })),
        );
      },
      resetDemo() {
        const seeded = { businesses: makeSeedBusinesses() };
        setState(seeded);
      },
    };
  }, [state]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside StoreProvider");
  return ctx;
}

/* ---------- mock auth (demo gate, not security — see blueprint §7) ---------- */

export function isAuthed(): boolean {
  return localStorage.getItem(AUTH_KEY) === "1";
}

export function signIn(user: string, pass: string): boolean {
  if (user.trim().toLowerCase() === "admin" && pass === "admin") {
    localStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
}

export function signOut(): void {
  localStorage.removeItem(AUTH_KEY);
}
