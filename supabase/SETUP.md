# PROJECT V1 — Supabase Setup & Operations Guide

Everything the live site renders now comes from the database (the KV store behind
the edge function). There is **no static UI data** left in the client. Follow the
steps below in order to take the platform from empty to fully operational.

Your Supabase project: **`vxpyexforlqjpwyxlkcz`**
Dashboard: https://supabase.com/dashboard/project/vxpyexforlqjpwyxlkcz

---

## 0. Rotate the exposed secret (do this first)

The `sb_secret_…` service-role key was pasted into chat, so treat it as compromised.

- Dashboard → **Project Settings → API → Service role key → “Reset / Roll”**.
- The edge function reads the key from the `SUPABASE_SERVICE_ROLE_KEY` env var
  automatically, so you don't paste it anywhere in code. Never expose it to the browser.

---

## 1. Deploy the edge function

All backend logic lives in `supabase/functions/server/index.tsx`. Changes there only
take effect after a deploy.

- **Figma Make settings page → Deploy / redeploy the Supabase edge function.**

Do this now (backend changed) and again any time you edit files under
`supabase/functions/`.

---

## 2. Auth settings

Dashboard → **Authentication → Sign In / Providers**.

### Email + Password
1. Enable the **Email** provider (on by default).
2. For real launches configure SMTP under **Authentication → Emails** so confirmation
   mails are delivered. (The `/signup` endpoint currently creates users with
   `email_confirm: true` so accounts work immediately even without SMTP — remove that
   flag in `index.tsx` once SMTP is live if you want real email verification.)

### Google Sign-In
1. In **Google Cloud Console** create an OAuth 2.0 Client ID (type: *Web application*).
   - **Authorized redirect URI:**
     `https://vxpyexforlqjpwyxlkcz.supabase.co/auth/v1/callback`
2. Dashboard → **Authentication → Providers → Google** → enable it and paste the
   **Client ID** and **Client Secret** from Google. Save.
3. Dashboard → **Authentication → URL Configuration**:
   - **Site URL:** your deployed app URL (and `http://localhost:5173` /
     your Make preview URL while developing).
   - **Redirect URLs:** add every origin the app runs on. The client calls
     `signInWithOAuth({ redirectTo: window.location.origin })`, so each origin must be
     allow-listed here or the redirect back will be rejected.

That's all the code needs — the “Continue with Google” button is already wired.

---

## 3. Where to run SQL queries

Dashboard → **SQL Editor → New query** → paste → **Run**.

You normally won't need SQL: the KV table (`kv_store_d346d9b8`) is auto-created and
all data is written by the edge function. SQL is only for the one-time bootstrap and
for inspection.

---

## 4. Bootstrap the first admin (GOD)

Roles are stored per user in the KV table under the key `user:<auth-user-id>` as JSON.
There are three ways to get a GOD account — pick one:

### Option A — Automatic (easiest)
The **first user to ever sign in** (email/password *or* Google) is automatically
promoted to **GOD** by the server (see `getProfile` in `index.tsx`). So: deploy the
function, then be the very first person to log in. Done.

### Option B — Promote an existing user via SQL
If you already have accounts and need to grant GOD to a specific one, first find the
user id in **Authentication → Users**, then run this in the SQL Editor:

```sql
-- Replace the UUID with the target auth user id.
update kv_store_d346d9b8
set value = jsonb_set(value, '{role}', '"GOD"')
where key = 'user:00000000-0000-0000-0000-000000000000';
```

To promote by email instead (looks the row up by the email stored in the JSON):

```sql
update kv_store_d346d9b8
set value = jsonb_set(value, '{role}', '"GOD"')
where key like 'user:%'
  and value->>'email' = 'you@example.com';
```

Valid roles: `"GOD"`, `"DEMI_GOD"`, `"HUMAN"`. After GOD exists you can manage all
other roles from **Control → USERS** in the app (no more SQL needed).

---

## 5. Seed the first tournament

1. Log in as a GOD/DEMI_GOD account.
2. Click **CONTROL** in the nav → **SEED 8-TEAM TOURNAMENT**.

This writes the live tournament, three directory events, the results archive, the
house roster, and an opening announcement into the database. The public site
immediately reflects it. From there, drive the full lifecycle in Control:

`REGISTRATION_OPEN → approve teams → close registration → roster lock → check-in →
seeding → generate bracket → go live → finalize matches → champion.`

---

## 6. Useful inspection queries

```sql
-- All stored keys by type
select split_part(key, ':', 1) as kind, count(*)
from kv_store_d346d9b8 group by 1 order by 2 desc;

-- Every user profile + role
select key, value->>'username' as username, value->>'email' as email, value->>'role' as role
from kv_store_d346d9b8 where key like 'user:%';

-- The live tournament document
select value from kv_store_d346d9b8 where key = 'tournament:main';
```

---

## Data model (KV keys)

| Key pattern            | Contents                                    |
|------------------------|---------------------------------------------|
| `user:<uuid>`          | User profile + role (RBAC authority)        |
| `tournament:main`      | The live tournament (teams, matches, state) |
| `event:<id>`           | Directory cards for other events            |
| `result:<id>`          | Past tournament results (archive)           |
| `roster:main`          | House roster                                |
| `announcement:<ts>`    | Published announcements                     |
| `notif:<ts>:<rand>`    | Notifications feed                          |
| `audit:<ts>:<rand>`    | Immutable audit log                         |

> Note: Figma Make is not intended for collecting real PII or securing sensitive
> data. Authorization is enforced server-side in the edge function; the service-role
> key never reaches the browser.
