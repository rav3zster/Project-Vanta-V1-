import { useState } from "react";
import { type Match, type Team } from "../data/tournament";
import { StatusChip } from "./ui";

function Slot({
  team,
  score,
  isWinner,
  live,
}: {
  team: Team | null;
  score: number | null;
  isWinner: boolean;
  live: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 transition-colors ${
        isWinner ? "bg-surface-hover" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`w-5 shrink-0 text-center font-mono text-[10px] ${
            team ? "text-muted" : "text-border-strong"
          }`}
        >
          {team && team.seed != null ? team.seed : "—"}
        </span>
        <span
          className={`truncate text-sm ${
            team ? (isWinner ? "font-semibold text-foreground" : "text-foreground/80") : "text-border-strong"
          }`}
        >
          {team ? team.name : "Awaiting winner"}
        </span>
        {team && isWinner && <span className="size-1 shrink-0 rounded-full bg-accent" />}
      </div>
      <span
        className={`shrink-0 font-mono text-sm tabular-nums ${
          score === null ? "text-border-strong" : isWinner ? "text-accent" : "text-muted"
        } ${live ? "text-foreground" : ""}`}
      >
        {score === null ? "–" : score}
      </span>
    </div>
  );
}

function MatchCard({ match, find }: { match: Match; find: (id: string | null) => Team | null }) {
  const decided = match.winner !== null;
  const live = match.status === "LIVE";
  return (
    <div
      className={`w-full sm:w-64 border bg-surface transition-colors hover:border-border-strong ${
        live ? "border-accent/40" : match.status === "DISPUTED" ? "border-danger/40" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[10px] tracking-[0.15em] text-muted">{match.id}</span>
        <StatusChip status={match.status} />
      </div>
      <div className="divide-y divide-border">
        <Slot team={find(match.a)} score={match.scoreA} isWinner={match.winner === match.a && !!match.a} live={live} />
        <Slot team={find(match.b)} score={match.scoreB} isWinner={match.winner === match.b && !!match.b} live={live} />
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
        <span className="font-mono text-[10px] text-muted">
          {(match as any).time ?? match.round} · {match.server}
        </span>
        <span className={`font-mono text-[10px] tracking-[0.15em] ${decided ? "text-muted" : "text-accent/80"}`}>
          {decided ? "FINAL" : "BO1"}
        </span>
      </div>
    </div>
  );
}

function Column({
  title,
  ms,
  find,
  className = "",
}: {
  title: string;
  ms: Match[];
  find: (id: string | null) => Team | null;
  className?: string;
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      <h3 className="mb-4 font-mono text-[11px] tracking-[0.25em] text-muted uppercase">{title}</h3>
      <div className="flex flex-1 flex-col justify-around gap-6">
        {ms.map((m) => (
          <MatchCard key={m.id} match={m} find={find} />
        ))}
      </div>
    </div>
  );
}

export function Bracket({ teams, matches }: { teams?: Team[]; matches?: Match[] }) {
  const [mobileRound, setMobileRound] = useState<"ALL" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL">("ALL");
  const ts = teams ?? [];
  const ms = matches ?? [];
  const find = (id: string | null) => (id ? ts.find((t) => t.id === id) ?? null : null);

  const qf = ms.filter((m) => m.round === "QUARTERFINAL");
  const sf = ms.filter((m) => m.round === "SEMIFINAL");
  const final = ms.filter((m) => m.round === "FINAL");
  const champion = find(final[0]?.winner ?? null);

  if (ms.length === 0) {
    return (
      <div className="grain relative border border-border bg-surface/40 p-8 sm:p-12 text-center">
        <p className="font-mono text-xs tracking-[0.2em] text-muted">
          BRACKET NOT YET GENERATED — AWAITING SEEDING
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile Round Selector on small screens */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2 md:hidden">
        <div className="flex flex-wrap gap-1">
          {(["ALL", "QUARTERFINAL", "SEMIFINAL", "FINAL"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setMobileRound(r)}
              className={`px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] border transition-colors ${
                mobileRound === r
                  ? "border-accent bg-accent/15 text-accent font-bold"
                  : "border-border text-muted"
              }`}
            >
              {r === "QUARTERFINAL" ? "QF" : r === "SEMIFINAL" ? "SF" : r}
            </button>
          ))}
        </div>
        <span className="font-mono text-[9px] text-muted">↔ SWIPE</span>
      </div>

      {/* Bracket Viewport */}
      <div className="grain relative overflow-x-auto border border-border bg-surface/40 p-4 sm:p-8">
        <div className="relative z-10 flex min-w-[760px] gap-6 sm:gap-10">
          {(mobileRound === "ALL" || mobileRound === "QUARTERFINAL") && (
            <Column title="QUARTERFINALS" ms={qf} find={find} className="w-60 sm:w-64" />
          )}
          {(mobileRound === "ALL" || mobileRound === "SEMIFINAL") && (
            <Column title="SEMIFINALS" ms={sf} find={find} className="w-60 sm:w-64" />
          )}
          {(mobileRound === "ALL" || mobileRound === "FINAL") && (
            <div className="flex flex-col">
              <Column title="FINAL" ms={final} find={find} className="w-60 sm:w-64 flex-1" />
              <div className="mt-6 w-60 sm:w-64 border border-accent/30 bg-accent/5 px-3 py-3">
                <div className="font-mono text-[10px] tracking-[0.25em] text-accent">CHAMPION</div>
                <div className={`mt-1 text-sm ${champion ? "font-semibold text-foreground" : "text-border-strong"}`}>
                  {champion ? champion.name : "Pending final result"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
