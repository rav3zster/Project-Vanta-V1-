import { useEffect, useState } from "react"
import { brand } from "./config/brand"
import { useAuth } from "./lib/auth"
import { useSite } from "./lib/site"
import { api, type Player } from "./lib/supabase"
import { navigate } from "./lib/router"
import { StatusChip, SectionHeader, Mono, PlayerCard } from "./components/ui"
import { Bracket } from "./components/Bracket"
import { PlayerDossier } from "./components/PlayerDossier"
import { Reveal, CountUp, HudCorners } from "./components/Reveal"
import { useInView } from "./lib/motion"

const primary =
  "btn-sweep bg-accent px-6 py-3 font-mono text-xs font-bold tracking-[0.15em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
const ghost =
  "btn-sweep border border-border-strong px-6 py-3 font-mono text-xs tracking-[0.15em] text-foreground transition-colors hover:bg-surface-hover"

function PageHead({
  kicker,
  title,
  sub,
}: {
  kicker: string
  title: string
  sub?: string
}) {
  return (
    <div className="border-b border-border bg-surface/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-16">
        <Mono className="text-accent text-[10px] sm:text-xs">{kicker}</Mono>
        <h1 className="mt-2 sm:mt-3 font-display text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase">
          {title}
        </h1>
        {sub && (
          <p className="mt-3 sm:mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-muted">
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grain relative border border-border bg-surface/40 p-12 text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-muted">{label}</p>
    </div>
  )
}

// ---------- TOURNAMENTS ----------
export function TournamentsPage() {
  const { data } = useSite()
  const t = data.tournament
  return (
    <>
      <PageHead
        kicker={`${brand.codename} // EVENT DIRECTORY`}
        title="Tournaments"
        sub="Every operated event — live, upcoming and archived. Registration, seeding and brackets run through a single operating pipeline."
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeader
          index="01"
          title="Featured"
          action={t ? <StatusChip status={t.status} /> : undefined}
        />
        {!t ? (
          <Empty label="NO ACTIVE TOURNAMENT" />
        ) : (
          <button
            onClick={() => navigate("tournament")}
            className="group relative grid w-full gap-6 border border-border bg-surface p-6 text-left transition-colors hover:border-border-strong sm:grid-cols-[1fr_auto]"
          >
            <HudCorners />
            <div>
              <Mono className="text-accent">{t.season}</Mono>
              <h3 className="mt-2 font-display text-4xl font-black tracking-tight uppercase">
                {t.name}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {t.game} · {t.format}
              </p>
            </div>
            <div className="flex items-center gap-6 self-center">
              {[
                ["TEAMS", `${t.teams.length}/${t.slots}`],
                ["PRIZE", t.prizePool],
                ["VIEW", "→"],
              ].map(([k, v]) => (
                <div key={k}>
                  <Mono>{k}</Mono>
                  <div className="font-display text-xl font-extrabold tabular-nums group-hover:text-accent">
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </button>
        )}

        <div className="mt-12">
          <SectionHeader index="02" title="Open For Registration" />
          {data.events.length === 0 ? (
            <Empty label="NO OTHER EVENTS" />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {data.events.map((u, i) => (
                <Reveal key={u.id} delay={i * 60}>
                  <div className="group relative flex flex-col border border-border bg-surface p-5 transition-colors hover:border-border-strong">
                    <HudCorners />
                    <div className="flex items-center justify-between">
                      <Mono>{u.id}</Mono>
                      <StatusChip status={u.status} />
                    </div>
                    <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
                      {u.name}
                    </h3>
                    <div className="mt-1 text-sm text-muted">
                      {u.game} · {u.format}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
                      <div>
                        <Mono>PRIZE</Mono>
                        <div className="font-display text-lg font-bold text-accent">
                          {u.prize}
                        </div>
                      </div>
                      <div>
                        <Mono>SLOTS</Mono>
                        <div className="font-mono text-lg tabular-nums">
                          {u.registered}/{u.slots}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("register")}
                      disabled={u.status !== "REGISTRATION_OPEN"}
                      className={`${primary} mt-5 w-full`}
                    >
                      {u.status === "REGISTRATION_OPEN"
                        ? "REGISTER TEAM"
                        : "REGISTRATION CLOSED"}
                    </button>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

// ---------- TOURNAMENT DETAIL ----------
const TABS = ["OVERVIEW", "BRACKET", "MATCHES", "TEAMS"] as const
export function TournamentDetailPage() {
  const { data } = useSite()
  const t = data.tournament
  const [tab, setTab] = useState<typeof TABS[number]>("BRACKET")

  if (!t) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-16">
        <button
          onClick={() => navigate("tournaments")}
          className="mb-6 font-mono text-[11px] tracking-[0.15em] text-muted hover:text-accent"
        >
          ← ALL TOURNAMENTS
        </button>
        <Empty label="NO ACTIVE TOURNAMENT — ADMIN MUST SEED AN EVENT" />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <button
        onClick={() => navigate("tournaments")}
        className="mb-6 font-mono text-[11px] tracking-[0.15em] text-muted hover:text-accent"
      >
        ← ALL TOURNAMENTS
      </button>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Mono className="text-accent">
              {brand.publicName} · {t.season}
            </Mono>
            <StatusChip status={t.status} />
            <Mono className="text-success">● LIVE DATA</Mono>
          </div>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight uppercase sm:text-6xl">
            {t.name}
          </h1>
        </div>
        <div className="flex gap-6">
          {[
            ["TEAMS", `${t.teams.length}/${t.slots}`],
            ["PRIZE", t.prizePool],
            ["FORMAT", "BO1"],
          ].map(([k, v]) => (
            <div key={k}>
              <Mono>{k}</Mono>
              <div className="font-display text-xl font-extrabold tabular-nums">
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-8 flex gap-1 border-b border-border">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`btn-sweep relative px-4 py-2.5 font-mono text-[11px] tracking-[0.15em] transition-colors ${
              tab === tb
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tb}
            {tab === tb && (
              <span className="tab-underline absolute inset-x-0 -bottom-px h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>
      {tab === "OVERVIEW" && <OverviewBlock t={t} />}
      {tab === "BRACKET" && (
        <Bracket
          teams={t.teams}
          matches={t.matches}
          formatType={t.formatType}
          tournamentName={t.name}
          game={t.game}
        />
      )}
      {tab === "MATCHES" && <MatchesTable t={t} />}
      {tab === "TEAMS" && <TeamsGrid t={t} />}
    </section>
  )
}

function OverviewBlock({ t }: { t: any }) {
  const items = [
    ["FORMAT", t.format],
    ["GAME", t.game],
    ["REGION", t.region],
    ["PLATFORM", t.platform],
    ["CHECK-IN", t.checkInWindow ?? "TBD"],
    ["START", t.startDate ?? "TBD"],
  ]
  const breakdown: [string, string][] = t.prizeBreakdown ?? []
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          {t.season} flagship event. Qualified teams enter a single-elimination
          bracket, best-of-one across all rounds. The bracket is a live view of
          tournament state — winners advance automatically as results are
          finalized.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
          {items.map(([k, v], i) => (
            <Reveal key={k} delay={i * 50}>
              <div className="bg-surface p-4">
                <Mono>{k}</Mono>
                <div className="mt-1 font-display text-base font-bold">{v}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <aside className="border border-border bg-surface p-5">
        <Mono>PRIZE POOL</Mono>
        <div className="mt-1 font-display text-4xl font-black text-accent">
          {t.prizePool}
        </div>
        {breakdown.length > 0 && (
          <div className="mt-5 space-y-2 border-t border-border pt-4">
            {breakdown.map(([p, v]) => (
              <div key={p} className="flex justify-between">
                <span className="font-mono text-[11px] tracking-[0.1em] text-muted">
                  {p}
                </span>
                <span className="font-mono text-sm tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

function MatchesTable({ t }: { t: any }) {
  const teams = t?.teams ?? []
  const matches = t?.matches ?? []
  return (
    <Reveal>
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              {["MATCH", "ROUND", "TEAMS", "SCORE", "STATUS"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 font-mono text-[10px] tracking-[0.15em] text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center font-mono text-xs text-border-strong"
                >
                  NO MATCHES YET
                </td>
              </tr>
            )}
            {matches.map((m: any) => {
              const a = teams.find((x: any) => x.id === m.a)
              const b = teams.find((x: any) => x.id === m.b)
              return (
                <tr
                  key={m.id}
                  className="transition-colors hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {m.id}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] tracking-[0.1em]">
                    {m.round}
                  </td>
                  <td className="px-4 py-3">
                    {a && b ? (
                      `${a.tag} vs ${b.tag}`
                    ) : (
                      <span className="text-border-strong">TBD</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {m.scoreA === null || m.scoreA === undefined
                      ? "–"
                      : `${m.scoreA}:${m.scoreB}`}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={m.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Reveal>
  )
}

function TeamsGrid({ t }: { t: any }) {
  const teams = t?.teams ?? []
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  if (teams.length === 0) return <Empty label="NO TEAMS REGISTERED YET" />
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((tm: any, i: number) => {
        const isExpanded = expandedTeam === tm.id
        return (
          <Reveal key={tm.id} delay={i * 60}>
            <div className="group relative border border-border bg-surface p-5 transition-all hover:border-accent/40">
              <HudCorners />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                    {tm.seed ? `SEED #${tm.seed}` : `TEAM #${i + 1}`}
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    {tm.region}
                  </span>
                </div>
                <StatusChip
                  status={
                    tm.checkedIn
                      ? "READY"
                      : tm.approved
                        ? "SCHEDULED"
                        : "FORFEIT"
                  }
                />
              </div>

              <div className="mt-3">
                <h3 className="font-display text-2xl font-black tracking-tight text-foreground">
                  {tm.name}
                </h3>
                <div className="font-mono text-xs text-accent font-bold">
                  [{tm.tag}]
                </div>
              </div>

              {/* IGL Display Banner */}
              {tm.igl && (
                <div className="mt-3 border border-border bg-background/60 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold tracking-[0.15em] text-accent">
                      👑 IGL (LEADER)
                    </span>
                    <span className="font-mono text-[9px] text-muted">
                      DISCORD: {tm.igl.discordId || "N/A"}
                    </span>
                  </div>
                  <div className="mt-1 font-display text-sm font-bold text-foreground">
                    {tm.igl.name}{" "}
                    <span className="font-mono text-xs font-normal text-accent">
                      ({tm.igl.inGameName})
                    </span>
                  </div>
                </div>
              )}

              {/* Roster preview / toggle */}
              <div className="mt-3 border-t border-border/70 pt-2.5">
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : tm.id)}
                  className="flex w-full items-center justify-between font-mono text-[10px] tracking-[0.1em] text-muted transition-colors hover:text-accent"
                >
                  <span>
                    {isExpanded
                      ? "▲ HIDE ROSTER LINEUP"
                      : `▼ VIEW FULL ROSTER (${(tm.members?.length || 0) + (tm.igl ? 1 : 0)} + ${
                          tm.sub ? "1 SUB" : "0 SUB"
                        })`}
                  </span>
                  <span className="text-accent">{isExpanded ? "−" : "+"}</span>
                </button>

                {isExpanded && (
                  <div className="mt-2.5 space-y-2 border-t border-border/40 pt-2">
                    {/* Starters */}
                    <div className="space-y-1">
                      <div className="font-mono text-[9px] tracking-[0.1em] text-muted uppercase">
                        STARTING LINEUP
                      </div>
                      {tm.members?.map((m: any, mi: number) => (
                        <div
                          key={mi}
                          className="flex items-center justify-between bg-background/40 px-2 py-1 font-mono text-[10px]"
                        >
                          <div>
                            <span className="font-bold text-foreground">
                              {m.name}
                            </span>
                            <span className="ml-1.5 text-accent">
                              [{m.inGameName}]
                            </span>
                          </div>
                          <span className="text-muted text-[9px]">
                            @{m.discordId}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Sub if available */}
                    {tm.sub && (
                      <div className="border-t border-border/30 pt-1.5">
                        <div className="font-mono text-[9px] tracking-[0.1em] text-warning uppercase">
                          SUBSTITUTE
                        </div>
                        <div className="flex items-center justify-between bg-background/40 px-2 py-1 font-mono text-[10px]">
                          <div>
                            <span className="font-bold text-foreground">
                              {tm.sub.name}
                            </span>
                            <span className="ml-1.5 text-warning">
                              [{tm.sub.inGameName}]
                            </span>
                          </div>
                          <span className="text-muted text-[9px]">
                            @{tm.sub.discordId}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}

// ---------- MATCHES ----------
export function MatchesPage() {
  const { data } = useSite()
  return (
    <>
      <PageHead
        kicker={`${brand.codename} // MATCH OPERATIONS`}
        title="Matches"
        sub="Every scheduled, live and completed match. Scores are finalized server-side and projected onto the bracket in real time."
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <MatchesTable t={data.tournament} />
      </section>
    </>
  )
}

// ---------- TEAMS ----------
export function TeamsPage() {
  const { data } = useSite()
  return (
    <>
      <PageHead
        kicker={`${brand.codename} // COMPETITORS`}
        title="Teams"
        sub="Registered organizations competing across the current operation."
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <TeamsGrid t={data.tournament} />
      </section>
    </>
  )
}

// ---------- ROSTER ----------
export function RosterPage() {
  const { data } = useSite()
  const [activeGame, setActiveGame] = useState<string>("ALL")
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // The sliding "deck" animation below assumes the multi-column desktop grid
  // (cards translate by multiples of their own width to reach column 0). Below
  // the md breakpoint the grid collapses to a single column and the dossier
  // renders separately underneath instead, so the slide must be disabled there
  // — otherwise cards visually fly off-screen on phones/small tablets.
  const [isDesktopLayout, setIsDesktopLayout] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches,
  )
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = () => setIsDesktopLayout(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const roster = data.roster ?? []
  const games = [
    "ALL",
    ...Array.from(
      new Set(roster.map((p) => p.game).filter(Boolean)),
    ) as string[],
  ]

  const filtered =
    activeGame === "ALL"
      ? roster
      : roster.filter(
          (p) => (p.game ?? "").toUpperCase() === activeGame.toUpperCase(),
        )

  // Calculate total winnings numeric sum if available
  const totalWinnings = roster.reduce((acc, p) => {
    if (!p.winnings) return acc
    const num = Number(p.winnings.replace(/[^0-9.-]+/g, ""))
    return isNaN(num) ? acc : acc + num
  }, 0)

  const [statsRef, statsInView] = useInView<HTMLDivElement>()

  const handleSelectGame = (g: string) => {
    setActiveGame(g)
    setSelectedPlayer(null)
  }

  // When a player is selected, find the other players in the currently filtered game
  const otherPlayers = selectedPlayer
    ? filtered.filter((p) => p.handle !== selectedPlayer.handle)
    : []

  return (
    <>
      <PageHead
        kicker={`${brand.codename} // HOUSE ROSTER`}
        title="Roster"
        sub={`The ${brand.organizationName} elite competitive lineup across titles.`}
      />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
        {/* Organization Showcase Stats Bar */}
        <div
          ref={statsRef}
          className="mb-8 grid gap-4 border border-border bg-surface p-5 sm:p-6 sm:grid-cols-3"
        >
          <div>
            <Mono className="text-[10px]">TOTAL EARNINGS</Mono>
            <div className="mt-1 font-display text-3xl font-black text-accent">
              $<CountUp value={totalWinnings} start={statsInView} />
            </div>
            <div className="text-xs text-muted">
              Across official championship circuits
            </div>
          </div>
          <div>
            <Mono className="text-[10px]">ACTIVE OPERATORS</Mono>
            <div className="mt-1 font-display text-3xl font-black text-foreground">
              <CountUp value={roster.length} start={statsInView} />
            </div>
            <div className="text-xs text-muted">
              Signed across {Math.max(1, games.length - 1)} competitive titles
            </div>
          </div>
          <div>
            <Mono className="text-[10px]">GLOBAL STATUS</Mono>
            <div className="mt-1 flex items-center gap-2">
              <span className="status-pulse inline-block size-2 rounded-full bg-accent" />
              <span className="font-mono text-xl font-bold text-accent">
                TIER 1 ROSTER
              </span>
            </div>
            <div className="text-xs text-muted">
              Managed by Project Vanta Operations
            </div>
          </div>
        </div>

        {/* Game Filter Tabs */}
        {games.length > 1 && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 font-mono text-[10px] tracking-[0.2em] text-muted">
                FILTER TITLE:
              </span>
              {games.map((g) => (
                <button
                  key={g}
                  onClick={() => handleSelectGame(g)}
                  className={`btn-sweep border px-3 py-1.5 font-mono text-[11px] tracking-[0.15em] transition-colors ${
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
                className="btn-sweep flex items-center gap-1.5 border border-danger/40 px-3 py-1 font-mono text-[11px] tracking-[0.1em] text-danger hover:bg-danger/10 transition-colors"
              >
                <span>✕ CLOSE DOSSIER</span>
              </button>
            )}
          </div>
        )}

        {/* Player Section Container — Exact same container outline with persistent sliding card deck */}
        {filtered.length === 0 ? (
          <Empty label="NO PLAYERS IN THIS CATEGORY" />
        ) : (
          <div className="relative border border-border bg-background overflow-hidden">
            {/* The 4-column layout track */}
            <div className="grid gap-px grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 bg-border relative min-h-[580px]">
              {/* Render all cards persistently so browser executes fluid transform interpolation */}
              {filtered.map((p, idx) => {
                const isSelected = selectedPlayer?.handle === p.handle
                const isExpanded =
                  isDesktopLayout &&
                  selectedPlayer !== null &&
                  activeGame !== "ALL"
                const selectedIdx = filtered.findIndex(
                  (x) => x.handle === selectedPlayer?.handle,
                )

                let cardStyle: React.CSSProperties = {
                  transition:
                    "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease, z-index 0.3s ease",
                }

                if (isExpanded) {
                  // In desktop 4-col layout, slide all cards to column 0
                  const offsetToCol0 = -idx * 100
                  if (isSelected) {
                    cardStyle = {
                      ...cardStyle,
                      transform: `translate3d(${offsetToCol0}%, 0, 0) scale(1)`,
                      zIndex: 30,
                      opacity: 1,
                    }
                  } else {
                    const stackRank = Math.abs(idx - selectedIdx)
                    cardStyle = {
                      ...cardStyle,
                      transform: `translate3d(${offsetToCol0}%, ${stackRank * 6}px, 0) scale(${1 - stackRank * 0.04})`,
                      zIndex: Math.max(1, 20 - stackRank),
                      opacity: Math.max(0.2, 0.8 - stackRank * 0.2),
                    }
                  }
                } else {
                  cardStyle = {
                    ...cardStyle,
                    transform: "translate3d(0, 0, 0) scale(1)",
                    zIndex: 10,
                    opacity: 1,
                  }
                }

                return (
                  <div
                    key={p.handle}
                    style={cardStyle}
                    className="relative bg-surface h-full"
                  >
                    <PlayerCard
                      p={p}
                      isSelected={isSelected && isExpanded}
                      onClick={
                        activeGame !== "ALL"
                          ? () => setSelectedPlayer(isSelected ? null : p)
                          : undefined
                      }
                    />
                  </div>
                )
              })}

              {/* Dossier Panel overlaying the remaining 3 columns when an operator is selected */}
              <div
                className={`absolute inset-y-0 right-0 left-0 lg:left-[25%] md:left-[33.33%] hidden md:block bg-surface border-l border-border transition-all duration-600 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                  selectedPlayer && activeGame !== "ALL"
                    ? "opacity-100 translate-x-0 pointer-events-auto z-25"
                    : "opacity-0 translate-x-16 pointer-events-none z-0"
                }`}
              >
                {selectedPlayer && (
                  <PlayerDossier
                    player={selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                  />
                )}
              </div>
            </div>

            {/* Mobile layout fallback for phone screens (< md) */}
            {selectedPlayer && activeGame !== "ALL" && (
              <div className="block md:hidden border-t border-border bg-surface animate-bundle">
                <PlayerDossier
                  player={selectedPlayer}
                  onClose={() => setSelectedPlayer(null)}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}

// ---------- NEWS ----------
export function NewsPage() {
  const { data } = useSite()
  return (
    <>
      <PageHead
        kicker={`${brand.codename} // BROADCAST`}
        title="News"
        sub="Operational announcements, schedule changes and results."
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        {data.announcements.length === 0 ? (
          <Empty label="NO ANNOUNCEMENTS" />
        ) : (
          <div className="space-y-3">
            {data.announcements.map((a, i) => (
              <Reveal key={a.id} delay={i * 60}>
                <div className="flex flex-col gap-2 border border-border bg-surface p-5 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <StatusChip status={a.severity} />
                    <div>
                      <div className="font-display text-base font-bold">
                        {a.title}
                      </div>
                      <div className="mt-0.5 text-sm text-muted">{a.body}</div>
                    </div>
                  </div>
                  <Mono className="shrink-0">
                    {new Date(a.ts).toLocaleString()}
                  </Mono>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

// ---------- REGISTER ----------
export function RegisterPage({ onLogin }: { onLogin: () => void }) {
  const { profile, effectiveRole } = useAuth()
  const { data } = useSite()
  const t = data.tournament
  const admin = effectiveRole !== "HUMAN"

  return (
    <>
      <PageHead
        kicker={`${brand.codename} // TOURNAMENT ENTRY`}
        title="Registration"
        sub="Official competitive team entry for tournament operations. All registrations are verified via the official Google Form and imported directly by tournament administrators."
      />
      <section className="mx-auto max-w-2xl px-5 py-12">
        <div className="space-y-6">
          {/* Active Tournament Info Card */}
          {t && (
            <div className="border border-accent/40 bg-accent/5 p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-wider">
                  {t.game} · {t.season}
                </span>
                <StatusChip status={t.status} />
              </div>
              <h2 className="mt-2 font-display text-2xl font-black text-foreground">
                {t.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs text-muted">
                <span>
                  Slots:{" "}
                  <strong className="text-foreground">
                    {t.teams.length}/{t.slots}
                  </strong>
                </span>
                <span>
                  Format:{" "}
                  <strong className="text-foreground">{t.format}</strong>
                </span>
                <span>
                  Prize: <strong className="text-accent">{t.prizePool}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Official Google Form Submission Portal */}
          <div className="border border-border bg-surface p-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className="font-display text-lg font-bold">
                Official Registration Form Entry
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              To ensure roster integrity and direct verification of Riot
              accounts and Discord communications, all player submissions are
              collected through the official registration form.
            </p>

            <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
              <div className="font-mono text-[10px] font-bold tracking-[0.15em] text-accent">
                REQUIRED REGISTRATION DETAILS:
              </div>
              <ul className="space-y-2 font-mono text-xs text-foreground/90">
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>
                    <strong>Team Name & Tag</strong> (e.g. Sentinels [SEN])
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>
                    <strong>Team IGL (In-Game Leader):</strong> Full Name,
                    Valorant IGN + Tag (e.g. <code>TenZ#NA1</code>), Discord
                    User ID
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>
                    <strong>4 Starting Players:</strong> Full Name, In-Game Name
                    + Tag, Discord User ID, Main Role
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">✓</span>
                  <span>
                    <strong>1 Substitute Player:</strong> Name, Valorant IGN +
                    Tag, Discord User ID (Optional)
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#google-form"
                onClick={(e) => {
                  e.preventDefault()
                  alert(
                    "Please contact your tournament administrator or submit your squad roster via the official Google Form link provided in Discord announcements.",
                  )
                }}
                className={`${primary} text-center flex-1`}
              >
                OPEN OFFICIAL GOOGLE FORM ↗
              </a>
              <button
                onClick={() => navigate("teams")}
                className={`${ghost} text-center flex-1`}
              >
                VIEW REGISTERED SQUADS
              </button>
            </div>
          </div>

          {/* Admin shortcut if GOD or DEMI_GOD */}
          {admin && (
            <div className="border border-accent/60 bg-accent/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] font-bold text-accent tracking-wider">
                    ADMINISTRATOR CONTROL
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    Import & manage team registrations directly
                  </div>
                </div>
                <button
                  onClick={() => navigate("dashboard")}
                  className="border border-accent px-4 py-2 font-mono text-xs font-bold text-accent hover:bg-accent/20"
                >
                  OPEN COMMAND CENTER →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

// ---------- DASHBOARD ----------
export function DashboardPage({ onControl }: { onControl: () => void }) {
  const { profile, effectiveRole, permissions, updateProfile } = useAuth()
  const [notifs, setNotifs] = useState<any[]>([])
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(profile?.username ?? "")
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.username) setNewName(profile.username)
  }, [profile?.username])

  useEffect(() => {
    const loadNotifs = () => {
      api
        .getNotifications()
        .then(({ notifications }) => setNotifs(notifications ?? []))
        .catch(() => {})
    }
    loadNotifs()
    const interval = setInterval(loadNotifs, 4000)
    window.addEventListener("focus", loadNotifs)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", loadNotifs)
    }
  }, [])

  const admin = effectiveRole !== "HUMAN"

  async function handleSaveName() {
    if (!newName.trim() || newName.trim() === profile?.username) {
      setEditingName(false)
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      await updateProfile({ username: newName.trim() })
      setSaveMsg("Handle updated!")
      setEditingName(false)
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (e: any) {
      setSaveMsg(e.message || "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const { data } = useSite()
  const t = data.tournament
  const championTeam = t?.champion
    ? t.teams.find((x: any) => x.id === t.champion)
    : null
  const completedMatches = (t?.matches || []).filter(
    (m: any) => m.status === "COMPLETED",
  )
  const liveMatches = (t?.matches || []).filter((m: any) => m.status === "LIVE")

  return (
    <>
      <PageHead
        kicker={`${brand.codename} // OPERATOR`}
        title="Dashboard"
        sub={
          profile
            ? `Signed in as ${profile.username} · ${effectiveRole}`
            : undefined
        }
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        {/* Custom Username Setup Banner if user has default name */}
        {profile && (
          <div className="mb-6 flex flex-col gap-4 border border-accent/40 bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">
                  OPERATOR IDENTITY
                </span>
                <span className="font-mono text-[10px] text-muted">
                  ({profile.email})
                </span>
              </div>
              <div className="mt-1 text-sm text-foreground">
                Current Handle:{" "}
                <span className="font-display font-black text-accent">
                  {profile.username}
                </span>
              </div>
            </div>
            {!editingName ? (
              <button
                onClick={() => setEditingName(true)}
                className="btn-sweep border border-accent px-4 py-2 font-mono text-[11px] font-bold tracking-[0.15em] text-accent transition-colors hover:bg-accent/10"
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
                  className="btn-sweep bg-accent px-3 py-1.5 font-mono text-xs font-bold text-accent-foreground"
                >
                  {saving ? "SAVING…" : "SAVE"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false)
                    setNewName(profile.username)
                  }}
                  className="btn-sweep border border-border px-3 py-1.5 font-mono text-xs text-muted"
                >
                  CANCEL
                </button>
              </div>
            )}
            {saveMsg && (
              <span className="font-mono text-xs text-accent">{saveMsg}</span>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="border border-border bg-surface p-6 lg:col-span-2">
            <Mono>QUICK ACTIONS</Mono>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button onClick={() => navigate("tournament")} className={ghost}>
                VIEW LIVE BRACKET
              </button>
              <button onClick={() => navigate("teams")} className={ghost}>
                VIEW TEAMS & ROSTERS
              </button>
              <button onClick={() => navigate("matches")} className={ghost}>
                BROWSE MATCHES
              </button>
              {admin ? (
                <button onClick={onControl} className={primary}>
                  OPEN CONTROL CENTER
                </button>
              ) : (
                <button
                  onClick={() => navigate("tournaments")}
                  className={ghost}
                >
                  EXPLORE TOURNAMENTS
                </button>
              )}
            </div>
          </div>
          <div className="border border-border bg-surface p-6">
            <Mono>OPERATOR ACCESS & PERMISSIONS</Mono>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="font-mono text-[10px] text-muted">
                  PERSPECTIVE
                </span>
                <span className="font-mono text-xs font-bold text-accent">
                  {effectiveRole}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {permissions.map((p) => (
                  <span
                    key={p}
                    className="border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-muted"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TOURNAMENT MILESTONES & RECENT ACTIVITY */}
        <div className="mt-6 border border-border bg-surface p-6">
          <SectionHeader index="01" title="Tournament Milestones & Activity" />

          <div className="space-y-4">
            {/* Active Tournament Status Banner */}
            {t && (
              <div className="flex flex-col justify-between gap-3 border border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <span className="status-pulse mt-1 inline-block size-2 rounded-full bg-accent" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-wider">
                        {t.game}
                      </span>
                      <span className="text-muted text-xs">·</span>
                      <span className="font-mono text-[10px] text-muted">
                        {t.season}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-black tracking-tight">
                      {t.name}
                    </h3>
                    <div className="font-mono text-xs text-muted">
                      {t.teams.length} Teams Registered · {t.format} · Prize
                      Pool: <span className="text-accent">{t.prizePool}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip status={t.status} />
                  <button
                    onClick={() => navigate("tournament")}
                    className="border border-accent px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.15em] text-accent hover:bg-accent/10"
                  >
                    VIEW BRACKET →
                  </button>
                </div>
              </div>
            )}

            {/* Champion Declaration if completed */}
            {championTeam && (
              <div className="flex items-center justify-between border border-accent bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👑</span>
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.15em] text-accent">
                      OFFICIAL TOURNAMENT CHAMPION
                    </div>
                    <div className="font-display text-base font-bold text-foreground">
                      {championTeam.name} [{championTeam.tag}] — {t?.name}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-accent">
                  {t?.prizePool} 1ST PLACE
                </span>
              </div>
            )}

            {/* Live Matches if any */}
            {liveMatches.length > 0 && (
              <div className="space-y-2">
                <div className="font-mono text-[10px] tracking-[0.15em] text-accent font-bold">
                  ⚡ MATCHES CURRENTLY LIVE
                </div>
                {liveMatches.map((m: any) => {
                  const teamA = t?.teams.find((x: any) => x.id === m.a)
                  const teamB = t?.teams.find((x: any) => x.id === m.b)
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between border border-border bg-background/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <StatusChip status="LIVE" />
                        <span className="font-mono text-xs text-muted">
                          {m.round}
                        </span>
                        <span className="font-display text-sm font-bold">
                          {teamA?.name ?? "TBD"}{" "}
                          <span className="text-accent">vs</span>{" "}
                          {teamB?.name ?? "TBD"}
                        </span>
                      </div>
                      <div className="font-mono text-sm font-bold text-accent">
                        {m.scoreA ?? 0} — {m.scoreB ?? 0}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Completed Tournament Results & Match Outcomes */}
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                TOURNAMENT ARCHIVES & COMPLETED EVENTS
              </div>
              {(data.results || []).slice(0, 4).map((r: any) => (
                <div
                  key={r.id}
                  className="flex flex-col justify-between gap-2 border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <StatusChip status="COMPLETED" />
                    <div>
                      <span className="font-display text-sm font-bold">
                        {r.event}
                      </span>
                      <span className="ml-2 font-mono text-xs text-muted">
                        Winner:{" "}
                        <span className="font-bold text-accent">
                          {r.winner}
                        </span>{" "}
                        (Defeated {r.runnerUp} {r.score})
                      </span>
                    </div>
                  </div>
                  <Mono className="text-[10px] text-muted">{r.date}</Mono>
                </div>
              ))}
            </div>

            {/* Upcoming Tournaments */}
            {(data.events || []).length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                  UPCOMING TOURNAMENT SCHEDULE
                </div>
                {(data.events || []).slice(0, 3).map((e: any) => (
                  <div
                    key={e.id}
                    className="flex flex-col justify-between gap-2 border border-border bg-surface/60 px-4 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="border border-border px-1.5 py-0.5 font-mono text-[9px] text-accent">
                        {e.game}
                      </span>
                      <div>
                        <span className="font-display text-sm font-bold">
                          {e.name}
                        </span>
                        <span className="ml-2 font-mono text-xs text-muted">
                          {e.format} · Prize:{" "}
                          <span className="text-foreground">{e.prize}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip status={e.status} />
                      <Mono className="text-[10px]">{e.region}</Mono>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([])
  useEffect(() => {
    const loadNotifs = () => {
      api
        .getNotifications()
        .then(({ notifications }) => setNotifs(notifications ?? []))
        .catch(() => {})
    }
    loadNotifs()
    const interval = setInterval(loadNotifs, 4000)
    window.addEventListener("focus", loadNotifs)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", loadNotifs)
    }
  }, [])
  return (
    <>
      <PageHead kicker={`${brand.codename} // SIGNALS`} title="Notifications" />
      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="space-y-2">
          {notifs.length === 0 && (
            <div className="border border-border bg-surface p-8 text-center">
              <Mono>No notifications.</Mono>
            </div>
          )}
          {notifs.map((n, i) => (
            <Reveal key={i} delay={i * 50}>
              <div className="flex items-start justify-between gap-4 border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <StatusChip status={n.severity ?? "INFO"} />
                  <div>
                    <div className="font-display text-sm font-bold">
                      {n.title}
                    </div>
                    <div className="text-sm text-muted">{n.body}</div>
                  </div>
                </div>
                <Mono className="shrink-0">
                  {new Date(n.ts).toLocaleString()}
                </Mono>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}

// ---------- PROFILE ----------
export function ProfilePage() {
  const { profile, updateProfile, logout } = useAuth()
  const [username, setUsername] = useState(profile?.username ?? "")
  const [region, setRegion] = useState(profile?.region ?? "GLOBAL")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username)
      setRegion(profile.region)
    }
  }, [profile])

  if (!profile) return null

  async function handleSave() {
    if (!username.trim()) return
    setSaving(true)
    setMsg(null)
    try {
      await updateProfile({ username: username.trim(), region })
      setMsg({ text: "Profile updated successfully!", ok: true })
    } catch (e: any) {
      setMsg({ text: e.message || "Failed to save profile", ok: false })
    } finally {
      setSaving(false)
    }
  }

  const input =
    "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"

  return (
    <>
      <PageHead
        kicker={`${brand.codename} // IDENTITY`}
        title="Profile Settings"
      />
      <section className="mx-auto max-w-lg px-5 py-16">
        <div className="border border-border bg-surface p-8">
          <div className="space-y-4">
            <div>
              <Mono>EMAIL (LOGIN ACCOUNT)</Mono>
              <div className="mt-1 font-mono text-sm text-muted">
                {profile.email}
              </div>
            </div>

            <div>
              <Mono>OPERATOR HANDLE / USERNAME</Mono>
              <input
                className={`${input} mt-1.5 font-mono text-sm`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Custom Gamer Handle"
              />
              <p className="mt-1 text-[11px] text-muted">
                This name will appear on leaderboards, brackets, and the navbar.
              </p>
            </div>

            <div>
              <Mono>COMPETITIVE REGION</Mono>
              <select
                className={`${input} mt-1.5`}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {["GLOBAL", "NA", "EU", "APAC", "SA", "MENA"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Mono>SYSTEM ROLE</Mono>
              <div className="mt-1 font-mono text-sm font-bold text-accent">
                {profile.role}
              </div>
            </div>

            {msg && (
              <div
                className={`font-mono text-xs ${
                  msg.ok ? "text-success" : "text-danger"
                }`}
              >
                {msg.text}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={
                saving ||
                !username.trim() ||
                (username === profile.username && region === profile.region)
              }
              className={`${primary} w-full`}
            >
              {saving ? "SAVING CHANGES…" : "SAVE PROFILE"}
            </button>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <button
              onClick={() => {
                logout()
                navigate("home")
              }}
              className={`${ghost} w-full`}
            >
              LOG OUT
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
