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
  round: "QUARTERFINAL" | "SEMIFINAL" | "FINAL";
  slot: number;
  status: MatchStatus;
  a: string | null;
  b: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: string | null;
  time?: string;
  server: string;
  note?: string;
};
