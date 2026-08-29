# PROJECT V1 / PROJECT VANTA — FULL-STACK BUILD MASTER PROMPT

You are the lead product architect, senior full-stack engineer, database architect, UI/UX designer, and esports tournament-platform engineer.

Your task is to **FULLY BUILD the PROJECT V1 esports platform**, not merely create a visual prototype.

The application must have:

* a complete public website
* functioning authentication
* functioning user signup/login/logout
* functioning protected user dashboard
* functioning admin authentication
* functioning admin dashboard
* Supabase/PostgreSQL backend
* real database persistence
* RBAC
* RLS
* tournament management
* team/player management
* registration
* check-in
* seeding
* bracket generation
* match management
* match results
* disputes
* notifications
* announcements
* audit logging
* Discord integration architecture
* responsive UI
* dark/light/system theme
* production-quality error/loading/empty states

Do not build fake functionality where a real Supabase implementation is possible.

Do not create a separate mock backend that will later be thrown away.

The finished development environment must run as a real application against Supabase.

---

# 1. PROJECT IDENTITY

Working organization:

**Vanta Nox Gaming**

Working public identity:

**PROJECT V1**

Working project/design identity:

**PROJECT VANTA**

Short form:

**VANTA**

IMPORTANT:

The final commercial brand name is not yet legally/commercially finalized.

Therefore:

* do not hardcode "Vanta" throughout the application
* create a central brand configuration
* make all branding replaceable
* use PROJECT V1 / PROJECT VANTA for the current implementation

Create something similar to:

```ts
export const brand = {
  organizationName: "Vanta Nox Gaming",
  publicName: "PROJECT V1",
  projectName: "PROJECT VANTA",
  shortName: "VANTA",
  tagline: "Compete. Conquer. Repeat.",
}
```

Every reusable branded location must reference configuration rather than hardcoded strings.

---

# 2. NON-NEGOTIABLE DEVELOPMENT APPROACH

Do not work page-by-page without establishing the underlying system.

Build in this order:

1. inspect repository
2. establish application architecture
3. configure Supabase
4. create database migrations
5. create schema
6. create RLS policies
7. create authentication
8. create RBAC
9. create domain services
10. seed development data
11. implement tournament engine
12. implement public UI
13. implement user UI
14. implement admin UI
15. implement realtime
16. implement Discord integration foundation
17. test end-to-end tournament lifecycle
18. document Supabase setup and SQL

The first milestone is a complete playable 8-team tournament.

Do not spend excessive time building speculative features before the first tournament lifecycle works.

---

# 3. TECHNOLOGY STACK

Use:

Frontend:

* Next.js
* React
* TypeScript
* App Router

Styling:

* Tailwind CSS
* CSS variables
* shadcn/ui primitives where useful
* custom Vanta design system

Animation:

* Motion only

Do not install GSAP.

Do not install another animation framework when Motion already handles the requirement.

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

Validation:

* Zod

Forms:

* React Hook Form where useful

Icons:

* Lucide

Testing:

* Vitest or equivalent for unit tests
* Playwright or equivalent for end-to-end tests

Use current stable versions available in the project environment.

---

# 4. SUPABASE REQUIREMENT

SUPABASE IS NOT OPTIONAL.

This must be a real Supabase-backed application.

Create the project architecture assuming:

```text
Next.js
   ↓
Supabase SSR/Auth
   ↓
PostgreSQL
   ↓
RLS
```

and:

```text
Supabase Storage
Supabase Realtime
Supabase Auth
Supabase Edge Functions
```

where appropriate.

Do not use local JSON files as the permanent source of truth.

Do not use browser localStorage as the source of truth for users, tournaments, teams, permissions, matches, or results.

localStorage may only be used for harmless UI preferences such as theme or dismissible presentation state.

---

# 5. SUPABASE SETUP DOCUMENTATION

You MUST create a complete setup guide for me.

Create:

```text
docs/SUPABASE_SETUP.md
```

It must explain step-by-step:

1. create Supabase account
2. create new Supabase project
3. choose project name
4. choose region
5. retrieve project URL
6. retrieve publishable key
7. configure local `.env.local`
8. configure authentication
9. configure Google OAuth if implemented
10. create database schema
11. run migrations
12. create storage buckets
13. configure storage policies
14. enable required realtime tables
15. configure redirect URLs
16. configure production URLs
17. create development seed data
18. create GOD admin safely
19. verify RLS
20. test authentication
21. test database connection

Clearly state which values I need to copy from the Supabase dashboard.

---

# 6. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

with all required variables.

At minimum:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Add Discord and other integration variables only where actually required.

NEVER expose the service-role key to browser code.

NEVER hardcode secrets.

NEVER commit secrets.

---

# 7. SUPABASE SQL / MIGRATIONS

This is mandatory.

Do not merely tell me the database schema conceptually.

Actually create SQL migrations.

Place them under:

```text
supabase/migrations/
```

Each migration must be executable in Supabase.

Create migrations in sensible dependency order.

For example:

```text
001_extensions.sql
002_profiles.sql
003_roles_permissions.sql
004_games.sql
005_teams_players.sql
006_tournaments.sql
007_matches.sql
008_brackets.sql
009_notifications.sql
010_disputes.sql
011_audit_logs.sql
012_financial_architecture.sql
013_storage.sql
014_rls.sql
015_realtime.sql
```

Use PostgreSQL constraints and foreign keys properly.

Do not create everything in one enormous migration if splitting it improves maintainability.

---

# 8. DATABASE DESIGN

Create a normalized relational schema.

At minimum:

## Identity

profiles
user_preferences
roles
permissions
role_permissions
user_roles

## Games

games
game_modes
maps
map_pools
game_rules

## Players

players
player_game_accounts
player_socials
player_statistics

## Teams

teams
team_members
team_invitations
team_roles
team_socials
team_achievements

## Tournaments

tournaments
tournament_settings
tournament_rules
tournament_stages
tournament_rounds
tournament_registrations
tournament_registration_players
tournament_seeding
tournament_checkins
tournament_prize_structures
tournament_sponsors

## Matches

matches
match_participants
match_maps
match_map_vetoes
match_scores
match_events
match_evidence
match_submissions
match_officials

## Brackets

brackets
bracket_nodes
bracket_connections
bracket_entries

## Disputes

disputes
dispute_messages
dispute_evidence
dispute_decisions

## Moderation

reports
moderation_actions

## Notifications

notifications
notification_preferences
global_alerts
announcements
announcement_targets

## Audit

audit_logs
security_events
admin_actions

## Media

media_assets
media_links

## Financial/compliance-ready

registration_fees
payment_orders
payment_transactions
payment_refunds
prize_funds
prize_allocations
payout_requests
payouts
payout_recipients
tax_records
verification_records

Do not activate financial functionality merely because the tables exist.

---

# 9. TOURNAMENT DATA MODEL

The bracket MUST NOT be the authoritative source of tournament state.

The source of truth is:

```text
Tournament
↓
Stage
↓
Round
↓
Match
↓
Participants
↓
Result
```

The bracket is a projection/representation of these entities.

This permits changing bracket UI later without corrupting tournament state.

---

# 10. GAME-AGNOSTIC DESIGN

Do not hardcode the platform around Valorant.

Make:

```text
Game
Game Mode
Map Pool
Rules
Roster Size
Substitute Rules
Match Format
Scoring Rules
```

configurable.

Seed the initial database with Valorant as the first supported game.

Architecture must support future:

CS2
BGMI
PUBG
COD
other games

without rewriting the tournament engine.

---

# 11. AUTHENTICATION — REAL IMPLEMENTATION

Build actual authentication using Supabase Auth.

## Signup

Fields:

* email
* password
* username
* avatar optional
* region
* favorite game optional

Upon signup:

Supabase Auth user is created.

Then create corresponding profile record.

Handle duplicate usernames safely.

Validate all fields.

Never trust client input.

---

# 12. LOGIN PAGE

Create a production-quality login page.

Support:

* email/password
* Google OAuth if configured
* forgot password
* remember session appropriately
* loading state
* validation
* invalid credentials
* unverified email state where applicable
* rate-limit/error messaging

Example visual hierarchy:

```text
PROJECT V1

ENTER THE PROJECT

EMAIL
PASSWORD

[ LOG IN ]

Forgot password?

──────── OR ────────

[ CONTINUE WITH GOOGLE ]

Don't have an account?
Create one
```

Do not create fake authentication.

Login must actually create/authenticate a Supabase session.

---

# 13. SIGNUP PAGE

Create an actual working signup page.

Fields:

username
email
password
confirm password
region

Optional:
favorite game

Create:

* password requirements
* validation
* duplicate account handling
* username validation
* Terms/Rules acknowledgement if required
* successful signup state
* email verification flow if enabled

After authentication:
redirect to dashboard or onboarding.

---

# 14. LOGOUT

Implement actual logout.

Remove/refresh session correctly.

Protected pages must reject unauthenticated access.

---

# 15. PASSWORD RESET

Build:

forgot password
email reset
reset password page
success state
expired/invalid link state

Use Supabase Auth.

---

# 16. SESSION MANAGEMENT

Use modern Supabase SSR/auth patterns for Next.js.

Implement:

* server-side session handling
* protected layouts
* auth-aware navigation
* session refresh
* proper redirects
* logout
* unauthorized access handling

Do not rely purely on client-side route guards.

---

# 17. ADMIN AUTHENTICATION

Use the same identity system but separate authorization.

Do not create a completely separate user database.

Use:

Supabase Auth identity
+
profile
+
roles
+
permissions

Admin entry route:

```text
/control/login
```

A normal user cannot become an admin by selecting a role at login.

The server determines administrative access.

---

# 18. RBAC

Use dynamic:

User
→ Role
→ Permission
→ Scope
→ Policy
→ Action

Initial roles:

HUMAN
DEMI_GOD
GOD

Future roles:

SUPER_ADMIN
TOURNAMENT_ADMIN
MATCH_OFFICIAL
MODERATOR
CONTENT_ADMIN
COMMUNITY_MANAGER
ANALYST
FINANCE_ADMIN

Permissions must be stored in the database.

Do not hardcode role logic throughout React components.

---

# 19. GOD PERMISSIONS

GOD can:

manage admins
create/remove admin assignments
create roles
assign permissions
manage users
manage tournaments
manage teams
manage players
manage matches
manage brackets
resolve disputes
manage announcements
manage notifications
view audit logs
manage settings
manage compliance configuration
manage protected financial configuration

Do not allow deletion of the last GOD account through normal UI.

Add safeguards against self-lockout.

---

# 20. DEMI-GOD

Operational admin.

Can:

create tournaments
edit tournaments
approve teams
manage check-ins
manage seeding
generate brackets
manage matches
reschedule
declare forfeits
resolve disputes if permitted
manage announcements
manage notifications
manage teams
moderate users within assigned scope

Cannot by default:

manage GOD
change protected system ownership
modify core RBAC architecture
change protected infrastructure configuration

---

# 21. HUMAN

Normal user.

Can:

register
create/join teams
manage own profile
register teams in tournaments
check in
participate
submit match result where allowed
upload evidence
create disputes
view tournament data
receive notifications

---

# 22. RLS

Create actual Supabase Row Level Security policies.

Do not simply document them.

At minimum:

* users can read/update their own profile
* users cannot read private admin data
* team members can access their own team management records
* public tournament information is publicly readable when published
* private evidence is restricted
* admin actions require appropriate permissions
* audit logs cannot be manipulated by HUMAN users
* payout information is restricted
* moderation information is restricted

Use secure helper functions/policies where appropriate.

Test RLS independently.

---

# 23. TOURNAMENT ENGINE

Implement actual tournament logic.

Initial MVP:

8 teams
single elimination
BO1

Architecture must support:

single elimination
double elimination
round robin
Swiss
groups → playoffs
custom stages

The first working path is:

8 registrations
→ approval
→ roster lock
→ check-in
→ seeding
→ bracket generation
→ quarterfinals
→ semifinals
→ final
→ champion

---

# 24. TOURNAMENT STATES

Use explicit state transitions.

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

Do not permit arbitrary state changes.

Create a domain service that validates legal state transitions.

---

# 25. REGISTRATION

Support:

team registration
roster submission
eligibility checks
approval
rejection
waitlist
duplicate prevention
deadline
registration capacity
registration state

States:

DRAFT
SUBMITTED
PENDING_REVIEW
APPROVED
REJECTED
WAITLISTED
CANCELLED
LOCKED

---

# 26. CHECK-IN

Must be functional.

Tournament admin configures:

check-in start
check-in end
timezone
grace period
automatic no-show policy

Team states:

NOT_OPEN
OPEN
CHECKED_IN
MISSED
OVERRIDDEN

Send notification when:

check-in opens
reminder threshold reached
check-in closes
team misses check-in

---

# 27. NO-SHOWS

Support:

no-show declaration
grace period
forfeit
admin override
reason
evidence
audit record

Do not simply mutate the match score.

A forfeit is an event with history.

---

# 28. RESCHEDULE

Support:

team requests
opponent response
admin response
proposed time
reason
deadline
SLA
approval/rejection

Never overwrite the original schedule without history.

Store the change as an event.

---

# 29. SEEDING

Initial:

manual
random

Future:

ELO
rank
previous tournament
custom weighted

Once locked:

seeding cannot casually change.

Privileged reseed:

* requires permission
* requires reason
* creates audit event
* rebuilds dependent state safely

---

# 30. BRACKET ENGINE

Initial:

8-team single elimination

Generate:

4 quarterfinals
2 semifinals
1 final

When a result is finalized:

* determine winner
* advance winner
* update dependent match
* update bracket projection
* notify next participant
* audit action

Do not let the browser independently decide tournament progression.

---

# 31. MATCH ENGINE

Each match has:

scheduled
check-in
ready
live
completed
forfeit
disputed
reschedule_requested
postponed
cancelled

Match stores:

tournament
stage
round
teams
officials
scheduled time
server/region
format
maps
status
result

---

# 32. MAP VETO / PICK

Create a configurable abstraction:

map pool
ban
pick
side choice
veto order

For MVP, it may be optional for the first tournament.

Architecture must support it.

---

# 33. ROSTER LOCK

Tournament roster lock must be enforced server-side.

After lock:

no additions
no removals
no substitutions

unless tournament rules permit it or privileged admin override occurs.

Admin override must require:

reason
permission
audit log

---

# 34. MATCH ROOM

Build:

MATCH ID
TOURNAMENT
ROUND
START TIME
STATUS
TEAMS
SERVER
FORMAT

Actions:

CHECK IN
READY
MAP VETO
SUBMIT RESULT
UPLOAD EVIDENCE
REQUEST RESCHEDULE
OPEN DISPUTE
REPORT PROBLEM

---

# 35. RESULT SUBMISSION

Support:

Team A submits
Team B confirms

If both agree:
→ finalize

If disagreement:
→ disputed

Admin can resolve.

Do not finalize conflicting results automatically.

---

# 36. EVIDENCE

Allow uploads:

screenshots
clips
VOD URLs
documents if required

Use Supabase Storage.

Private evidence must not become public through accidental bucket configuration.

Use appropriate storage policies/signed URLs.

---

# 37. DISPUTES

Create functional dispute workflow.

Fields:

match
creator
reason
description
evidence
assigned official
SLA
status
decision
resolution
timestamp

Statuses:

OPEN
UNDER_REVIEW
WAITING_FOR_EVIDENCE
RESOLVED
REJECTED
ESCALATED

Store all relevant actions in history.

---

# 38. ANTI-SMURF / INTEGRITY

Create infrastructure for:

game account ID
Discord account association
duplicate account signals
risk flags
manual review
verification status

Do not claim perfect automated detection.

Do not automatically ban solely on weak heuristics.

Allow manual admin review.

---

# 39. DISCORD

Treat Discord as a first-class tournament surface.

Create integration architecture.

Support eventually:

bot
guild configuration
tournament categories
match rooms
team roles
check-in reminders
match reminders
result notifications
announcement publishing

For MVP:

create the integration configuration layer
create webhook/bot service abstraction
create event hooks

Do not hardcode Discord logic inside tournament UI components.

---

# 40. NOTIFICATION ENGINE

Create event-driven notifications.

Examples:

tournament registration opened
registration approved
registration rejected
roster lock
check-in opened
check-in reminder
missed check-in
match upcoming
match live
result submitted
result confirmed
match disputed
match resolved
match rescheduled
tournament completed
announcement published

Support:

IN_APP
EMAIL
DISCORD

Push notifications can be future.

---

# 41. ANNOUNCEMENTS

Separate announcements from notifications.

Announcement supports:

draft
schedule
publish
archive

Fields:

title
slug
content
cover image
author
published_at
status
audience
tournament
game

---

# 42. GLOBAL ALERTS

Support:

INFO
SUCCESS
WARNING
CRITICAL

Fields:

title
message
severity
start
expiry
audience
game
tournament
region

---

# 43. PUBLIC WEBSITE

Build the complete public website.

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

All appropriate public pages must use real Supabase data.

---

# 44. HOMEPAGE

Design language:

minimal
premium
dark
editorial
technical
competitive
luxury-tech

Do not create generic neon gamer UI.

Homepage:

hero
live tournaments
upcoming tournaments
latest results
roster
announcements
news
sponsors
community/Discord
footer

Hero copy can be:

PROJECT
V1

COMPETE.
CONQUER.
REPEAT.

[ VIEW TOURNAMENTS ]
[ ENTER PROJECT ]

Keep the hero immediately renderable.

Do not block LCP with a cinematic intro.

Use a subtle first-visit logo reveal only if it does not delay meaningful content.

Do not repeat expensive intro animation on every page.

---

# 45. TOURNAMENT LIST

Real database-driven list.

Search
filter
sort
pagination

Filters:

game
status
format
date
region
platform

---

# 46. TOURNAMENT PAGE

Header:

PROJECT V1
TOURNAMENT NAME

PRIZE POOL
TEAMS
FORMAT
REGION
PLATFORM

Tabs:

OVERVIEW
SCHEDULE
BRACKET
MATCHES
TEAMS
RULES
RESULTS

All data comes from Supabase.

---

# 47. BRACKET UI

Build an excellent bracket visualization.

Desktop:
horizontal bracket

Mobile:
horizontal scrolling or round-based stacked view

Match cards show:

team
seed
score
status
match ID

Never make the bracket independently authoritative.

---

# 48. MATCH PAGE

Show:

teams
score
status
round
schedule
maps
players
match events
evidence where authorized
stream/VOD
result
dispute
admin decision

---

# 49. TEAM PAGE

Show:

logo
name
game
region
captain
roster
achievements
history
results
socials

---

# 50. PLAYER PAGE

Show:

avatar
username
game
region
role
team
statistics
achievements
history
socials

Real name optional.

Respect privacy settings.

---

# 51. USER DASHBOARD

Real Supabase data.

Show:

upcoming matches
registered tournaments
my teams
notifications
recent results

Navigation:

Overview
My Tournaments
My Matches
My Teams
Notifications
Profile
Settings

---

# 52. TEAM MANAGEMENT

A team captain/authorized member must be able to:

create team
edit team
invite players
remove players
promote captain
manage roster
submit tournament registration
check in

Protect all actions with RBAC/team membership checks.

---

# 53. ADMIN CONTROL CENTER

Build an operational dashboard.

Metrics:

active tournaments
live matches
registered teams
active players
pending registrations
missing check-ins
open disputes
reschedule requests

Live activity:

actor
action
entity
timestamp
result

---

# 54. ADMIN TOURNAMENT MANAGEMENT

Create:

list
search
filters
create
edit
duplicate
archive

Tournament creator is a wizard.

Steps:

1 Basic information
2 Game
3 Format
4 Registration
5 Eligibility
6 Roster
7 Check-in
8 Schedule
9 Prize
10 Rules
11 Seeding
12 Bracket
13 Discord
14 Review
15 Publish

Save drafts.

---

# 55. ADMIN REGISTRATION MANAGEMENT

Admin can:

review
approve
reject
waitlist
bulk approve
bulk reject
inspect roster
see eligibility failures

Every sensitive action audited.

---

# 56. ADMIN CHECK-IN DASHBOARD

Show:

team
check-in state
captain
time
last activity
grace period
no-show risk

Actions:

open
close
override
mark checked-in
mark no-show

---

# 57. ADMIN SEEDING

Show registered teams.

Allow:

drag/reorder
randomize
lock
unlock if permitted

Once locked:
protected.

---

# 58. ADMIN MATCH MANAGEMENT

Admin can:

create
edit
schedule
reschedule
start
pause if supported
declare forfeit
resolve result
resolve dispute
view evidence

Every important action is audited.

---

# 59. ADMIN DISPUTE CENTER

Queue:

open
SLA countdown
priority
match
teams
assigned admin

Admin can:

claim
request evidence
review
resolve
reject
escalate

Resolution requires reason.

---

# 60. ADMIN ANNOUNCEMENTS + NOTIFICATIONS

Build actual CRUD.

Create
edit
schedule
publish
archive

Allow targeting by:

all users
game
tournament
region
team
specific user

---

# 61. ADMIN MANAGEMENT

GOD sees:

admins
roles
permissions
status
last active

GOD can:

assign role
remove admin access
change permissions
create roles

Protect against self-lockout.

---

# 62. PERMISSION MATRIX

Create a visual matrix:

Permission
GOD
DEMI_GOD
custom role

Actions:

view
create
edit
delete
publish
approve
resolve
override

Changes save to Supabase.

---

# 63. AUDIT LOGS

Create a genuine append-oriented audit system.

Record:

actor
action
entity
entity_id
timestamp
reason
before
after
session/request metadata where appropriate

Examples:

team approved
tournament published
seed locked
match rescheduled
forfeit declared
dispute resolved
role changed

Audit data must not be casually writable/deletable by HUMAN users.

---

# 64. FINANCIAL ARCHITECTURE

Build the data model but keep live payments behind a feature flag.

Model:

registration fee
fee type
prize pool
prize funding
prize distribution
sponsor funding
organizer funding
payout status
tax/verification state

NEVER implement:

betting
wagering
odds
player staking
pooled competitive stakes

Do not automatically calculate:

entry fees × registrations = prize pool.

Prize pool must be independently defined.

Keep legal/compliance settings configurable.

---

# 65. THEME

Support:

DARK
LIGHT
SYSTEM

Default:

DARK

Use CSS variables/design tokens.

Do not duplicate theme-specific component implementations.

---

# 66. DESIGN SYSTEM

Create central tokens:

background
foreground
surface
surface-hover
surface-active
border
border-strong
accent
accent-foreground
muted
success
warning
danger
info

Typography:
display
heading
body
caption
label
mono

Spacing:
consistent scale

Radius:
restrained

---

# 67. VISUAL STYLE

The site should feel:

expensive
minimal
controlled
intelligent
competitive
modern

Use:

thin borders
negative space
large typography
single accent
monochrome base
precise status indicators
subtle texture
editorial composition

Avoid:

excessive rounded cards
rainbow gradients
RGB gamer effects
random particles
huge glows
visual clutter

---

# 68. MOTION

Use Motion only.

Create reusable motion components.

Animations:

page transitions
card hover
tab indicators
modal
drawer
toast
number count
status pulse
bracket changes
scroll reveal

Rules:

never block functionality
respect prefers-reduced-motion
avoid layout shifts
avoid long blocking animations
do not animate everything

---

# 69. PERFORMANCE

Priority:

LCP
INP
CLS
mobile performance

Use:

server rendering where appropriate
image optimization
lazy loading
code splitting
small client bundles
optimized fonts
minimal dependencies

No full-screen intro should delay actual page content.

---

# 70. SEO

Public pages need:

dynamic metadata
canonical URLs
Open Graph
Twitter/X cards
sitemap
robots
clean slugs
structured data where appropriate

Tournament pages must be indexable.

---

# 71. ACCESSIBILITY

Implement:

semantic HTML
keyboard navigation
visible focus
proper labels
ARIA where needed
contrast
reduced motion
accessible forms
accessible tables
accessible dialogs

Never use color alone as status.

---

# 72. RESPONSIVE

Support:

mobile
tablet
desktop
ultrawide

Especially test:

brackets
match room
admin tables
tournament pages
dashboard

---

# 73. GLOBAL SEARCH

Search real Supabase data.

Search:

tournaments
teams
players
matches
news

Make the search layer extensible for future content.

---

# 74. STORAGE

Create storage buckets:

avatars
team-logos
tournament-banners
evidence
media
documents

Use correct access policies.

Evidence should generally be private.

---

# 75. REALTIME

Use realtime selectively.

Implement where valuable:

live match state
registration counts
check-in state
bracket progression
notifications
admin activity

Do not subscribe globally to every table.

---

# 76. DOMAIN EVENTS

Create an event abstraction for:

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

These events should eventually drive:

notifications
Discord
audit logs
analytics
emails

---

# 77. ERROR HANDLING

Every feature needs:

loading
empty
error
success
permission denied
offline where relevant

Never silently fail.

Admin mutation failures should clearly indicate:

what failed
whether state changed
what can be done next

---

# 78. TESTING

Write tests for:

authentication
authorization
RLS
registration
team permissions
check-in
roster locking
seeding
bracket generation
result finalization
forfeit
reschedule
dispute
notifications
audit

Critical tournament logic must be unit tested.

Create an end-to-end 8-team tournament test.

---

# 79. SEED DATA

Create:

1 game
8 fictional teams
40+ players
1 tournament
quarterfinals
semifinals
final
sample notifications
sample announcements
sample disputes
sample audit events
GOD
DEMI_GOD
HUMAN development users

Do not use real people's personal data.

---

# 80. DEVELOPMENT ADMIN CREATION

Provide a secure script or SQL-assisted process for creating a development GOD account.

Never hardcode passwords in source code.

Do not make a public signup form capable of creating admins.

---

# 81. API / SERVICE LAYER

Create domain services for:

auth
users
teams
players
tournaments
registrations
checkin
seeding
brackets
matches
disputes
notifications
announcements
audit
discord
financials

Example:

```text
TournamentService
RegistrationService
CheckInService
SeedingService
BracketService
MatchService
DisputeService
NotificationService
AuditService
```

Do not put tournament progression logic inside React components.

---

# 82. SECURITY

Implement:

RLS
server authorization
input validation
rate limiting
secure session handling
protected routes
secure upload handling
database constraints
audit
least privilege

Do not expose service-role key to browser.

Do not trust hidden frontend buttons.

---

# 83. FUTURE-PROOFING

Build extension points for:

ELO
rankings
leaderboards
seasons
advanced tournament formats
stats
scrims
community
media
clips
streams
sponsors
store
memberships
tickets
mobile application
push notifications
Discord automation
game APIs
anti-cheat integrations

Do not build all of these now.

Build the architecture so they can be added without rewriting core systems.

---

# 84. NAVIGATION

Public:

HOME
TOURNAMENTS
MATCHES
TEAMS
ROSTERS
NEWS

Authenticated:

DASHBOARD
MY TOURNAMENTS
MY MATCHES
MY TEAMS
NOTIFICATIONS

Admin:

CONTROL
TOURNAMENTS
REGISTRATIONS
CHECK-IN
SEEDING
BRACKETS
MATCHES
TEAMS
PLAYERS
DISPUTES
ANNOUNCEMENTS
NOTIFICATIONS
DISCORD
ADMINS
ROLES
PERMISSIONS
AUDIT
ANALYTICS
SETTINGS

Keep future modules feature-flagged.

---

# 85. URL STRUCTURE

Use:

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

/login
/signup
/forgot-password
/reset-password

/dashboard
/profile
/settings
/my-tournaments
/my-matches
/my-teams
/notifications

/control
/control/login
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

# 86. FIRST SUCCESS CRITERIA

Do not consider the project successful because the homepage looks good.

The first success milestone is:

A HUMAN:

creates account
logs in
creates team
adds roster
registers for tournament
sees registration status
checks in
enters match
submits result
receives notification
sees bracket progress
sees final
sees champion

A DEMI_GOD:

logs in
creates tournament
approves teams
opens check-in
monitors check-in
locks roster
seeds teams
generates bracket
schedules matches
handles no-show
handles reschedule
reviews result
resolves dispute
publishes announcement

A GOD:

can manage all operational permissions
manage admins
manage roles
manage permissions
view audit logs

All of this must persist in Supabase.

---

# 87. DELIVERABLES

Before declaring the build complete, provide:

1. fully working application
2. complete Supabase migration files
3. complete RLS policies
4. seed scripts
5. `.env.example`
6. `docs/SUPABASE_SETUP.md`
7. `docs/DATABASE.md`
8. `docs/RBAC.md`
9. `docs/TOURNAMENT_ENGINE.md`
10. `docs/SECURITY.md`
11. `README.md`
12. automated tests
13. end-to-end test for the 8-team tournament
14. explanation of how to create the first GOD admin
15. explanation of how to connect Google OAuth if included
16. explanation of how to deploy
17. explanation of how to reset/seed development database

---

# 88. SUPABASE SQL OUTPUT REQUIREMENT

I need to be able to take the SQL you generate and execute it in Supabase.

Therefore:

* make migrations executable
* do not use pseudo-SQL
* do not omit policies
* do not say "create policies as needed"
* actually create them
* include indexes
* include foreign keys
* include unique constraints
* include check constraints where useful
* include enum/type strategy where appropriate
* include timestamps
* include updated_at handling
* include triggers/functions where appropriate

Where Supabase-specific SQL is required, provide actual executable SQL.

---

# 89. SUPABASE SETUP HANDHOLDING

The documentation must assume I may be doing this for the first time.

Explain exactly:

OPEN SUPABASE
→ NEW PROJECT
→ COPY URL
→ COPY PUBLISHABLE KEY
→ SET `.env.local`
→ RUN MIGRATIONS
→ SEED DATA
→ CONFIGURE AUTH
→ CONFIGURE REDIRECT URL
→ CREATE STORAGE BUCKETS
→ VERIFY RLS
→ RUN APP
→ TEST LOGIN
→ TEST ADMIN
→ TEST TOURNAMENT

Also clearly identify:

WHAT I MUST DO MANUALLY

versus

WHAT THE APPLICATION/SQL DOES AUTOMATICALLY.

---

# 90. CODE QUALITY

Use:

strict TypeScript
clear naming
small functions
reusable components
server/client separation
error handling
typed Supabase queries
domain-specific services
minimal duplication

Do not create giant 1,000+ line React files unless genuinely unavoidable.

---

# 91. NO PLACEHOLDER FUNCTIONALITY

Do not create:

```text
TODO: connect later
console.log("fake login")
mockUser
fakeAdmin
fakeTournament
```

for functionality that is supposed to work.

For future functionality, feature flag it or create a clean abstraction.

---

# 92. WHEN SOMETHING CANNOT YET BE FULLY IMPLEMENTED

If an external credential/integration is required, build the complete integration interface and configuration layer.

Example:

Discord requires bot token:

* build service
* build database configuration
* build event hooks
* build UI
* clearly identify the one secret I must add

Do NOT replace the feature with fake UI.

---

# 93. FINAL UX QUALITY BAR

The site should look like a serious esports organization.

Not:

"template made with AI"

It should feel:

premium
minimal
fast
credible
competitive
modern

The UI should communicate:

PROJECT V1
COMPETITIVE OPERATIONS
PRECISION
CONTROL
PERFORMANCE

---

# 94. IMPORTANT BRANDING RULE

Do not use the name "Vanta" as the sole SEO identity throughout metadata.

Keep:

organization name
public brand
short name

configurable.

Until the final brand is cleared, use PROJECT V1 as the visible primary identity wherever possible.

---

# 95. EXECUTION INSTRUCTIONS

Do not stop after generating the plan.

Actually implement the application.

Start by inspecting the repository.

Then:

1. establish architecture
2. configure Supabase integration
3. create migrations
4. create schema
5. create RLS
6. implement Auth
7. implement RBAC
8. seed database
9. implement tournament engine
10. implement 8-team tournament
11. implement public pages
12. implement user dashboard
13. implement admin control center
14. implement notifications
15. implement audit
16. implement Discord integration foundation
17. run tests
18. fix errors
19. verify end-to-end lifecycle
20. generate final setup documentation

Do not declare success before verifying the application actually runs.

---

# 96. FINAL REPORT

When finished, provide me with:

## A. What was built

Concise but complete feature summary.

## B. Supabase setup

Exact steps I need to perform.

## C. SQL / migrations

List the migration files and explain execution order.

## D. Environment variables

Exactly what I must place in `.env.local`.

## E. Admin setup

How to create the first GOD account.

## F. Test credentials

Only for development seed accounts, and never use real passwords/secrets.

## G. Run instructions

Exact commands:

install
dev
test
build

## H. Deployment

Exact production deployment sequence.

## I. Remaining limitations

Be honest about anything not fully implemented.

Do not claim functionality is complete if it is not.

---

# 97. THE MOST IMPORTANT RULE

Do not optimize for:

"number of pages built."

Optimize for:

"Can PROJECT V1 actually run an esports tournament?"

The fundamental lifecycle is:

REGISTRATION
→ APPROVAL
→ ROSTER LOCK
→ CHECK-IN
→ SEEDING
→ BRACKET
→ MATCH
→ RESULT
→ DISPUTE IF NECESSARY
→ RESOLUTION
→ ADVANCEMENT
→ FINAL
→ CHAMPION
→ NOTIFICATION
→ AUDIT

That lifecycle must work against real Supabase data before the project is considered successful.

BEGIN IMPLEMENTATION NOW.
