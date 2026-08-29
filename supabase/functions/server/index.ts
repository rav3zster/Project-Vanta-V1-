import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.ts";
import { hasPermission, permissionsFor, type Permission, type Role } from "./rbac.ts";
import {
  assertTransition, finalizeResult, generateBracket,
  type Tournament, type TournamentStatus,
} from "./engine.ts";

const app = new Hono();
const P = "/make-server-d346d9b8";

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const admin = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Profile = { id: string; email: string; username: string; region: string; role: Role };

const TOURNAMENT_KEY = "tournament:main";

// Founders are always GOD, regardless of signup order. Matched case-insensitively
// against username or the local-part of the email.
const FOUNDERS = ["raveends70@gmail.com", "raveends70"];
function isFounder(username?: string, email?: string): boolean {
  const u = (username ?? "").toLowerCase().trim();
  const e = (email ?? "").toLowerCase().trim();
  const local = e.split("@")[0];
  return FOUNDERS.some((f) => f === u || f === local || f === e);
}

// ---- Auth helpers -----------------------------------------------------------

async function getProfile(accessToken: string | undefined): Promise<Profile | null> {
  if (!accessToken) return null;
  const { data, error } = await admin().auth.getUser(accessToken);
  if (error || !data.user) return null;
  const u = data.user;
  const meta = (u.user_metadata ?? {}) as Record<string, string>;
  const emailLocal = u.email?.split("@")[0] ?? "";
  // Prefer a real display name over the email prefix.
  const displayName = meta.username || meta.full_name || meta.name || emailLocal || "operator";

  const existing: Profile | undefined = await kv.get(`user:${data.user.id}`);
  if (existing) {
    let changed = false;
    // Promote a founder that already has a (non-GOD) profile.
    if (isFounder(existing.username, existing.email) && existing.role !== "GOD") {
      existing.role = "GOD";
      changed = true;
    }
    // Upgrade a stale email-prefix username to the real display name.
    if ((!existing.username || existing.username === emailLocal) && displayName !== emailLocal) {
      existing.username = displayName;
      changed = true;
    }
    if (changed) await kv.set(`user:${data.user.id}`, existing);
    return existing;
  }

  // First login with no profile yet (e.g. Google OAuth): provision automatically.
  // Founders and the very first account ever created are promoted to GOD so the
  // platform is bootstrappable without manual DB edits.
  const username = displayName;
  const allUsers = await kv.getByPrefix("user:");
  const role: Role =
    isFounder(username, u.email ?? "") || allUsers.length === 0 ? "GOD" : "HUMAN";
  const profile: Profile = {
    id: u.id, email: u.email ?? "", username,
    region: meta.region ?? "GLOBAL", role,
  };
  await kv.set(`user:${u.id}`, profile);
  return profile;
}

async function requireProfile(c: any): Promise<Profile> {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const profile = await getProfile(token);
  if (!profile) throw new HttpError(401, "Authentication required");
  return profile;
}

function requirePerm(profile: Profile, perm: Permission) {
  if (!hasPermission(profile.role, perm)) {
    throw new HttpError(403, `Permission denied: ${perm}`);
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---- Audit ------------------------------------------------------------------

async function audit(actor: Profile, action: string, entity: string, detail: Record<string, unknown> = {}) {
  const ts = new Date().toISOString();
  await kv.set(`audit:${ts}:${crypto.randomUUID().slice(0, 8)}`, {
    ts, actor: actor.username, role: actor.role, action, entity, detail,
  });
}

// ---- Notifications ----------------------------------------------------------

const SEVERITY_OF: Record<string, string> = {
  "tournament.completed": "SUCCESS",
  "match.disputed": "CRITICAL",
  "match.forfeited": "WARNING",
  "checkin.opened": "INFO",
  "bracket.generated": "INFO",
  "announcement.published": "INFO",
};

async function notify(type: string, title: string, body: string) {
  const ts = new Date().toISOString();
  await kv.set(`notif:${ts}:${crypto.randomUUID().slice(0, 8)}`, {
    ts, type, title, body, severity: SEVERITY_OF[type] ?? "INFO",
  });
}

// ---- Routes -----------------------------------------------------------------

app.get(`${P}/health`, (c) => c.json({ status: "ok" }));

app.post(`${P}/signup`, async (c) => {
  try {
    const { email, password, username, region } = await c.req.json();
    if (!email || !password || !username) {
      return c.json({ error: "email, password and username are required" }, 400);
    }
    // email_confirm true: no mail server is configured in this environment.
    const { data, error } = await admin().auth.admin.createUser({
      email, password, user_metadata: { username },
      email_confirm: true,
    });
    if (error) return c.json({ error: error.message }, 400);

    // Bootstrap: the very first account ever created is promoted to GOD so the
    // platform is usable without manual DB edits; everyone after is HUMAN.
    const existingUsers = await kv.getByPrefix("user:");
    const role: Role =
      isFounder(username, email) || existingUsers.length === 0 ? "GOD" : "HUMAN";

    const profile: Profile = {
      id: data.user.id, email, username,
      region: region ?? "GLOBAL", role,
    };
    await kv.set(`user:${data.user.id}`, profile);
    return c.json({ profile });
  } catch (e) {
    console.log("signup error", e);
    return c.json({ error: String(e) }, 500);
  }
});

app.get(`${P}/me`, async (c) => {
  try {
    const profile = await requireProfile(c);
    return c.json({ profile, permissions: permissionsFor(profile.role) });
  } catch (e) {
    return errJson(c, e);
  }
});

app.post(`${P}/me/update-profile`, async (c) => {
  try {
    const profile = await requireProfile(c);
    const { username, region } = await c.req.json();
    if (!username || !username.trim()) {
      return c.json({ error: "Username cannot be empty" }, 400);
    }
    const cleanUsername = String(username).trim();
    profile.username = cleanUsername;
    if (region) profile.region = String(region).toUpperCase().trim();

    await kv.set(`user:${profile.id}`, profile);
    await audit(profile, "profile.updated", profile.id, { username: cleanUsername, region: profile.region });
    return c.json({ profile });
  } catch (e) {
    return errJson(c, e);
  }
});

app.get(`${P}/tournament`, async (c) => {
  const t = await kv.get(TOURNAMENT_KEY);
  return c.json({ tournament: t ?? null });
});

// Public bootstrap: everything the marketing/site pages render, from real data.
app.get(`${P}/site`, async (c) => {
  const t: Tournament | null = (await kv.get(TOURNAMENT_KEY)) ?? null;
  const events = (await kv.getByPrefix("event:")) as any[];
  const results = (await kv.getByPrefix("result:")) as any[];
  const rosterDoc = (await kv.get("roster:main")) as any;
  const announcements = (await kv.getByPrefix("announcement:")) as any[];
  announcements.sort((a: any, b: any) => (a.ts < b.ts ? 1 : -1));
  results.sort((a: any, b: any) => (a.date < b.date ? 1 : -1));

  const teams = t?.teams ?? [];
  const matches = t?.matches ?? [];
  const liveTournaments = [
    ...(t && t.status !== "COMPLETED" && t.status !== "CANCELLED" ? [1] : []),
    ...events.filter((e) => e.status === "REGISTRATION_OPEN"),
  ].length;

  const stats = {
    activeTournaments: liveTournaments,
    liveMatches: matches.filter((m) => m.status === "LIVE" || m.status === "DISPUTED").length,
    registeredTeams: teams.length + events.reduce((n, e) => n + (e.registered ?? 0), 0),
    activePlayers: (teams.length + events.reduce((n, e) => n + (e.registered ?? 0), 0)) * 5,
    openDisputes: matches.filter((m) => m.status === "DISPUTED").length,
  };

  return c.json({
    tournament: t,
    events,
    results,
    roster: rosterDoc?.players ?? [],
    announcements,
    stats,
  });
});

app.get(`${P}/audit`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "audit.view");
    const entries = await kv.getByPrefix("audit:");
    entries.sort((a: any, b: any) => (a.ts < b.ts ? 1 : -1));
    return c.json({ entries: entries.slice(0, 100) });
  } catch (e) {
    return errJson(c, e);
  }
});

// Seed the vertical-slice tournament with real starter data. This does NOT create
// any accounts — the first user to sign in is promoted to GOD (see getProfile), and
// all other roles are managed from Control → USERS or via SQL (see supabase/SETUP.md).
app.post(`${P}/seed`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "seed.run");

    const now = new Date().toISOString();
    const tags = [
      ["Eclipse Order", "ECL", "APAC"], ["Nova Syndicate", "NVA", "EU"],
      ["Vermillion", "VMN", "NA"], ["Ashfall Collective", "ASH", "APAC"],
      ["Meridian Nine", "MR9", "EU"], ["Obsidian Pact", "OBS", "NA"],
      ["Halcyon Drift", "HAL", "SA"], ["Cinder Vow", "CND", "APAC"],
    ];
    const t: Tournament = {
      id: "TRN-0001", slug: "requiem-open-s1", name: "REQUIEM OPEN", season: "SEASON 01",
      status: "REGISTRATION_OPEN", game: "Tactical 5v5", format: "Single Elimination · BO1",
      prizePool: "$12,000", region: "GLOBAL", platform: "PC", slots: 8,
      champion: null, createdAt: now, updatedAt: now,
      startDate: "AUG 28, 2026", checkInWindow: "18:00 – 18:30 UTC",
      prizeBreakdown: [["1ST", "$7,000"], ["2ND", "$3,000"], ["3RD–4TH", "$1,000"]],
      teams: tags.map(([name, tag, region], i) => ({
        id: `t${i + 1}`, name, tag, region, seed: null,
        checkedIn: false, approved: false,
      })),
      matches: [],
    } as Tournament;
    await kv.set(TOURNAMENT_KEY, t);

    // Other events (directory cards).
    await kv.mset(
      ["event:TRN-0002", "event:TRN-0003", "event:TRN-0004"],
      [
        { id: "TRN-0002", name: "MIDNIGHT CIRCUIT", game: "Tactical 5v5", format: "Double Elim · BO3", prize: "$25,000", slots: 16, registered: 11, status: "REGISTRATION_OPEN", region: "EU", closes: "SEP 04" },
        { id: "TRN-0003", name: "VANGUARD SERIES", game: "MOBA 5v5", format: "Groups → Playoffs", prize: "$40,000", slots: 24, registered: 24, status: "REGISTRATION_CLOSED", region: "APAC", closes: "CLOSED" },
        { id: "TRN-0004", name: "SILENT PROTOCOL", game: "Tactical 5v5", format: "Swiss · BO1", prize: "$8,000", slots: 32, registered: 6, status: "REGISTRATION_OPEN", region: "GLOBAL", closes: "SEP 18" },
      ],
    );

    // Past results (archive).
    await kv.mset(
      ["result:TRN-9821", "result:TRN-9799", "result:TRN-9764"],
      [
        { id: "TRN-9821", event: "PHANTOM CUP", winner: "Eclipse Order", runnerUp: "Nova Syndicate", score: "13–9", date: "2026-08-14" },
        { id: "TRN-9799", event: "ZERO HOUR", winner: "Vermillion", runnerUp: "Obsidian Pact", score: "2–1", date: "2026-08-07" },
        { id: "TRN-9764", event: "BLACKOUT INVITATIONAL", winner: "Meridian Nine", runnerUp: "Ashfall Collective", score: "13–6", date: "2026-07-30" },
      ],
    );

    // House roster across top esports titles.
    await kv.set("roster:main", {
      players: [
        { handle: "TITAN", name: "Rave Ends", role: "IGL / CARRY", game: "DOTA 2", rank: "Rank 1 Immortal", winnings: "$110,000", region: "GLOBAL", image: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600&auto=format&fit=crop&q=80" },
        { handle: "VORTEX", name: "Marcus Vance", role: "AWPER / IGL", game: "CS2", rank: "Global Elite · 28k ELO", winnings: "$75,000", region: "NA", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80" },
        { handle: "SPECTRE", name: "Anthony Reyes", role: "DUELIST", game: "VALORANT", rank: "Radiant #1", winnings: "$45,000", region: "APAC", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80" },
        { handle: "APEX", name: "Shin Tanaka", role: "MID LANER", game: "LEAGUE OF LEGENDS", rank: "Challenger 980 LP", winnings: "$60,000", region: "APAC", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80" },
        { handle: "VIGIL", name: "Katarina Novak", role: "SENTINEL", game: "VALORANT", rank: "Radiant #4", winnings: "$32,000", region: "EU", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80" },
        { handle: "REAPER", name: "Erik Lindholm", role: "ENTRY FRAGGER", game: "CS2", rank: "Global Elite", winnings: "$50,000", region: "EU", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80" },
        { handle: "HYPERION", name: "Lucas Costa", role: "CARRY (ADC)", game: "LEAGUE OF LEGENDS", rank: "Challenger 850 LP", winnings: "$40,000", region: "SA", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80" },
        { handle: "PHANTOM", name: "Nikhil Varma", role: "MIDLANER", game: "DOTA 2", rank: "Top 50 Immortal", winnings: "$85,000", region: "APAC", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80" },
      ],
    });

    await kv.set(`announcement:${now}`, {
      id: "ANN-SEED", title: "REQUIEM OPEN registration is live",
      body: "Season 01 flagship event. Eight slots, single elimination, BO1. Registration now open.",
      severity: "INFO", author: profile.username, ts: now, status: "PUBLISHED",
    });
    await notify("registration.open", "Registration open", "REQUIEM OPEN is accepting teams");
    await audit(profile, "tournament.seeded", t.id, { teams: t.teams.length });
    return c.json({ tournament: t });
  } catch (e) {
    return errJson(c, e);
  }
});

// Operations: every mutation is permission-gated and audited.
app.post(`${P}/ops/:action`, async (c) => {
  try {
    const profile = await requireProfile(c);
    const action = c.req.param("action");
    const body = await c.req.json().catch(() => ({}));
    const t: Tournament | undefined = await kv.get(TOURNAMENT_KEY);
    if (!t) return c.json({ error: "No tournament. Run seed first." }, 404);

    const events = await runOp(profile, t, action, body);
    t.updatedAt = new Date().toISOString();
    await kv.set(TOURNAMENT_KEY, t);
    return c.json({ tournament: t, events });
  } catch (e) {
    return errJson(c, e);
  }
});

// ---- Notifications & announcements routes -----------------------------------

app.get(`${P}/notifications`, async (c) => {
  const notifs = await kv.getByPrefix("notif:");
  notifs.sort((a: any, b: any) => (a.ts < b.ts ? 1 : -1));
  return c.json({ notifications: notifs.slice(0, 30) });
});

app.get(`${P}/announcements`, async (c) => {
  const list = await kv.getByPrefix("announcement:");
  list.sort((a: any, b: any) => (a.ts < b.ts ? 1 : -1));
  return c.json({ announcements: list });
});

app.post(`${P}/announcements`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "announcements.publish");
    const { title, body, severity } = await c.req.json();
    if (!title || !body) return c.json({ error: "title and body are required" }, 400);
    const ts = new Date().toISOString();
    const ann = {
      id: `ann:${ts}`, title, body, severity: severity ?? "INFO",
      author: profile.username, ts, status: "PUBLISHED",
    };
    await kv.set(`announcement:${ts}`, ann);
    await notify("announcement.published", title, body);
    await audit(profile, "announcement.published", ann.id, { title });
    return c.json({ announcement: ann });
  } catch (e) {
    return errJson(c, e);
  }
});

// ---- Roster management (GOD & DEMI_GOD) -------------------------------------

const ROSTER_KEY = "roster:main";

app.get(`${P}/roster`, async (c) => {
  const doc: any = await kv.get(ROSTER_KEY);
  return c.json({ players: doc?.players ?? [] });
});

app.post(`${P}/roster`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "roster.manage");
    const { players } = await c.req.json();
    if (!Array.isArray(players)) return c.json({ error: "players array required" }, 400);
    const clean = players.map((p: any) => ({
      handle: String(p.handle ?? "").toUpperCase().trim(),
      name: String(p.name ?? "").trim(),
      role: String(p.role ?? "").toUpperCase().trim(),
      game: String(p.game ?? "VALORANT").toUpperCase().trim(),
      rank: String(p.rank ?? "").trim(),
      winnings: String(p.winnings ?? "").trim(),
      region: String(p.region ?? "GLOBAL").toUpperCase().trim(),
      image: p.image ? String(p.image).trim() : "",
      stats: p.stats ?? {},
    })).filter((p: any) => p.handle);
    await kv.set(ROSTER_KEY, { players: clean });
    await audit(profile, "roster.updated", ROSTER_KEY, { count: clean.length });
    return c.json({ players: clean });
  } catch (e) {
    return errJson(c, e);
  }
});

// ---- Users & roles (GOD & DEMI_GOD management) ------------------------------

app.get(`${P}/users`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "audit.view");
    const users = await kv.getByPrefix("user:");
    return c.json({ users });
  } catch (e) {
    return errJson(c, e);
  }
});

app.post(`${P}/users/role`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "roles.manage");
    const { userId, role } = await c.req.json();
    const target: Profile | undefined = await kv.get(`user:${userId}`);
    if (!target) return c.json({ error: "User not found" }, 404);

    if (isFounder(target.username, target.email) && role !== "GOD") {
      return c.json({ error: "Founding account must remain GOD" }, 409);
    }

    if (target.role === "GOD" && role !== "GOD") {
      const users: Profile[] = await kv.getByPrefix("user:");
      const gods = users.filter((u) => u.role === "GOD");
      if (gods.length <= 1) return c.json({ error: "Cannot demote the last GOD account" }, 409);
    }
    const before = target.role;
    target.role = role;
    await kv.set(`user:${userId}`, target);
    await audit(profile, "role.changed", userId, { from: before, to: role, email: target.email });
    return c.json({ profile: target });
  } catch (e) {
    return errJson(c, e);
  }
});

app.post(`${P}/users/role-by-email`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "roles.manage");
    const { email, role } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);

    const targetEmail = String(email).toLowerCase().trim();
    if (isFounder(undefined, targetEmail) && role !== "GOD") {
      return c.json({ error: "Founding account must remain GOD" }, 409);
    }

    const allUsers: Profile[] = await kv.getByPrefix("user:");
    const found = allUsers.find((u) => u.email?.toLowerCase().trim() === targetEmail);

    if (found) {
      const before = found.role;
      found.role = role;
      await kv.set(`user:${found.id}`, found);
      await audit(profile, "role.assigned_email", found.id, { email: targetEmail, from: before, to: role });
      return c.json({ profile: found });
    }

    // Provision an entry keyed by email so when they sign in, role is mapped
    await kv.set(`role-override:${targetEmail}`, { email: targetEmail, role });
    await audit(profile, "role.preassigned_email", targetEmail, { email: targetEmail, role });
    return c.json({ message: `Role ${role} pre-assigned to ${targetEmail}`, email: targetEmail, role });
  } catch (e) {
    return errJson(c, e);
  }
});

// ---- Self-service (HUMAN) ---------------------------------------------------

app.post(`${P}/register-team`, async (c) => {
  try {
    const profile = await requireProfile(c);
    const { name, tag, region } = await c.req.json();
    const t: Tournament | undefined = await kv.get(TOURNAMENT_KEY);
    if (!t) return c.json({ error: "No tournament open" }, 404);
    if (t.status !== "REGISTRATION_OPEN") return c.json({ error: "Registration is not open" }, 409);
    if (t.teams.length >= t.slots) return c.json({ error: "Tournament is full" }, 409);
    if (t.teams.some((x) => x.tag === tag)) return c.json({ error: "Team tag already registered" }, 409);
    const team = {
      id: `t${Date.now()}`, name, tag, region: region ?? profile.region,
      seed: null, checkedIn: false, approved: false, ownerId: profile.id,
    };
    t.teams.push(team as any);
    t.updatedAt = new Date().toISOString();
    await kv.set(TOURNAMENT_KEY, t);
    await notify("registration.submitted", "New registration", `${name} submitted for ${t.name}`);
    await audit(profile, "registration.submitted", team.id, { name, tag });
    return c.json({ tournament: t });
  } catch (e) {
    return errJson(c, e);
  }
});

async function runOp(
  profile: Profile, t: Tournament, action: string, body: any,
): Promise<string[]> {
  switch (action) {
    case "transition": {
      requirePerm(profile, "tournaments.manage");
      const to = body.to as TournamentStatus;
      assertTransition(t, to);
      const from = t.status;
      t.status = to;
      await audit(profile, "tournament.transition", t.id, { from, to });
      if (to === "CHECK_IN_OPEN") await notify("checkin.opened", "Check-in open", `Check-in is open for ${t.name}`);
      if (to === "REGISTRATION_OPEN") await notify("registration.open", "Registration open", `${t.name} is accepting teams`);
      return [`tournament.${to.toLowerCase()}`];
    }
    case "approve-team": {
      requirePerm(profile, "registrations.approve");
      const team = t.teams.find((x) => x.id === body.teamId);
      if (!team) throw new HttpError(404, "Team not found");
      team.approved = true;
      await audit(profile, "registration.approved", team.id, {});
      await notify("registration.approved", "Registration approved", `${team.name} is approved`);
      return [`registration.approved:${team.id}`];
    }
    case "reject-team": {
      requirePerm(profile, "registrations.approve");
      const idx = t.teams.findIndex((x) => x.id === body.teamId);
      if (idx === -1) throw new HttpError(404, "Team not found");
      const [removed] = t.teams.splice(idx, 1);
      await audit(profile, "registration.rejected", removed.id, { reason: body.reason });
      return [`registration.rejected:${removed.id}`];
    }
    case "checkin": {
      requirePerm(profile, "checkins.manage");
      if (t.status !== "CHECK_IN_OPEN") throw new HttpError(409, "Check-in is not open");
      const team = t.teams.find((x) => x.id === body.teamId);
      if (!team) throw new HttpError(404, "Team not found");
      team.checkedIn = Boolean(body.value);
      await audit(profile, team.checkedIn ? "team.checked_in" : "team.checkin_cleared", team.id, {});
      return [`checkin:${team.id}`];
    }
    case "seed-teams": {
      requirePerm(profile, "seeding.manage");
      if (t.status !== "SEEDING") throw new HttpError(409, "Tournament is not in SEEDING");
      const eligible = t.teams.filter((x) => x.approved && x.checkedIn);
      if (eligible.length !== 8) throw new HttpError(409, `Need 8 checked-in teams, have ${eligible.length}`);
      let order = [...eligible];
      if (body.method === "random") order = shuffle(order);
      // manual: keep given order if provided
      if (body.method === "manual" && Array.isArray(body.order)) {
        order = body.order.map((id: string) => eligible.find((e) => e.id === id)).filter(Boolean);
      }
      t.teams.forEach((x) => (x.seed = null));
      order.forEach((team, i) => {
        const ref = t.teams.find((x) => x.id === team.id)!;
        ref.seed = i + 1;
      });
      await audit(profile, "seed.locked", t.id, { method: body.method ?? "manual" });
      return ["seed.locked"];
    }
    case "generate-bracket": {
      requirePerm(profile, "brackets.generate");
      if (t.status !== "BRACKET_LOCKED") throw new HttpError(409, "Transition to BRACKET_LOCKED first");
      if (t.teams.some((x) => x.seed === null)) throw new HttpError(409, "Seed all teams first");
      t.matches = generateBracket(t);
      await audit(profile, "bracket.generated", t.id, { matches: t.matches.length });
      await notify("bracket.generated", "Bracket generated", `The bracket for ${t.name} is live`);
      return ["bracket.generated"];
    }
    case "submit-result": {
      requirePerm(profile, "matches.resolve");
      const events = finalizeResult(t, body.matchId, Number(body.scoreA), Number(body.scoreB));
      await audit(profile, "result.finalized", body.matchId, { scoreA: body.scoreA, scoreB: body.scoreB });
      if (events.includes(`tournament.completed:${t.id}`)) {
        const champ = t.teams.find((x) => x.id === t.champion);
        await notify("tournament.completed", "Champion declared", `${champ?.name ?? "A team"} won ${t.name}`);
      }
      return events;
    }
    case "forfeit": {
      requirePerm(profile, "matches.resolve");
      const m = t.matches.find((x) => x.id === body.matchId);
      if (!m) throw new HttpError(404, "Match not found");
      const loser = body.teamId;
      const winner = m.a === loser ? m.b : m.a;
      if (!winner) throw new HttpError(409, "Match not populated");
      m.status = "FORFEIT";
      m.note = `Forfeit: ${body.reason ?? "no reason given"}`;
      const events = finalizeResult(t, m.id, m.a === winner ? 1 : 0, m.b === winner ? 1 : 0);
      await audit(profile, "match.forfeited", m.id, { loser, reason: body.reason });
      return ["match.forfeited", ...events];
    }
    case "dispute": {
      requirePerm(profile, "disputes.create");
      const m = t.matches.find((x) => x.id === body.matchId);
      if (!m) throw new HttpError(404, "Match not found");
      m.status = "DISPUTED";
      m.note = `Disputed: ${body.reason ?? "under review"}`;
      await audit(profile, "match.disputed", m.id, { reason: body.reason });
      return ["match.disputed"];
    }
    case "resolve-dispute": {
      requirePerm(profile, "disputes.resolve");
      const m = t.matches.find((x) => x.id === body.matchId);
      if (!m) throw new HttpError(404, "Match not found");
      if (m.status !== "DISPUTED") throw new HttpError(409, "Match is not disputed");
      const events = finalizeResult(t, m.id, Number(body.scoreA), Number(body.scoreB));
      m.note = `Resolved: ${body.reason ?? "admin decision"}`;
      await audit(profile, "dispute.resolved", m.id, { reason: body.reason, scoreA: body.scoreA, scoreB: body.scoreB });
      return ["dispute.resolved", ...events];
    }
    default:
      throw new HttpError(400, `Unknown operation: ${action}`);
  }
}

// ---- Utilities --------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function errJson(c: any, e: unknown) {
  if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
  console.log("server error", e);
  return c.json({ error: String(e) }, 500);
}

Deno.serve(app.fetch);
