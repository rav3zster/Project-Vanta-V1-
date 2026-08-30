/**
 * Shared domain types for the tournament engine. All runtime data is fetched
 * from the backend (Supabase edge function + KV store) — there is no static
 * seed data in the client. The bracket is a VIEW of match state; winners are
 * derived from results, never stored as an independent source of truth.
 */

export type TournamentStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "ROSTER_LOCK"
  | "CHECK_IN_OPEN"
  | "CHECK_IN_CLOSED"
  | "SEEDING"
  | "BRACKET_LOCKED"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

export type TournamentFormatType =
  | "KNOCKOUT"       // Single Elimination Knockout
  | "DOUBLE_ELIM"    // Double Elimination (Upper + Lower Brackets)
  | "ROUND_ROBIN"    // League Table / Round Robin Groups
  | "SWISS"          // Swiss System Rounds (3W / 3L)
  | "GSL_GROUPS";    // GSL Dual-Tournament Groups into Playoffs

export type MatchStatus =
  | "SCHEDULED"
  | "READY"
  | "LIVE"
  | "COMPLETED"
  | "DISPUTED"
  | "FORFEIT";

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
  approved?: boolean;
  igl?: TeamMember;
  members?: TeamMember[];
  sub?: TeamMember;
  contactEmail?: string;
  registrationNotes?: string;
};

export type Match = {
  id: string;
  round: string; // "ROUND OF 16" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL" | "UPPER FINAL" | "LOWER R1" | "LOWER FINAL" | "GROUP A" | "SWISS R1" etc.
  bracketType?: "UPPER" | "LOWER" | "GRAND_FINAL" | "GROUP" | "SWISS";
  slot: number;
  status: MatchStatus;
  a: string | null;
  b: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: string | null;
  time?: string;
  format?: "BO1" | "BO3" | "BO5";
  server: string;
  note?: string;
  feeds?: [string, "a" | "b"] | null;
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
