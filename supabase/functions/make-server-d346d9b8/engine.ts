// Tournament engine. The bracket is a PROJECTION of this state — winners are
// derived from match results and never stored as independent truth.

export type TournamentStatus =
  | "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "ROSTER_LOCK"
  | "CHECK_IN_OPEN" | "CHECK_IN_CLOSED" | "SEEDING" | "BRACKET_LOCKED"
  | "LIVE" | "COMPLETED" | "CANCELLED";

export type MatchStatus =
  | "SCHEDULED" | "READY" | "LIVE" | "COMPLETED" | "FORFEIT" | "DISPUTED";

export type TeamMember = {
  name: string;
  inGameName: string; // e.g. TenZ#NA1
  discordId?: string; // e.g. tenz_official
  role?: string;      // e.g. IGL, DUELIST, CONTROLLER, etc.
  isIgl?: boolean;
  isSub?: boolean;
};

export type Team = {
  id: string;
  name: string;
  tag: string;
  region: string;
  seed: number | null;
  checkedIn: boolean;
  approved: boolean;
  igl?: TeamMember;
  members?: TeamMember[];
  sub?: TeamMember;
  ownerId?: string;
  contactEmail?: string;
  registrationNotes?: string;
};

export type Match = {
  id: string; round: "QUARTERFINAL" | "SEMIFINAL" | "FINAL"; slot: number;
  status: MatchStatus; a: string | null; b: string | null;
  scoreA: number | null; scoreB: number | null; winner: string | null;
  // where the winner of this match feeds next: [matchId, "a"|"b"] or null for final
  feeds: [string, "a" | "b"] | null;
  server: string; note?: string;
};

export type Tournament = {
  id: string; slug: string; name: string; season: string;
  status: TournamentStatus; game: string; format: string;
  prizePool: string; region: string; platform: string;
  slots: number; teams: Team[]; matches: Match[]; champion: string | null;
  createdAt: string; updatedAt: string;
  startDate?: string; checkInWindow?: string; prizeBreakdown?: [string, string][];
};

// Legal state transitions. Any other change is rejected server-side.
const TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  DRAFT: ["REGISTRATION_OPEN", "CHECK_IN_OPEN", "SEEDING", "CANCELLED"],
  REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "CHECK_IN_OPEN", "CANCELLED"],
  REGISTRATION_CLOSED: ["ROSTER_LOCK", "CHECK_IN_OPEN", "CANCELLED"],
  ROSTER_LOCK: ["CHECK_IN_OPEN", "SEEDING", "CANCELLED"],
  CHECK_IN_OPEN: ["CHECK_IN_CLOSED", "SEEDING", "CANCELLED"],
  CHECK_IN_CLOSED: ["SEEDING", "BRACKET_LOCKED", "CANCELLED"],
  SEEDING: ["BRACKET_LOCKED", "LIVE", "CANCELLED"],
  BRACKET_LOCKED: ["LIVE", "CANCELLED"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: TournamentStatus, to: TournamentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(t: Tournament, to: TournamentStatus): void {
  if (!canTransition(t.status, to)) {
    throw new Error(`Illegal transition ${t.status} → ${to}`);
  }
}

// Standard 8-team seeding order: 1v8, 4v5, 2v7, 3v6.
const SEED_PAIRS: [number, number][] = [[1, 8], [4, 5], [2, 7], [3, 6]];

export function generateBracket(t: Tournament): Match[] {
  const eligible = t.teams.filter((x) => x.approved);
  const teamsList = eligible.length > 0 ? eligible : t.teams;
  const bySeed = (s: number) => teamsList.find((x) => x.seed === s)?.id ?? teamsList[s - 1]?.id ?? null;
  const count = teamsList.length;

  if (count <= 4) {
    // 4 teams: 2 Semifinals (1v4, 2v3) -> Final
    const fin: Match = base("M-F1", "FINAL", 1, null);
    const sf1: Match = {
      ...base("M-SF1", "SEMIFINAL", 1, ["M-F1", "a"]),
      a: bySeed(1),
      b: bySeed(4) ?? bySeed(2),
      status: "READY",
    };
    const sf2: Match = {
      ...base("M-SF2", "SEMIFINAL", 2, ["M-F1", "b"]),
      a: bySeed(2) ?? bySeed(3),
      b: bySeed(3) ?? bySeed(4),
      status: "READY",
    };
    return [sf1, sf2, fin];
  }

  // 8 teams standard single elimination
  const matches: Match[] = [];
  const sf1: Match = base("M-SF1", "SEMIFINAL", 1, ["M-F1", "a"]);
  const sf2: Match = base("M-SF2", "SEMIFINAL", 2, ["M-F1", "b"]);
  const fin: Match = base("M-F1", "FINAL", 1, null);

  SEED_PAIRS.forEach((pair, i) => {
    const feedsMatch = i < 2 ? "M-SF1" : "M-SF2";
    const slotInSf: "a" | "b" = i % 2 === 0 ? "a" : "b";
    matches.push({
      ...base(`M-QF${i + 1}`, "QUARTERFINAL", i + 1, [feedsMatch, slotInSf]),
      a: bySeed(pair[0]),
      b: bySeed(pair[1]),
      status: "READY",
    });
  });

  matches.push(sf1, sf2, fin);
  return matches;
}

function base(
  id: string,
  round: Match["round"],
  slot: number,
  feeds: Match["feeds"],
): Match {
  return {
    id, round, slot, status: "SCHEDULED",
    a: null, b: null, scoreA: null, scoreB: null, winner: null,
    feeds, server: "AUTO",
  };
}

// Finalize a result: validate, set winner, advance into the dependent match.
// Returns the list of events that occurred (for audit + notifications).
export function finalizeResult(
  t: Tournament,
  matchId: string,
  scoreA: number,
  scoreB: number,
): string[] {
  const m = t.matches.find((x) => x.id === matchId);
  if (!m) throw new Error(`Match ${matchId} not found`);
  if (!m.a || !m.b) throw new Error("Both participants required before a result");
  if (m.status === "COMPLETED") throw new Error("Match already finalized");
  if (scoreA === scoreB) throw new Error("BO1 cannot end in a tie");

  const events: string[] = [];
  m.scoreA = scoreA;
  m.scoreB = scoreB;
  m.winner = scoreA > scoreB ? m.a : m.b;
  m.status = "COMPLETED";
  events.push(`result.confirmed:${m.id}`);

  if (m.feeds) {
    const [nextId, slot] = m.feeds;
    const next = t.matches.find((x) => x.id === nextId);
    if (next) {
      next[slot] = m.winner;
      if (next.a && next.b) {
        next.status = "READY";
        events.push(`match.ready:${next.id}`);
      }
    }
  } else {
    // Final finished → champion.
    t.champion = m.winner;
    t.status = "COMPLETED";
    events.push(`tournament.completed:${t.id}`);
  }

  return events;
}
