import { useEffect, useState } from "react";
import { brand } from "./config/brand";
import { AuthProvider, useAuth } from "./lib/auth";
import { SiteProvider, useSite } from "./lib/site";
import { ThemeProvider } from "./lib/theme";
import { AuthModal } from "./components/AuthModal";
import { Control } from "./components/Control";
import { useRoute, navigate, type Route } from "./lib/router";
import {
  TournamentsPage, TournamentDetailPage, MatchesPage, TeamsPage,
  RosterPage, NewsPage, RegisterPage, DashboardPage, NotificationsPage, ProfilePage,
} from "./pages";
import { StatusChip, SectionHeader, Mono, PlayerCard } from "./components/ui";
import { Bracket } from "./components/Bracket";
import { ThemeSwitcher } from "./components/ThemeSwitcher";

const NAV: { label: string; route: Route }[] = [
  { label: "TOURNAMENTS", route: "tournaments" },
  { label: "MATCHES", route: "matches" },
  { label: "TEAMS", route: "teams" },
  { label: "ROSTER", route: "roster" },
  { label: "NEWS", route: "news" },
];

function ClassifiedBar() {
  const { data } = useSite();
  const t = data.tournament;
  const items = [
    `${brand.codename} // OPERATIONS TERMINAL`,
    t ? `${t.season} ACTIVE` : "AWAITING SEASON",
    t ? `${t.name} — ${t.status}` : "NO ACTIVE OPERATION",
    `${data.stats.liveMatches} MATCHES IN PROGRESS`,
    `${data.stats.openDisputes} DISPUTE${data.stats.openDisputes === 1 ? "" : "S"} UNDER REVIEW`,
    "GLOBAL SERVERS NOMINAL",
  ];
  return (
    <div className="overflow-hidden border-b border-border bg-surface">
      <div className="marquee-track flex w-max gap-8 py-1.5">
        {[...items, ...items].map((tx, i) => (
          <span key={i} className="flex items-center gap-8 font-mono text-[10px] tracking-[0.2em] text-muted">
            {tx}<span className="text-accent/50">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Nav({ onLogin, onControl, route }: { onLogin: () => void; onControl: () => void; route: Route }) {
  const { profile, effectiveRole, availablePerspectives, setPerspective, loading, logout } = useAuth();
  const admin = effectiveRole !== "HUMAN";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <button onClick={() => navigate("home")} className="flex items-baseline gap-3">
          <span className="font-display text-xl font-black tracking-tight">{brand.publicName}</span>
          <Mono className="hidden sm:inline">{brand.codename}</Mono>
        </button>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <button key={n.route} onClick={() => navigate(n.route)}
              className={`font-mono text-[11px] tracking-[0.15em] transition-colors hover:text-foreground ${route === n.route ? "text-accent" : "text-muted"}`}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <ThemeSwitcher />
          {!loading && profile ? (
            <>
              {/* Role Perspective Selector for GOD / DEMI_GOD */}
              {availablePerspectives.length > 1 && (
                <div className="hidden items-center gap-1 border border-border bg-surface px-2 py-1 lg:flex">
                  <span className="font-mono text-[9px] tracking-[0.1em] text-muted">PERSPECTIVE:</span>
                  <select
                    value={effectiveRole}
                    onChange={(e) => setPerspective(e.target.value as any)}
                    className="bg-transparent font-mono text-[10px] font-bold tracking-[0.1em] text-accent outline-none cursor-pointer"
                  >
                    {availablePerspectives.map((r) => (
                      <option key={r} value={r} className="bg-surface text-foreground">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button onClick={() => navigate("notifications")} className="hidden border border-border px-3 py-2 font-mono text-[11px] tracking-[0.15em] text-muted transition-colors hover:border-border-strong hover:text-foreground sm:block">
                ALERTS
              </button>

              <button onClick={() => navigate("dashboard")} className="hidden items-center gap-2 border border-border/80 bg-surface/50 px-3 py-1.5 text-left sm:flex hover:border-border-strong">
                <div>
                  <div className="font-mono text-xs font-bold text-foreground">{profile.username}</div>
                  <div className="flex items-center gap-1 font-mono text-[9px] tracking-[0.15em]">
                    <span className={effectiveRole === "GOD" ? "text-accent font-bold" : effectiveRole === "DEMI_GOD" ? "text-success font-bold" : "text-muted"}>
                      {effectiveRole}
                    </span>
                    {effectiveRole !== profile.role && (
                      <span className="text-[8px] text-border-strong">({profile.role})</span>
                    )}
                  </div>
                </div>
              </button>

              <button onClick={admin ? onControl : () => navigate("dashboard")} className="bg-accent px-4 py-2 font-mono text-[11px] font-bold tracking-[0.15em] text-accent-foreground transition-opacity hover:opacity-90">
                {admin ? "CONTROL" : "DASHBOARD"}
              </button>
              <button onClick={() => { logout(); navigate("home"); }} className="border border-border px-3 py-2 font-mono text-[11px] tracking-[0.15em] text-muted transition-colors hover:border-danger/50 hover:text-danger">
                LOG OUT
              </button>
            </>
          ) : (
            <>
              <button onClick={onLogin} className="hidden border border-border px-4 py-2 font-mono text-[11px] tracking-[0.15em] text-muted transition-colors hover:border-border-strong hover:text-foreground sm:block">
                LOG IN
              </button>
              <button onClick={onLogin} className="bg-accent px-4 py-2 font-mono text-[11px] font-bold tracking-[0.15em] text-accent-foreground transition-opacity hover:opacity-90">
                ENTER PROJECT
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { data } = useSite();
  const t = data.tournament;
  const s = data.stats;
  return (
    <section className="grain relative overflow-hidden border-b border-border">
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.4fr_1fr] lg:py-28">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <span className="status-pulse inline-block size-2 rounded-full bg-accent" />
            <Mono className="text-accent">{t ? `LIVE OPERATION // ${t.name}` : "OPERATIONS TERMINAL"}</Mono>
          </div>
          <h1 className="font-display text-[15vw] leading-[0.82] font-black tracking-tighter uppercase sm:text-8xl lg:text-9xl">
            PROJECT<br /><span className="text-accent">V1</span>
          </h1>
          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1">
            {brand.tagline.map((tg) => (
              <span key={tg} className="font-display text-lg font-bold tracking-wide sm:text-2xl">{tg}</span>
            ))}
          </div>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
            An esports operating platform. Registration, check-in, seeding, brackets and live match
            operations — run a real tournament without spreadsheets.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => navigate("tournaments")} className="bg-accent px-6 py-3 font-mono text-xs font-bold tracking-[0.15em] text-accent-foreground transition-opacity hover:opacity-90">
              VIEW TOURNAMENTS
            </button>
            <button onClick={() => navigate("register")} className="border border-border-strong px-6 py-3 font-mono text-xs tracking-[0.15em] text-foreground transition-colors hover:bg-surface-hover">
              REGISTER TEAM
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-between border border-border bg-surface/60 p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <Mono>SYSTEM STATUS</Mono>
            <StatusChip status={t ? "LIVE" : "SCHEDULED"} />
          </div>
          <dl className="my-4 space-y-3">
            {[
              ["ACTIVE TOURNAMENTS", s.activeTournaments],
              ["LIVE MATCHES", s.liveMatches],
              ["REGISTERED TEAMS", s.registeredTeams],
              ["ACTIVE PLAYERS", s.activePlayers],
              ["OPEN DISPUTES", s.openDisputes],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-center justify-between">
                <dt className="font-mono text-[11px] tracking-[0.1em] text-muted">{k}</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-border pt-3">
            <Mono>{t?.id ?? "NO OPERATION"} · UPTIME 99.98%</Mono>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveNow() {
  const { data } = useSite();
  const t = data.tournament;
  const teams = t?.teams ?? [];
  const live = (t?.matches ?? []).filter((m: any) => m.status === "LIVE" || m.status === "DISPUTED");
  if (live.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <SectionHeader index="01" title="Live Now" action={<StatusChip status="LIVE" />} />
      <div className="grid gap-4 md:grid-cols-2">
        {live.map((m: any) => {
          const a = teams.find((tm: any) => tm.id === m.a);
          const b = teams.find((tm: any) => tm.id === m.b);
          return (
            <div key={m.id} className="flex items-center justify-between border border-border bg-surface p-5 transition-colors hover:border-border-strong">
              <div className="flex items-center gap-5">
                <div className="text-right"><div className="font-display text-lg font-bold">{a?.tag}</div><Mono>{a?.name}</Mono></div>
                <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
                  {m.scoreA}<span className="mx-1.5 text-border-strong">:</span>{m.scoreB}
                </div>
                <div><div className="font-display text-lg font-bold">{b?.tag}</div><Mono>{b?.name}</Mono></div>
              </div>
              <div className="text-right">
                <StatusChip status={m.status} />
                <div className="mt-2"><Mono>{m.id} · {m.server}</Mono></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeaturedTournament() {
  const { data } = useSite();
  const t = data.tournament;
  if (!t) return null;
  return (
    <section className="border-y border-border bg-surface/30">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Mono className="text-accent">{brand.publicName} · {t.season}</Mono>
              <StatusChip status={t.status} />
              <Mono className="text-success">● LIVE DATA</Mono>
            </div>
            <h2 className="mt-2 font-display text-4xl font-black tracking-tight uppercase sm:text-6xl">{t.name}</h2>
          </div>
          <div className="flex gap-6">
            {[["TEAMS", `${t.teams.length}/${t.slots}`], ["PRIZE", t.prizePool], ["FORMAT", "BO1"]].map(([k, v]) => (
              <div key={k}><Mono>{k}</Mono><div className="font-display text-xl font-extrabold tabular-nums">{v}</div></div>
            ))}
          </div>
        </div>
        <Bracket teams={t.teams} matches={t.matches} />
        <div className="mt-6 flex justify-end">
          <button onClick={() => navigate("tournament")} className="font-mono text-[11px] tracking-[0.15em] text-muted hover:text-accent">FULL TOURNAMENT VIEW →</button>
        </div>
      </div>
    </section>
  );
}

function Upcoming() {
  const { data } = useSite();
  if (data.events.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <SectionHeader index="02" title="Upcoming"
        action={<button onClick={() => navigate("tournaments")} className="font-mono text-[11px] tracking-[0.15em] text-muted hover:text-accent">ALL EVENTS →</button>} />
      <div className="grid gap-4 md:grid-cols-3">
        {data.events.map((u) => (
          <div key={u.id} className="group flex flex-col border border-border bg-surface p-5 transition-colors hover:border-border-strong">
            <div className="flex items-center justify-between"><Mono>{u.id}</Mono><StatusChip status={u.status} /></div>
            <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight">{u.name}</h3>
            <div className="mt-1 text-sm text-muted">{u.game} · {u.format}</div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div><Mono>PRIZE</Mono><div className="font-display text-lg font-bold text-accent">{u.prize}</div></div>
              <div><Mono>SLOTS</Mono><div className="font-mono text-lg tabular-nums">{u.registered}/{u.slots}</div></div>
              <div><Mono>REGION</Mono><div className="font-mono text-sm">{u.region}</div></div>
              <div><Mono>CLOSES</Mono><div className="font-mono text-sm">{u.closes}</div></div>
            </div>
            <div className="mt-4 h-px bg-border">
              <div className="h-px bg-accent" style={{ width: `${Math.min(100, (u.registered / u.slots) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Results() {
  const { data } = useSite();
  if (data.results.length === 0) return null;
  return (
    <section className="border-y border-border bg-surface/30">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeader index="03" title="Latest Results" />
        <div className="divide-y divide-border border border-border">
          {data.results.map((r) => (
            <div key={r.id} className="grid grid-cols-2 items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-hover sm:grid-cols-[120px_1fr_auto_100px]">
              <Mono>{r.id}</Mono>
              <div>
                <div className="font-display text-lg font-bold">{r.event}</div>
                <div className="text-sm text-muted"><span className="text-accent">{r.winner}</span> def. {r.runnerUp}</div>
              </div>
              <div className="font-mono text-lg tabular-nums">{r.score}</div>
              <div className="text-right"><Mono>{new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Mono></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roster() {
  const { data } = useSite();
  if (data.roster.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <SectionHeader index="04" title="Our Roster" />
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
        {data.roster.map((p) => (
          <PlayerCard key={p.handle} p={p} />
        ))}
      </div>
    </section>
  );
}

function Announcements() {
  const { data } = useSite();
  if (data.announcements.length === 0) return null;
  return (
    <section className="border-y border-border bg-surface/30">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeader index="05" title="Announcements" />
        <div className="space-y-3">
          {data.announcements.slice(0, 5).map((a) => (
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
      </div>
    </section>
  );
}

function DiscordCTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20">
      <div className="grain relative flex flex-col items-center overflow-hidden border border-accent/30 bg-accent/5 px-6 py-16 text-center">
        <div className="relative z-10">
          <Mono className="text-accent">COMMUNITY // DISCORD-FIRST OPERATIONS</Mono>
          <h2 className="mt-4 font-display text-4xl font-black tracking-tight uppercase sm:text-6xl">Join the Operation</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted">
            Check-in reminders, match rooms, live results and admin alerts route through Discord as a
            first-class channel — not an afterthought.
          </p>
          <button onClick={() => window.open(brand.discordUrl, "_blank")} className="mt-8 bg-accent px-8 py-3 font-mono text-xs font-bold tracking-[0.2em] text-accent-foreground transition-opacity hover:opacity-90">
            CONNECT DISCORD
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer({ onLogin }: { onLogin: () => void }) {
  const cols: { title: string; links: { label: string; go: () => void }[] }[] = [
    { title: "PLATFORM", links: [
      { label: "Tournaments", go: () => navigate("tournaments") },
      { label: "Matches", go: () => navigate("matches") },
      { label: "Bracket", go: () => navigate("tournament") },
      { label: "Teams", go: () => navigate("teams") },
    ] },
    { title: "ORG", links: [
      { label: "Roster", go: () => navigate("roster") },
      { label: "News", go: () => navigate("news") },
      { label: "Register", go: () => navigate("register") },
      { label: "Dashboard", go: () => navigate("dashboard") },
    ] },
    { title: "ACCESS", links: [
      { label: "Log In", go: onLogin },
      { label: "Notifications", go: () => navigate("notifications") },
      { label: "Profile", go: () => navigate("profile") },
      { label: "Discord", go: () => window.open(brand.discordUrl, "_blank") },
    ] },
  ];
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <div className="font-display text-2xl font-black">{brand.publicName}</div>
            <Mono className="mt-1 block">{brand.organizationName} · {brand.codename}</Mono>
            <p className="mt-4 max-w-xs text-sm text-muted">{brand.metaDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 sm:grid-cols-3">
            {cols.map((col) => (
              <div key={col.title}>
                <Mono className="text-foreground">{col.title}</Mono>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button onClick={l.go} className="text-sm text-muted transition-colors hover:text-foreground">{l.label}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-2 border-t border-border pt-6 sm:flex-row">
          <Mono>© 2026 {brand.organizationName}. WORKING IDENTITY — NAME NOT FINAL.</Mono>
          <Mono>ALL SYSTEMS NOMINAL</Mono>
        </div>
      </div>
    </footer>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <LiveNow />
      <FeaturedTournament />
      <Upcoming />
      <Results />
      <Roster />
      <Announcements />
      <DiscordCTA />
    </>
  );
}

function AppShell() {
  const { profile } = useAuth();
  const { refresh } = useSite();
  const route = useRoute();
  const [showAuth, setShowAuth] = useState(false);
  const [showControl, setShowControl] = useState(false);

  // Refresh live site data when returning from Control (admin may have mutated state).
  useEffect(() => { if (!showControl) refresh(); }, [showControl, refresh]);

  const openLogin = () => setShowAuth(true);
  const openControl = () => setShowControl(true);

  return (
    <div className="min-h-full bg-background">
      <ClassifiedBar />
      <Nav onLogin={openLogin} onControl={openControl} route={route} />
      <main>
        {route === "home" && <Home />}
        {route === "tournaments" && <TournamentsPage />}
        {route === "tournament" && <TournamentDetailPage />}
        {route === "matches" && <MatchesPage />}
        {route === "teams" && <TeamsPage />}
        {route === "roster" && <RosterPage />}
        {route === "news" && <NewsPage />}
        {route === "register" && <RegisterPage onLogin={openLogin} />}
        {route === "dashboard" && <DashboardPage onControl={openControl} />}
        {route === "notifications" && <NotificationsPage />}
        {route === "profile" && <ProfilePage />}
      </main>
      <Footer onLogin={openLogin} />

      {showAuth && !profile && <AuthModal onClose={() => setShowAuth(false)} />}
      {showControl && profile && <Control onClose={() => setShowControl(false)} />}
    </div>
  );
}

// Providers live here (not only in main.tsx) so the app is self-contained no
// matter how it is mounted in the preview environment.
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteProvider>
          <AppShell />
        </SiteProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
