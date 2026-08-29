// Role-based access control. Permissions live server-side and are the ONLY
// authority for mutations — the frontend never decides authorization.

export type Role = "GOD" | "DEMI_GOD" | "HUMAN";

export type Permission =
  | "tournaments.manage"
  | "registrations.approve"
  | "checkins.manage"
  | "seeding.manage"
  | "brackets.generate"
  | "matches.resolve"
  | "results.submit"
  | "disputes.resolve"
  | "disputes.create"
  | "announcements.publish"
  | "roster.manage"
  | "admins.manage"
  | "roles.manage"
  | "audit.view"
  | "seed.run";

const DEMI_GOD_PERMS: Permission[] = [
  "tournaments.manage",
  "registrations.approve",
  "checkins.manage",
  "seeding.manage",
  "brackets.generate",
  "matches.resolve",
  "disputes.resolve",
  "announcements.publish",
  "roster.manage",
  "audit.view",
  "results.submit",
  "disputes.create",
  "seed.run",
];

const HUMAN_PERMS: Permission[] = ["results.submit", "disputes.create"];

// GOD implicitly holds every permission.
export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "GOD") return true;
  if (role === "DEMI_GOD") return DEMI_GOD_PERMS.includes(permission);
  return HUMAN_PERMS.includes(permission);
}

export function permissionsFor(role: Role): Permission[] {
  if (role === "GOD") {
    return [
      "tournaments.manage", "registrations.approve", "checkins.manage",
      "seeding.manage", "brackets.generate", "matches.resolve", "results.submit",
      "disputes.resolve", "disputes.create", "announcements.publish",
      "roster.manage", "admins.manage", "roles.manage", "audit.view", "seed.run",
    ];
  }
  if (role === "DEMI_GOD") return DEMI_GOD_PERMS;
  return HUMAN_PERMS;
}
