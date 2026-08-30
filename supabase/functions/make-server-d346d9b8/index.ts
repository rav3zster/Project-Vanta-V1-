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
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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

// Consumes a role pre-assigned via /users/role-by-email before the target ever
// signed up. One-shot: the override key is deleted once applied so it can't be
// replayed if the account is later demoted through normal role management.
async function takeRoleOverride(email: string): Promise<Role | null> {
  const key = `role-override:${email.toLowerCase().trim()}`;
  const override: { role: Role } | undefined = await kv.get(key);
  if (!override) return null;
  await kv.del(key);
  return override.role;
}

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
  // platform is bootstrappable without manual DB edits. A role pre-assigned by
  // email (Control → Users) takes priority over the first-user bootstrap.
  const username = displayName;
  const allUsers = await kv.getByPrefix("user:");
  const override = await takeRoleOverride(u.email ?? "");
  const role: Role = isFounder(username, u.email ?? "")
    ? "GOD"
    : override ?? (allUsers.length === 0 ? "GOD" : "HUMAN");
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
    // platform is usable without manual DB edits; everyone after is HUMAN unless
    // a role was pre-assigned to this email via Control → Users.
    const existingUsers = await kv.getByPrefix("user:");
    const override = await takeRoleOverride(email);
    const role: Role = isFounder(username, email)
      ? "GOD"
      : override ?? (existingUsers.length === 0 ? "GOD" : "HUMAN");

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
    const valTeams: Team[] = [
      {
        id: "t_sen", name: "Sentinels", tag: "SEN", region: "NA", seed: 1, checkedIn: true, approved: true,
        contactEmail: "admin@sentinels.gg", registrationNotes: "Official Tier 1 VCT NA Roster",
        igl: { name: "Tyson Ngo", inGameName: "TenZ#NA1", discordId: "tenz_official", role: "IGL", isIgl: true },
        members: [
          { name: "Zachary Patrone", inGameName: "zekken#NA1", discordId: "zekken_fps", role: "DUELIST" },
          { name: "Gustavo Rossi", inGameName: "Sacy#BR1", discordId: "sacy_vlr", role: "INITIATOR" },
          { name: "Bryan Luna", inGameName: "pANcada#BR1", discordId: "pancada_vlr", role: "CONTROLLER" },
          { name: "Jordan Montemurro", inGameName: "Zellsis#NA1", discordId: "zellsis_vlr", role: "SENTINEL" },
        ],
        sub: { name: "Rahul Gosain", inGameName: "curry#NA1", discordId: "curry_fps", role: "SUB", isSub: true },
      },
      {
        id: "t_fnc", name: "Fnatic", tag: "FNC", region: "EU", seed: 2, checkedIn: true, approved: true,
        contactEmail: "contact@fnatic.com", registrationNotes: "Official Tier 1 VCT EMEA Roster",
        igl: { name: "Jake Howlett", inGameName: "Boaster#EU1", discordId: "boaster_fnc", role: "IGL", isIgl: true },
        members: [
          { name: "Nikita Sirmitev", inGameName: "Derke#EU1", discordId: "derke_fnc", role: "DUELIST" },
          { name: "Emir Muminovic", inGameName: "Alfajer#TR1", discordId: "alfajer_fnc", role: "SENTINEL" },
          { name: "Leo Jannesson", inGameName: "Leo#EU1", discordId: "leo_fnc", role: "INITIATOR" },
          { name: "Timofey Khromov", inGameName: "Chronicle#EU1", discordId: "chronicle_fnc", role: "CONTROLLER" },
        ],
        sub: { name: "Maks Dembo", inGameName: "kamyk#EU1", discordId: "kamyk_vlr", role: "SUB", isSub: true },
      },
      {
        id: "t_prx", name: "Paper Rex", tag: "PRX", region: "APAC", seed: 3, checkedIn: true, approved: true,
        contactEmail: "ops@prx.gg", registrationNotes: "Official Tier 1 VCT Pacific Roster",
        igl: { name: "Alexandre Sallé", inGameName: "alecks#SG1", discordId: "alecks_prx", role: "IGL", isIgl: true },
        members: [
          { name: "Jason Susanto", inGameName: "f0rsakeN#ID1", discordId: "forsaken_prx", role: "FLEX" },
          { name: "Ilya Petrov", inGameName: "something#RU1", discordId: "something_prx", role: "DUELIST" },
          { name: "Khalish Rusyaidi", inGameName: "d4v41#MY1", discordId: "davai_prx", role: "INITIATOR" },
          { name: "Aaron Leonhart", inGameName: "mindfreak#ID1", discordId: "mindfreak_prx", role: "CONTROLLER" },
        ],
        sub: { name: "Wang Jing Jie", inGameName: "Jinggg#SG1", discordId: "jinggg_prx", role: "SUB", isSub: true },
      },
      {
        id: "t_drx", name: "DRX", tag: "DRX", region: "APAC", seed: 4, checkedIn: true, approved: true,
        contactEmail: "valorant@drx.gg", registrationNotes: "Korean VCT Champions Contender",
        igl: { name: "Kim Gu-taek", inGameName: "stax#KR1", discordId: "stax_drx", role: "IGL", isIgl: true },
        members: [
          { name: "Goo Sang-min", inGameName: "Rb#KR1", discordId: "rb_drx", role: "FLEX" },
          { name: "Byung-chul Cho", inGameName: "BuZz#KR1", discordId: "buzz_drx", role: "DUELIST" },
          { name: "Myeong-kwan Kim", inGameName: "MaKo#KR1", discordId: "mako_drx", role: "CONTROLLER" },
          { name: "Yu Byung-chul", inGameName: "Flashback#KR1", discordId: "flashback_drx", role: "SENTINEL" },
        ],
        sub: { name: "Jung Min-seok", inGameName: "Foxy9#KR1", discordId: "foxy9_drx", role: "SUB", isSub: true },
      },
      {
        id: "t_eg", name: "Evil Geniuses", tag: "EG", region: "NA", seed: 5, checkedIn: true, approved: true,
        contactEmail: "esports@evilgeniuses.gg", registrationNotes: "2023 Champions Roster",
        igl: { name: "Kelden Pupello", inGameName: "Boostio#NA1", discordId: "boostio_eg", role: "IGL", isIgl: true },
        members: [
          { name: "Max Mazanov", inGameName: "Demon1#NA1", discordId: "demon1_eg", role: "DUELIST" },
          { name: "Ethan Arnold", inGameName: "Ethan#NA1", discordId: "ethan_eg", role: "INITIATOR" },
          { name: "Alexander Mor", inGameName: "jawgemo#NA1", discordId: "jawgemo_eg", role: "CONTROLLER" },
          { name: "Corbin Lee", inGameName: "C0M#NA1", discordId: "c0m_eg", role: "INITIATOR" },
        ],
        sub: { name: "Jeffrey Tsang", inGameName: "Reformed#NA1", discordId: "reformed_eg", role: "SUB", isSub: true },
      },
      {
        id: "t_navi", name: "Natus Vincere", tag: "NAVI", region: "EU", seed: 6, checkedIn: true, approved: true,
        contactEmail: "admin@navi.gg", registrationNotes: "CIS/EMEA Masters Seed",
        igl: { name: "Kyrylo Karasov", inGameName: "ANGE1#UA1", discordId: "ange1_navi", role: "IGL", isIgl: true },
        members: [
          { name: "Mehmet Yağız İpek", inGameName: "cNed#TR1", discordId: "cned_navi", role: "DUELIST" },
          { name: "Andrey Kiprsky", inGameName: "Shao#EU1", discordId: "shao_navi", role: "INITIATOR" },
          { name: "Dmitry Ilyushin", inGameName: "SUYGETSU#EU1", discordId: "suygetsu_navi", role: "SENTINEL" },
          { name: "Pontus Eek", inGameName: "Zyppan#EU1", discordId: "zyppan_navi", role: "CONTROLLER" },
        ],
        sub: { name: "Ardis Svarenieks", inGameName: "ardiis#LV1", discordId: "ardiis_navi", role: "SUB", isSub: true },
      },
      {
        id: "t_loud", name: "LOUD", tag: "LOUD", region: "SA", seed: 7, checkedIn: true, approved: true,
        contactEmail: "contato@loud.gg", registrationNotes: "Champions Champions & Brazilian Seed 1",
        igl: { name: "Matias Delipetro", inGameName: "Saadhak#AR1", discordId: "saadhak_loud", role: "IGL", isIgl: true },
        members: [
          { name: "Erick Santos", inGameName: "aspas#BR1", discordId: "aspas_loud", role: "DUELIST" },
          { name: "Felipe Basso", inGameName: "Less#BR1", discordId: "less_loud", role: "SENTINEL" },
          { name: "Cauan Silva", inGameName: "cauanzin#BR1", discordId: "cauanzin_loud", role: "INITIATOR" },
          { name: "Arthur Vieira", inGameName: "tuyz#BR1", discordId: "tuyz_loud", role: "CONTROLLER" },
        ],
        sub: { name: "Gabriel Lino", inGameName: "qck#BR1", discordId: "qck_loud", role: "SUB", isSub: true },
      },
      {
        id: "t_tl", name: "Team Liquid", tag: "TL", region: "EU", seed: 8, checkedIn: true, approved: true,
        contactEmail: "admin@teamliquid.com", registrationNotes: "EMEA Invitational Top Contender",
        igl: { name: "James Macauley", inGameName: "Kamo#EU1", discordId: "kamo_tl", role: "IGL", isIgl: true },
        members: [
          { name: "Elias Olkkonen", inGameName: "Jamppi#FI1", discordId: "jamppi_tl", role: "INITIATOR" },
          { name: "Ayaz Murat", inGameName: "nAts#RU1", discordId: "nats_tl", role: "SENTINEL" },
          { name: "Igor Vlasov", inGameName: "Redgar#EU1", discordId: "redgar_tl", role: "CONTROLLER" },
          { name: "Georgio Sanassy", inGameName: "Keiko#UK1", discordId: "keiko_tl", role: "DUELIST" },
        ],
        sub: { name: "Dom Sulcas", inGameName: "soulcas#UK1", discordId: "soulcas_tl", role: "SUB", isSub: true },
      },
    ];

    const t: Tournament = {
      id: "TRN-0001",
      slug: "vanta-valorant-invitational-2026",
      name: "VANTA VALORANT INVITATIONAL 2026",
      season: "SEASON 01",
      status: "BRACKET_LOCKED",
      game: "VALORANT",
      format: "Single Elimination Knockout · BO1",
      prizePool: "$50,000",
      region: "GLOBAL",
      platform: "PC (Riot Competitive)",
      slots: 8,
      champion: null,
      createdAt: now,
      updatedAt: now,
      startDate: "AUG 30, 2026",
      checkInWindow: "18:00 – 18:30 UTC",
      prizeBreakdown: [["1ST", "$30,000"], ["2ND", "$12,000"], ["3RD–4TH", "$4,000"]],
      teams: valTeams,
      matches: [],
    } as Tournament;

    // Generate standard knockout bracket
    t.matches = generateBracket(t);
    await kv.set(TOURNAMENT_KEY, t);

    // Other events (directory cards).
    await kv.mset(
      ["event:TRN-0002", "event:TRN-0003", "event:TRN-0004"],
      [
        { id: "TRN-0002", name: "MIDNIGHT CS2 CIRCUIT", game: "CS2", format: "Double Elim · BO3", prize: "$25,000", slots: 16, registered: 11, status: "REGISTRATION_OPEN", region: "EU", closes: "SEP 04" },
        { id: "TRN-0003", name: "DOTA 2 VANGUARD CUP", game: "DOTA 2", format: "Single Elim · BO3", prize: "$40,000", slots: 8, registered: 8, status: "REGISTRATION_CLOSED", region: "APAC", closes: "CLOSED" },
        { id: "TRN-0004", name: "VALORANT ASCENT PROTOCOL", game: "VALORANT", format: "Single Elim Knockout · BO1", prize: "$15,000", slots: 8, registered: 6, status: "REGISTRATION_OPEN", region: "GLOBAL", closes: "SEP 18" },
      ],
    );

    // Past results (archive).
    await kv.mset(
      ["result:TRN-9821", "result:TRN-9799", "result:TRN-9764"],
      [
        { id: "TRN-9821", event: "VALORANT PHANTOM CUP", winner: "Sentinels", runnerUp: "Fnatic", score: "13–9", date: "2026-08-14" },
        { id: "TRN-9799", event: "CS2 ZERO HOUR", winner: "Vermillion", runnerUp: "Obsidian Pact", score: "2–1", date: "2026-08-07" },
        { id: "TRN-9764", event: "DOTA 2 BLACKOUT INVITATIONAL", winner: "Paper Rex", runnerUp: "DRX", score: "2–0", date: "2026-07-30" },
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

async function findAnnouncementKey(id?: string, ts?: string): Promise<{ key: string; item: any } | null> {
  if (ts) {
    const direct = await kv.get(`announcement:${ts}`);
    if (direct) return { key: `announcement:${ts}`, item: direct };
  }
  if (id) {
    const directId = await kv.get(`announcement:${id}`);
    if (directId) return { key: `announcement:${id}`, item: directId };
    const directRaw = await kv.get(id);
    if (directRaw) return { key: id, item: directRaw };
  }
  try {
    const { data } = await admin()
      .from("kv_store_d346d9b8")
      .select("key, value")
      .like("key", "announcement:%");
    if (data) {
      for (const row of data) {
        if (
          (id && row.value?.id === id) ||
          (ts && row.value?.ts === ts) ||
          (id && row.key.includes(id)) ||
          (ts && row.key.includes(ts))
        ) {
          return { key: row.key, item: row.value };
        }
      }
    }
  } catch { /* ignore fallback error */ }
  return null;
}

// Edit an existing announcement (POST RPC)
app.post(`${P}/announcements/update`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "announcements.edit");
    const { id, ts, title, body, severity } = await c.req.json();
    const found = await findAnnouncementKey(id, ts);
    if (!found) return c.json({ error: "Announcement not found" }, 404);
    const updated = {
      ...found.item,
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(severity !== undefined && { severity }),
      editedAt: new Date().toISOString(),
      editedBy: profile.username,
    };
    await kv.set(found.key, updated);
    await audit(profile, "announcement.edited", updated.id || found.key, { title: updated.title });
    return c.json({ announcement: updated });
  } catch (e) {
    return errJson(c, e);
  }
});

// Delete an announcement permanently (POST RPC)
app.post(`${P}/announcements/delete`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "announcements.delete");
    const { id, ts, title } = await c.req.json();
    const found = await findAnnouncementKey(id, ts);

    // Direct deletion from PostgreSQL KV table for 100% clean wipe
    if (found?.key) {
      await kv.del(found.key);
      await admin().from("kv_store_d346d9b8").delete().eq("key", found.key);
    }
    if (ts) {
      await kv.del(`announcement:${ts}`);
      await admin().from("kv_store_d346d9b8").delete().like("key", `%${ts}%`);
    }
    if (id) {
      await kv.del(`announcement:${id}`);
      await admin().from("kv_store_d346d9b8").delete().like("key", `%${id}%`);
    }
    if (title) {
      // Find by title in value if passed
      const { data } = await admin().from("kv_store_d346d9b8").select("key, value").like("key", "announcement:%");
      if (data) {
        for (const row of data) {
          if (row.value?.title === title) {
            await kv.del(row.key);
            await admin().from("kv_store_d346d9b8").delete().eq("key", row.key);
          }
        }
      }
    }

    await audit(profile, "announcement.deleted", found?.item?.id || id || ts || "announcement", { title: found?.item?.title || title });
    return c.json({ ok: true });
  } catch (e) {
    return errJson(c, e);
  }
});

// Edit an existing announcement (REST PATCH)
app.patch(`${P}/announcements/:ts`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "announcements.edit");
    const ts = c.req.param("ts");
    const found = await findAnnouncementKey(undefined, ts);
    if (!found) return c.json({ error: "Announcement not found" }, 404);
    const { title, body, severity } = await c.req.json();
    const updated = {
      ...found.item,
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(severity !== undefined && { severity }),
      editedAt: new Date().toISOString(),
      editedBy: profile.username,
    };
    await kv.set(found.key, updated);
    await audit(profile, "announcement.edited", updated.id || found.key, { title: updated.title });
    return c.json({ announcement: updated });
  } catch (e) {
    return errJson(c, e);
  }
});

// Delete an announcement permanently (REST DELETE)
app.delete(`${P}/announcements/:ts`, async (c) => {
  try {
    const profile = await requireProfile(c);
    requirePerm(profile, "announcements.delete");
    const ts = c.req.param("ts");
    const found = await findAnnouncementKey(undefined, ts);
    if (found?.key) {
      await kv.del(found.key);
      await admin().from("kv_store_d346d9b8").delete().eq("key", found.key);
    }
    await kv.del(`announcement:${ts}`);
    await admin().from("kv_store_d346d9b8").delete().like("key", `%${ts}%`);
    await audit(profile, "announcement.deleted", found?.item?.id || ts, { title: found?.item?.title });
    return c.json({ ok: true });
  } catch (e) {
    return errJson(c, e);
  }
});

// ---------------------------------------------------------------------------
// OPERATOR MUTATIONS (POST RPC to avoid CORS/PUT issues)
// ---------------------------------------------------------------------------

app.post(`${P}/operations/run`, async (c) => {
  try {
    const profile = await requireProfile(c);
    const { action, ...body } = await c.req.json();
    const t: Tournament = (await kv.get(TOURNAMENT_KEY)) ?? ({} as any);

    const events = await runOp(profile, t, action, body);
    await kv.set(TOURNAMENT_KEY, t);

    return c.json({ ok: true, events, tournament: t });
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
    case "create-tournament": {
      requirePerm(profile, "tournaments.manage");
      const { name, game, season, format, formatType, slots, prizePool, region, startDate, registrationDeadline, checkInWindow } = body;
      if (!name) throw new HttpError(400, "Tournament name is required");
      t.name = String(name).trim();
      t.game = String(game || "VALORANT").trim();
      t.season = String(season || "SEASON 01").trim();
      t.format = String(format || "Single Elimination Knockout · BO1").trim();
      t.formatType = formatType || "KNOCKOUT";
      t.slots = Number(slots) || 8;
      t.prizePool = String(prizePool || "$10,000").trim();
      t.region = String(region || "GLOBAL").trim();
      t.startDate = startDate ? String(startDate).trim() : undefined;
      t.registrationDeadline = registrationDeadline ? String(registrationDeadline).trim() : undefined;
      t.checkInWindow = checkInWindow ? String(checkInWindow).trim() : undefined;
      t.status = "DRAFT";
      t.champion = null;
      t.teams = [];
      t.matches = [];
      t.updatedAt = new Date().toISOString();
      await audit(profile, "tournament.created", t.id, { name: t.name, game: t.game, slots: t.slots, format: t.format });
      await notify("tournament.created", "Tournament created", `${t.name} (${t.game}) configured for ${t.slots} teams`);
      return ["tournament.created"];
    }
    case "edit-tournament": {
      requirePerm(profile, "tournaments.manage");
      if (body.name) t.name = String(body.name).trim();
      if (body.game) t.game = String(body.game).trim();
      if (body.season) t.season = String(body.season).trim();
      if (body.format) t.format = String(body.format).trim();
      if (body.formatType) t.formatType = body.formatType;
      if (body.slots) t.slots = Number(body.slots);
      if (body.prizePool) t.prizePool = String(body.prizePool).trim();
      if (body.region) t.region = String(body.region).trim();
      if (body.startDate !== undefined) t.startDate = String(body.startDate).trim();
      if (body.registrationDeadline !== undefined) t.registrationDeadline = String(body.registrationDeadline).trim();
      if (body.checkInWindow !== undefined) t.checkInWindow = String(body.checkInWindow).trim();
      if (body.status) t.status = body.status;
      t.updatedAt = new Date().toISOString();
      await audit(profile, "tournament.edited", t.id, { name: t.name, game: t.game });
      return ["tournament.edited"];
    }
    case "update-fixture": {
      requirePerm(profile, "tournaments.manage");
      const { matchId, teamAId, teamBId, time, format, roundName } = body;
      const match = t.matches.find((m) => m.id === matchId);
      if (!match) throw new HttpError(404, "Match fixture not found");
      if (teamAId !== undefined) match.a = teamAId ? String(teamAId) : null;
      if (teamBId !== undefined) match.b = teamBId ? String(teamBId) : null;
      if (time !== undefined) match.time = String(time);
      if (format !== undefined) match.format = format;
      if (roundName !== undefined) match.round = String(roundName);
      if (match.a && match.b && match.status === "SCHEDULED") match.status = "READY";
      t.updatedAt = new Date().toISOString();
      await audit(profile, "fixture.updated", match.id, { a: match.a, b: match.b, time: match.time });
      return [`fixture.updated:${match.id}`];
    }
    case "add-team": {
      requirePerm(profile, "tournaments.manage");
      const { name, tag, region, seed, igl, members, sub, contactEmail, registrationNotes } = body;
      if (!name || !tag) throw new HttpError(400, "Team name and tag are required");
      const cleanTag = String(tag).toUpperCase().trim();
      if (t.teams.some((x) => x.tag === cleanTag)) throw new HttpError(409, `Team tag ${cleanTag} already exists`);
      const newTeam: Team = {
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: String(name).trim(),
        tag: cleanTag,
        region: String(region || t.region || "GLOBAL").toUpperCase().trim(),
        seed: seed ? Number(seed) : null,
        checkedIn: true,
        approved: true,
        igl: igl ? {
          name: String(igl.name || "").trim(),
          inGameName: String(igl.inGameName || "").trim(),
          discordId: String(igl.discordId || "").trim(),
          role: String(igl.role || "IGL").trim(),
          isIgl: true,
        } : undefined,
        members: Array.isArray(members) ? members.map((m: any) => ({
          name: String(m.name || "").trim(),
          inGameName: String(m.inGameName || "").trim(),
          discordId: String(m.discordId || "").trim(),
          role: String(m.role || "MEMBER").trim(),
        })) : [],
        sub: sub ? {
          name: String(sub.name || "").trim(),
          inGameName: String(sub.inGameName || "").trim(),
          discordId: String(sub.discordId || "").trim(),
          role: "SUB",
          isSub: true,
        } : undefined,
        contactEmail: contactEmail ? String(contactEmail).trim() : undefined,
        registrationNotes: registrationNotes ? String(registrationNotes).trim() : undefined,
      };
      t.teams.push(newTeam);
      t.updatedAt = new Date().toISOString();
      await audit(profile, "team.added_admin", newTeam.id, { name: newTeam.name, tag: newTeam.tag });
      return [`team.added:${newTeam.id}`];
    }
    case "remove-team": {
      requirePerm(profile, "tournaments.manage");
      const idx = t.teams.findIndex((x) => x.id === body.teamId);
      if (idx === -1) throw new HttpError(404, "Team not found");
      const [removed] = t.teams.splice(idx, 1);
      await audit(profile, "team.removed_admin", removed.id, { name: removed.name });
      return [`team.removed:${removed.id}`];
    }
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
      const eligible = t.teams.filter((x) => x.approved);
      if (eligible.length < 2) throw new HttpError(409, `Need at least 2 approved teams, have ${eligible.length}`);
      let order = [...eligible];
      if (body.method === "random") order = shuffle(order);
      // manual: keep given order if provided
      if (body.method === "manual" && Array.isArray(body.order)) {
        order = body.order.map((id: string) => eligible.find((e) => e.id === id)).filter(Boolean);
      }
      t.teams.forEach((x) => (x.seed = null));
      order.forEach((team, i) => {
        const ref = t.teams.find((x) => x.id === team.id);
        if (ref) ref.seed = i + 1;
      });
      await audit(profile, "seed.locked", t.id, { method: body.method ?? "manual", count: order.length });
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
