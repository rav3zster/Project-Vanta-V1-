# PROJECT VANTA — MASTER PRODUCT + ENGINEERING BUILD PROMPT

You are the lead product architect, senior full-stack engineer, UX designer, and esports-platform engineer responsible for building a production-grade esports tournament platform from the ground up.

The product is an esports organization and tournament platform currently operating under the working identity:

* Organization name: **Vanta Nox Gaming**
* Primary public-facing display identity: **PROJECT V1**
* Working project identity: **PROJECT VANTA**
* Internal shorthand: **VANTA**

IMPORTANT BRAND RULE:
The final commercial/trademark-safe brand name has not been finalized. Do NOT hardcode the brand name into the application architecture. Put all brand strings, logo assets, metadata, page titles, social metadata, and organization settings into a centralized configuration layer so the organization can rename itself later without restructuring the application.

Use PROJECT V1 / PROJECT VANTA as the visual placeholder during development.

---

# 0. YOUR CORE MISSION

Do not build a generic gaming website.

Build an extensible esports operating platform whose first and most important capability is:

REGISTRATION → CHECK-IN → SEEDING → BRACKET → MATCHES → RESULTS → CHAMPION

The first production-ready vertical slice must support:

* 8 teams
* single-elimination tournament
* team registration
* registration approval
* roster validation
* roster lock
* check-in
* no-show handling
* forfeits
* seeding
* bracket generation
* match scheduling
* match room
* map selection / map veto abstraction
* result submission
* evidence submission
* dispute creation
* admin resolution
* automatic bracket progression
* live tournament status
* champion declaration
* notifications
* Discord integration hooks
* audit logs

Everything outside this vertical slice should be architected for future expansion but should not delay the first functional tournament.

DO NOT build 40+ disconnected pages before the first tournament works.

The application must feel complete, but development must remain vertical-slice driven.

---

# 1. PRODUCT PRINCIPLES

Follow these principles throughout the project:

1. Systems over isolated features.
2. Data model before UI abstractions.
3. Tournament state is the source of truth.
4. Bracket is a representation of tournament state, never the source of truth.
5. Authentication and authorization are separate.
6. Never hardcode GOD / DEMI-GOD / HUMAN permissions directly into components.
7. Use role + permission + scope.
8. Every important admin action must be auditable.
9. Never trust frontend authorization.
10. Database/server authorization must independently enforce permissions.
11. Do not hardcode Valorant-specific assumptions into the entire application.
12. Game, tournament format, map pool, roster rules, and scoring must be configurable.
13. All money-related functionality must be compliance-ready and configurable.
14. Do not assume legal eligibility of any particular tournament/payment model.
15. Do not implement prohibited betting/wagering mechanics.
16. Use feature flags for incomplete/future modules.
17. Make the architecture modular enough to add games and tournament formats later.
18. Prioritize performance over decorative effects.
19. Animation communicates state and hierarchy, not visual noise.
20. Mobile is a first-class platform.

---

# 2. TECHNOLOGY STACK

Use:

Frontend:

* Next.js
* TypeScript
* React
* App Router

Styling:

* Tailwind CSS
* CSS variables/design tokens
* shadcn/ui primitives where appropriate
* Custom PROJECT V1 visual system on top

Animation:

* Motion for React
* DO NOT use GSAP
* DO NOT use Framer Motion separately
* Use CSS transitions for trivial effects
* Use Motion for coordinated UI animation, layout transitions, page transitions, scroll-linked effects, bracket movement, modal transitions, and meaningful micro-interactions

Backend:

* Supabase

Database:

* PostgreSQL

Authentication:

* Supabase Auth

Storage:

* Supabase Storage

Realtime:

* Supabase Realtime

Server:

* Next.js Server Components
* Server Actions where appropriate
* Route Handlers where appropriate
* Supabase server client
* Supabase Edge Functions where they are the correct fit

Validation:

* Zod or equivalent strongly typed validation

Forms:

* React Hook Form + Zod where useful

Icons:

* Lucide React or another clean SVG icon system

Charts:

* Lightweight charting library only where analytics genuinely require it

Use the latest stable versions available in the development environment. Do not unnecessarily pin obsolete versions.

Follow current Supabase Next.js SSR/auth patterns rather than legacy client-only authentication patterns. Supabase currently documents separate browser/server clients and cookie-based server-side auth for Next.js.

---

# 3. REPOSITORY ARCHITECTURE

Create a clean architecture similar to:

/app
/(public)
/(auth)
/(dashboard)
/(control)

/components
/ui
/brand
/navigation
/tournaments
/matches
/brackets
/teams
/players
/notifications
/admin
/forms
/charts
/layout

/lib
/supabase
/auth
/rbac
/tournaments
/matches
/brackets
/notifications
/discord
/payments
/compliance
/audit
/validation
/utils

/types

/config

/hooks

/services

/supabase
/migrations
/seed
/functions

/public
/brand
/images
/icons
/fonts

Do not put database logic directly into presentational components.

Use service/domain layers for tournament operations.

---

# 4. SUPABASE-FIRST IMPLEMENTATION

Do NOT create a fake frontend database and later rebuild it.

Set up Supabase architecture before building major application screens.

Create:

* database schema
* migrations
* seed data
* RLS policies
* auth integration
* role/permission system
* audit system
* storage buckets
* realtime subscriptions
* server-side authorization utilities

The UI must consume typed domain data through real Supabase-backed services.

For local UI development, seed realistic development data rather than inventing an independent mock architecture.

Supabase should provide the foundation for:

* Postgres
* Auth
* Storage
* Realtime
* RLS

Supabase's current documentation specifically recommends RLS for data authorization and supports auth/session integration with Next.js.

---

# 5. DATABASE DOMAIN MODEL

Design a normalized relational model.

At minimum model:

## Identity

* profiles
* user_preferences
* user_roles
* roles
* permissions
* role_permissions
* user_permissions if explicitly needed for exceptional cases
* sessions / security metadata where appropriate

## Games

* games
* game_versions
* game_modes
* maps
* map_pools
* game_rules

## Teams

* teams
* team_members
* team_invitations
* team_roles
* team_socials
* team_achievements

## Players

* players
* player_profiles
* player_socials
* player_game_accounts
* player_statistics

## Tournaments

* tournaments
* tournament_settings
* tournament_rules
* tournament_stages
* tournament_rounds
* tournament_registrations
* tournament_registration_players
* tournament_seeding
* tournament_checkins
* tournament_prize_structures
* tournament_sponsors

## Matches

* matches
* match_participants
* match_maps
* match_map_vetoes
* match_scores
* match_events
* match_evidence
* match_submissions
* match_officials

## Brackets

* brackets
* bracket_nodes
* bracket_connections
* bracket_entries

But remember:

The bracket is a VIEW OF STATE.

The authoritative progression state lives in tournament stages, rounds, matches, participants, and results.

## Disputes / moderation

* disputes
* dispute_messages
* dispute_evidence
* dispute_decisions
* reports
* moderation_actions

## Notifications

* notifications
* notification_preferences
* global_alerts
* announcements
* announcement_targets

## Audit

* audit_logs
* security_events
* admin_actions

## Media

* media_assets
* media_links

## Financial/compliance-ready architecture

Even if actual money movement is disabled during initial deployment, structure:

* payment_orders
* payment_transactions
* payment_refunds
* registration_fees
* prize_funds
* prize_allocations
* payout_requests
* payouts
* payout_recipients
* tax_records
* verification_records

NEVER make prize pool automatically equal:

registration fee × participant count.

Prize funding must be a separate domain concept.

Do not implement wagering, betting, odds, pooled stakes, or any mechanic that turns player money into a competitive stake.

Keep financial/compliance behavior behind feature flags and configurable policies.

---

# 6. RBAC ARCHITECTURE

Do not hardcode:

if role === "god"

throughout the frontend.

Instead build:

USER
→ ROLE
→ PERMISSIONS
→ SCOPE
→ POLICY CHECK
→ ACTION
→ AUDIT

Initial roles:

## HUMAN

Normal user/player.

## DEMI_GOD

Tournament and operational administrator.

## GOD

Highest administrative authority.

Potential future roles:

* SUPER ADMIN
* TOURNAMENT ADMIN
* MATCH OFFICIAL
* MODERATOR
* CONTENT ADMIN
* COMMUNITY MANAGER
* ANALYST
* FINANCE ADMIN

Create granular permissions.

Examples:

users.view
users.edit
users.suspend
users.ban

teams.view
teams.create
teams.edit
teams.remove
teams.approve

tournaments.view
tournaments.create
tournaments.edit
tournaments.publish
tournaments.cancel
tournaments.archive

registrations.view
registrations.approve
registrations.reject

checkins.view
checkins.override

seeding.view
seeding.edit
seeding.lock

brackets.view
brackets.generate
brackets.edit
brackets.reset

matches.view
matches.create
matches.edit
matches.reschedule
matches.forfeit
matches.resolve

results.submit
results.approve
results.override

disputes.view
disputes.create
disputes.resolve

announcements.create
announcements.publish
announcements.archive

notifications.send

admins.view
admins.create
admins.remove

roles.view
roles.create
roles.edit
roles.delete

permissions.view
permissions.assign

audit.view

settings.view
settings.edit

financials.view
financials.manage

compliance.view
compliance.manage

GOD:

* full control subject to system safety constraints

DEMI_GOD:

* operational control
* cannot manage GOD accounts
* cannot alter core system ownership
* cannot alter protected infrastructure settings unless explicitly granted

HUMAN:

* normal player/community capabilities

The frontend should hide unavailable controls for UX, but the backend/database must enforce permissions independently.

Use Supabase RLS where appropriate.

---

# 7. VERTICAL SLICE — FIRST REAL TOURNAMENT

The first end-to-end tournament must support exactly:

8 teams
Single elimination
Best of 1 initially, architecture-ready for BO3/BO5
One game title
Registration
Team approval
Roster verification
Check-in
Seeding
Quarterfinals
Semifinals
Final
Champion

The first successful test should be:

Team 1–8 register
→ admin approves
→ roster locks
→ check-in opens
→ teams check in
→ admin/system seeds
→ bracket generated
→ quarterfinal matches created
→ match rooms become active
→ results submitted
→ disputes can be opened
→ admin resolves
→ bracket progresses
→ final completes
→ champion declared
→ results published
→ notifications sent
→ audit log populated

Do not consider the MVP complete until this path works using real Supabase data.

---

# 8. TOURNAMENT STATE MACHINE

Create explicit tournament states:

DRAFT
REGISTRATION_OPEN
REGISTRATION_CLOSED
ROSTER_LOCK
CHECK_IN_OPEN
CHECK_IN_CLOSED
SEEDING
BRACKET_LOCKED
LIVE
COMPLETED
CANCELLED
POSTPONED
ARCHIVED

Do not allow arbitrary status changes.

Define valid transitions.

For example:

DRAFT → REGISTRATION_OPEN
REGISTRATION_OPEN → REGISTRATION_CLOSED
REGISTRATION_CLOSED → ROSTER_LOCK
ROSTER_LOCK → CHECK_IN_OPEN
CHECK_IN_OPEN → CHECK_IN_CLOSED
CHECK_IN_CLOSED → SEEDING
SEEDING → BRACKET_LOCKED
BRACKET_LOCKED → LIVE
LIVE → COMPLETED

Administrative override actions must be permission-protected and audited.

---

# 9. REGISTRATION SYSTEM

Tournament registration must support:

* solo
* team
* configurable roster sizes
* substitutes
* captains
* eligibility rules
* game account verification
* registration deadlines
* registration status
* approval/rejection
* waitlist
* duplicate registration prevention
* roster validation
* roster lock

Registration state:

DRAFT
SUBMITTED
PENDING_REVIEW
APPROVED
REJECTED
WAITLISTED
CANCELLED
LOCKED

Admin must be able to see why an application was rejected.

---

# 10. CHECK-IN SYSTEM

This is mandatory.

Each tournament needs:

* check-in start
* check-in deadline
* timezone
* team check-in status
* player presence if needed
* captain check-in
* admin override
* automatic no-show marking

States:

NOT_OPEN
OPEN
CHECKED_IN
MISSED
OVERRIDDEN

Example:

Tournament check-in opens at 09:00
Closes at 09:30

If team fails to check in:
→ mark no-show
→ notify team
→ allow configured grace period if applicable
→ admin can override
→ bracket/seeding engine accounts for eligible teams only

Never make check-in a cosmetic UI feature.

---

# 11. NO-SHOW / FORFEIT SYSTEM

Every match must support:

SCHEDULED
CHECK_IN
READY
LIVE
COMPLETED
FORFEIT
DISPUTED
RESCHEDULE_REQUESTED
POSTPONED
CANCELLED

A no-show must be recorded as an event.

Never simply change the score to 0–1 without recording why.

Store:

* who declared forfeit
* timestamp
* reason
* evidence
* official/admin
* affected team
* resulting bracket action

---

# 12. RESCHEDULE SYSTEM

Support:

* team request
* opponent approval
* admin approval
* proposed times
* deadline
* reason
* SLA
* final decision

A reschedule must never silently overwrite the original schedule.

Store an immutable history.

---

# 13. SEEDING SYSTEM

Create configurable seeding methods:

* random
* manual
* ranked
* ELO
* previous results
* regional
* custom weighted

Initial MVP:

* manual
* random

But architecture must support additional strategies.

Seeding becomes LOCKED after bracket generation unless a privileged admin performs a controlled reseed action.

Any reseed must:

* require permission
* create audit event
* invalidate/rebuild dependent bracket state safely
* never destroy historical records

---

# 14. BRACKET ENGINE

Support a generic bracket engine.

Initial implementation:
Single elimination.

Future:

* double elimination
* round robin
* Swiss
* groups → playoffs
* ladder
* custom stages

Bracket nodes should reference matches, not contain independent truth.

When a match result is finalized:

1. Validate result.
2. Determine winner/loser.
3. Advance participant.
4. Update dependent match.
5. update bracket projection.
6. notify affected teams.
7. write audit event.

Do not manually mutate visual bracket positions from the frontend.

---

# 15. MAP VETO / MAP PICK

For supported games, match configuration should be able to define:

* map pool
* veto order
* pick order
* side selection
* maps banned
* maps selected
* timeout
* admin override

Initial MVP can keep it simple, but model the data generically.

---

# 16. ROSTER LOCK

Tournament-specific roster lock.

After lock:

* no player additions
* no substitutions unless rules explicitly permit
* admin override only
* override requires reason
* every change audited

Support:

main roster
substitutes
coach
analyst
manager

---

# 17. MATCH ROOM

Create a dedicated match room.

Show:

MATCH ID
TOURNAMENT
ROUND
TEAMS
START TIME
STATUS
SERVER / REGION
RULESET

Actions:

READY
CHECK IN
MAP VETO
SUBMIT RESULT
UPLOAD EVIDENCE
REQUEST RESCHEDULE
OPEN DISPUTE
REPORT ISSUE

Future:

* Discord room
* automated room creation
* match voice channel
* stream
* VOD
* game server link

---

# 18. MATCH RESULT FLOW

Do not allow arbitrary score submission.

Workflow:

Team A submits
→ Team B confirms

OR

Both submit
→ compare
→ if matching → finalize

If mismatch:
→ disputed
→ evidence review
→ admin resolution

Admin resolution must record:

* decision
* reason
* evidence
* official/admin
* timestamp

---

# 19. DISPUTE ENGINE

Create a real dispute workflow.

Each dispute includes:

* match
* creator
* category
* description
* evidence
* opposing team
* timestamps
* assigned moderator
* SLA deadline
* status
* decision
* resolution

Statuses:

OPEN
UNDER_REVIEW
WAITING_FOR_EVIDENCE
RESOLVED
REJECTED
ESCALATED

Support evidence:

* screenshots
* clips
* VOD links
* files
* chat records

Never delete evidence from an audit perspective.

Use immutable or append-only event history where practical.

---

# 20. ANTI-SMURF / ACCOUNT INTEGRITY ARCHITECTURE

Do not promise perfect anti-smurf detection.

Instead build an integrity framework that can later integrate:

* game account IDs
* Discord identity
* device/session signals where legally and technically appropriate
* duplicate account signals
* suspicious registration patterns
* IP/device metadata where justified
* manual verification
* admin flags

Create:

risk score
flag type
review status
evidence
admin decision

Do not automatically ban someone based solely on an unverified heuristic.

---

# 21. DISCORD-FIRST INTEGRATION

Discord is not a later notification add-on.

Design Discord integration as a first-class tournament channel.

Initial architecture:

/integrations/discord

Support:

* bot authentication
* guild configuration
* tournament category
* tournament channels
* match rooms
* team roles where appropriate
* check-in reminders
* match reminders
* result notifications
* announcement publishing
* admin alerts

Example:

Tournament created
→ Discord category created

Match created
→ Match room created

Team approved
→ role assigned if configured

Check-in opens
→ bot sends notification

Match starts soon
→ bot sends reminder

Result finalized
→ bot publishes result

Keep Discord integration modular so it can be replaced/extended later.

---

# 22. NOTIFICATION ENGINE

Create a unified event-driven notification system.

Events:

TOURNAMENT_CREATED
REGISTRATION_OPEN
REGISTRATION_APPROVED
REGISTRATION_REJECTED
ROSTER_LOCKED
CHECKIN_OPEN
CHECKIN_REMINDER
CHECKIN_MISSED
MATCH_UPCOMING
MATCH_LIVE
MATCH_RESULT_SUBMITTED
MATCH_RESULT_CONFIRMED
MATCH_DISPUTED
MATCH_RESCHEDULED
TOURNAMENT_COMPLETED
PRIZE_PENDING
PRIZE_READY
ANNOUNCEMENT_PUBLISHED
ADMIN_ACTION_REQUIRED

Channels:

IN_APP
EMAIL
DISCORD
PUSH — future

Use user notification preferences.

---

# 23. GLOBAL ALERT SYSTEM

Separate:

NOTIFICATION
ANNOUNCEMENT
GLOBAL ALERT

Global alert supports:

* title
* message
* severity
* start time
* end time
* target audience
* tournament
* game
* region

Severity:

INFO
SUCCESS
WARNING
CRITICAL

---

# 24. PUBLIC WEBSITE

Build a premium public esports experience.

Routes:

/
/tournaments
/tournaments/[slug]
/tournaments/[slug]/bracket
/tournaments/[slug]/matches
/matches
/matches/[id]
/teams
/teams/[slug]
/players
/players/[username]
/roster
/news
/news/[slug]
/about
/rules
/sponsors
/contact

Auth:

/login
/signup
/forgot-password

User:

/dashboard
/profile
/settings
/my-tournaments
/my-matches
/my-teams
/notifications

Admin:

/control
/control/tournaments
/control/tournaments/new
/control/tournaments/[id]
/control/registrations
/control/checkins
/control/seeding
/control/brackets
/control/matches
/control/teams
/control/players
/control/users
/control/disputes
/control/announcements
/control/notifications
/control/discord
/control/admins
/control/roles
/control/permissions
/control/audit
/control/analytics
/control/settings

---

# 25. HOMEPAGE

The homepage should feel like a premium esports organization rather than a tournament template.

Visual direction:

luxury tech
competitive esports
classified operation
minimal
high contrast
editorial
precise
intelligent

Avoid:

RGB gamer aesthetics
overuse of neon
excessive gradients
random particles
giant rounded cards
visual clutter
cheap cyberpunk clichés

Suggested hero:

PROJECT
V1

COMPETE.
CONQUER.
REPEAT.

[VIEW TOURNAMENTS]
[ENTER PROJECT]

Sections:

LIVE NOW
UPCOMING TOURNAMENTS
LATEST RESULTS
OUR ROSTER
LATEST ANNOUNCEMENTS
NEWS
SPONSORS
DISCORD / COMMUNITY
FOOTER

---

# 26. NO HEAVY INTRO ANIMATION

Do not force a 1–2 second cinematic intro on every page load.

Do not block LCP waiting for animation.

Preferred:

first visit:
subtle logo reveal if performance budget allows

return visit:
no intro

Use session/local state or an equivalent mechanism to avoid repeated cinematic loading.

Primary content must render immediately.

Use Motion for subtle entrance and scroll animation. Motion is designed for React animation, layout, gestures, scroll and transitions.

---

# 27. TOURNAMENT LISTING PAGE

Each card should show:

tournament
game
format
prize pool
slots
teams registered
registration status
registration deadline
start date
region
platform

Filters:

game
status
format
date
region
platform
prize range

Search instantly.

Statuses:

UPCOMING
REGISTRATION OPEN
REGISTRATION CLOSED
CHECK-IN
LIVE
COMPLETED
CANCELLED
POSTPONED

---

# 28. TOURNAMENT DETAILS

Tabs:

OVERVIEW
SCHEDULE
BRACKET
MATCHES
TEAMS
RULES
RESULTS

Header:

PROJECT V1
TOURNAMENT NAME

PRIZE POOL
TEAMS
FORMAT
REGION
PLATFORM

Overview:

* description
* eligibility
* dates
* organizer
* server
* platform
* rules
* registration

Schedule:
registration
check-in
stages
playoffs
final

Bracket:
dynamic visualization from actual tournament state

Matches:
sortable/filterable

Results:
historical results

---

# 29. TEAM SYSTEM

Team page:

logo
name
game
region
roster
captain
coach
achievements
tournament history
results
social links

Team management:

invite
remove
promote captain
edit roster
submit registration
check in
manage team profile

---

# 30. PLAYER SYSTEM

Player profile:

avatar
username
real name — optional
game
region
role
team
statistics
achievements
tournament history
socials

Future-ready for:

ELO
rank
leaderboards
performance history
season stats

---

# 31. USER DASHBOARD

Dashboard should immediately tell the user:

UPCOMING MATCHES
REGISTERED TOURNAMENTS
MY TEAMS
NOTIFICATIONS
RECENT RESULTS

Example:

WELCOME BACK

2 UPCOMING MATCHES
4 REGISTERED TOURNAMENTS
12 RESULTS
3 NOTIFICATIONS

---

# 32. AUTHENTICATION

User login:

Email
Password
Forgot password
Google OAuth where configured

Admin access:

Dedicated /control authentication entry point.

Never expose an “admin checkbox” during login.

A user logs in as an authenticated identity.

The system determines permissions from database state.

Use secure SSR-aware Supabase auth patterns appropriate for Next.js.

---

# 33. ADMIN CONTROL CENTER

The admin dashboard should feel like an operations command center.

Top metrics:

ACTIVE TOURNAMENTS
LIVE MATCHES
REGISTERED TEAMS
ACTIVE PLAYERS
PENDING REGISTRATIONS
OPEN DISPUTES
CHECK-IN ALERTS

Live activity feed:

time
actor
action
entity
status

Quick actions:

CREATE TOURNAMENT
MANAGE CHECK-IN
VIEW DISPUTES
CREATE ANNOUNCEMENT
SCHEDULE MATCH
MANAGE TEAMS

---

# 34. TOURNAMENT CREATOR

Use a wizard.

Step 01:
Basic information

Step 02:
Game

Step 03:
Tournament format

Step 04:
Registration

Step 05:
Eligibility

Step 06:
Roster rules

Step 07:
Check-in rules

Step 08:
Schedule

Step 09:
Prize configuration

Step 10:
Rules

Step 11:
Seeding

Step 12:
Bracket

Step 13:
Discord

Step 14:
Review

Step 15:
Publish

Do not create an enormous single-page form.

Allow draft save at every step.

---

# 35. TOURNAMENT ECONOMICS

Model independently:

Registration fee
Fee type
Prize pool
Prize funding source
Prize distribution
Sponsor contribution
Organizer contribution
Administrative costs

Possible states:

PRIZE_TBA
PRIZE_ANNOUNCED
PRIZE_LOCKED
PAYOUT_PENDING
PAYOUT_COMPLETED

Never derive prize pool automatically from entry fees.

Do not implement gambling or wagering.

Money-related flows must be feature-flagged and compliance-reviewed before production activation.

The Indian regulatory environment currently has a formal statutory/regulatory framework around online gaming and recognition/registration of qualifying e-sports, so do not encode legal assumptions directly into business logic. Keep compliance policy configurable and require human legal review before enabling any paid competition flow.

---

# 36. PRIZE / PAYOUT ARCHITECTURE

Even before full payments are enabled, create the data model.

Prize allocation:

1st
2nd
3rd
MVP / special awards if applicable

Payout status:

PENDING_VERIFICATION
READY
PROCESSING
PAID
FAILED
HELD
CANCELLED

Recipients should have a secure compliance profile.

Do not store sensitive information casually.

Build placeholders for:

PAN status
verification status
tax status
payout method
payout history
tax documents

Do not hardcode tax rates or legal assumptions into UI. Make them configurable and governed by current law and professional advice.

---

# 37. ADMIN PERMISSION MANAGEMENT

GOD can see:

ADMIN MANAGEMENT
ROLES
PERMISSIONS
AUDIT

Admin detail:

name
role
status
last active
permissions

Permission matrix:

VIEW
CREATE
EDIT
DELETE
PUBLISH
APPROVE
RESOLVE
OVERRIDE

Add support for custom roles.

---

# 38. AUDIT LOG

Every sensitive mutation must generate an audit event.

Store:

actor
action
entity
entity_id
timestamp
request/session metadata where appropriate
before state
after state
reason
source
severity

Examples:

GOD changed role assignment
DEMI_GOD approved team
ADMIN rescheduled match
ADMIN declared forfeit
ADMIN resolved dispute
GOD changed permission

Audit logs should be append-only from the normal application layer.

Never allow normal admins to silently delete audit history.

---

# 39. SUPPORT / IMPERSONATION

Future-ready support mode.

Rules:

explicit action
time-limited
visible banner
audited
restricted by permission

Never silently impersonate a user.

---

# 40. SEARCH

Global search:

TOURNAMENTS
MATCHES
TEAMS
PLAYERS
NEWS

Architecture should permit future:

EVENTS
MEDIA
SPONSORS
CLIPS
ORGANIZATIONS

---

# 41. THEME SYSTEM

Support:

DARK
LIGHT
SYSTEM

Build using design tokens.

Tokens:

background
foreground
surface
surface-secondary
surface-hover
surface-active
border
border-strong
accent
accent-foreground
success
warning
danger
info
muted

radius
spacing
font
shadow
motion

Never hardcode colors repeatedly inside components.

---

# 42. BRAND SYSTEM

Create centralized:

brand.config.ts

containing:

organizationName
publicName
shortName
logo
wordmark
favicon
accentColor
metaTitle
metaDescription
socialLinks
discordUrl

Changing the organization name must not require a rewrite.

This is especially important because the working “Vanta” brand is not yet legally/commercially cleared.

---

# 43. DESIGN DIRECTION

Visual personality:

minimal
premium
technical
dark
editorial
competitive
controlled
modern

Think:

luxury technology
fashion campaign
competitive broadcast
operations dashboard

Not:

generic gaming SaaS
neon cyberpunk
cartoon esports
overdone glassmorphism

Use:

* thin borders
* restrained cards
* strong typography
* monochrome base
* single accent
* grid
* whitespace
* subtle grain
* precise status indicators

---

# 44. TYPOGRAPHY

Use one strong display family and one UI/body family.

Display:
bold geometric / condensed / editorial

Body:
highly readable modern sans-serif

Create typographic tokens:

display-xl
display-lg
heading-xl
heading-lg
heading-md
body-lg
body-md
body-sm
caption
label
mono

Use monospaced typography selectively for:

* match IDs
* tournament IDs
* timestamps
* system data
* admin metadata

---

# 45. MOTION SYSTEM

Use Motion only.

Create reusable motion primitives:

PageFade
PageSlide
StaggerChildren
CardHover
ModalEnter
ModalExit
ToastEnter
NumberReveal
StatusPulse
BracketTransition
TabIndicator
ScrollReveal

Do not animate everything.

Respect prefers-reduced-motion.

Avoid long blocking animations.

No animation should prevent interaction.

---

# 46. RESPONSIVE SYSTEM

Support:

mobile
tablet
desktop
ultrawide

Important responsive surfaces:

bracket
admin tables
match room
tournament details
dashboards

On mobile:

* bracket can horizontally scroll
* tables can become cards
* admin sidebar can become drawer
* match room must remain functional
* key actions remain thumb accessible

---

# 47. COMPONENT SYSTEM

Create reusable domain components:

TournamentCard
TournamentStatus
TournamentHeader
TournamentStats
TournamentTimeline
TournamentRules
TournamentBracket
BracketMatch
MatchCard
MatchScore
MatchStatus
MatchRoom
MapVeto
TeamCard
PlayerCard
RosterCard
NotificationItem
AnnouncementBanner
AdminTable
PermissionMatrix
AuditLog
DisputePanel
CheckinStatus
SeedEditor
PrizeTable

Do not duplicate these across pages.

---

# 48. LOADING / EMPTY / ERROR STATES

Every feature must support:

LOADING
EMPTY
ERROR
SUCCESS
OFFLINE
PERMISSION_DENIED

Brand these states.

Example:

NO ACTIVE OPERATIONS

There are currently no open tournaments.

[VIEW ARCHIVED EVENTS]

---

# 49. ADMIN ERROR HANDLING

Never silently fail.

Show:

what happened
what action failed
whether data was changed
what the admin can do next

For destructive actions:
require confirmation.

For sensitive actions:
require explicit reason where appropriate.

For irreversible actions:
strong confirmation.

---

# 50. SECURITY

Implement:

server-side authorization
RLS
input validation
rate limiting
secure auth
secure cookies/session handling
protected routes
secure uploads
file validation
database constraints
audit logging
safe destructive actions
soft deletion where appropriate
least privilege

Never rely on UI hiding buttons for security.

Use Supabase Auth and RLS correctly. Supabase's Auth tokens can be used with RLS to scope database access at row level.

---

# 51. STORAGE

Create appropriate storage buckets:

avatars
team-logos
tournament-banners
evidence
media
documents

Apply access policies.

Evidence should not become publicly accessible by default.

Sensitive uploads should be private.

Use signed URLs where appropriate.

---

# 52. REALTIME

Use Realtime selectively for:

live match status
bracket progression
check-in state
registration count
notifications
admin activity
dispute updates where appropriate

Do not subscribe every page to everything.

Scope subscriptions narrowly.

Supabase currently supports database change subscriptions and realtime channels, with authorization policies available for private channels.

---

# 53. PERFORMANCE

Performance is a product requirement.

Targets:

fast first contentful rendering
minimal client JavaScript
server-render public content where appropriate
image optimization
lazy loading
code splitting
avoid huge dependencies
avoid unnecessary subscriptions

The homepage must remain usable even on mediocre mobile networks.

Do not make hero animation block critical rendering.

---

# 54. SEO

Public pages should be SEO-ready:

metadata
Open Graph
Twitter/X card metadata
canonical URLs
structured data where applicable
sitemap
robots.txt
clean slugs
dynamic metadata

Each tournament should have a crawlable public URL.

Each team and player should have a crawlable public profile where public visibility is enabled.

---

# 55. ACCESSIBILITY

Follow WCAG-oriented practices.

Keyboard navigation
focus states
semantic HTML
ARIA where needed
contrast
reduced motion
screen reader labels
form errors
accessible modals
accessible tables

Do not use color as the only status indicator.

---

# 56. ANALYTICS

Architecture should support future analytics.

Admin analytics:

tournament registrations
conversion rate
check-in rate
no-show rate
match completion rate
dispute rate
reschedule rate
player activity
team retention
tournament participation
notification engagement

Keep analytics modular.

---

# 57. FEATURE FLAGS

Build a feature flag system.

Possible flags:

payments_enabled
paid_tournaments_enabled
discord_enabled
leaderboards_enabled
rankings_enabled
player_stats_enabled
community_enabled
media_enabled
store_enabled
advanced_brackets_enabled

When a feature is disabled:

* hide UI
* prevent routes where appropriate
* prevent server actions
* preserve underlying architecture

---

# 58. FUTURE MODULES

Architecture must permit:

rankings
ELO
leaderboards
seasons
clubs
scrims
community
following
friends
news
video
highlights
clips
stream embeds
sponsors
merchandise
memberships
tickets
mobile app
Discord automation
Telegram
email
push notifications
advanced tournament formats
anti-cheat integrations
game APIs
player analytics

Do not build these now unless they are needed to make the vertical slice work.

---

# 59. SEPARATION OF CONCERNS

Keep these separate:

identity
authorization
teams
players
tournaments
matches
brackets
notifications
content
payments
compliance
analytics
integrations

Do not create one giant service or one giant table.

---

# 60. DOMAIN EVENTS

Architect around important events.

Examples:

tournament.created
registration.submitted
registration.approved
registration.rejected
checkin.opened
team.checked_in
team.missed_checkin
seed.locked
bracket.generated
match.created
match.live
result.submitted
result.confirmed
match.disputed
match.resolved
match.rescheduled
match.forfeited
tournament.completed

These events can later drive:

notifications
Discord
analytics
audit logs
emails
webhooks

---

# 61. TESTING

Create tests for:

RBAC
RLS
tournament state transitions
registration rules
check-in
roster locks
seeding
bracket generation
result progression
forfeit logic
dispute workflow
permissions
audit logs

Critical tournament engine logic should have unit tests.

The 8-team tournament should have an integration/e2e test that verifies:

registration
approval
check-in
bracket
match result
progression
final
champion

---

# 62. ADMIN UX PRINCIPLES

Admin interfaces must prioritize:

clarity
speed
safe mutation
auditability
bulk actions
search
filters
keyboard efficiency
status visibility

Avoid turning admin screens into decorative dashboards.

Operators should be able to solve real tournament problems quickly.

---

# 63. ADMIN TABLE FEATURES

Reusable admin tables should support:

search
sorting
filters
pagination
column visibility
bulk actions
row actions
status chips
selection
export hooks
empty states

Use reusable table abstractions.

---

# 64. TOURNAMENT OPERATIONS DASHBOARD

Admin tournament page should show:

CURRENT STATUS
CURRENT STAGE
NEXT MATCH
CHECK-IN STATE
REGISTERED TEAMS
APPROVED TEAMS
MISSING TEAMS
OPEN DISPUTES
RESCHEDULE REQUESTS
RECENT EVENTS
DISCORD STATUS

Quick actions:

OPEN CHECK-IN
CLOSE CHECK-IN
GENERATE SEED
LOCK SEED
GENERATE BRACKET
START ROUND
DECLARE FORFEIT
RESCHEDULE
PUBLISH ANNOUNCEMENT

Every sensitive action requires permission.

---

# 65. FIRST DEMO DATA

Seed the database with:

1 game
8 realistic teams
40+ players
1 tournament
4 quarterfinals
2 semifinals
1 final
sample disputes
sample announcements
sample notifications
sample admin accounts
GOD
DEMI_GOD
HUMAN

Use fictional names.

Do not use real people's personal information.

Make the demo tournament playable through the UI.

---

# 66. ADMIN DEMO ACCOUNT

For development only, document how to create:

GOD
DEMI_GOD
HUMAN

Do not hardcode production credentials.

Use environment configuration / secure seed tooling.

---

# 67. ENVIRONMENT VARIABLES

Provide:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY

and any future integration secrets using environment variables.

Never expose service-role credentials to the client.

Never commit secrets.

---

# 68. DOCUMENTATION

Create:

README.md

docs/ARCHITECTURE.md
docs/DATABASE.md
docs/RBAC.md
docs/TOURNAMENT_ENGINE.md
docs/DEPLOYMENT.md
docs/DISCORD.md
docs/SECURITY.md

Document:

database relationships
RLS approach
role hierarchy
permission model
tournament state machine
bracket model
event architecture
environment setup
seed process

---

# 69. DEVELOPMENT PHASES

Do NOT treat phases as disconnected rewrites.

### PHASE 0

Project setup

* repository
* Next.js
* TypeScript
* Tailwind
* shadcn
* Motion
* Supabase
* environment
* architecture
* linting
* formatting
* testing

### PHASE 1

Database + Auth + RBAC

* schema
* migrations
* seed
* Auth
* profiles
* roles
* permissions
* RLS
* audit

### PHASE 2

Tournament engine

* tournament
* registration
* roster
* check-in
* seeding
* bracket
* match
* result
* forfeit
* reschedule
* dispute

### PHASE 3

First complete tournament

8 teams
single elimination
live end-to-end tournament

### PHASE 4

Public website

homepage
tournaments
match pages
brackets
teams
players
news

### PHASE 5

User dashboard

profiles
teams
registrations
matches
notifications

### PHASE 6

Admin control center

operations
registrations
check-in
seeding
matches
disputes
announcements
users

### PHASE 7

Discord

bot
check-in
match rooms
notifications
announcements

### PHASE 8

Financial/compliance-ready infrastructure

fee configuration
prize configuration
payout entities
verification entities
reporting

Keep payment activation behind feature flags until legally reviewed.

### PHASE 9

Growth

rankings
seasons
ELO
statistics
media
community
sponsors
store

---

# 70. WHAT NOT TO DO

DO NOT:

* create fake backend architecture that will later be thrown away
* hardcode the bracket
* hardcode Valorant everywhere
* hardcode roles into components
* trust frontend permission checks
* make entry fee automatically determine prize pool
* implement wagering
* bury audit logs
* make check-in cosmetic
* overwrite match history
* silently change schedules
* automatically ban based on weak anti-smurf heuristics
* build unnecessary futuristic modules before the first tournament works
* introduce multiple animation frameworks
* block LCP with cinematic intro
* create giant generic dashboards
* use excessive gradients
* make every UI element glow
* duplicate components between pages

---

# 71. DEFINITION OF DONE

The MVP is DONE only when:

A human can:

create account
create/join team
register team
see tournament
see registration state
check in
enter match
submit result
see bracket progression
receive notifications
see champion

A DEMI_GOD can:

create tournament
approve registration
manage roster
open/close check-in
seed teams
generate bracket
schedule match
reschedule
declare forfeit
review evidence
resolve dispute
publish announcements
manage teams

A GOD can:

do everything
manage admins
manage roles
manage permissions
view audit history
manage protected system settings

The system must:

persist data in Supabase
enforce RLS
enforce server authorization
generate audit records
support realtime updates
work on mobile
support dark/light/system theme
have accessible forms
handle loading/error/empty states
pass critical tournament tests

Most importantly:

RUN ONE REAL 8-TEAM TOURNAMENT END TO END.

That is the milestone that matters.

---

# 72. DELIVERY REQUIREMENT

Do not just generate pages.

Before considering a feature complete, verify:

1. Data model exists.
2. Server/service logic exists.
3. Authorization exists.
4. RLS exists where appropriate.
5. UI exists.
6. Loading/empty/error states exist.
7. Audit behavior exists where necessary.
8. Realtime behavior exists where necessary.
9. Tests exist for critical logic.
10. Mobile layout works.

When making architectural decisions, prefer the solution that minimizes future rewrites.

When a requirement is ambiguous, make the most scalable reasonable assumption and document it instead of stopping implementation.

Do not repeatedly ask for confirmation for minor implementation decisions.

---

# 73. FINAL PRODUCT FEEL

The finished product should feel like:

A legitimate esports organization
+
A tournament operating system
+
A premium technology brand

It should feel credible enough that:

* a player wants to create an account
* a team wants to register
* an organizer wants to run an event
* a sponsor wants to associate with it
* an admin can operate a live tournament without spreadsheets
* the system can grow from 8 teams to thousands without architectural collapse

The product should be:

FAST
PRECISE
MINIMAL
COMPETITIVE
PREMIUM
OPERATIONAL
SCALABLE

Do not optimize for the number of screens.

Optimize for the quality of the tournament lifecycle.

START BY:

1. inspecting the repository,
2. establishing the architecture,
3. configuring Supabase,
4. writing the first migrations,
5. creating the RBAC/RLS foundation,
6. creating the tournament domain model,
7. seeding the 8-team tournament,
8. implementing the tournament engine,
9. then building the UI directly against the real data,
10. and finally testing the full tournament lifecycle.
