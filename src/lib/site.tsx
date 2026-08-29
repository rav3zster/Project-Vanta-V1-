import { createContext, useContext, useCallback, useEffect, useState, type Context, type ReactNode } from "react";
import { api, type SiteData } from "./supabase";

const EMPTY: SiteData = {
  tournament: null, events: [], results: [], roster: [], announcements: [],
  stats: { activeTournaments: 0, liveMatches: 0, registeredTeams: 0, activePlayers: 0, openDisputes: 0 },
};

type SiteState = {
  data: SiteData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const g = globalThis as unknown as { __vantaSiteCtx?: Context<SiteState | null> };
const SiteContext = g.__vantaSiteCtx ?? (g.__vantaSiteCtx = createContext<SiteState | null>(null));

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const site = await api.getSite();
      setData(site);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SiteContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}
