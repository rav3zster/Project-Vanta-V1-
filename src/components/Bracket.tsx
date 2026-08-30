import { useState, useMemo } from "react"
import {
  type Match,
  type Team,
  type TournamentFormatType,
} from "../data/tournament"
import { StatusChip } from "./ui"
import { Reveal, HudCorners } from "./Reveal"

interface BracketProps {
  teams?: Team[]
  matches?: Match[]
  formatType?: TournamentFormatType
  tournamentName?: string
  game?: string
}

export function Bracket({
  teams = [],
  matches = [],
  formatType,
  tournamentName,
  game = "VALORANT",
}: BracketProps) {
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null)
  const [selectedStage, setSelectedStage] = useState<string>("ALL")
  const [searchFilter, setSearchFilter] = useState<string>("")

  const ts = teams ?? []
  const ms = matches ?? []

  const find = (id: string | null): Team | null => {
    if (!id) return null
    return ts.find((t) => t.id === id) ?? null
  }

  // Infer format if not explicitly passed
  const resolvedFormat: TournamentFormatType = useMemo(() => {
    if (formatType) return formatType
    if (ms.some((m) => m.bracketType === "LOWER" || m.round.includes("LOWER")))
      return "DOUBLE_ELIM"
    if (
      ms.some(
        (m) => m.bracketType === "GROUP" || m.round.includes("ROUND ROBIN"),
      )
    )
      return "ROUND_ROBIN"
    if (ms.some((m) => m.bracketType === "SWISS" || m.round.includes("SWISS")))
      return "SWISS"
    if (
      ms.some((m) => m.round.includes("GROUP A") || m.round.includes("GROUP B"))
    )
      return "GSL_GROUPS"
    return "KNOCKOUT"
  }, [formatType, ms])

  if (ms.length === 0) {
    return (
      <div className="grain relative border border-border bg-surface/40 p-8 sm:p-12 text-center">
        <div className="mx-auto mb-3 size-8 rounded-full border border-border flex items-center justify-center font-mono text-xs text-muted">
          ⚡
        </div>
        <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          BRACKET TREE NOT YET GENERATED — AWAITING SEEDING & FIXTURES
        </p>
        <p className="mt-1 font-mono text-[10px] text-border-strong">
          Tournament administrators (GOD / DEMI_GOD) can generate or customize
          fixtures in the Control Center.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* VLR.gg Interactive Display Tree Toolbar */}
      <div className="flex flex-col gap-3 rounded-none border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
            {game}
          </span>
          <span className="font-mono text-xs text-foreground font-semibold">
            {tournamentName || "TOURNAMENT TREE"}
          </span>
          <span className="font-mono text-[10px] text-muted">
            · FORMAT:{" "}
            <span className="text-foreground">
              {formatLabel(resolvedFormat)}
            </span>
          </span>
        </div>

        {/* Search & Team Highlighter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Highlight team path…"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value)
                const match = ts.find(
                  (t) =>
                    t.name
                      .toLowerCase()
                      .includes(e.target.value.toLowerCase()) ||
                    t.tag.toLowerCase().includes(e.target.value.toLowerCase()),
                )
                setHoveredTeamId(
                  e.target.value.trim() && match ? match.id : null,
                )
              }}
              className="w-44 bg-surface-raised border border-border px-2.5 py-1 font-mono text-[10px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {searchFilter && (
              <button
                onClick={() => {
                  setSearchFilter("")
                  setHoveredTeamId(null)
                }}
                className="absolute right-2 top-1 font-mono text-[10px] text-muted hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
          {hoveredTeamId && (
            <span className="hidden lg:inline-block font-mono text-[9px] text-accent animate-pulse">
              ● PATH HIGHLIGHTED
            </span>
          )}
        </div>
      </div>

      {/* Render Appropriate Format Tree */}
      {resolvedFormat === "DOUBLE_ELIM" ? (
        <DoubleElimTree
          matches={ms}
          find={find}
          hoveredTeamId={hoveredTeamId}
          setHoveredTeamId={setHoveredTeamId}
          selectedStage={selectedStage}
          setSelectedStage={setSelectedStage}
        />
      ) : resolvedFormat === "ROUND_ROBIN" ? (
        <RoundRobinView
          matches={ms}
          teams={ts}
          find={find}
          hoveredTeamId={hoveredTeamId}
          setHoveredTeamId={setHoveredTeamId}
        />
      ) : resolvedFormat === "SWISS" ? (
        <SwissSystemView
          matches={ms}
          teams={ts}
          find={find}
          hoveredTeamId={hoveredTeamId}
          setHoveredTeamId={setHoveredTeamId}
        />
      ) : resolvedFormat === "GSL_GROUPS" ? (
        <GslGroupsView
          matches={ms}
          teams={ts}
          find={find}
          hoveredTeamId={hoveredTeamId}
          setHoveredTeamId={setHoveredTeamId}
        />
      ) : (
        <KnockoutTree
          matches={ms}
          find={find}
          hoveredTeamId={hoveredTeamId}
          setHoveredTeamId={setHoveredTeamId}
        />
      )}
    </div>
  )
}

function formatLabel(type: TournamentFormatType): string {
  switch (type) {
    case "DOUBLE_ELIM":
      return "DOUBLE ELIMINATION (UPPER & LOWER)"
    case "ROUND_ROBIN":
      return "ROUND ROBIN (LEAGUE TABLE)"
    case "SWISS":
      return "SWISS SYSTEM (3W ADVANCE / 3L ELIM)"
    case "GSL_GROUPS":
      return "GSL DUAL-TOURNAMENT GROUPS → PLAYOFFS"
    case "KNOCKOUT":
    default:
      return "SINGLE ELIMINATION KNOCKOUT"
  }
}

// =============================================================================
// VLR.GG STYLE MATCH CARD COMPONENT
// =============================================================================

function VlrMatchCard({
  match,
  find,
  hoveredTeamId,
  setHoveredTeamId,
}: {
  match: Match
  find: (id: string | null) => Team | null
  hoveredTeamId: string | null
  setHoveredTeamId: (id: string | null) => void
}) {
  const teamA = find(match.a)
  const teamB = find(match.b)
  const isTeamAHighlighted = hoveredTeamId !== null && match.a === hoveredTeamId
  const isTeamBHighlighted = hoveredTeamId !== null && match.b === hoveredTeamId
  const isAnyHighlighted = isTeamAHighlighted || isTeamBHighlighted

  const decided = match.winner !== null || match.status === "COMPLETED"
  const live = match.status === "LIVE"
  const disputed = match.status === "DISPUTED"

  return (
    <div
      className={`group relative w-full sm:w-[270px] border transition-all duration-200 ${
        isAnyHighlighted
          ? "border-accent shadow-[0_0_15px_rgba(230,175,46,0.25)] bg-surface-raised scale-[1.02] z-20"
          : live
            ? "border-accent/60 bg-surface shadow-[0_0_10px_rgba(230,175,46,0.15)]"
            : disputed
              ? "border-danger/60 bg-surface"
              : "border-border bg-surface hover:border-border-strong"
      }`}
    >
      <HudCorners />

      {/* Header Info Bar */}
      <div className="flex items-center justify-between border-b border-border/80 bg-surface-raised/60 px-3 py-1.5 font-mono text-[9px]">
        <div className="flex items-center gap-1.5 text-muted">
          <span className="font-bold tracking-wider text-foreground/80">
            {match.id}
          </span>
          <span>·</span>
          <span className="truncate max-w-[120px]">{match.round}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="border border-border/60 bg-background/50 px-1 py-0.2 text-[8px] text-muted font-bold">
            {match.format || (decided ? "FINAL" : "BO1")}
          </span>
          <StatusChip status={match.status} />
        </div>
      </div>

      {/* Team Rows */}
      <div className="divide-y divide-border/60">
        <VlrTeamSlot
          team={teamA}
          score={match.scoreA}
          isWinner={match.winner === match.a && !!match.a}
          live={live}
          isHighlighted={isTeamAHighlighted}
          onMouseEnter={() => teamA && setHoveredTeamId(teamA.id)}
          onMouseLeave={() => setHoveredTeamId(null)}
        />
        <VlrTeamSlot
          team={teamB}
          score={match.scoreB}
          isWinner={match.winner === match.b && !!match.b}
          live={live}
          isHighlighted={isTeamBHighlighted}
          onMouseEnter={() => teamB && setHoveredTeamId(teamB.id)}
          onMouseLeave={() => setHoveredTeamId(null)}
        />
      </div>

      {/* Match Meta Footer */}
      <div className="flex items-center justify-between border-t border-border/60 bg-surface/30 px-3 py-1 font-mono text-[9px] text-muted">
        <span className="truncate">{match.time || "SCHEDULED"}</span>
        <span className="truncate">{match.server}</span>
      </div>
    </div>
  )
}

function VlrTeamSlot({
  team,
  score,
  isWinner,
  live,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  team: Team | null
  score: number | null
  isWinner: boolean
  live: boolean
  isHighlighted: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`flex cursor-pointer items-center justify-between gap-2.5 px-3 py-2 transition-colors ${
        isHighlighted
          ? "bg-accent/15"
          : isWinner
            ? "bg-surface-raised font-semibold"
            : "hover:bg-surface-hover"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Seed indicator */}
        <span
          className={`w-4 shrink-0 text-center font-mono text-[9px] font-bold ${
            team?.seed != null ? "text-muted" : "text-border-strong"
          }`}
        >
          {team?.seed != null ? `#${team.seed}` : "—"}
        </span>

        {/* Team Tag pill */}
        {team ? (
          <span
            className={`shrink-0 border px-1 py-0.2 font-mono text-[9px] font-bold ${
              isWinner
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-surface-raised text-foreground/90"
            }`}
          >
            {team.tag}
          </span>
        ) : null}

        {/* Team Name */}
        <span
          className={`truncate text-xs ${
            team
              ? isWinner
                ? "font-bold text-foreground"
                : "text-foreground/85"
              : "italic text-border-strong"
          }`}
        >
          {team ? team.name : "TBD"}
        </span>

        {/* Winner indicator tick */}
        {team && isWinner && (
          <span className="size-1.5 shrink-0 rounded-full bg-accent animate-pulse" />
        )}
      </div>

      {/* Score Pill */}
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums ${
          score === null
            ? "text-border-strong"
            : isWinner
              ? "bg-accent/20 text-accent"
              : live
                ? "bg-foreground/10 text-foreground"
                : "text-muted"
        }`}
      >
        {score === null ? "–" : score}
      </span>
    </div>
  )
}

// =============================================================================
// 1. KNOCKOUT TREE (SINGLE ELIMINATION)
// =============================================================================

function KnockoutTree({
  matches,
  find,
  hoveredTeamId,
  setHoveredTeamId,
}: {
  matches: Match[]
  find: (id: string | null) => Team | null
  hoveredTeamId: string | null
  setHoveredTeamId: (id: string | null) => void
}) {
  const r16 = matches.filter(
    (m) => m.round.includes("ROUND OF 16") || m.round.includes("R16"),
  )
  const qf = matches.filter(
    (m) => m.round.includes("QUARTERFINAL") || m.round.includes("QF"),
  )
  const sf = matches.filter(
    (m) => m.round.includes("SEMIFINAL") || m.round.includes("SF"),
  )
  const final = matches.filter(
    (m) => m.round === "FINAL" || m.round.includes("GRAND FINAL"),
  )
  const champion = find(final[0]?.winner ?? null)

  return (
    <div className="grain relative overflow-x-auto border border-border bg-surface/40 p-4 sm:p-8">
      <div className="relative z-10 flex min-w-[720px] gap-8 lg:gap-12 items-stretch">
        {r16.length > 0 && (
          <TreeColumn
            title="ROUND OF 16"
            subtitle="BO1 KNOCKOUT"
            ms={r16}
            find={find}
            hoveredTeamId={hoveredTeamId}
            setHoveredTeamId={setHoveredTeamId}
          />
        )}
        {qf.length > 0 && (
          <TreeColumn
            title="QUARTERFINALS"
            subtitle="BO3 MATCHES"
            ms={qf}
            find={find}
            hoveredTeamId={hoveredTeamId}
            setHoveredTeamId={setHoveredTeamId}
          />
        )}
        {sf.length > 0 && (
          <TreeColumn
            title="SEMIFINALS"
            subtitle="BO3 MATCHES"
            ms={sf}
            find={find}
            hoveredTeamId={hoveredTeamId}
            setHoveredTeamId={setHoveredTeamId}
          />
        )}
        {final.length > 0 && (
          <div className="flex flex-col justify-between w-64 sm:w-[270px]">
            <TreeColumn
              title="GRAND FINAL"
              subtitle="BO5 CHAMPIONSHIP"
              ms={final}
              find={find}
              hoveredTeamId={hoveredTeamId}
              setHoveredTeamId={setHoveredTeamId}
            />
            {/* Champion Showcase Card */}
            <div className="mt-6 border border-accent/40 bg-accent/5 p-4 text-center">
              <div className="font-mono text-[10px] font-bold tracking-[0.25em] text-accent uppercase">
                👑 OFFICIAL CHAMPION
              </div>
              <div className="mt-2 text-base font-bold text-foreground">
                {champion ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="border border-accent bg-accent/20 px-1.5 py-0.5 font-mono text-xs text-accent">
                      {champion.tag}
                    </span>
                    <span>{champion.name}</span>
                  </div>
                ) : (
                  <span className="font-mono text-xs text-muted">
                    AWAITING GRAND FINAL RESULT
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TreeColumn({
  title,
  subtitle,
  ms,
  find,
  hoveredTeamId,
  setHoveredTeamId,
}: {
  title: string
  subtitle: string
  ms: Match[]
  find: (id: string | null) => Team | null
  hoveredTeamId: string | null
  setHoveredTeamId: (id: string | null) => void
}) {
  return (
    <div className="flex flex-col w-64 sm:w-[270px]">
      <div className="mb-4 border-b border-border pb-2">
        <h3 className="font-mono text-[11px] font-bold tracking-[0.2em] text-foreground uppercase">
          {title}
        </h3>
        <p className="font-mono text-[9px] text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-1 flex-col justify-around gap-6">
        {ms.map((m) => (
          <VlrMatchCard
            key={m.id}
            match={m}
            find={find}
            hoveredTeamId={hoveredTeamId}
            setHoveredTeamId={setHoveredTeamId}
          />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// 2. DOUBLE ELIMINATION TREE (UPPER + LOWER BRACKETS)
// =============================================================================

function DoubleElimTree({
  matches,
  find,
  hoveredTeamId,
  setHoveredTeamId,
  selectedStage,
  setSelectedStage,
}: {
  matches: Match[]
  find: (id: string | null) => Team | null
  hoveredTeamId: string | null
  setHoveredTeamId: (id: string | null) => void
  selectedStage: string
  setSelectedStage: (s: string) => void
}) {
  const upperMatches = matches.filter(
    (m) =>
      m.bracketType === "UPPER" ||
      m.round.includes("UPPER") ||
      m.round.includes("QF") ||
      m.round.includes("SF"),
  )
  const lowerMatches = matches.filter(
    (m) => m.bracketType === "LOWER" || m.round.includes("LOWER"),
  )
  const grandFinal = matches.filter(
    (m) => m.bracketType === "GRAND_FINAL" || m.round.includes("GRAND FINAL"),
  )
  const champion = find(grandFinal[0]?.winner ?? null)

  const STAGES = ["ALL", "UPPER BRACKET", "LOWER BRACKET", "GRAND FINAL"]

  return (
    <div className="space-y-4">
      {/* Double Elim Stage Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStage(s)}
            className={`border px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] transition-colors ${
              selectedStage === s
                ? "border-accent bg-accent/15 text-accent font-bold"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* Upper Bracket Section */}
        {(selectedStage === "ALL" || selectedStage === "UPPER BRACKET") && (
          <div className="border border-border bg-surface/50 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" />
                <span className="font-mono text-xs font-bold tracking-[0.2em] text-foreground uppercase">
                  UPPER BRACKET (WINNERS)
                </span>
              </div>
              <span className="font-mono text-[9px] text-muted">
                Defeat moves team to Lower Bracket
              </span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex min-w-[680px] gap-8 items-stretch">
                <TreeColumn
                  title="UPPER QUARTERS"
                  subtitle="OPENING ROUND"
                  ms={upperMatches.filter(
                    (m) => m.round.includes("QUARTER") || m.id.includes("UQF"),
                  )}
                  find={find}
                  hoveredTeamId={hoveredTeamId}
                  setHoveredTeamId={setHoveredTeamId}
                />
                <TreeColumn
                  title="UPPER SEMIFINALS"
                  subtitle="BO3 MATCHES"
                  ms={upperMatches.filter(
                    (m) =>
                      m.round.includes("SEMIFINAL") || m.id.includes("USF"),
                  )}
                  find={find}
                  hoveredTeamId={hoveredTeamId}
                  setHoveredTeamId={setHoveredTeamId}
                />
                <TreeColumn
                  title="UPPER FINAL"
                  subtitle="QUALIFIES TO GRAND FINAL"
                  ms={upperMatches.filter(
                    (m) =>
                      m.round.includes("UPPER FINAL") || m.id.includes("UF"),
                  )}
                  find={find}
                  hoveredTeamId={hoveredTeamId}
                  setHoveredTeamId={setHoveredTeamId}
                />
              </div>
            </div>
          </div>
        )}

        {/* Lower Bracket Section */}
        {(selectedStage === "ALL" || selectedStage === "LOWER BRACKET") &&
          lowerMatches.length > 0 && (
            <div className="border border-danger/30 bg-danger/5 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-danger/30 pb-2">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-danger" />
                  <span className="font-mono text-xs font-bold tracking-[0.2em] text-danger uppercase">
                    LOWER BRACKET (ELIMINATION)
                  </span>
                </div>
                <span className="font-mono text-[9px] text-muted">
                  Defeat eliminates team permanently
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-w-[680px] gap-8 items-stretch">
                  <TreeColumn
                    title="LOWER ROUNDS"
                    subtitle="ELIMINATION MATCHES"
                    ms={lowerMatches.filter((m) => !m.round.includes("FINAL"))}
                    find={find}
                    hoveredTeamId={hoveredTeamId}
                    setHoveredTeamId={setHoveredTeamId}
                  />
                  <TreeColumn
                    title="LOWER FINAL"
                    subtitle="BO3 · QUALIFIES TO GRAND FINAL"
                    ms={lowerMatches.filter((m) => m.round.includes("FINAL"))}
                    find={find}
                    hoveredTeamId={hoveredTeamId}
                    setHoveredTeamId={setHoveredTeamId}
                  />
                </div>
              </div>
            </div>
          )}

        {/* Grand Final Section */}
        {(selectedStage === "ALL" || selectedStage === "GRAND FINAL") &&
          grandFinal.length > 0 && (
            <div className="border border-accent/40 bg-accent/5 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-accent/30 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold tracking-[0.2em] text-accent uppercase">
                    👑 GRAND FINAL (UPPER CHAMPION VS LOWER CHAMPION)
                  </span>
                </div>
                <span className="font-mono text-[9px] text-muted">
                  BO5 Series
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                <VlrMatchCard
                  match={grandFinal[0]}
                  find={find}
                  hoveredTeamId={hoveredTeamId}
                  setHoveredTeamId={setHoveredTeamId}
                />
                <div className="border border-accent/50 bg-surface p-4 text-center min-w-[200px]">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-accent font-bold">
                    CHAMPION
                  </div>
                  <div className="mt-1 text-sm font-bold text-foreground">
                    {champion
                      ? `${champion.name} [${champion.tag}]`
                      : "Awaiting Result"}
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

// =============================================================================
// 3. ROUND ROBIN / LEAGUE TABLE VIEW
// =============================================================================

function RoundRobinView({
  matches,
  teams,
  find,
  hoveredTeamId,
  setHoveredTeamId,
}: {
  matches: Match[]
  teams: Team[]
  find: (id: string | null) => Team | null
  hoveredTeamId: string | null
  setHoveredTeamId: (id: string | null) => void
}) {
  // Compute Standings Table from matches
  const standings = useMemo(() => {
    const table: Record<string, {
      team: Team
      played: number
      won: number
      lost: number
      roundsFor: number
      roundsAgainst: number
      points: number
    }> = {}

    teams.forEach((t) => {
      table[t.id] = {
        team: t,
        played: 0,
        won: 0,
        lost: 0,
        roundsFor: 0,
        roundsAgainst: 0,
        points: 0,
      }
    })

    matches.forEach((m) => {
      if (m.status === "COMPLETED" && m.a && m.b) {
        const teamAStats = table[m.a]
        const teamBStats = table[m.b]
        if (teamAStats && teamBStats) {
          teamAStats.played += 1
          teamBStats.played += 1
          teamAStats.roundsFor += m.scoreA ?? 0
          teamAStats.roundsAgainst += m.scoreB ?? 0
          teamBStats.roundsFor += m.scoreB ?? 0
          teamBStats.roundsAgainst += m.scoreA ?? 0

          if (m.winner === m.a) {
            teamAStats.won += 1
            teamAStats.points += 3
            teamBStats.lost += 1
          } else if (m.winner === m.b) {
            teamBStats.won += 1
            teamBStats.points += 3
            teamAStats.lost += 1
          }
        }
      }
    })

    return Object.values(table).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      const diffA = a.roundsFor - a.roundsAgainst
      const diffB = b.roundsFor - b.roundsAgainst
      return diffB - diffA
    })
  }, [teams, matches])

  return (
    <div className="space-y-6">
      {/* Standings Table */}
      <div className="border border-border bg-surface p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-mono text-xs font-bold tracking-[0.2em] text-foreground uppercase">
            ROUND ROBIN LEAGUE STANDINGS
          </h3>
          <span className="font-mono text-[9px] text-muted">
            Top 4 advance to Championship Stage
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] text-muted">
                <th className="py-2 pl-2">#</th>
                <th className="py-2">TEAM</th>
                <th className="py-2 text-center">P</th>
                <th className="py-2 text-center">W</th>
                <th className="py-2 text-center">L</th>
                <th className="py-2 text-center">DIFF</th>
                <th className="py-2 text-right pr-2">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {standings.map((row, idx) => {
                const isHovered = hoveredTeamId === row.team.id
                const isPlayoffSpot = idx < 4
                return (
                  <tr
                    key={row.team.id}
                    onMouseEnter={() => setHoveredTeamId(row.team.id)}
                    onMouseLeave={() => setHoveredTeamId(null)}
                    className={`transition-colors cursor-pointer ${
                      isHovered
                        ? "bg-accent/15"
                        : isPlayoffSpot
                          ? "bg-accent/5 hover:bg-surface-hover"
                          : "hover:bg-surface-hover"
                    }`}
                  >
                    <td className="py-2.5 pl-2 font-bold">
                      <span
                        className={isPlayoffSpot ? "text-accent" : "text-muted"}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="border border-border px-1 py-0.2 text-[9px] font-bold text-accent">
                          {row.team.tag}
                        </span>
                        <span className="font-bold text-foreground">
                          {row.team.name}
                        </span>
                        {isPlayoffSpot && (
                          <span className="hidden sm:inline-block font-mono text-[8px] text-success border border-success/30 px-1">
                            QUALIFIED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-center text-muted">
                      {row.played}
                    </td>
                    <td className="py-2.5 text-center font-bold text-success">
                      {row.won}
                    </td>
                    <td className="py-2.5 text-center text-danger">
                      {row.lost}
                    </td>
                    <td className="py-2.5 text-center text-muted">
                      {row.roundsFor - row.roundsAgainst > 0
                        ? `+${row.roundsFor - row.roundsAgainst}`
                        : row.roundsFor - row.roundsAgainst}
                    </td>
                    <td className="py-2.5 text-right pr-2 font-bold text-accent text-sm">
                      {row.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match Schedule Grid */}
      <div className="border border-border bg-surface p-4 sm:p-6">
        <h3 className="mb-4 font-mono text-xs font-bold tracking-[0.2em] text-foreground uppercase border-b border-border pb-2">
          FIXTURES & SCHEDULE
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <VlrMatchCard
              key={m.id}
              match={m}
              find={find}
              hoveredTeamId={hoveredTeamId}
              setHoveredTeamId={setHoveredTeamId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// 4. SWISS SYSTEM VIEW
// =============================================================================

function SwissSystemView({
  matches,
  teams,
  find,
  hoveredTeamId,
  setHoveredTeamId,
}: {
  matches: Match[]
  teams: Team[]
  find: (id: string | null) => Team | null
  hoveredTeamId: string | null
  setHoveredTeamId: (id: string | null) => void
}) {
  const r1 = matches.filter(
    (m) => m.round.includes("SWISS ROUND 1") || m.id.includes("SW1"),
  )
  const r2 = matches.filter(
    (m) => m.round.includes("SWISS ROUND 2") || m.id.includes("SW2"),
  )
  const r3 = matches.filter(
    (m) => m.round.includes("SWISS ROUND 3") || m.id.includes("SW3"),
  )

  return (
    <div className="space-y-6">
      <div className="border border-border bg-surface/50 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-mono text-xs font-bold tracking-[0.2em] text-foreground uppercase">
            SWISS SYSTEM PROGRESSION
          </h3>
          <span className="font-mono text-[9px] text-muted">
            Teams with equal records are paired each round
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-[760px] gap-8 items-stretch">
            <TreeColumn
              title="ROUND 1 (0–0)"
              subtitle="OPENING PAIRINGS"
              ms={r1}
              find={find}
              hoveredTeamId={hoveredTeamId}
              setHoveredTeamId={setHoveredTeamId}
            />
            <TreeColumn
              title="ROUND 2 (1–0 & 0–1)"
              subtitle="MID-STAGE PAIRINGS"
              ms={r2}
              find={find}
              hoveredTeamId={hoveredTeamId}
              setHoveredTeamId={setHoveredTeamId}
            />
            <TreeColumn
              title="ROUND 3 (2–0, 1–1, 0–2)"
              subtitle="ADVANCEMENT / ELIMINATION"
              ms={r3}
              find={find}
              hoveredTeamId={hoveredTeamId}
              setHoveredTeamId={setHoveredTeamId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// 5. GSL DUAL-TOURNAMENT GROUPS VIEW
// =============================================================================

function GslGroupsView({
  matches,
  teams,
  find,
  hoveredTeamId,
  setHoveredTeamId,
}: {
  matches: Match[]
  teams: Team[]
  find: (id: string | null) => Team | null
  hoveredTeamId: string | null
  setHoveredTeamId: (id: string | null) => void
}) {
  const groupA = matches.filter(
    (m) => m.round.includes("GROUP A") || m.id.includes("GA"),
  )
  const groupB = matches.filter(
    (m) => m.round.includes("GROUP B") || m.id.includes("GB"),
  )
  const playoffs = matches.filter(
    (m) =>
      m.round.includes("PLAYOFF") || m.id.includes("SF") || m.id.includes("F1"),
  )

  return (
    <div className="space-y-6">
      {/* Group A & Group B Dual Tournament */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-border bg-surface/50 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
            <span className="font-mono text-xs font-bold tracking-[0.2em] text-accent uppercase">
              GROUP A (GSL FORMAT)
            </span>
            <span className="font-mono text-[9px] text-muted">
              Top 2 advance to Playoffs
            </span>
          </div>
          <div className="space-y-3">
            {groupA.map((m) => (
              <VlrMatchCard
                key={m.id}
                match={m}
                find={find}
                hoveredTeamId={hoveredTeamId}
                setHoveredTeamId={setHoveredTeamId}
              />
            ))}
          </div>
        </div>

        <div className="border border-border bg-surface/50 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
            <span className="font-mono text-xs font-bold tracking-[0.2em] text-accent uppercase">
              GROUP B (GSL FORMAT)
            </span>
            <span className="font-mono text-[9px] text-muted">
              Top 2 advance to Playoffs
            </span>
          </div>
          <div className="space-y-3">
            {groupB.map((m) => (
              <VlrMatchCard
                key={m.id}
                match={m}
                find={find}
                hoveredTeamId={hoveredTeamId}
                setHoveredTeamId={setHoveredTeamId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Playoffs Stage */}
      {playoffs.length > 0 && (
        <div className="border border-accent/40 bg-accent/5 p-4 sm:p-6">
          <h3 className="mb-4 font-mono text-xs font-bold tracking-[0.2em] text-foreground uppercase border-b border-accent/30 pb-2">
            PLAYOFFS (SEMIFINALS & GRAND FINAL)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {playoffs.map((m) => (
              <VlrMatchCard
                key={m.id}
                match={m}
                find={find}
                hoveredTeamId={hoveredTeamId}
                setHoveredTeamId={setHoveredTeamId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
