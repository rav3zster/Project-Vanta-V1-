import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { api, type Player } from "../lib/supabase";
import { StatusChip, Mono } from "./ui";
import { Bracket } from "./Bracket";
import { getGameConfig, GAME_LIST } from "../config/games";
import { uploadRosterImage } from "../lib/storage";

const LIFECYCLE = [
  "DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "ROSTER_LOCK",
  "CHECK_IN_OPEN", "CHECK_IN_CLOSED", "SEEDING", "BRACKET_LOCKED",
  "LIVE", "COMPLETED",
];

const btn =
  "border border-border-strong px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] transition-colors hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent";
const primary =
  "bg-accent px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

type Tab = "OPERATIONS" | "REGISTRATIONS" | "ROSTER" | "USERS" | "ANNOUNCEMENTS" | "AUDIT";

export function Control({ onClose }: { onClose: () => void }) {
  const { profile, effectiveRole, availablePerspectives, setPerspective, can, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("OPERATIONS");
  const [t, setT] = useState<any>(null);
  const [feed, setFeed] = useState<{ msg: string; kind: "ok" | "err" }[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const { tournament } = await api.getTournament();
      setT(tournament);
    } catch { /* ignore */ }
    if (can("audit.view")) {
      try { setAudit((await api.audit()).entries); } catch { /* ignore */ }
      try { setUsers((await api.getUsers()).users); } catch { /* ignore */ }
    }
    try { setAnnouncements((await api.getAnnouncements()).announcements); } catch { /* ignore */ }
    try { setRoster((await api.getRoster()).players); } catch { /* ignore */ }
  }

  useEffect(() => { load(); }, []);

  function push(msg: string, kind: "ok" | "err" = "ok") {
    setFeed((f) => [{ msg, kind }, ...f].slice(0, 8));
  }

  async function run<T>(label: string, fn: () => Promise<T>, after?: (r: T) => void) {
    setBusy(true);
    try {
      const r = await fn();
      const events = (r as any)?.events as string[] | undefined;
      if ((r as any)?.tournament) setT((r as any).tournament);
      after?.(r);
      push(`${label} — ${events?.join(", ") || "ok"}`);
      if (can("audit.view")) {
        try { setAudit((await api.audit()).entries); } catch { /* ignore */ }
      }
    } catch (e) {
      push(`${label}: ${e instanceof Error ? e.message : String(e)}`, "err");
    } finally {
      setBusy(false);
    }
  }

  const seed = () => run("Seed tournament", () => api.seed());
  const op = (label: string, action: string, body?: Record<string, unknown>) =>
    run(label, () => api.op(action, body));

  const status: string = t?.status ?? "—";
  const teams: any[] = t?.teams ?? [];
  const matches: any[] = t?.matches ?? [];
  const checkedIn = teams.filter((x) => x.checkedIn).length;
  const approved = teams.filter((x) => x.approved).length;
  const readyMatches = matches.filter((m) => m.a && m.b && m.status !== "COMPLETED" && m.status !== "FORFEIT");
  const pendingReg = teams.filter((x) => !x.approved).length;

  const TABS: { id: Tab; show: boolean }[] = [
    { id: "OPERATIONS", show: true },
    { id: "REGISTRATIONS", show: can("registrations.approve") },
    { id: "ROSTER", show: can("roster.manage") },
    { id: "USERS", show: can("roles.manage") },
    { id: "ANNOUNCEMENTS", show: can("announcements.publish") },
    { id: "AUDIT", show: can("audit.view") },
  ];

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="font-display text-lg font-black tracking-tight">CONTROL</span>
          <Mono>OPERATIONS COMMAND CENTER</Mono>
        </div>
        <div className="flex items-center gap-3">
          {/* Perspective Switcher for GOD & DEMI_GOD */}
          {availablePerspectives.length > 1 && (
            <div className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5">
              <span className="font-mono text-[9px] tracking-[0.15em] text-muted">VIEW AS:</span>
              {availablePerspectives.map((role) => (
                <button
                  key={role}
                  onClick={() => setPerspective(role)}
                  className={`border px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.1em] transition-colors ${
                    effectiveRole === role
                      ? role === "GOD"
                        ? "border-accent bg-accent/20 text-accent"
                        : role === "DEMI_GOD"
                        ? "border-success bg-success/20 text-success"
                        : "border-foreground bg-foreground text-background"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}

          {profile && (
            <div className="text-right">
              <div className="font-mono text-[11px] text-foreground">{profile.username}</div>
              <StatusChip status={effectiveRole === "GOD" ? "LIVE" : effectiveRole === "DEMI_GOD" ? "READY" : "SCHEDULED"} />
            </div>
          )}
          <button onClick={() => logout()} className={btn}>LOG OUT</button>
          <button onClick={onClose} className={primary}>EXIT →</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-surface/60">
        <div className="mx-auto flex max-w-7xl gap-1 px-5">
          {TABS.filter((x) => x.show).map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`relative px-4 py-3 font-mono text-[11px] tracking-[0.15em] transition-colors ${
                tab === x.id ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {x.id}
              {x.id === "REGISTRATIONS" && pendingReg > 0 && (
                <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[9px] text-accent-foreground">{pendingReg}</span>
              )}
              {tab === x.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8">
        {!t && tab !== "ROSTER" ? (
          <div className="flex flex-col items-center gap-4 border border-border bg-surface p-16 text-center">
            <Mono>NO ACTIVE OPERATION</Mono>
            <p className="max-w-sm text-sm text-muted">
              No tournament exists yet. Seed the vertical-slice event — 8 teams, single elimination —
              to begin operations.
            </p>
            <button onClick={seed} disabled={busy || !can("seed.run")} className={primary}>
              SEED 8-TEAM TOURNAMENT
            </button>
            {!can("seed.run") && <Mono className="text-danger">Requires seed.run permission</Mono>}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {tab === "OPERATIONS" && (
                <>
                  <div className="border border-border bg-surface p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <Mono>TOURNAMENT LIFECYCLE</Mono>
                      <StatusChip status={status === "COMPLETED" ? "COMPLETED" : "LIVE"} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {LIFECYCLE.map((s) => {
                        const idx = LIFECYCLE.indexOf(status);
                        const here = s === status;
                        const done = LIFECYCLE.indexOf(s) < idx;
                        return (
                          <span key={s} className={`font-mono text-[9px] tracking-[0.1em] border px-1.5 py-1 ${
                            here ? "border-accent bg-accent/10 text-accent"
                            : done ? "border-border text-muted" : "border-border/50 text-border-strong"
                          }`}>
                            {s}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                      {status === "REGISTRATION_OPEN" && (
                        <button className={primary} disabled={busy || !can("tournaments.manage")}
                          onClick={() => op("Close registration", "transition", { to: "REGISTRATION_CLOSED" })}>
                          CLOSE REGISTRATION ({approved}/8 APPROVED)
                        </button>
                      )}
                      {status === "REGISTRATION_CLOSED" && (
                        <button className={primary} disabled={busy || approved < 8 || !can("tournaments.manage")}
                          onClick={() => op("Lock rosters", "transition", { to: "ROSTER_LOCK" })}>
                          LOCK ROSTERS
                        </button>
                      )}
                      {status === "ROSTER_LOCK" && (
                        <button className={primary} disabled={busy || !can("checkins.manage")}
                          onClick={() => op("Open check-in", "transition", { to: "CHECK_IN_OPEN" })}>
                          OPEN CHECK-IN
                        </button>
                      )}
                      {status === "CHECK_IN_OPEN" && (
                        <button className={primary} disabled={busy || !can("checkins.manage")}
                          onClick={() => op("Close check-in", "transition", { to: "CHECK_IN_CLOSED" })}>
                          CLOSE CHECK-IN ({checkedIn}/8)
                        </button>
                      )}
                      {status === "CHECK_IN_CLOSED" && (
                        <button className={primary} disabled={busy || !can("seeding.manage")}
                          onClick={() => op("Begin seeding", "transition", { to: "SEEDING" })}>
                          BEGIN SEEDING
                        </button>
                      )}
                      {status === "SEEDING" && (
                        <>
                          <button className={btn} disabled={busy || !can("seeding.manage")}
                            onClick={() => op("Randomize seeds", "seed-teams", { method: "random" })}>
                            RANDOMIZE SEEDS
                          </button>
                          <button className={primary} disabled={busy || teams.some((x) => x.seed == null) || !can("seeding.manage")}
                            onClick={() => op("Lock bracket", "transition", { to: "BRACKET_LOCKED" })}>
                            LOCK SEEDING
                          </button>
                        </>
                      )}
                      {status === "BRACKET_LOCKED" && (
                        <>
                          <button className={btn} disabled={busy || matches.length > 0 || !can("brackets.generate")}
                            onClick={() => op("Generate bracket", "generate-bracket")}>
                            GENERATE BRACKET
                          </button>
                          <button className={primary} disabled={busy || matches.length === 0 || !can("tournaments.manage")}
                            onClick={() => op("Go live", "transition", { to: "LIVE" })}>
                            GO LIVE
                          </button>
                        </>
                      )}
                      {status === "COMPLETED" && (
                        <div className="font-mono text-sm text-accent">
                          CHAMPION: {teams.find((x) => x.id === t.champion)?.name ?? "—"}
                        </div>
                      )}
                    </div>
                  </div>

                  {status === "CHECK_IN_OPEN" && (
                    <div className="border border-border bg-surface p-5">
                      <Mono>CHECK-IN CONTROL</Mono>
                      <div className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2">
                        {teams.map((tm) => (
                          <div key={tm.id} className="flex items-center justify-between bg-surface px-4 py-2.5">
                            <span className="text-sm">{tm.name}</span>
                            <button disabled={busy || !can("checkins.manage")}
                              onClick={() => op(`Check-in ${tm.tag}`, "checkin", { teamId: tm.id, value: !tm.checkedIn })}
                              className={`font-mono text-[10px] tracking-[0.12em] border px-2 py-1 transition-colors ${
                                tm.checkedIn ? "border-success/40 text-success" : "border-border text-muted hover:text-foreground"
                              }`}>
                              {tm.checkedIn ? "CHECKED IN" : "MARK IN"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(status === "LIVE" || matches.length > 0) && (
                    <div className="border border-border bg-surface p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <Mono>MATCH RESOLUTION</Mono>
                        <Mono>{matches.filter((m) => m.status === "COMPLETED").length}/{matches.length} FINAL</Mono>
                      </div>
                      <div className="space-y-2">
                        {readyMatches.length === 0 && (
                          <p className="font-mono text-xs text-border-strong">No matches awaiting a result.</p>
                        )}
                        {readyMatches.map((m) => (
                          <MatchResolver key={m.id} m={m} teams={teams} busy={busy} can={can} op={op} />
                        ))}
                      </div>
                    </div>
                  )}

                  {matches.length > 0 && (
                    <div>
                      <Mono className="mb-3 block">LIVE BRACKET — PROJECTION OF STATE</Mono>
                      <Bracket teams={teams as any} matches={matches as any} />
                    </div>
                  )}
                </>
              )}

              {tab === "REGISTRATIONS" && (
                <div className="border border-border bg-surface p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <Mono>TEAM REGISTRATIONS</Mono>
                    <Mono>{approved}/{teams.length} APPROVED</Mono>
                  </div>
                  <div className="grid gap-px border border-border bg-border">
                    {teams.map((tm) => (
                      <div key={tm.id} className="flex items-center justify-between bg-surface px-4 py-3">
                        <div>
                          <div className="font-display text-sm font-bold">{tm.tag} <span className="text-muted">· {tm.name}</span></div>
                          <Mono>{tm.region}</Mono>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusChip status={tm.approved ? "READY" : "SCHEDULED"} />
                          {!tm.approved ? (
                            <button className={btn} disabled={busy || !can("registrations.approve")}
                              onClick={() => op(`Approve ${tm.tag}`, "approve-team", { teamId: tm.id })}>
                              APPROVE
                            </button>
                          ) : (
                            <button className="border border-danger/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-danger hover:bg-danger/5 disabled:opacity-40"
                              disabled={busy || !can("registrations.approve")}
                              onClick={() => op(`Reject ${tm.tag}`, "reject-team", { teamId: tm.id })}>
                              REJECT
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "ROSTER" && (
                <RosterAdmin
                  roster={roster} busy={busy} can={can}
                  onSave={(players) => run("Save roster", () => api.updateRoster(players),
                    (r) => setRoster((r as any).players))}
                />
              )}

              {tab === "USERS" && (
                <div className="space-y-6">
                  {/* Assign Role by Email (GOD feature) */}
                  <div className="border border-border bg-surface p-5">
                    <Mono>ASSIGN ROLE BY EMAIL</Mono>
                    <p className="mt-1 text-xs text-muted">
                      Grant DEMI_GOD or GOD privileges to any email address. Works for existing accounts or pre-assigns role for future signups.
                    </p>
                    <RoleByEmailForm
                      busy={busy}
                      onAssign={(email, role) =>
                        run(`Assign ${email} → ${role}`, () => api.setUserRoleByEmail({ email, role }), () => load())
                      }
                    />
                  </div>

                  {/* Registered Users List */}
                  <div className="border border-border bg-surface p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <Mono>USER ROLES &amp; PERMISSIONS</Mono>
                      <Mono>{users.length} REGISTERED OPERATOR{users.length === 1 ? "" : "S"}</Mono>
                    </div>
                    <div className="grid gap-px border border-border bg-border">
                      {users.length === 0 && <div className="bg-surface px-4 py-3"><Mono>No users loaded.</Mono></div>}
                      {users.map((u) => {
                        const isFounderUser = (u.email ?? "").toLowerCase().trim() === "raveends70@gmail.com";
                        return (
                          <div key={u.id} className="flex flex-col gap-3 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-foreground">{u.username}</span>
                                {isFounderUser && (
                                  <span className="border border-accent bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent">
                                    FOUNDER
                                  </span>
                                )}
                              </div>
                              <Mono>{u.email} · {u.region}</Mono>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(["HUMAN", "DEMI_GOD", "GOD"] as const).map((r) => (
                                <button
                                  key={r}
                                  disabled={busy || u.role === r || (isFounderUser && r !== "GOD")}
                                  onClick={() =>
                                    run(`Set ${u.username} → ${r}`, () => api.setUserRole({ userId: u.id, role: r }),
                                      () => setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: r } : x))))
                                  }
                                  className={`font-mono text-[10px] tracking-[0.1em] border px-2.5 py-1 transition-colors ${
                                    u.role === r
                                      ? r === "GOD"
                                        ? "border-accent bg-accent/15 font-bold text-accent"
                                        : r === "DEMI_GOD"
                                        ? "border-success bg-success/15 font-bold text-success"
                                        : "border-border bg-surface-secondary text-foreground"
                                      : "border-border text-muted hover:text-foreground disabled:opacity-40"
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {tab === "ANNOUNCEMENTS" && (
                <AnnouncementsAdmin
                  list={announcements} busy={busy} can={can}
                  onPost={(b) => run("Publish announcement", () => api.createAnnouncement(b),
                    (r) => setAnnouncements((prev) => [(r as any).announcement, ...prev]))}
                />
              )}

              {tab === "AUDIT" && (
                <div className="border border-border bg-surface p-5">
                  <Mono>FULL AUDIT LOG</Mono>
                  <div className="mt-4 divide-y divide-border border border-border">
                    {audit.length === 0 && <div className="px-4 py-3"><Mono>No entries.</Mono></div>}
                    {audit.map((a, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <div className="font-mono text-[11px] text-foreground">{a.action}</div>
                          <Mono>{a.actor} · {a.role}</Mono>
                        </div>
                        <Mono>{new Date(a.ts).toLocaleString()}</Mono>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="border border-border bg-surface p-5">
                <Mono>OPERATION FEED</Mono>
                <div className="mt-3 space-y-1.5">
                  {feed.length === 0 && <p className="font-mono text-[11px] text-border-strong">Awaiting actions…</p>}
                  {feed.map((f, i) => (
                    <div key={i} className={`font-mono text-[10px] leading-relaxed ${f.kind === "err" ? "text-danger" : "text-muted"}`}>
                      {f.kind === "err" ? "✕ " : "› "}{f.msg}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border bg-surface p-5">
                <Mono>SNAPSHOT</Mono>
                <dl className="mt-3 space-y-2">
                  {[
                    ["STATUS", status],
                    ["TEAMS", `${teams.length}/${t?.slots ?? 8}`],
                    ["APPROVED", `${approved}`],
                    ["CHECKED IN", `${checkedIn}`],
                    ["MATCHES", `${matches.length}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="font-mono text-[10px] tracking-[0.1em] text-muted">{k}</dt>
                      <dd className="font-mono text-[11px] tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementsAdmin({
  list, busy, can, onPost,
}: {
  list: any[]; busy: boolean;
  can: (p: string) => boolean;
  onPost: (b: { title: string; body: string; severity: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("INFO");
  const input = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
  return (
    <div className="space-y-6">
      <div className="border border-border bg-surface p-5">
        <Mono>COMPOSE ANNOUNCEMENT</Mono>
        <div className="mt-4 space-y-3">
          <input className={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={`${input} min-h-24 resize-y`} placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex items-center gap-2">
            {["INFO", "SUCCESS", "WARNING", "DANGER"].map((s) => (
              <button key={s} onClick={() => setSeverity(s)}
                className={`font-mono text-[10px] tracking-[0.1em] border px-2 py-1 ${
                  severity === s ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"
                }`}>
                {s}
              </button>
            ))}
            <button className={`${primary} ml-auto`} disabled={busy || !title || !body || !can("announcements.publish")}
              onClick={() => { onPost({ title, body, severity }); setTitle(""); setBody(""); }}>
              PUBLISH
            </button>
          </div>
        </div>
      </div>
      <div className="border border-border bg-surface p-5">
        <Mono>PUBLISHED</Mono>
        <div className="mt-4 space-y-2">
          {list.length === 0 && <Mono>None yet.</Mono>}
          {list.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 border border-border p-3">
              <div className="flex items-start gap-3">
                <StatusChip status={a.severity} />
                <div>
                  <div className="font-display text-sm font-bold">{a.title}</div>
                  <div className="text-sm text-muted">{a.body}</div>
                </div>
              </div>
              <Mono className="shrink-0">{new Date(a.ts).toLocaleDateString()}</Mono>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const GAME_PRESETS = [
  "VALORANT",
  "CS2",
  "LEAGUE OF LEGENDS",
  "DOTA 2",
  "APEX LEGENDS",
  "OVERWATCH 2",
  "ROCKET LEAGUE",
  "RAINBOW SIX",
];
const ROLE_PRESETS = [
  "DUELIST", "SENTINEL", "CONTROLLER", "INITIATOR", "IGL", "AWPER",
  "ENTRY FRAGGER", "MID LANER", "CARRY", "SUPPORT", "OFFLANER", "FLEX",
  "SUB", "COACH", "ANALYST", "MANAGER",
];
const REGION_PRESETS = ["GLOBAL", "NA", "EU", "APAC", "SA", "MENA"];

function RoleByEmailForm({
  busy,
  onAssign,
}: {
  busy: boolean;
  onAssign: (email: string, role: "GOD" | "DEMI_GOD" | "HUMAN") => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"GOD" | "DEMI_GOD" | "HUMAN">("DEMI_GOD");
  const input =
    "w-full border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent placeholder:text-border-strong";

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        className={`${input} flex-1`}
        placeholder="operator@email.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex items-center gap-1.5">
        {(["HUMAN", "DEMI_GOD", "GOD"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`border px-2.5 py-2 font-mono text-[10px] font-bold tracking-[0.1em] transition-colors ${
              role === r
                ? r === "GOD"
                  ? "border-accent bg-accent/20 text-accent"
                  : r === "DEMI_GOD"
                  ? "border-success bg-success/20 text-success"
                  : "border-foreground bg-foreground text-background"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || !email.trim()}
        onClick={() => {
          if (email.trim()) {
            onAssign(email.trim(), role);
            setEmail("");
          }
        }}
        className={`${primary} whitespace-nowrap`}
      >
        {busy ? "ASSIGNING…" : `ASSIGN ${role}`}
      </button>
    </div>
  );
}

function RosterAdmin({
  roster, busy, can, onSave,
}: {
  roster: Player[]; busy: boolean;
  can: (p: string) => boolean;
  onSave: (players: Player[]) => void;
}) {
  const [players, setPlayers] = useState<Player[]>(roster);
  const [dirty, setDirty] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  // Re-sync when a save round-trips or the roster first loads (until edited).
  useEffect(() => { if (!dirty) setPlayers(roster); }, [roster, dirty]);

  const input =
    "w-full border border-border bg-background px-2.5 py-2 text-sm outline-none transition-colors focus:border-accent placeholder:text-border-strong";

  function edit(i: number, patch: Partial<Player>) {
    setDirty(true);
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function handleGameChange(i: number, newGame: string) {
    const cfg = getGameConfig(newGame);
    edit(i, {
      game: newGame,
      role: cfg.roles[0] || "PLAYER",
      rank: cfg.ranks[0] || "",
    });
  }

  async function handleFileUpload(i: number, file: File) {
    setUploadingIdx(i);
    try {
      const url = await uploadRosterImage(file);
      edit(i, { image: url });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingIdx(null);
    }
  }

  function remove(i: number) {
    setDirty(true);
    setPlayers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= players.length) return;
    setDirty(true);
    setPlayers((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function add() {
    setDirty(true);
    const defaultGame = "VALORANT";
    const cfg = getGameConfig(defaultGame);
    setPlayers((prev) => [
      ...prev,
      {
        handle: "",
        name: "",
        role: cfg.roles[0] || "DUELIST",
        game: defaultGame,
        rank: cfg.ranks[0] || "Radiant",
        winnings: "$0",
        region: "GLOBAL",
        image: "",
      },
    ]);
  }

  const canManage = can("roster.manage");

  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <Mono>HOUSE ROSTER MANAGEMENT</Mono>
        <Mono>{players.length} OPERATOR{players.length === 1 ? "" : "S"}{dirty ? " · UNSAVED" : ""}</Mono>
      </div>

      <div className="space-y-4">
        {players.length === 0 && (
          <p className="font-mono text-xs text-border-strong">No players yet. Add your first operator below.</p>
        )}
        {players.map((p, i) => {
          const gameKey = p.game || "VALORANT";
          const cfg = getGameConfig(gameKey);

          return (
            <div key={i} className="border border-border p-4 bg-background/60">
              <div className="flex flex-col gap-4 lg:flex-row">
                {/* Image Preview & Local Upload */}
                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <div
                    className="grain relative flex size-24 shrink-0 items-center justify-center overflow-hidden border border-border-strong bg-background"
                    aria-hidden="true"
                  >
                    {uploadingIdx === i ? (
                      <span className="font-mono text-[10px] text-accent animate-pulse">UPLOADING…</span>
                    ) : p.image ? (
                      <img src={p.image} alt="" className="size-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
                    ) : (
                      <span className="relative z-10 font-display text-2xl font-black text-border-strong">
                        {(p.handle || "?").slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <label className="cursor-pointer border border-border px-2.5 py-1 text-center font-mono text-[9px] tracking-[0.1em] text-accent transition-colors hover:border-accent hover:bg-accent/10">
                    <span>📁 {p.image ? "REPLACE PHOTO" : "UPLOAD PHOTO"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(i, f);
                      }}
                    />
                  </label>
                  {p.image && (
                    <button
                      type="button"
                      onClick={() => edit(i, { image: "" })}
                      className="font-mono text-[9px] text-danger hover:underline"
                    >
                      ✕ Clear Photo
                    </button>
                  )}
                </div>

                {/* Operator Fields */}
                <div className="grid flex-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Handle */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">GAMER HANDLE</label>
                    <input
                      className={input}
                      placeholder="e.g. TITAN, SPECTRE"
                      value={p.handle}
                      onChange={(e) => edit(i, { handle: e.target.value.toUpperCase() })}
                    />
                  </div>

                  {/* Real Name */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">REAL NAME</label>
                    <input
                      className={input}
                      placeholder="e.g. Rave Ends"
                      value={p.name}
                      onChange={(e) => edit(i, { name: e.target.value })}
                    />
                  </div>

                  {/* Game Selection */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">COMPETITIVE GAME</label>
                    <select
                      className={input}
                      value={gameKey}
                      onChange={(e) => handleGameChange(i, e.target.value)}
                    >
                      {GAME_LIST.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Game-Specific Role */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      {gameKey} ROLE
                    </label>
                    <div className="relative">
                      <input
                        className={input}
                        placeholder="Select or type role"
                        list={`roles-${i}`}
                        value={p.role}
                        onChange={(e) => edit(i, { role: e.target.value.toUpperCase() })}
                      />
                      <datalist id={`roles-${i}`}>
                        {cfg.roles.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Game-Specific Rank */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      {gameKey} RANK
                    </label>
                    <div className="relative">
                      <input
                        className={input}
                        placeholder="Select or type rank"
                        list={`ranks-${i}`}
                        value={p.rank ?? ""}
                        onChange={(e) => edit(i, { rank: e.target.value })}
                      />
                      <datalist id={`ranks-${i}`}>
                        {cfg.ranks.map((rk) => (
                          <option key={rk} value={rk} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Earnings / Winnings */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">TOTAL EARNINGS</label>
                    <input
                      className={input}
                      placeholder="e.g. $75,000"
                      value={p.winnings ?? ""}
                      onChange={(e) => edit(i, { winnings: e.target.value })}
                    />
                  </div>

                  {/* Region */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">REGION</label>
                    <select
                      className={input}
                      value={REGION_PRESETS.includes(p.region) ? p.region : "GLOBAL"}
                      onChange={(e) => edit(i, { region: e.target.value })}
                    >
                      {REGION_PRESETS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direct Image URL fallback */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-mono text-[9px] text-muted">IMAGE URL (OPTIONAL)</label>
                    <input
                      className={input}
                      placeholder="https://images.unsplash.com/... or uploaded photo"
                      value={p.image ?? ""}
                      onChange={(e) => edit(i, { image: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Operator footer bar */}
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
                  <span className="font-bold text-accent">{p.game || "VALORANT"}</span>
                  <span>·</span>
                  <span>{p.role || "FLEX"}</span>
                  {p.rank && (
                    <>
                      <span>·</span>
                      <span className="text-foreground">{p.rank}</span>
                    </>
                  )}
                  {p.winnings && (
                    <>
                      <span>·</span>
                      <span className="text-accent">{p.winnings}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-foreground disabled:opacity-30">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === players.length - 1}
                    className="border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-foreground disabled:opacity-30">↓</button>
                  <button onClick={() => remove(i)}
                    className="border border-danger/40 px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-danger hover:bg-danger/5">REMOVE</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button onClick={add} className={btn} disabled={!canManage}>+ ADD OPERATOR</button>
        <button onClick={() => { setDirty(false); setPlayers(roster); }} disabled={!dirty}
          className={`${btn} disabled:opacity-40`}>DISCARD</button>
        <button
          onClick={() => { onSave(players.filter((p) => p.handle.trim())); setDirty(false); }}
          disabled={busy || !dirty || !canManage}
          className={`${primary} ml-auto`}>
          {busy ? "SAVING…" : "PUBLISH ROSTER"}
        </button>
      </div>
      {!canManage && <Mono className="mt-2 block text-danger">Requires roster.manage permission</Mono>}
    </div>
  );
}


function MatchResolver({
  m, teams, busy, can, op,
}: {
  m: any; teams: any[]; busy: boolean;
  can: (p: string) => boolean;
  op: (label: string, action: string, body?: Record<string, unknown>) => void;
}) {
  const [sa, setSa] = useState("13");
  const [sb, setSb] = useState("11");
  const a = teams.find((x) => x.id === m.a);
  const b = teams.find((x) => x.id === m.b);
  const disputed = m.status === "DISPUTED";
  const scoreInput = "w-14 border border-border bg-background px-2 py-1 text-center font-mono text-sm outline-none focus:border-accent";

  return (
    <div className={`border p-3 ${disputed ? "border-danger/40 bg-danger/5" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted">{m.id} · {m.round}</span>
        <StatusChip status={m.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="w-28 truncate text-sm">{a?.tag ?? "—"}</span>
        <input className={scoreInput} value={sa} onChange={(e) => setSa(e.target.value)} />
        <span className="text-border-strong">:</span>
        <input className={scoreInput} value={sb} onChange={(e) => setSb(e.target.value)} />
        <span className="w-28 truncate text-sm">{b?.tag ?? "—"}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!disputed && (
          <>
            <button className="border border-border-strong px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] hover:bg-surface-hover disabled:opacity-40"
              disabled={busy || !can("matches.resolve")}
              onClick={() => op(`Finalize ${m.id}`, "submit-result", { matchId: m.id, scoreA: Number(sa), scoreB: Number(sb) })}>
              FINALIZE RESULT
            </button>
            <button className="border border-warning/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-warning hover:bg-warning/5 disabled:opacity-40"
              disabled={busy || !can("matches.resolve")}
              onClick={() => op(`Forfeit ${m.id}`, "forfeit", { matchId: m.id, teamId: m.b, reason: "No-show" })}>
              FORFEIT {b?.tag}
            </button>
            <button className="border border-danger/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-danger hover:bg-danger/5 disabled:opacity-40"
              disabled={busy || !can("disputes.create")}
              onClick={() => op(`Dispute ${m.id}`, "dispute", { matchId: m.id, reason: "Score mismatch" })}>
              OPEN DISPUTE
            </button>
          </>
        )}
        {disputed && (
          <button className="bg-accent px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] text-accent-foreground disabled:opacity-40"
            disabled={busy || !can("disputes.resolve")}
            onClick={() => op(`Resolve ${m.id}`, "resolve-dispute", { matchId: m.id, scoreA: Number(sa), scoreB: Number(sb), reason: "Evidence reviewed" })}>
            RESOLVE DISPUTE
          </button>
        )}
      </div>
    </div>
  );
}
