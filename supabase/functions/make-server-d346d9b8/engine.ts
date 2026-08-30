export type TournamentStatus =
  | "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "ROSTER_LOCK"
  | "CHECK_IN_OPEN" | "CHECK_IN_CLOSED" | "SEEDING" | "BRACKET_LOCKED"
  | "LIVE" | "COMPLETED" | "CANCELLED";

export type TournamentFormatType =
  | "KNOCKOUT"
  | "DOUBLE_ELIM"
  | "ROUND_ROBIN"
  | "SWISS"
  | "GSL_GROUPS";

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
  id: string;
  round: string;
  bracketType?: "UPPER" | "LOWER" | "GRAND_FINAL" | "GROUP" | "SWISS";
  slot: number;
  status: MatchStatus;
  a: string | null;
  b: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: string | null;
  // where the winner of this match feeds next: [matchId, "a"|"b"] or null for final
  feeds: [string, "a" | "b"] | null;
  format?: "BO1" | "BO3" | "BO5";
  server: string;
  time?: string;
  note?: string;
};

export type Tournament = {
  id: string;
  slug: string;
  name: string;
  season: string;
  status: TournamentStatus;
  game: string;
  format: string;
  formatType?: TournamentFormatType;
  prizePool: string;
  region: string;
  platform: string;
  slots: number;
  teams: Team[];
  matches: Match[];
  champion: string | null;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  registrationDeadline?: string;
  checkInWindow?: string;
  prizeBreakdown?: [string, string][];
};

// Legal state transitions. Any other change is rejected server-side.
const TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  DRAFT: ["REGISTRATION_OPEN", "CHECK_IN_OPEN", "SEEDING", "BRACKET_LOCKED", "CANCELLED"],
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
const SEED_PAIRS_8: [number, number][] = [[1, 8], [4, 5], [2, 7], [3, 6]];
const SEED_PAIRS_16: [number, number][] = [
  [1, 16], [8, 9], [4, 13], [5, 12],
  [2, 15], [7, 10], [3, 14], [6, 11],
];

export function generateBracket(t: Tournament): Match[] {
  const eligible = t.teams.filter((x) => x.approved);
  const teamsList = eligible.length > 0 ? eligible : t.teams;
  const count = teamsList.length;
  const formatType = t.formatType || inferFormatType(t.format);

  if (formatType === "DOUBLE_ELIM") {
    return generateDoubleElim(teamsList);
  }
  if (formatType === "ROUND_ROBIN") {
    return generateRoundRobin(teamsList);
  }
  if (formatType === "SWISS") {
    return generateSwiss(teamsList);
  }
  if (formatType === "GSL_GROUPS") {
    return generateGslGroups(teamsList);
  }

  // Default: Knockout (Single Elimination)
  return generateSingleElim(teamsList);
}

function inferFormatType(formatStr: string = ""): TournamentFormatType {
  const s = formatStr.toUpperCase();
  if (s.includes("DOUBLE")) return "DOUBLE_ELIM";
  if (s.includes("ROBIN") || s.includes("LEAGUE")) return "ROUND_ROBIN";
  if (s.includes("SWISS")) return "SWISS";
  if (s.includes("GSL") || s.includes("GROUP")) return "GSL_GROUPS";
  return "KNOCKOUT";
}

function generateSingleElim(teamsList: Team[]): Match[] {
  const bySeed = (s: number) => teamsList.find((x) => x.seed === s)?.id ?? teamsList[s - 1]?.id ?? null;
  const count = teamsList.length;

  if (count <= 4) {
    const fin: Match = base("M-F1", "FINAL", 1, null, "GRAND_FINAL", "BO3");
    const sf1: Match = {
      ...base("M-SF1", "SEMIFINAL", 1, ["M-F1", "a"], "UPPER", "BO1"),
      a: bySeed(1),
      b: bySeed(4) ?? bySeed(2),
      status: "READY",
    };
    const sf2: Match = {
      ...base("M-SF2", "SEMIFINAL", 2, ["M-F1", "b"], "UPPER", "BO1"),
      a: bySeed(2) ?? bySeed(3),
      b: bySeed(3) ?? bySeed(4),
      status: "READY",
    };
    return [sf1, sf2, fin];
  }

  if (count > 8 && count <= 16) {
    // 16-team knockout
    const fin: Match = base("M-F1", "FINAL", 1, null, "GRAND_FINAL", "BO5");
    const sf1: Match = base("M-SF1", "SEMIFINAL", 1, ["M-F1", "a"], "UPPER", "BO3");
    const sf2: Match = base("M-SF2", "SEMIFINAL", 2, ["M-F1", "b"], "UPPER", "BO3");
    const qfs = [
      base("M-QF1", "QUARTERFINAL", 1, ["M-SF1", "a"], "UPPER", "BO3"),
      base("M-QF2", "QUARTERFINAL", 2, ["M-SF1", "b"], "UPPER", "BO3"),
      base("M-QF3", "QUARTERFINAL", 3, ["M-SF2", "a"], "UPPER", "BO3"),
      base("M-QF4", "QUARTERFINAL", 4, ["M-SF2", "b"], "UPPER", "BO3"),
    ];
    const r16: Match[] = SEED_PAIRS_16.map((pair, i) => {
      const qfIdx = Math.floor(i / 2) + 1;
      const slot: "a" | "b" = i % 2 === 0 ? "a" : "b";
      return {
        ...base(`M-R16-${i + 1}`, "ROUND OF 16", i + 1, [`M-QF${qfIdx}`, slot], "UPPER", "BO1"),
        a: bySeed(pair[0]),
        b: bySeed(pair[1]),
        status: "READY",
      };
    });
    return [...r16, ...qfs, sf1, sf2, fin];
  }

  // 8 teams standard
  const matches: Match[] = [];
  const sf1: Match = base("M-SF1", "SEMIFINAL", 1, ["M-F1", "a"], "UPPER", "BO3");
  const sf2: Match = base("M-SF2", "SEMIFINAL", 2, ["M-F1", "b"], "UPPER", "BO3");
  const fin: Match = base("M-F1", "FINAL", 1, null, "GRAND_FINAL", "BO5");

  SEED_PAIRS_8.forEach((pair, i) => {
    const feedsMatch = i < 2 ? "M-SF1" : "M-SF2";
    const slotInSf: "a" | "b" = i % 2 === 0 ? "a" : "b";
    matches.push({
      ...base(`M-QF${i + 1}`, "QUARTERFINAL", i + 1, [feedsMatch, slotInSf], "UPPER", "BO1"),
      a: bySeed(pair[0]),
      b: bySeed(pair[1]),
      status: "READY",
    });
  });

  matches.push(sf1, sf2, fin);
  return matches;
}

function generateDoubleElim(teamsList: Team[]): Match[] {
  const bySeed = (s: number) => teamsList.find((x) => x.seed === s)?.id ?? teamsList[s - 1]?.id ?? null;
  const count = teamsList.length;

  if (count <= 4) {
    // 4-Team Double Elimination (Upper SF, Upper Final, Lower R1, Lower Final, Grand Final)
    const gf: Match = base("M-GF", "GRAND FINAL", 1, null, "GRAND_FINAL", "BO5");
    const uf: Match = base("M-UF", "UPPER FINAL", 1, ["M-GF", "a"], "UPPER", "BO3");
    const lf: Match = base("M-LF", "LOWER FINAL", 1, ["M-GF", "b"], "LOWER", "BO3");
    const lr1: Match = base("M-LR1", "LOWER ROUND 1", 1, ["M-LF", "a"], "LOWER", "BO1");

    const u_sf1: Match = {
      ...base("M-USF1", "UPPER SEMIFINAL 1", 1, ["M-UF", "a"], "UPPER", "BO1"),
      a: bySeed(1),
      b: bySeed(4) ?? bySeed(2),
      status: "READY",
    };
    const u_sf2: Match = {
      ...base("M-USF2", "UPPER SEMIFINAL 2", 2, ["M-UF", "b"], "UPPER", "BO1"),
      a: bySeed(2) ?? bySeed(3),
      b: bySeed(3) ?? bySeed(4),
      status: "READY",
    };
    return [u_sf1, u_sf2, u_sf1 && u_sf2 ? uf : uf, lr1, lf, gf];
  }

  // 8-Team Double Elimination
  const gf: Match = base("M-GF", "GRAND FINAL", 1, null, "GRAND_FINAL", "BO5");
  const uf: Match = base("M-UF", "UPPER FINAL", 1, ["M-GF", "a"], "UPPER", "BO3");
  const usf1: Match = base("M-USF1", "UPPER SEMIFINAL 1", 1, ["M-UF", "a"], "UPPER", "BO3");
  const usf2: Match = base("M-USF2", "UPPER SEMIFINAL 2", 2, ["M-UF", "b"], "UPPER", "BO3");

  const lf: Match = base("M-LF", "LOWER FINAL", 1, ["M-GF", "b"], "LOWER", "BO3");
  const lsf: Match = base("M-LSF", "LOWER SEMIFINAL", 1, ["M-LF", "b"], "LOWER", "BO3");
  const lr2_1: Match = base("M-LR2-1", "LOWER ROUND 2", 1, ["M-LSF", "a"], "LOWER", "BO1");
  const lr2_2: Match = base("M-LR2-2", "LOWER ROUND 2", 2, ["M-LSF", "b"], "LOWER", "BO1");
  const lr1_1: Match = base("M-LR1-1", "LOWER ROUND 1", 1, ["M-LR2-1", "a"], "LOWER", "BO1");
  const lr1_2: Match = base("M-LR1-2", "LOWER ROUND 1", 2, ["M-LR2-2", "a"], "LOWER", "BO1");

  const uqf: Match[] = SEED_PAIRS_8.map((pair, i) => ({
    ...base(`M-UQF${i + 1}`, "UPPER QUARTERFINAL", i + 1, [i < 2 ? "M-USF1" : "M-USF2", i % 2 === 0 ? "a" : "b"], "UPPER", "BO1"),
    a: bySeed(pair[0]),
    b: bySeed(pair[1]),
    status: "READY",
  }));

  return [...uqf, usf1, usf2, uf, lr1_1, lr1_2, lr2_1, lr2_2, lsf, lf, gf];
}

function generateRoundRobin(teamsList: Team[]): Match[] {
  const matches: Match[] = [];
  const n = teamsList.length;
  let idCounter = 1;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      matches.push({
        ...base(`M-RR${idCounter}`, `ROUND ROBIN · FIXTURE ${idCounter}`, idCounter, null, "GROUP", "BO1"),
        a: teamsList[i]?.id ?? null,
        b: teamsList[j]?.id ?? null,
        status: "READY",
        time: `MATCHDAY ${Math.floor((idCounter - 1) / (n / 2)) + 1}`,
      });
      idCounter++;
    }
  }
  return matches;
}

function generateSwiss(teamsList: Team[]): Match[] {
  const bySeed = (s: number) => teamsList.find((x) => x.seed === s)?.id ?? teamsList[s - 1]?.id ?? null;
  const n = teamsList.length;
  const matches: Match[] = [];

  // Round 1 (0-0 Record Pairings: 1vN, 2vN-1, etc.)
  for (let i = 0; i < Math.floor(n / 2); i++) {
    matches.push({
      ...base(`M-SW1-${i + 1}`, "SWISS ROUND 1 (0–0)", i + 1, null, "SWISS", "BO1"),
      a: bySeed(i + 1),
      b: bySeed(n - i),
      status: "READY",
    });
  }

  // Placeholder slots for subsequent rounds
  for (let r = 2; r <= 3; r++) {
    for (let i = 0; i < Math.floor(n / 2); i++) {
      matches.push({
        ...base(`M-SW${r}-${i + 1}`, `SWISS ROUND ${r}`, i + 1, null, "SWISS", "BO1"),
        a: null,
        b: null,
        status: "SCHEDULED",
      });
    }
  }
  return matches;
}

function generateGslGroups(teamsList: Team[]): Match[] {
  const bySeed = (s: number) => teamsList.find((x) => x.seed === s)?.id ?? teamsList[s - 1]?.id ?? null;
  const matches: Match[] = [];

  // Group A (Seeds 1, 4, 5, 8)
  matches.push({
    ...base("M-GA-O1", "GROUP A · OPENING 1", 1, ["M-GA-W", "a"], "GROUP", "BO1"),
    a: bySeed(1), b: bySeed(8) ?? bySeed(4), status: "READY",
  });
  matches.push({
    ...base("M-GA-O2", "GROUP A · OPENING 2", 2, ["M-GA-W", "b"], "GROUP", "BO1"),
    a: bySeed(4) ?? bySeed(2), b: bySeed(5) ?? bySeed(3), status: "READY",
  });
  matches.push(base("M-GA-W", "GROUP A · WINNERS MATCH", 3, null, "GROUP", "BO3"));
  matches.push(base("M-GA-E", "GROUP A · ELIMINATION MATCH", 4, ["M-GA-D", "b"], "GROUP", "BO3"));
  matches.push(base("M-GA-D", "GROUP A · DECIDER MATCH", 5, null, "GROUP", "BO3"));

  // Group B (Seeds 2, 3, 6, 7) if >= 6 teams
  if (teamsList.length >= 6) {
    matches.push({
      ...base("M-GB-O1", "GROUP B · OPENING 1", 6, ["M-GB-W", "a"], "GROUP", "BO1"),
      a: bySeed(2), b: bySeed(7) ?? bySeed(3), status: "READY",
    });
    matches.push({
      ...base("M-GB-O2", "GROUP B · OPENING 2", 7, ["M-GB-W", "b"], "GROUP", "BO1"),
      a: bySeed(3), b: bySeed(6) ?? bySeed(4), status: "READY",
    });
    matches.push(base("M-GB-W", "GROUP B · WINNERS MATCH", 8, null, "GROUP", "BO3"));
    matches.push(base("M-GB-E", "GROUP B · ELIMINATION MATCH", 9, ["M-GB-D", "b"], "GROUP", "BO3"));
    matches.push(base("M-GB-D", "GROUP B · DECIDER MATCH", 10, null, "GROUP", "BO3"));
  }

  // Playoffs (Semifinals + Finals)
  matches.push(base("M-SF1", "PLAYOFFS · SEMIFINAL 1", 11, ["M-F1", "a"], "UPPER", "BO3"));
  matches.push(base("M-SF2", "PLAYOFFS · SEMIFINAL 2", 12, ["M-F1", "b"], "UPPER", "BO3"));
  matches.push(base("M-F1", "PLAYOFFS · GRAND FINAL", 13, null, "GRAND_FINAL", "BO5"));

  return matches;
}

function base(
  id: string,
  round: string,
  slot: number,
  feeds: Match["feeds"],
  bracketType?: Match["bracketType"],
  format?: Match["format"],
): Match {
  return {
    id,
    round,
    slot,
    bracketType: bracketType || "UPPER",
    format: format || "BO1",
    status: "SCHEDULED",
    a: null,
    b: null,
    scoreA: null,
    scoreB: null,
    winner: null,
    feeds,
    server: "AUTO",
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
