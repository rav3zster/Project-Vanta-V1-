import { createClient } from "@supabase/supabase-js"
import { projectId, publicAnonKey } from "../../utils/supabase/info"

// Singleton across duplicate module evaluations (HMR / proxied preview),
// otherwise multiple GoTrueClient instances race on the same storage key.
const g = globalThis as unknown as {
  __vantaSupabase?: ReturnType<typeof createClient>
}
export const supabase =
  g.__vantaSupabase ??
  (g.__vantaSupabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
  ))

export const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d346d9b8`

export type Role = "GOD" | "DEMI_GOD" | "HUMAN"

export type Profile = {
  id: string
  email: string
  username: string
  region: string
  role: Role
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? publicAnonKey
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(await authHeader()), ...(init.headers ?? {}) },
    })
  } catch {
    // Network-level failure (function not deployed / unreachable / CORS).
    throw new Error(
      "Cannot reach the server. The edge function may need to be redeployed.",
    )
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok)
    throw new Error((json as any).error ?? `Request failed (${res.status})`)
  return json as T
}

export type PlayerGear = {
  mouse?: string
  mousepad?: string
  keyboard?: string
  headset?: string
  monitor?: string
}

export type PlayerSettings = {
  dpi?: string
  sensitivity?: string
  edpi?: string
  pollingRate?: string
  scopedSens?: string
  resolution?: string
  crosshair?: string
}

export type PlayerStats = {
  kd?: string
  winRate?: string
  headshotPct?: string
  acs?: string
  trophies?: number
  matchesPlayed?: number
  signaturePick?: string
}

export type Player = {
  handle: string
  name: string
  role: string
  game?: string
  rank?: string
  winnings?: string
  region: string
  image?: string
  stats?: PlayerStats
  gear?: PlayerGear
  settings?: PlayerSettings
}

export type SiteData = {
  tournament: any | null
  events: any[]
  results: any[]
  roster: Player[]
  announcements: any[]
  stats: {
    activeTournaments: number
    liveMatches: number
    registeredTeams: number
    activePlayers: number
    openDisputes: number
  }
}

export const api = {
  getSite: () => req<SiteData>("/site"),
  getTournament: () => req<{ tournament: any }>("/tournament"),
  me: () => req<{ profile: Profile; permissions: string[] }>("/me"),
  updateProfile: (b: { username: string; region?: string }) =>
    req<{ profile: Profile }>("/me/update-profile", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  signup: (b: {
    email: string
    password: string
    username: string
    region?: string
  }) =>
    req<{ profile: Profile }>("/signup", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  seed: () => req<{ tournament: any }>("/seed", { method: "POST", body: "{}" }),
  audit: () => req<{ entries: any[] }>("/audit"),
  op: (action: string, body: Record<string, unknown> = {}) =>
    req<{ tournament: any; events: string[] }>(`/ops/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getNotifications: () => req<{ notifications: any[] }>("/notifications"),
  getAnnouncements: () => req<{ announcements: any[] }>("/announcements"),
  createAnnouncement: (b: { title: string; body: string; severity?: string }) =>
    req<{ announcement: any }>("/announcements", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  updateAnnouncement: (b: {
    id?: string
    ts?: string
    title?: string
    body?: string
    severity?: string
  }) =>
    req<{ announcement: any }>("/announcements/update", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  deleteAnnouncement: (b: { id?: string; ts?: string; title?: string }) =>
    req<{ ok: boolean }>("/announcements/delete", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  getRoster: () => req<{ players: Player[] }>("/roster"),
  updateRoster: (players: Player[]) =>
    req<{ players: Player[] }>("/roster", {
      method: "POST",
      body: JSON.stringify({ players }),
    }),
  getUsers: () => req<{ users: Profile[] }>("/users"),
  setUserRole: (b: { userId: string; role: Role }) =>
    req<{ user: Profile }>("/users/role", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  setUserRoleByEmail: (b: { email: string; role: Role }) =>
    req<{ user: Profile }>("/users/role-by-email", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  registerTeam: (b: { name: string; tag: string; region: string }) =>
    req<{ tournament: any }>("/register-team", {
      method: "POST",
      body: JSON.stringify(b),
    }),
}
