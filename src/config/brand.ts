/**
 * Centralized brand configuration.
 *
 * The final commercial/trademark-safe name is NOT finalized. Never hardcode
 * brand strings in components — read them from here so the organization can
 * rename itself without restructuring the application.
 */
export const brand = {
  organizationName: "Vanta Nox Gaming",
  publicName: "PROJECT V1",
  shortName: "V1",
  codename: "VANTA",
  tagline: ["COMPETE.", "CONQUER.", "REPEAT."],
  metaTitle: "PROJECT V1 — Competitive Operations",
  metaDescription:
    "An esports operating platform. Registration, check-in, seeding, brackets and live match operations for competitive teams.",
  accentColor: "#d6ff2e",
  discordUrl: "#",
  socialLinks: {
    x: "#",
    instagram: "#",
    youtube: "#",
    twitch: "#",
  },
} as const;
