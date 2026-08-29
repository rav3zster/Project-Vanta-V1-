import { useEffect, useState } from "react";
import { brand } from "./config/brand";
import { useAuth } from "./lib/auth";
import { useSite } from "./lib/site";
import { api, type Player } from "./lib/supabase";
import { navigate } from "./lib/router";
import { StatusChip, SectionHeader, Mono, PlayerCard } from "./components/ui";
import { Bracket } from "./components/Bracket";
import { PlayerDossier } from "./components/PlayerDossier";

const primary =
  "bg-accent px-6 py-3 font-mono text-xs font-bold tracking-[0.15em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40";
const ghost =
  "border border-border-strong px-6 py-3 font-mono text-xs tracking-[0.15em] text-foreground transition-colors hover:bg-surface-hover";

function PageHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="border-b border-border bg-surface/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-16">
        <Mono className="text-accent text-[10px] sm:text-xs">{kicker}</Mono>
        <h1 className="mt-2 sm:mt-3 font-display text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase">{title}</h1>
        {sub && <p className="mt-3 sm:mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grain relative border border-border bg-surface/40 p-12 text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-muted">{label}</p>
    </div>
  );
}

// ---------- TOURNAMENTS ----------
export function TournamentsPage() {
  const { data } = useSite();
  const t = data.tournament;
  return (
    <>
      <PageHead kicker={`${brand.codename} // EVENT DIRECTORY`} title="Tournaments"
        sub="Every operated event — live, upcoming and archived. Registration, seeding and brackets run through a single operating pipeline." />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeader index="01" title="Featured" action={t ? <StatusChip status={t.status} /> : undefined} />
        {!t ? <Empty label="NO ACTIVE TOURNAMENT" /> : (
          <button onClick={() => navigate("tournament")}
            className="group grid w-full gap-6 border border-border bg-surface p-6 text-left transition-colors hover:border-border-strong sm:grid-cols-[1fr_auto]">
            <div>
              <Mono className="text-accent">{t.season}</Mono>
              <h3 className="mt-2 font-display text-4xl font-black tracking-tight uppercase">{t.name}</h3>
              <p className="mt-2 text-sm text-muted">{t.game} · {t.format}</p>
            </div>
            <div className="flex items-center gap-6 self-center">
              {[["TEAMS", `${t.teams.length}/${t.slots}`], ["PRIZE", t.prizePool], ["VIEW", "→"]].map(([k, v]) => (
                <div key={k}><Mono>{k}</Mono><div className="font-display text-xl font-extrabold tabular-nums group-hover:text-accent">{v}</div></div>
              ))}
            </div>
          </button>
        )}

        <div className="mt-12">
          <SectionHeader index="02" title="Open For Registration" />
          {data.events.length === 0 ? <Empty label="NO OTHER EVENTS" /> : (
            <div className="grid gap-4 md:grid-cols-3">
              {data.events.map((u) => (
                <div key={u.id} className="flex flex-col border border-border bg-surface p-5 transition-colors hover:border-border-strong">
                  <div className="flex items-center justify-between"><Mono>{u.id}</Mono><StatusChip status={u.status} /></div>
                  <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight">{u.name}</h3>
                  <div className="mt-1 text-sm text-muted">{u.game} · {u.format}</div>
                  <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
                    <div><Mono>PRIZE</Mono><div className="font-display text-lg font-bold text-accent">{u.prize}</div></div>
                    <div><Mono>SLOTS</Mono><div className="font-mono text-lg tabular-nums">{u.registered}/{u.slots}</div></div>
                  </div>
                  <button onClick={() => navigate("register")} disabled={u.status !== "REGISTRATION_OPEN"}
                    className={`${primary} mt-5 w-full`}>
                    {u.status === "REGISTRATION_OPEN" ? "REGISTER TEAM" : "REGISTRATION CLOSED"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// ---------- TOURNAMENT DETAIL ----------
const TABS = ["OVERVIEW", "BRACKET", "MATCHES", "TEAMS"] as const;
export function TournamentDetailPage() {
  const { data } = useSite();
  const t = data.tournament;
  const [tab, setTab] = useState<(typeof TABS)[number]>("BRACKET");

  if (!t) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-16">
        <button onClick={() => navigate("tournaments")} className="mb-6 font-mono text-[11px] tracking-[0.15em] text-muted hover:text-accent">← ALL TOURNAMENTS</button>
        <Empty label="NO ACTIVE TOURNAMENT — ADMIN MUST SEED AN EVENT" />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <button onClick={() => navigate("tournaments")} className="mb-6 font-mono text-[11px] tracking-[0.15em] text-muted hover:text-accent">← ALL TOURNAMENTS</button>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Mono className="text-accent">{brand.publicName} · {t.season}</Mono>
            <StatusChip status={t.status} />
            <Mono className="text-success">● LIVE DATA</Mono>
          </div>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight uppercase sm:text-6xl">{t.name}</h1>
        </div>
        <div className="flex gap-6">
          {[["TEAMS", `${t.teams.length}/${t.slots}`], ["PRIZE", t.prizePool], ["FORMAT", "BO1"]].map(([k, v]) => (
            <div key={k}><Mono>{k}</Mono><div className="font-display text-xl font-extrabold tabular-nums">{v}</div></div>
          ))}
        </div>
      </div>
      <div className="mb-8 flex gap-1 border-b border-border">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`relative px-4 py-2.5 font-mono text-[11px] tracking-[0.15em] transition-colors ${tab === tb ? "text-foreground" : "text-muted hover:text-foreground"}`}>
            {tb}{tab === tb && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
          </button>
        ))}
      </div>
      {tab === "OVERVIEW" && <OverviewBlock t={t} />}
      {tab === "BRACKET" && <Bracket teams={t.teams} matches={t.matches} />}
      {tab === "MATCHES" && <MatchesTable t={t} />}
      {tab === "TEAMS" && <TeamsGrid t={t} />}
    </section>
  );
}

function OverviewBlock({ t }: { t: any }) {
  const items = [
    ["FORMAT", t.format], ["GAME", t.game], ["REGION", t.region],
    ["PLATFORM", t.platform], ["CHECK-IN", t.checkInWindow ?? "TBD"], ["START", t.startDate ?? "TBD"],
  ];
  const breakdown: [string, string][] = t.prizeBreakdown ?? [];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          {t.season} flagship event. Qualified teams enter a single-elimination bracket,
          best-of-one across all rounds. The bracket is a live view of tournament state — winners
          advance automatically as results are finalized.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
          {items.map(([k, v]) => (
            <div key={k} className="bg-surface p-4"><Mono>{k}</Mono><div className="mt-1 font-display text-base font-bold">{v}</div></div>
          ))}
        </div>
      </div>
      <aside className="border border-border bg-surface p-5">
        <Mono>PRIZE POOL</Mono>
        <div className="mt-1 font-display text-4xl font-black text-accent">{t.prizePool}</div>
        {breakdown.length > 0 && (
          <div className="mt-5 space-y-2 border-t border-border pt-4">
            {breakdown.map(([p, v]) => (
              <div key={p} className="flex justify-between">
                <span className="font-mono text-[11px] tracking-[0.1em] text-muted">{p}</span>
                <span className="font-mono text-sm tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function MatchesTable({ t }: { t: any }) {
  const teams = t?.teams ?? [];
  const matches = t?.matches ?? [];
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {["MATCH", "ROUND", "TEAMS", "SCORE", "STATUS"].map((h) => (
              <th key={h} className="px-4 py-3 font-mono text-[10px] tracking-[0.15em] text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {matches.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-border-strong">NO MATCHES YET</td></tr>
          )}
          {matches.map((m: any) => {
            const a = teams.find((x: any) => x.id === m.a);
            const b = teams.find((x: any) => x.id === m.b);
            return (
              <tr key={m.id} className="transition-colors hover:bg-surface-hover">
                <td className="px-4 py-3 font-mono text-xs text-muted">{m.id}</td>
                <td className="px-4 py-3 font-mono text-[11px] tracking-[0.1em]">{m.round}</td>
                <td className="px-4 py-3">{a && b ? `${a.tag} vs ${b.tag}` : <span className="text-border-strong">TBD</span>}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{m.scoreA === null || m.scoreA === undefined ? "–" : `${m.scoreA}:${m.scoreB}`}</td>
                <td className="px-4 py-3"><StatusChip status={m.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamsGrid({ t }: { t: any }) {
  const teams = t?.teams ?? [];
  if (teams.length === 0) return <Empty label="NO TEAMS REGISTERED YET" />;
  return (
    <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {teams.map((tm: any) => (
        <div key={tm.id} className="bg-surface p-5 transition-colors hover:bg-surface-hover">
          <div className="flex items-start justify-between">
            <span className="font-mono text-xs text-accent">{tm.seed ? `#${tm.seed}` : "—"}</span>
            <StatusChip status={tm.checkedIn ? "READY" : tm.approved ? "SCHEDULED" : "FORFEIT"} />
          </div>
          <div className="mt-4 font-display text-xl font-extrabold">{tm.tag}</div>
          <div className="text-sm text-muted">{tm.name}</div>
          <div className="mt-3"><Mono>{tm.region}</Mono></div>
        </div>
      ))}
    </div>
  );
}

// ---------- MATCHES ----------
export function MatchesPage() {
  const { data } = useSite();
  return (
    <>
      <PageHead kicker={`${brand.codename} // MATCH OPERATIONS`} title="Matches"
        sub="Every scheduled, live and completed match. Scores are finalized server-side and projected onto the bracket in real time." />
      <section className="mx-auto max-w-7xl px-5 py-16"><MatchesTable t={data.tournament} /></section>
    </>
  );
}

// ---------- TEAMS ----------
export function TeamsPage() {
  const { data } = useSite();
  return (
    <>
      <PageHead kicker={`${brand.codename} // COMPETITORS`} title="Teams"
        sub="Registered organizations competing across the current operation." />
      <section className="mx-auto max-w-7xl px-5 py-16"><TeamsGrid t={data.tournament} /></section>
    </>
  );
}

// ---------- ROSTER ----------
export function RosterPage() {
  const { data } = useSite();
  const [activeGame, setActiveGame] = useState<string>("ALL");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const roster = data.roster ?? [];
  const games = ["ALL", ...Array.from(new Set(roster.map((p) => p.game).filter(Boolean))) as string[]];

  const filtered = activeGame === "ALL"
    ? roster
    : roster.filter((p) => (p.game ?? "").toUpperCase() === activeGame.toUpperCase());

  // Calculate total winnings numeric sum if available
  const totalWinnings = roster.reduce((acc, p) => {
    if (!p.winnings) return acc;
    const num = Number(p.winnings.replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? acc : acc + num;
  }, 0);

  const handleSelectGame = (g: string) => {
    setActiveGame(g);
    setSelectedPlayer(null);
  };

  // When a player is selected, find the other players in the currently filtered game
  const otherPlayers = selectedPlayer
    ? filtered.filter((p) => p.handle !== selectedPlayer.handle)
    : [];

  return (
    <>
      <PageHead
        kicker={`${brand.codename} // HOUSE ROSTER`}
        title="Roster"
        sub={`The ${brand.organizationName} elite competitive lineup across titles.`}
      />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
        {/* Organization Showcase Stats Bar */}
        <div className="mb-8 grid gap-4 border border-border bg-surface p-5 sm:p-6 sm:grid-cols-3">
          <div>
            <Mono className="text-[10px]">TOTAL EARNINGS</Mono>
            <div className="mt-1 font-display text-3xl font-black text-accent">
              ${totalWinnings.toLocaleString()}
            </div>
            <div className="text-xs text-muted">Across official championship circuits</div>
          </div>
          <div>
            <Mono className="text-[10px]">ACTIVE OPERATORS</Mono>
            <div className="mt-1 font-display text-3xl font-black text-foreground">
              {roster.length}
            </div>
            <div className="text-xs text-muted">Signed across {Math.max(1, games.length - 1)} competitive titles</div>
          </div>
          <div>
            <Mono className="text-[10px]">GLOBAL STATUS</Mono>
            <div className="mt-1 flex items-center gap-2">
              <span className="status-pulse inline-block size-2 rounded-full bg-accent" />
              <span className="font-mono text-xl font-bold text-accent">TIER 1 ROSTER</span>
            </div>
            <div className="text-xs text-muted">Managed by Project Vanta Operations</div>
          </div>
        </div>

        {/* Game Filter Tabs */}
        {games.length > 1 && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 font-mono text-[10px] tracking-[0.2em] text-muted">FILTER TITLE:</span>
              {games.map((g) => (
                <button
                  key={g}
                  onClick={() => handleSelectGame(g)}
                  className={`border px-3 py-1.5 font-mono text-[11px] tracking-[0.15em] transition-colors ${
                    activeGame === g
                      ? "border-accent bg-accent/10 font-bold text-accent"
                      : "border-border text-muted hover:border-border-strong hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Hint or Close Indicator when in single-game view */}
            {activeGame !== "ALL" && selectedPlayer && (
              <button
                onClick={() => setSelectedPlayer(null)}
                className="flex items-center gap-1.5 border border-danger/40 px-3 py-1 font-mono text-[11px] tracking-[0.1em] text-danger hover:bg-danger/10 transition-colors"
              >
                <span>✕ CLOSE DOSSIER</span>
              </button>
            )}
          </div>
        )}

        {/* Player Section */}
        {filtered.length === 0 ? (
          <Empty label="NO PLAYERS IN THIS CATEGORY" />
        ) : activeGame !== "ALL" && selectedPlayer ? (
          /* Active Game Inspector Mode: Selected Card + Gathered Cards on Left, Dossier on Right */
          <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
            {/* Left Column: Selected Card on Top + Other Players Gathered Below */}
            <div className="space-y-4">
              <div className="transition-all duration-300">
                <PlayerCard
                  p={selectedPlayer}
                  isSelected
                  onClick={() => setSelectedPlayer(null)}
                />
              </div>

              {/* Gathered Remaining Cards Below */}
              {otherPlayers.length > 0 && (
                <div className="border border-border bg-surface/50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/70 pb-2">
                    <Mono className="text-[10px] text-muted">
                      OTHER {activeGame} OPERATORS ({otherPlayers.length})
                    </Mono>
                    <span className="font-mono text-[9px] text-accent">CLICK TO SWITCH</span>
                  </div>
                  <div className="space-y-2">
                    {otherPlayers.map((op) => (
                      <button
                        key={op.handle}
                        onClick={() => setSelectedPlayer(op)}
                        className="group flex w-full cursor-pointer items-center gap-3 border border-border bg-background/80 p-2.5 text-left transition-all duration-200 hover:border-accent/80 hover:bg-surface-hover hover:translate-x-1"
                      >
                        <div className="relative size-11 shrink-0 overflow-hidden border border-border bg-surface">
                          {op.image ? (
                            <img src={op.image} alt={op.handle} className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center font-display font-black text-xs text-border-strong">
                              {(op.handle || "?").slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-display text-sm font-black text-foreground group-hover:text-accent transition-colors">
                              {op.handle}
                            </span>
                            <span className="font-mono text-[9px] text-accent">
                              {op.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted truncate">{op.name}</div>
                        </div>
                        <span className="font-mono text-xs text-muted group-hover:text-accent transition-colors">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Player Dossier */}
            <div className="min-w-0">
              <PlayerDossier player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
            </div>
          </div>
        ) : (
          /* Standard Card Grid (When ALL is active or no specific player is clicked) */
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <PlayerCard
                key={p.handle}
                p={p}
                onClick={activeGame !== "ALL" ? () => setSelectedPlayer(p) : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ---------- NEWS ----------
export function NewsPage() {
  const { data } = useSite();
  return (
    <>
      <PageHead kicker={`${brand.codename} // BROADCAST`} title="News"
        sub="Operational announcements, schedule changes and results." />
      <section className="mx-auto max-w-7xl px-5 py-16">
        {data.announcements.length === 0 ? <Empty label="NO ANNOUNCEMENTS" /> : (
          <div className="space-y-3">
            {data.announcements.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 border border-border bg-surface p-5 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <StatusChip status={a.severity} />
                  <div>
                    <div className="font-display text-base font-bold">{a.title}</div>
                    <div className="mt-0.5 text-sm text-muted">{a.body}</div>
                  </div>
                </div>
                <Mono className="shrink-0">{new Date(a.ts).toLocaleString()}</Mono>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ---------- REGISTER ----------
export function RegisterPage({ onLogin }: { onLogin: () => void }) {
  const { profile } = useAuth();
  const { data, refresh } = useSite();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [region, setRegion] = useState("NA");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const input = "w-full border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent";
  const open = data.tournament?.status === "REGISTRATION_OPEN";

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      await api.registerTeam({ name, tag, region });
      setMsg({ text: "Team registered. Awaiting admin approval.", ok: true });
      setName(""); setTag("");
      await refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHead kicker={`${brand.codename} // ENTRY`} title="Register"
        sub="Submit your team for the current operation. Registrations are reviewed and approved by tournament admins before roster lock." />
      <section className="mx-auto max-w-lg px-5 py-16">
        {!profile ? (
          <div className="border border-border bg-surface p-8 text-center">
            <Mono>AUTHENTICATION REQUIRED</Mono>
            <p className="mt-3 text-sm text-muted">You must be signed in to register a team.</p>
            <button onClick={onLogin} className={`${primary} mt-6`}>LOG IN / SIGN UP</button>
          </div>
        ) : !open ? (
          <div className="border border-border bg-surface p-8 text-center">
            <Mono>REGISTRATION CLOSED</Mono>
            <p className="mt-3 text-sm text-muted">There is no tournament currently accepting registrations. Check back soon.</p>
            <button onClick={() => navigate("tournaments")} className={`${ghost} mt-6`}>VIEW TOURNAMENTS</button>
          </div>
        ) : (
          <div className="border border-border bg-surface p-8">
            <div className="space-y-4">
              <div><Mono>TEAM NAME</Mono><input className={`${input} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Requiem Esports" /></div>
              <div><Mono>TAG</Mono><input className={`${input} mt-1.5`} value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="RQM" maxLength={5} /></div>
              <div><Mono>REGION</Mono>
                <select className={`${input} mt-1.5`} value={region} onChange={(e) => setRegion(e.target.value)}>
                  {["NA", "EU", "APAC", "SA", "MENA", "GLOBAL"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {msg && <div className={`font-mono text-[11px] ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</div>}
              <button onClick={submit} disabled={busy || !name || !tag} className={`${primary} w-full`}>
                {busy ? "SUBMITTING…" : "SUBMIT REGISTRATION"}
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

// ---------- DASHBOARD ----------
export function DashboardPage({ onControl }: { onControl: () => void }) {
  const { profile, effectiveRole, permissions, updateProfile } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.username ?? "");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.username) setNewName(profile.username);
  }, [profile?.username]);

  useEffect(() => {
    api.getNotifications().then(({ notifications }) => setNotifs(notifications ?? [])).catch(() => {});
  }, []);

  const admin = effectiveRole !== "HUMAN";

  async function handleSaveName() {
    if (!newName.trim() || newName.trim() === profile?.username) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateProfile({ username: newName.trim() });
      setSaveMsg("Handle updated!");
      setEditingName(false);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      setSaveMsg(e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHead
        kicker={`${brand.codename} // OPERATOR`}
        title="Dashboard"
        sub={profile ? `Signed in as ${profile.username} · ${effectiveRole}` : undefined}
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        {/* Custom Username Setup Banner if user has default name */}
        {profile && (
          <div className="mb-6 flex flex-col gap-4 border border-accent/40 bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">OPERATOR IDENTITY</span>
                <span className="font-mono text-[10px] text-muted">({profile.email})</span>
              </div>
              <div className="mt-1 text-sm text-foreground">
                Current Handle: <span className="font-display font-black text-accent">{profile.username}</span>
              </div>
            </div>
            {!editingName ? (
              <button
                onClick={() => setEditingName(true)}
                className="border border-accent px-4 py-2 font-mono text-[11px] font-bold tracking-[0.15em] text-accent transition-colors hover:bg-accent/10"
              >
                CUSTOMIZE USERNAME ✎
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  className="border border-accent bg-background px-3 py-1.5 font-mono text-sm outline-none"
                  value={newName}
                  placeholder="New Gamer Handle"
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <button
                  disabled={saving || !newName.trim()}
                  onClick={handleSaveName}
                  className="bg-accent px-3 py-1.5 font-mono text-xs font-bold text-accent-foreground"
                >
                  {saving ? "SAVING…" : "SAVE"}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNewName(profile.username); }}
                  className="border border-border px-3 py-1.5 font-mono text-xs text-muted"
                >
                  CANCEL
                </button>
              </div>
            )}
            {saveMsg && <span className="font-mono text-xs text-accent">{saveMsg}</span>}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="border border-border bg-surface p-6 lg:col-span-2">
            <Mono>QUICK ACTIONS</Mono>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button onClick={() => navigate("register")} className={ghost}>REGISTER A TEAM</button>
              <button onClick={() => navigate("tournament")} className={ghost}>VIEW LIVE BRACKET</button>
              <button onClick={() => navigate("notifications")} className={ghost}>NOTIFICATIONS ({notifs.length})</button>
              {admin
                ? <button onClick={onControl} className={primary}>OPEN CONTROL CENTER</button>
                : <button onClick={() => navigate("matches")} className={ghost}>BROWSE MATCHES</button>}
            </div>
          </div>
          <div className="border border-border bg-surface p-6">
            <Mono>PERMISSIONS</Mono>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {permissions.length === 0 && <Mono>None.</Mono>}
              {permissions.map((p) => (
                <span key={p} className="border border-border px-1.5 py-1 font-mono text-[9px] tracking-[0.1em] text-muted">{p}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 border border-border bg-surface p-6">
          <SectionHeader index="01" title="Recent Activity" />
          <div className="space-y-2">
            {notifs.length === 0 && <Mono>No recent notifications.</Mono>}
            {notifs.slice(0, 6).map((n, i) => (
              <div key={i} className="flex items-center justify-between border border-border px-4 py-2.5">
                <div className="flex items-center gap-3"><StatusChip status={n.severity ?? "INFO"} /><span className="text-sm">{n.title}</span></div>
                <Mono>{new Date(n.ts).toLocaleTimeString()}</Mono>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ---------- NOTIFICATIONS ----------
export function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  useEffect(() => { api.getNotifications().then(({ notifications }) => setNotifs(notifications ?? [])).catch(() => {}); }, []);
  return (
    <>
      <PageHead kicker={`${brand.codename} // SIGNALS`} title="Notifications" />
      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="space-y-2">
          {notifs.length === 0 && <div className="border border-border bg-surface p-8 text-center"><Mono>No notifications.</Mono></div>}
          {notifs.map((n, i) => (
            <div key={i} className="flex items-start justify-between gap-4 border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <StatusChip status={n.severity ?? "INFO"} />
                <div>
                  <div className="font-display text-sm font-bold">{n.title}</div>
                  <div className="text-sm text-muted">{n.body}</div>
                </div>
              </div>
              <Mono className="shrink-0">{new Date(n.ts).toLocaleString()}</Mono>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ---------- PROFILE ----------
export function ProfilePage() {
  const { profile, updateProfile, logout } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [region, setRegion] = useState(profile?.region ?? "GLOBAL");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setRegion(profile.region);
    }
  }, [profile]);

  if (!profile) return null;

  async function handleSave() {
    if (!username.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile({ username: username.trim(), region });
      setMsg({ text: "Profile updated successfully!", ok: true });
    } catch (e: any) {
      setMsg({ text: e.message || "Failed to save profile", ok: false });
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

  return (
    <>
      <PageHead kicker={`${brand.codename} // IDENTITY`} title="Profile Settings" />
      <section className="mx-auto max-w-lg px-5 py-16">
        <div className="border border-border bg-surface p-8">
          <div className="space-y-4">
            <div>
              <Mono>EMAIL (LOGIN ACCOUNT)</Mono>
              <div className="mt-1 font-mono text-sm text-muted">{profile.email}</div>
            </div>

            <div>
              <Mono>OPERATOR HANDLE / USERNAME</Mono>
              <input
                className={`${input} mt-1.5 font-mono text-sm`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Custom Gamer Handle"
              />
              <p className="mt-1 text-[11px] text-muted">This name will appear on leaderboards, brackets, and the navbar.</p>
            </div>

            <div>
              <Mono>COMPETITIVE REGION</Mono>
              <select
                className={`${input} mt-1.5`}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {["GLOBAL", "NA", "EU", "APAC", "SA", "MENA"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <Mono>SYSTEM ROLE</Mono>
              <div className="mt-1 font-mono text-sm font-bold text-accent">{profile.role}</div>
            </div>

            {msg && (
              <div className={`font-mono text-xs ${msg.ok ? "text-success" : "text-danger"}`}>
                {msg.text}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !username.trim() || (username === profile.username && region === profile.region)}
              className={`${primary} w-full`}
            >
              {saving ? "SAVING CHANGES…" : "SAVE PROFILE"}
            </button>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <button onClick={() => { logout(); navigate("home"); }} className={`${ghost} w-full`}>
              LOG OUT
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
