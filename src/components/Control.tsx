import { useEffect, useState } from "react"
import { useAuth } from "../lib/auth"
import { useSite } from "../lib/site"
import { api, supabase, type Player } from "../lib/supabase"
import { type Match, type Team } from "../data/tournament"
import { StatusChip, Mono } from "./ui"
import { Bracket } from "./Bracket"
import { getGameConfig, GAME_LIST } from "../config/games"
import { uploadRosterImage } from "../lib/storage"
import { ImageCropperModal } from "./ImageCropperModal"

const LIFECYCLE = [
  "DRAFT",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "ROSTER_LOCK",
  "CHECK_IN_OPEN",
  "CHECK_IN_CLOSED",
  "SEEDING",
  "BRACKET_LOCKED",
  "LIVE",
  "COMPLETED",
]

const btn =
  "border border-border-strong px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] transition-colors hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
const primary =
  "bg-accent px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"

type Tab = "OPERATIONS" | "FIXTURES" | "TEAMS" | "REGISTRATIONS" | "ROSTER" | "USERS" | "ANNOUNCEMENTS" | "AUDIT"

export function Control({ onClose }: { onClose: () => void }) {
  const {
    profile,
    effectiveRole,
    availablePerspectives,
    setPerspective,
    can,
    logout,
  } = useAuth()
  const { refresh: refreshSite } = useSite()
  const [tab, setTab] = useState<Tab>("OPERATIONS")
  const [t, setT] = useState<any>(null)
  const [feed, setFeed] = useState<{ msg: string; kind: "ok" | "err" }[]>([])
  const [audit, setAudit] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [roster, setRoster] = useState<Player[]>([])
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const { tournament } = await api.getTournament()
      setT(tournament)
    } catch {
      /* ignore */
    }
    if (can("audit.view")) {
      try {
        setAudit((await api.audit()).entries)
      } catch {
        /* ignore */
      }
      try {
        setUsers((await api.getUsers()).users)
      } catch {
        /* ignore */
      }
    }
    try {
      setAnnouncements((await api.getAnnouncements()).announcements)
    } catch {
      /* ignore */
    }
    try {
      setRoster((await api.getRoster()).players)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()

    // Live push listener from Supabase Postgres
    const channel = supabase
      .channel("control-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kv_store_d346d9b8" },
        () => {
          load()
        },
      )
      .subscribe()

    // 3-second background polling guarantee
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !busy) {
        load()
      }
    }, 3000)

    const onFocus = () => load()
    window.addEventListener("focus", onFocus)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [busy])

  function push(msg: string, kind: "ok" | "err" = "ok") {
    setFeed((f) => [{ msg, kind }, ...f].slice(0, 8))
  }

  async function run<T>(
    label: string,
    fn: () => Promise<T>,
    after?: (r: T) => void,
  ) {
    setBusy(true)
    try {
      const r = await fn()
      const events = (r as any)?.events as string[] | undefined
      if ((r as any)?.tournament) setT((r as any).tournament)
      after?.(r)
      push(`${label} — ${events?.join(", ") || "ok"}`)
      if (can("audit.view")) {
        try {
          setAudit((await api.audit()).entries)
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      push(`${label}: ${e instanceof Error ? e.message : String(e)}`, "err")
    } finally {
      setBusy(false)
    }
  }

  const seed = () => run("Seed tournament", () => api.seed())
  const op = (label: string, action: string, body?: Record<string, unknown>) =>
    run(label, () => api.op(action, body))

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [confirmRemoveTeamId, setConfirmRemoveTeamId] = useState<string | null>(
    null,
  )

  const status: string = t?.status ?? "—"
  const teams: any[] = t?.teams ?? []
  const matches: any[] = t?.matches ?? []
  const checkedIn = teams.filter((x) => x.checkedIn).length
  const approved = teams.filter((x) => x.approved).length
  const readyMatches = matches.filter(
    (m) => m.a && m.b && m.status !== "COMPLETED" && m.status !== "FORFEIT",
  )
  const pendingReg = teams.filter((x) => !x.approved).length

  const TABS: { id: Tab; show: boolean }[] = [
    { id: "OPERATIONS", show: true },
    { id: "FIXTURES", show: can("tournaments.manage") },
    { id: "TEAMS", show: can("tournaments.manage") },
    {
      id: "REGISTRATIONS",
      show: can("registrations.approve") || can("tournaments.manage"),
    },
    { id: "ROSTER", show: can("roster.manage") },
    { id: "USERS", show: can("roles.manage") },
    { id: "ANNOUNCEMENTS", show: can("announcements.publish") },
    { id: "AUDIT", show: can("audit.view") },
  ]

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <span className="font-display text-base sm:text-lg font-black tracking-tight">
            CONTROL
          </span>
          <Mono className="hidden sm:inline text-[10px] sm:text-xs">
            OPERATIONS COMMAND CENTER
          </Mono>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Perspective Switcher for GOD & DEMI_GOD */}
          {availablePerspectives.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5">
              <span className="font-mono text-[9px] tracking-[0.15em] text-muted">
                VIEW AS:
              </span>
              {availablePerspectives.map((role) => (
                <button
                  key={role}
                  onClick={() => setPerspective(role)}
                  className={`border px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.1em] transition-colors ${
                    effectiveRole === role
                      ? role === "GOD"
                        ? "border-accent bg-accent/20 text-accent"
                        : role === "DEMI_GOD"
                          ? "border-success bg-success/20 text-success"
                          : "border-foreground bg-foreground text-background"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}

          {profile && (
            <div className="text-right hidden sm:block">
              <div className="font-mono text-[11px] text-foreground">
                {profile.username}
              </div>
              <StatusChip
                status={
                  effectiveRole === "GOD"
                    ? "LIVE"
                    : effectiveRole === "DEMI_GOD"
                      ? "READY"
                      : "SCHEDULED"
                }
              />
            </div>
          )}
          <button
            onClick={onClose}
            className="bg-accent px-3 py-1.5 sm:px-4 sm:py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-accent-foreground transition-opacity hover:opacity-90"
          >
            EXIT ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-surface/60 overflow-x-auto">
        <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-5 min-w-max">
          {TABS.filter((x) => x.show).map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`relative px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-[10px] sm:text-[11px] tracking-[0.15em] transition-colors shrink-0 ${
                tab === x.id
                  ? "text-foreground font-bold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {x.id === "REGISTRATIONS" ? "TEAMS & SQUADS" : x.id}
              {x.id === "REGISTRATIONS" && (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[8px] text-accent-foreground">
                  {teams.length}
                </span>
              )}
              {tab === x.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">
        {!t && tab !== "ROSTER" ? (
          <div className="flex flex-col items-center gap-4 border border-border bg-surface p-16 text-center">
            <Mono>NO ACTIVE OPERATION</Mono>
            <p className="max-w-sm text-sm text-muted">
              No tournament configured. You can create a custom tournament for
              any game or seed reference Valorant teams.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={busy || !can("tournaments.manage")}
                className={primary}
              >
                + CREATE TOURNAMENT
              </button>
              <button
                onClick={seed}
                disabled={busy || !can("seed.run")}
                className={btn}
              >
                SEED REFERENCE VALORANT TEAMS
              </button>
            </div>
            {!can("tournaments.manage") && (
              <Mono className="text-danger">
                Requires tournaments.manage permission
              </Mono>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {tab === "OPERATIONS" && (
                <>
                  {/* Tournament Header Summary & Controls */}
                  <div className="border border-border bg-surface p-5">
                    <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="border border-accent bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                            {t?.game || "VALORANT"}
                          </span>
                          <span className="font-mono text-xs text-muted">
                            · {t?.season || "SEASON 01"}
                          </span>
                          <span className="font-mono text-xs text-muted">
                            · {t?.region || "GLOBAL"}
                          </span>
                        </div>
                        <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-foreground">
                          {t?.name}
                        </h2>
                        <div className="mt-1 font-mono text-xs text-muted">
                          {t?.format} · Prize Pool:{" "}
                          <span className="font-bold text-accent">
                            {t?.prizePool}
                          </span>{" "}
                          · Slots:{" "}
                          <span className="text-foreground">
                            {teams.length}/{t?.slots ?? 8}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {can("tournaments.manage") && (
                          <>
                            <button
                              onClick={() => setShowEditModal(true)}
                              className="border border-border px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-foreground hover:border-accent hover:text-accent transition-colors"
                            >
                              ✎ EDIT TOURNAMENT
                            </button>
                            <button
                              onClick={() => setShowCreateModal(true)}
                              className="border border-border px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-muted hover:border-accent hover:text-accent transition-colors"
                            >
                              + NEW TOURNAMENT
                            </button>
                          </>
                        )}
                        <StatusChip status={status} />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Mono>TOURNAMENT LIFECYCLE</Mono>
                      <span className="font-mono text-[10px] text-muted">
                        STAGE: {status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {LIFECYCLE.map((s) => {
                        const idx = LIFECYCLE.indexOf(status)
                        const here = s === status
                        const done = LIFECYCLE.indexOf(s) < idx
                        return (
                          <span
                            key={s}
                            className={`font-mono text-[9px] tracking-[0.1em] border px-1.5 py-1 ${
                              here
                                ? "border-accent bg-accent/10 text-accent"
                                : done
                                  ? "border-border text-muted"
                                  : "border-border/50 text-border-strong"
                            }`}
                          >
                            {s}
                          </span>
                        )
                      })}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                      {status === "DRAFT" && (
                        <button
                          className={primary}
                          disabled={busy || !can("tournaments.manage")}
                          onClick={() =>
                            op("Open check-in / seeding", "transition", {
                              to: "SEEDING",
                            })
                          }
                        >
                          PROCEED TO SEEDING ({approved} TEAMS)
                        </button>
                      )}
                      {status === "REGISTRATION_OPEN" && (
                        <button
                          className={primary}
                          disabled={busy || !can("tournaments.manage")}
                          onClick={() =>
                            op("Close registration", "transition", {
                              to: "REGISTRATION_CLOSED",
                            })
                          }
                        >
                          CLOSE REGISTRATION ({approved}/{t?.slots ?? 8}{" "}
                          APPROVED)
                        </button>
                      )}
                      {status === "REGISTRATION_CLOSED" && (
                        <button
                          className={primary}
                          disabled={busy || !can("tournaments.manage")}
                          onClick={() =>
                            op("Lock rosters", "transition", {
                              to: "ROSTER_LOCK",
                            })
                          }
                        >
                          LOCK ROSTERS
                        </button>
                      )}
                      {status === "ROSTER_LOCK" && (
                        <button
                          className={primary}
                          disabled={busy || !can("checkins.manage")}
                          onClick={() =>
                            op("Open check-in", "transition", {
                              to: "CHECK_IN_OPEN",
                            })
                          }
                        >
                          OPEN CHECK-IN
                        </button>
                      )}
                      {status === "CHECK_IN_OPEN" && (
                        <button
                          className={primary}
                          disabled={busy || !can("checkins.manage")}
                          onClick={() =>
                            op("Close check-in", "transition", {
                              to: "CHECK_IN_CLOSED",
                            })
                          }
                        >
                          CLOSE CHECK-IN ({checkedIn}/{teams.length})
                        </button>
                      )}
                      {status === "CHECK_IN_CLOSED" && (
                        <button
                          className={primary}
                          disabled={busy || !can("seeding.manage")}
                          onClick={() =>
                            op("Begin seeding", "transition", { to: "SEEDING" })
                          }
                        >
                          BEGIN SEEDING
                        </button>
                      )}
                      {status === "SEEDING" && (
                        <>
                          <button
                            className={btn}
                            disabled={
                              busy || teams.length < 2 || !can("seeding.manage")
                            }
                            onClick={() =>
                              op("Randomize seeds", "seed-teams", {
                                method: "random",
                              })
                            }
                          >
                            RANDOMIZE SEEDS
                          </button>
                          <button
                            className={primary}
                            disabled={
                              busy || teams.length < 2 || !can("seeding.manage")
                            }
                            onClick={() =>
                              op("Lock bracket", "transition", {
                                to: "BRACKET_LOCKED",
                              })
                            }
                          >
                            LOCK SEEDING ({teams.length} TEAMS)
                          </button>
                        </>
                      )}
                      {status === "BRACKET_LOCKED" && (
                        <>
                          <button
                            className={btn}
                            disabled={busy || !can("brackets.generate")}
                            onClick={() =>
                              op(
                                "Generate knockout bracket",
                                "generate-bracket",
                              )
                            }
                          >
                            GENERATE {teams.length <= 4 ? "4-TEAM" : "8-TEAM"}{" "}
                            KNOCKOUT BRACKET
                          </button>
                          <button
                            className={primary}
                            disabled={
                              busy ||
                              matches.length === 0 ||
                              !can("tournaments.manage")
                            }
                            onClick={() =>
                              op("Go live", "transition", { to: "LIVE" })
                            }
                          >
                            GO LIVE ⚡
                          </button>
                        </>
                      )}
                      {status === "COMPLETED" && (
                        <div className="font-mono text-sm text-accent">
                          CHAMPION:{" "}
                          {teams.find((x) => x.id === t.champion)?.name ?? "—"}
                        </div>
                      )}
                    </div>
                  </div>

                  {status === "CHECK_IN_OPEN" && (
                    <div className="border border-border bg-surface p-5">
                      <Mono>CHECK-IN CONTROL</Mono>
                      <div className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2">
                        {teams.map((tm) => (
                          <div
                            key={tm.id}
                            className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-2.5"
                          >
                            <span className="text-sm">{tm.name}</span>
                            <button
                              disabled={busy || !can("checkins.manage")}
                              onClick={() =>
                                op(`Check-in ${tm.tag}`, "checkin", {
                                  teamId: tm.id,
                                  value: !tm.checkedIn,
                                })
                              }
                              className={`font-mono text-[10px] tracking-[0.12em] border px-2 py-1 transition-colors ${
                                tm.checkedIn
                                  ? "border-success/40 text-success"
                                  : "border-border text-muted hover:text-foreground"
                              }`}
                            >
                              {tm.checkedIn ? "CHECKED IN" : "MARK IN"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(status === "LIVE" || matches.length > 0) && (
                    <div className="border border-border bg-surface p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <Mono>MATCH RESOLUTION</Mono>
                        <Mono>
                          {
                            matches.filter((m) => m.status === "COMPLETED")
                              .length
                          }
                          /{matches.length} FINAL
                        </Mono>
                      </div>
                      <div className="space-y-2">
                        {readyMatches.length === 0 && (
                          <p className="font-mono text-xs text-border-strong">
                            No matches awaiting a result.
                          </p>
                        )}
                        {readyMatches.map((m) => (
                          <MatchResolver
                            key={m.id}
                            m={m}
                            teams={teams}
                            busy={busy}
                            can={can}
                            op={op}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {matches.length > 0 && (
                    <div>
                      <Mono className="mb-3 block">
                        LIVE BRACKET — PROJECTION OF STATE
                      </Mono>
                      <Bracket
                        teams={teams as any}
                        matches={matches as any}
                        formatType={t?.formatType}
                        tournamentName={t?.name}
                        game={t?.game}
                      />
                    </div>
                  )}
                </>
              )}

              {tab === "FIXTURES" && (
                <FixturesAdmin
                  matches={matches}
                  teams={teams}
                  busy={busy}
                  can={can}
                  op={op}
                />
              )}

              {(tab === "REGISTRATIONS" || tab === "TEAMS") && (
                <div className="space-y-6">
                  <div className="border border-border bg-surface p-5">
                    <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <Mono>TEAM ROSTERS &amp; SQUAD ENTRIES</Mono>
                          <span className="font-mono text-xs text-accent">
                            ({teams.length}/{t?.slots ?? 8} SLOTS)
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          Official tournament squads imported from Google Form
                          submissions. Verified with Riot IGNs and Discord IDs.
                        </p>
                      </div>
                      {can("tournaments.manage") && (
                        <button
                          onClick={() => setShowAddTeamModal(true)}
                          disabled={busy || teams.length >= (t?.slots ?? 16)}
                          className={primary}
                        >
                          + ADD TEAM (GOOGLE FORM ENTRY)
                        </button>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      {teams.length === 0 && (
                        <div className="py-8 text-center">
                          <Mono>NO TEAMS REGISTERED YET</Mono>
                          <p className="mt-1 text-xs text-muted">
                            Use the button above to add teams from Google Form
                            submissions.
                          </p>
                        </div>
                      )}

                      {teams.map((tm, idx) => {
                        const isExpanded = expandedTeamId === tm.id
                        const isConfirmingRemove = confirmRemoveTeamId === tm.id
                        return (
                          <div
                            key={tm.id}
                            className="border border-border bg-background transition-colors hover:border-border-strong"
                          >
                            {/* Team Row Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                              <div className="flex items-center gap-3">
                                <span className="flex size-7 items-center justify-center border border-accent/40 bg-accent/10 font-mono text-xs font-bold text-accent">
                                  {tm.seed ? `#${tm.seed}` : idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-display text-base font-black text-foreground">
                                      {tm.name}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-accent">
                                      [{tm.tag}]
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted">
                                    <span>REGION: {tm.region}</span>
                                    {tm.igl && (
                                      <span>
                                        · IGL:{" "}
                                        <strong className="text-foreground">
                                          {tm.igl.name} ({tm.igl.inGameName})
                                        </strong>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <StatusChip
                                  status={
                                    tm.approved
                                      ? tm.checkedIn
                                        ? "READY"
                                        : "SCHEDULED"
                                      : "FORFEIT"
                                  }
                                />

                                <button
                                  onClick={() =>
                                    setExpandedTeamId(isExpanded ? null : tm.id)
                                  }
                                  className="border border-border px-2.5 py-1 font-mono text-[10px] text-muted hover:text-foreground"
                                >
                                  {isExpanded
                                    ? "HIDE ROSTER ▲"
                                    : "VIEW ROSTER ▼"}
                                </button>

                                {can("checkins.manage") && (
                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      op(`Check-in ${tm.tag}`, "checkin", {
                                        teamId: tm.id,
                                        value: !tm.checkedIn,
                                      })
                                    }
                                    className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] transition-colors ${
                                      tm.checkedIn
                                        ? "border-success/40 bg-success/10 text-success"
                                        : "border-border text-muted hover:text-foreground"
                                    }`}
                                  >
                                    {tm.checkedIn ? "CHECKED IN" : "MARK IN"}
                                  </button>
                                )}

                                {can("registrations.approve") &&
                                  (!tm.approved ? (
                                    <button
                                      disabled={busy}
                                      onClick={() =>
                                        op(
                                          `Approve ${tm.tag}`,
                                          "approve-team",
                                          { teamId: tm.id },
                                        )
                                      }
                                      className="border border-accent bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold text-accent"
                                    >
                                      APPROVE
                                    </button>
                                  ) : (
                                    <button
                                      disabled={busy}
                                      onClick={() =>
                                        op(`Reject ${tm.tag}`, "reject-team", {
                                          teamId: tm.id,
                                        })
                                      }
                                      className="border border-border px-2.5 py-1 font-mono text-[10px] text-muted hover:text-danger"
                                    >
                                      REJECT
                                    </button>
                                  ))}

                                {can("tournaments.manage") &&
                                  (isConfirmingRemove ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        disabled={busy}
                                        onClick={() => {
                                          op(
                                            `Remove ${tm.name}`,
                                            "remove-team",
                                            { teamId: tm.id },
                                          )
                                          setConfirmRemoveTeamId(null)
                                        }}
                                        className="border border-danger bg-danger/20 px-2 py-1 font-mono text-[10px] text-danger font-bold"
                                      >
                                        CONFIRM REMOVE
                                      </button>
                                      <button
                                        onClick={() =>
                                          setConfirmRemoveTeamId(null)
                                        }
                                        className="border border-border px-2 py-1 font-mono text-[10px] text-muted"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        setConfirmRemoveTeamId(tm.id)
                                      }
                                      className="border border-border px-2 py-1 font-mono text-[10px] text-muted hover:border-danger hover:text-danger"
                                      title="Remove team from tournament"
                                    >
                                      REMOVE
                                    </button>
                                  ))}
                              </div>
                            </div>

                            {/* Expanded Squad Details */}
                            {isExpanded && (
                              <div className="border-t border-border bg-surface p-4 text-xs space-y-3">
                                {tm.igl && (
                                  <div className="border border-accent/40 bg-accent/5 p-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[10px] font-bold text-accent">
                                        👑 IGL (TEAM LEADER)
                                      </span>
                                      <span className="font-mono text-[10px] text-muted">
                                        DISCORD: {tm.igl.discordId || "N/A"}
                                      </span>
                                    </div>
                                    <div className="mt-1 font-mono text-xs">
                                      <strong>{tm.igl.name}</strong> · Valorant
                                      Tag:{" "}
                                      <span className="font-bold text-accent">
                                        {tm.igl.inGameName}
                                      </span>{" "}
                                      · Role: {tm.igl.role || "IGL"}
                                    </div>
                                  </div>
                                )}

                                {Array.isArray(tm.members) &&
                                  tm.members.length > 0 && (
                                    <div>
                                      <div className="font-mono text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                                        STARTING PLAYERS ({tm.members.length})
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {tm.members.map(
                                          (m: any, mi: number) => (
                                            <div
                                              key={mi}
                                              className="border border-border/80 bg-background px-3 py-2"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-bold text-foreground">
                                                  {m.name}
                                                </span>
                                                <span className="font-mono text-[9px] text-accent">
                                                  {m.role || "MEMBER"}
                                                </span>
                                              </div>
                                              <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted">
                                                <span>
                                                  IGN:{" "}
                                                  <strong className="text-foreground">
                                                    {m.inGameName}
                                                  </strong>
                                                </span>
                                                <span>@{m.discordId}</span>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {tm.sub && (
                                  <div className="border border-warning/30 bg-warning/5 p-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[10px] font-bold text-warning">
                                        SUBSTITUTE PLAYER
                                      </span>
                                      <span className="font-mono text-[10px] text-muted">
                                        DISCORD: {tm.sub.discordId || "N/A"}
                                      </span>
                                    </div>
                                    <div className="mt-1 font-mono text-xs">
                                      <strong>{tm.sub.name}</strong> · Valorant
                                      Tag:{" "}
                                      <span className="font-bold text-warning">
                                        {tm.sub.inGameName}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {tm.contactEmail && (
                                  <div className="font-mono text-[10px] text-muted pt-1">
                                    Contact Email:{" "}
                                    <span className="text-foreground">
                                      {tm.contactEmail}
                                    </span>
                                    {tm.registrationNotes && (
                                      <span className="ml-3">
                                        Notes: {tm.registrationNotes}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {tab === "ROSTER" && (
                <RosterAdmin
                  roster={roster}
                  busy={busy}
                  can={can}
                  onSave={(players) =>
                    run(
                      "Save roster",
                      () => api.updateRoster(players),
                      (r) => {
                        setRoster((r as any).players)
                        refreshSite()
                      },
                    )
                  }
                />
              )}

              {tab === "USERS" && (
                <div className="space-y-6">
                  {/* Assign Role by Email (GOD feature) */}
                  <div className="border border-border bg-surface p-5">
                    <Mono>ASSIGN ROLE BY EMAIL</Mono>
                    <p className="mt-1 text-xs text-muted">
                      Grant DEMI_GOD or GOD privileges to any email address.
                      Works for existing accounts or pre-assigns role for future
                      signups.
                    </p>
                    <RoleByEmailForm
                      busy={busy}
                      onAssign={(email, role) =>
                        run(
                          `Assign ${email} → ${role}`,
                          () => api.setUserRoleByEmail({ email, role }),
                          () => load(),
                        )
                      }
                    />
                  </div>

                  {/* Registered Users List */}
                  <div className="border border-border bg-surface p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <Mono>USER ROLES &amp; PERMISSIONS</Mono>
                      <Mono>
                        {users.length} REGISTERED OPERATOR
                        {users.length === 1 ? "" : "S"}
                      </Mono>
                    </div>
                    <div className="grid gap-px border border-border bg-border">
                      {users.length === 0 && (
                        <div className="bg-surface px-4 py-3">
                          <Mono>No users loaded.</Mono>
                        </div>
                      )}
                      {users.map((u) => {
                        const isFounderUser =
                          (u.email ?? "").toLowerCase().trim() ===
                          "raveends70@gmail.com"
                        return (
                          <div
                            key={u.id}
                            className="flex flex-col gap-3 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-foreground">
                                  {u.username}
                                </span>
                                {isFounderUser && (
                                  <span className="border border-accent bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent">
                                    FOUNDER
                                  </span>
                                )}
                              </div>
                              <Mono>
                                {u.email} · {u.region}
                              </Mono>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(["HUMAN", "DEMI_GOD", "GOD"] as const).map(
                                (r) => (
                                  <button
                                    key={r}
                                    disabled={
                                      busy ||
                                      u.role === r ||
                                      (isFounderUser && r !== "GOD")
                                    }
                                    onClick={() =>
                                      run(
                                        `Set ${u.username} → ${r}`,
                                        () =>
                                          api.setUserRole({
                                            userId: u.id,
                                            role: r,
                                          }),
                                        () =>
                                          setUsers((prev) =>
                                            prev.map((x) =>
                                              x.id === u.id
                                                ? { ...x, role: r }
                                                : x,
                                            ),
                                          ),
                                      )
                                    }
                                    className={`font-mono text-[10px] tracking-[0.1em] border px-2.5 py-1 transition-colors ${
                                      u.role === r
                                        ? r === "GOD"
                                          ? "border-accent bg-accent/15 font-bold text-accent"
                                          : r === "DEMI_GOD"
                                            ? "border-success bg-success/15 font-bold text-success"
                                            : "border-border bg-surface-secondary text-foreground"
                                        : "border-border text-muted hover:text-foreground disabled:opacity-40"
                                    }`}
                                  >
                                    {r}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {tab === "ANNOUNCEMENTS" && (
                <AnnouncementsAdmin
                  list={announcements}
                  busy={busy}
                  can={can}
                  onPost={(b) =>
                    run(
                      "Publish announcement",
                      () => api.createAnnouncement(b),
                      (r) => {
                        setAnnouncements((prev) => [
                          (r as any).announcement,
                          ...prev,
                        ])
                        refreshSite()
                      },
                    )
                  }
                  onDelete={(a) =>
                    run(
                      "Delete announcement",
                      () =>
                        api.deleteAnnouncement({
                          id: a.id,
                          ts: a.ts,
                          title: a.title,
                        }),
                      () => {
                        setAnnouncements((prev) =>
                          prev.filter(
                            (item) =>
                              item !== a &&
                              item.id !== a.id &&
                              item.ts !== a.ts &&
                              item.title !== a.title,
                          ),
                        )
                        refreshSite()
                      },
                    )
                  }
                  onEdit={(a, b) =>
                    run(
                      "Update announcement",
                      () =>
                        api.updateAnnouncement({ id: a.id, ts: a.ts, ...b }),
                      (r) => {
                        setAnnouncements((prev) =>
                          prev.map((item) =>
                            item === a || item.id === a.id || item.ts === a.ts
                              ? (r as any).announcement
                              : item,
                          ),
                        )
                        refreshSite()
                      },
                    )
                  }
                />
              )}

              {tab === "AUDIT" && (
                <div className="border border-border bg-surface p-5">
                  <Mono>FULL AUDIT LOG</Mono>
                  <div className="mt-4 divide-y divide-border border border-border">
                    {audit.length === 0 && (
                      <div className="px-4 py-3">
                        <Mono>No entries.</Mono>
                      </div>
                    )}
                    {audit.map((a, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                      >
                        <div>
                          <div className="font-mono text-[11px] text-foreground">
                            {a.action}
                          </div>
                          <Mono>
                            {a.actor} · {a.role}
                          </Mono>
                        </div>
                        <Mono className="shrink-0">
                          {new Date(a.ts).toLocaleString()}
                        </Mono>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="border border-border bg-surface p-5">
                <Mono>OPERATION FEED</Mono>
                <div className="mt-3 space-y-1.5">
                  {feed.length === 0 && (
                    <p className="font-mono text-[11px] text-border-strong">
                      Awaiting actions…
                    </p>
                  )}
                  {feed.map((f, i) => (
                    <div
                      key={i}
                      className={`font-mono text-[10px] leading-relaxed ${
                        f.kind === "err" ? "text-danger" : "text-muted"
                      }`}
                    >
                      {f.kind === "err" ? "✕ " : "› "}
                      {f.msg}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border bg-surface p-5">
                <Mono>SNAPSHOT</Mono>
                <dl className="mt-3 space-y-2">
                  {[
                    ["STATUS", status],
                    ["TEAMS", `${teams.length}/${t?.slots ?? 8}`],
                    ["APPROVED", `${approved}`],
                    ["CHECKED IN", `${checkedIn}`],
                    ["MATCHES", `${matches.length}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="font-mono text-[10px] tracking-[0.1em] text-muted">
                        {k}
                      </dt>
                      <dd className="font-mono text-[11px] tabular-nums">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showCreateModal && (
        <CreateTournamentModal
          busy={busy}
          onClose={() => setShowCreateModal(false)}
          onCreate={(params) => {
            op("Create tournament", "create-tournament", params)
            setShowCreateModal(false)
          }}
        />
      )}

      {showEditModal && t && (
        <EditTournamentModal
          t={t}
          busy={busy}
          onClose={() => setShowEditModal(false)}
          onEdit={(params) => {
            op("Edit tournament", "edit-tournament", params)
            setShowEditModal(false)
          }}
        />
      )}

      {showAddTeamModal && (
        <AddTeamModal
          busy={busy}
          currentCount={teams.length}
          maxSlots={t?.slots ?? 8}
          onClose={() => setShowAddTeamModal(false)}
          onAdd={(teamPayload) => {
            op(`Add team ${teamPayload.name}`, "add-team", teamPayload)
            setShowAddTeamModal(false)
          }}
        />
      )}
    </div>
  )
}

function AnnouncementsAdmin({
  list,
  busy,
  can,
  onPost,
  onDelete,
  onEdit,
}: {
  list: any[]
  busy: boolean
  can: (p: string) => boolean
  onPost: (b: { title: string; body: string; severity: string }) => void
  onDelete: (a: any) => void
  onEdit: (a: any, b: { title: string; body: string; severity: string }) => void
}) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [severity, setSeverity] = useState("INFO")
  // editing: announcement item currently being edited, or null
  const [editing, setEditing] = useState<any | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editSeverity, setEditSeverity] = useState("INFO")
  // confirmDelete: announcement item or id awaiting confirmation, or null
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)

  const input =
    "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"

  function startEdit(a: any) {
    setEditing(a)
    setEditTitle(a.title)
    setEditBody(a.body)
    setEditSeverity(a.severity ?? "INFO")
    setConfirmDelete(null)
  }

  function cancelEdit() {
    setEditing(null)
  }

  function saveEdit() {
    if (!editing) return
    onEdit(editing, {
      title: editTitle,
      body: editBody,
      severity: editSeverity,
    })
    setEditing(null)
  }

  const canEdit = can("announcements.edit")
  const canDelete = can("announcements.delete")

  return (
    <div className="space-y-6">
      {/* Compose */}
      <div className="border border-border bg-surface p-5">
        <Mono>COMPOSE ANNOUNCEMENT</Mono>
        <div className="mt-4 space-y-3">
          <input
            className={input}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={`${input} min-h-24 resize-y`}
            placeholder="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center gap-2">
            {["INFO", "SUCCESS", "WARNING", "DANGER"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`font-mono text-[10px] tracking-[0.1em] border px-2 py-1 ${
                  severity === s
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              className={`${primary} ml-auto`}
              disabled={
                busy || !title || !body || !can("announcements.publish")
              }
              onClick={() => {
                onPost({ title, body, severity })
                setTitle("")
                setBody("")
              }}
            >
              PUBLISH
            </button>
          </div>
        </div>
      </div>

      {/* Published list */}
      <div className="border border-border bg-surface p-5">
        <Mono>PUBLISHED</Mono>
        <div className="mt-4 space-y-2">
          {list.length === 0 && <Mono>None yet.</Mono>}
          {list.map((a) => {
            const isEditing =
              editing &&
              (editing === a || editing.id === a.id || editing.ts === a.ts)
            const isConfirming =
              confirmDelete &&
              (confirmDelete === a ||
                confirmDelete.id === a.id ||
                confirmDelete.ts === a.ts)
            return (
              <div key={a.id ?? a.ts} className="border border-border">
                {isEditing ? (
                  /* ── Inline edit form ── */
                  <div className="space-y-2 p-3">
                    <input
                      className={input}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <textarea
                      className={`${input} min-h-20 resize-y`}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      {["INFO", "SUCCESS", "WARNING", "DANGER"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setEditSeverity(s)}
                          className={`font-mono text-[10px] tracking-[0.1em] border px-2 py-1 ${
                            editSeverity === s
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border text-muted"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="border border-border px-3 py-1 font-mono text-[10px] tracking-[0.1em] text-muted hover:border-foreground hover:text-foreground"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={busy || !editTitle || !editBody}
                          className={primary}
                        >
                          SAVE
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Normal read row ── */
                  <div className="flex items-start justify-between gap-4 p-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <StatusChip status={a.severity} />
                      <div className="min-w-0">
                        <div className="font-display text-sm font-bold">
                          {a.title}
                        </div>
                        <div className="text-sm text-muted">{a.body}</div>
                        {a.editedAt && (
                          <div className="mt-0.5 font-mono text-[9px] text-muted/60">
                            Edited {new Date(a.editedAt).toLocaleString()} by{" "}
                            {a.editedBy}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Mono className="shrink-0">
                        {new Date(a.ts).toLocaleDateString()}
                      </Mono>
                      {canEdit && (
                        <button
                          onClick={() => startEdit(a)}
                          className="border border-border px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-muted transition-colors hover:border-accent hover:text-accent"
                          title="Edit announcement"
                        >
                          EDIT
                        </button>
                      )}
                      {canDelete &&
                        (isConfirming ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                onDelete(a)
                                setConfirmDelete(null)
                              }}
                              className="border border-danger bg-danger/10 px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-danger transition-colors hover:bg-danger/20"
                            >
                              CONFIRM
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="border border-border px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-muted hover:text-foreground"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmDelete(a)
                              setEditing(null)
                            }}
                            className="border border-border px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-muted transition-colors hover:border-danger hover:text-danger"
                            title="Delete announcement"
                          >
                            DELETE
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const GAME_PRESETS = [
  "VALORANT",
  "CS2",
  "LEAGUE OF LEGENDS",
  "DOTA 2",
  "APEX LEGENDS",
  "OVERWATCH 2",
  "ROCKET LEAGUE",
  "RAINBOW SIX",
]
const ROLE_PRESETS = [
  "DUELIST",
  "SENTINEL",
  "CONTROLLER",
  "INITIATOR",
  "IGL",
  "AWPER",
  "ENTRY FRAGGER",
  "MID LANER",
  "CARRY",
  "SUPPORT",
  "OFFLANER",
  "FLEX",
  "SUB",
  "COACH",
  "ANALYST",
  "MANAGER",
]
const REGION_PRESETS = ["GLOBAL", "NA", "EU", "APAC", "SA", "MENA"]

function RoleByEmailForm({
  busy,
  onAssign,
}: {
  busy: boolean
  onAssign: (email: string, role: "GOD" | "DEMI_GOD" | "HUMAN") => void
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"GOD" | "DEMI_GOD" | "HUMAN">("DEMI_GOD")
  const input =
    "w-full border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent placeholder:text-border-strong"

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        className={`${input} flex-1`}
        placeholder="operator@email.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex items-center gap-1.5">
        {(["HUMAN", "DEMI_GOD", "GOD"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`border px-2.5 py-2 font-mono text-[10px] font-bold tracking-[0.1em] transition-colors ${
              role === r
                ? r === "GOD"
                  ? "border-accent bg-accent/20 text-accent"
                  : r === "DEMI_GOD"
                    ? "border-success bg-success/20 text-success"
                    : "border-foreground bg-foreground text-background"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || !email.trim()}
        onClick={() => {
          if (email.trim()) {
            onAssign(email.trim(), role)
            setEmail("")
          }
        }}
        className={`${primary} whitespace-nowrap`}
      >
        {busy ? "ASSIGNING…" : `ASSIGN ${role}`}
      </button>
    </div>
  )
}

function RosterAdmin({
  roster,
  busy,
  can,
  onSave,
}: {
  roster: Player[]
  busy: boolean
  can: (p: string) => boolean
  onSave: (players: Player[]) => void
}) {
  const [players, setPlayers] = useState<Player[]>(roster)
  const [dirty, setDirty] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  // Re-sync when a save round-trips or the roster first loads (until edited).
  useEffect(() => {
    if (!dirty) setPlayers(roster)
  }, [roster, dirty])

  const input =
    "w-full border border-border bg-background px-2.5 py-2 text-sm outline-none transition-colors focus:border-accent placeholder:text-border-strong"

  function edit(i: number, patch: Partial<Player>) {
    setDirty(true)
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    )
  }

  function handleGameChange(i: number, newGame: string) {
    const cfg = getGameConfig(newGame)
    edit(i, {
      game: newGame,
      role: cfg.roles[0] || "PLAYER",
      rank: cfg.ranks[0] || "",
    })
  }

  const [cropTarget, setCropTarget] = useState<{
    index: number
    src: string
  } | null>(null)

  function handleFileSelect(i: number, file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) {
        setCropTarget({ index: i, src: reader.result as string })
      }
    }
    reader.readAsDataURL(file)
  }

  function remove(i: number) {
    setDirty(true)
    setPlayers((prev) => prev.filter((_, idx) => idx !== i))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= players.length) return
    setDirty(true)
    setPlayers((prev) => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function add() {
    setDirty(true)
    const defaultGame = "VALORANT"
    const cfg = getGameConfig(defaultGame)
    setPlayers((prev) => [
      ...prev,
      {
        handle: "",
        name: "",
        role: cfg.roles[0] || "DUELIST",
        game: defaultGame,
        rank: cfg.ranks[0] || "Radiant",
        winnings: "$0",
        region: "GLOBAL",
        image: "",
      },
    ])
  }

  const canManage = can("roster.manage")

  return (
    <div className="border border-border bg-surface p-5">
      {/* Interactive Crop Modal */}
      {cropTarget && (
        <ImageCropperModal
          imageSrc={cropTarget.src}
          onCropComplete={(croppedUrl) => {
            edit(cropTarget.index, { image: croppedUrl })
            setCropTarget(null)
          }}
          onCancel={() => setCropTarget(null)}
        />
      )}

      <div className="mb-4 flex items-center justify-between">
        <Mono>HOUSE ROSTER MANAGEMENT</Mono>
        <Mono>
          {players.length} OPERATOR{players.length === 1 ? "" : "S"}
          {dirty ? " · UNSAVED" : ""}
        </Mono>
      </div>

      <div className="space-y-4">
        {players.length === 0 && (
          <p className="font-mono text-xs text-border-strong">
            No players yet. Add your first operator below.
          </p>
        )}
        {players.map((p, i) => {
          const gameKey = p.game || "VALORANT"
          const cfg = getGameConfig(gameKey)

          return (
            <div key={i} className="border border-border p-4 bg-background/60">
              <div className="flex flex-col gap-4 lg:flex-row">
                {/* Image Preview & Local Upload with Crop Action */}
                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <div
                    className="grain relative flex size-24 shrink-0 items-center justify-center overflow-hidden border border-border-strong bg-background"
                    aria-hidden="true"
                  >
                    {uploadingIdx === i ? (
                      <span className="font-mono text-[10px] text-accent animate-pulse">
                        UPLOADING…
                      </span>
                    ) : p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        className="size-full object-cover"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).style.visibility =
                            "hidden")
                        }
                      />
                    ) : (
                      <span className="relative z-10 font-display text-2xl font-black text-border-strong">
                        {(p.handle || "?").slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="cursor-pointer border border-border px-2.5 py-1 text-center font-mono text-[9px] tracking-[0.1em] text-accent transition-colors hover:border-accent hover:bg-accent/10">
                      <span>
                        📁 {p.image ? "REPLACE PHOTO" : "UPLOAD PHOTO"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleFileSelect(i, f)
                        }}
                      />
                    </label>
                    {p.image && (
                      <button
                        type="button"
                        onClick={() =>
                          setCropTarget({ index: i, src: p.image! })
                        }
                        className="border border-border-strong px-2 py-0.5 font-mono text-[9px] text-foreground hover:border-accent hover:text-accent transition-colors"
                      >
                        ✂ ADJUST / CROP
                      </button>
                    )}
                    {p.image && (
                      <button
                        type="button"
                        onClick={() => edit(i, { image: "" })}
                        className="font-mono text-[9px] text-danger hover:underline text-center"
                      >
                        ✕ Clear Photo
                      </button>
                    )}
                  </div>
                </div>

                {/* Operator Fields */}
                <div className="grid flex-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Handle */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      GAMER HANDLE
                    </label>
                    <input
                      className={input}
                      placeholder="e.g. TITAN, SPECTRE"
                      value={p.handle}
                      onChange={(e) =>
                        edit(i, { handle: e.target.value.toUpperCase() })
                      }
                    />
                  </div>

                  {/* Real Name */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      REAL NAME
                    </label>
                    <input
                      className={input}
                      placeholder="e.g. Rave Ends"
                      value={p.name}
                      onChange={(e) => edit(i, { name: e.target.value })}
                    />
                  </div>

                  {/* Game Selection */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      COMPETITIVE GAME
                    </label>
                    <select
                      className={input}
                      value={gameKey}
                      onChange={(e) => handleGameChange(i, e.target.value)}
                    >
                      {GAME_LIST.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Game-Specific Role */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      {gameKey} ROLE
                    </label>
                    <div className="relative">
                      <input
                        className={input}
                        placeholder="Select or type role"
                        list={`roles-${i}`}
                        value={p.role}
                        onChange={(e) =>
                          edit(i, { role: e.target.value.toUpperCase() })
                        }
                      />
                      <datalist id={`roles-${i}`}>
                        {cfg.roles.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Game-Specific Rank */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      {gameKey} RANK
                    </label>
                    <div className="relative">
                      <input
                        className={input}
                        placeholder="Select or type rank"
                        list={`ranks-${i}`}
                        value={p.rank ?? ""}
                        onChange={(e) => edit(i, { rank: e.target.value })}
                      />
                      <datalist id={`ranks-${i}`}>
                        {cfg.ranks.map((rk) => (
                          <option key={rk} value={rk} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Earnings / Winnings */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      TOTAL EARNINGS
                    </label>
                    <input
                      className={input}
                      placeholder="e.g. $75,000"
                      value={p.winnings ?? ""}
                      onChange={(e) => edit(i, { winnings: e.target.value })}
                    />
                  </div>

                  {/* Region */}
                  <div>
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      REGION
                    </label>
                    <select
                      className={input}
                      value={
                        REGION_PRESETS.includes(p.region) ? p.region : "GLOBAL"
                      }
                      onChange={(e) => edit(i, { region: e.target.value })}
                    >
                      {REGION_PRESETS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direct Image URL fallback */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-mono text-[9px] text-muted">
                      IMAGE URL (OPTIONAL)
                    </label>
                    <input
                      className={input}
                      placeholder="https://images.unsplash.com/... or uploaded photo"
                      value={p.image ?? ""}
                      onChange={(e) => edit(i, { image: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Operator footer bar */}
              <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted">
                  <span className="font-bold text-accent">
                    {p.game || "VALORANT"}
                  </span>
                  <span>·</span>
                  <span>{p.role || "FLEX"}</span>
                  {p.rank && (
                    <>
                      <span>·</span>
                      <span className="text-foreground">{p.rank}</span>
                    </>
                  )}
                  {p.winnings && (
                    <>
                      <span>·</span>
                      <span className="text-accent">{p.winnings}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-foreground disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === players.length - 1}
                    className="border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-foreground disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => remove(i)}
                    className="border border-danger/40 px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-danger hover:bg-danger/5"
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button onClick={add} className={btn} disabled={!canManage}>
          + ADD OPERATOR
        </button>
        <button
          onClick={() => {
            setDirty(false)
            setPlayers(roster)
          }}
          disabled={!dirty}
          className={`${btn} disabled:opacity-40`}
        >
          DISCARD
        </button>
        <button
          onClick={() => {
            onSave(players.filter((p) => p.handle.trim()))
            setDirty(false)
          }}
          disabled={busy || !dirty || !canManage}
          className={`${primary} ml-auto`}
        >
          {busy ? "SAVING…" : "PUBLISH ROSTER"}
        </button>
      </div>
      {!canManage && (
        <Mono className="mt-2 block text-danger">
          Requires roster.manage permission
        </Mono>
      )}
    </div>
  )
}

function MatchResolver({
  m,
  teams,
  busy,
  can,
  op,
}: {
  m: any
  teams: any[]
  busy: boolean
  can: (p: string) => boolean
  op: (label: string, action: string, body?: Record<string, unknown>) => void
}) {
  const [sa, setSa] = useState("13")
  const [sb, setSb] = useState("11")
  const a = teams.find((x) => x.id === m.a)
  const b = teams.find((x) => x.id === m.b)
  const disputed = m.status === "DISPUTED"
  const scoreInput =
    "w-14 border border-border bg-background px-2 py-1 text-center font-mono text-sm outline-none focus:border-accent"

  return (
    <div
      className={`border p-3 ${
        disputed ? "border-danger/40 bg-danger/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted">
          {m.id} · {m.round}
        </span>
        <StatusChip status={m.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="w-28 truncate text-sm">{a?.tag ?? "—"}</span>
        <input
          className={scoreInput}
          value={sa}
          onChange={(e) => setSa(e.target.value)}
        />
        <span className="text-border-strong">:</span>
        <input
          className={scoreInput}
          value={sb}
          onChange={(e) => setSb(e.target.value)}
        />
        <span className="w-28 truncate text-sm">{b?.tag ?? "—"}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!disputed && (
          <>
            <button
              className="border border-border-strong px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] hover:bg-surface-hover disabled:opacity-40"
              disabled={busy || !can("matches.resolve")}
              onClick={() =>
                op(`Finalize ${m.id}`, "submit-result", {
                  matchId: m.id,
                  scoreA: Number(sa),
                  scoreB: Number(sb),
                })
              }
            >
              FINALIZE RESULT
            </button>
            <button
              className="border border-warning/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-warning hover:bg-warning/5 disabled:opacity-40"
              disabled={busy || !can("matches.resolve")}
              onClick={() =>
                op(`Forfeit ${m.id}`, "forfeit", {
                  matchId: m.id,
                  teamId: m.b,
                  reason: "No-show",
                })
              }
            >
              FORFEIT {b?.tag}
            </button>
            <button
              className="border border-danger/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-danger hover:bg-danger/5 disabled:opacity-40"
              disabled={busy || !can("disputes.create")}
              onClick={() =>
                op(`Dispute ${m.id}`, "dispute", {
                  matchId: m.id,
                  reason: "Score mismatch",
                })
              }
            >
              OPEN DISPUTE
            </button>
          </>
        )}
        {disputed && (
          <button
            className="bg-accent px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] text-accent-foreground disabled:opacity-40"
            disabled={busy || !can("disputes.resolve")}
            onClick={() =>
              op(`Resolve ${m.id}`, "resolve-dispute", {
                matchId: m.id,
                scoreA: Number(sa),
                scoreB: Number(sb),
                reason: "Evidence reviewed",
              })
            }
          >
            RESOLVE DISPUTE
          </button>
        )}
      </div>
    </div>
  )
}

// ==========================================
// TOURNAMENT & TEAM MODALS
// ==========================================

const GAME_OPTIONS = [
  "VALORANT",
  "CS2",
  "LEAGUE OF LEGENDS",
  "DOTA 2",
  "APEX LEGENDS",
  "OVERWATCH 2",
  "RAINBOW SIX SIEGE",
  "ROCKET LEAGUE",
  "CALL OF DUTY",
  "FORTNITE",
  "CUSTOM / OTHER",
]

const FORMAT_OPTIONS: { id: string; label: string; desc: string }[] = [
  {
    id: "KNOCKOUT",
    label: "Single Elimination (Knockout)",
    desc: "Direct single bracket, winner advances",
  },
  {
    id: "DOUBLE_ELIM",
    label: "Double Elimination (Upper & Lower)",
    desc: "Upper bracket + Losers lower bracket + Grand Final",
  },
  {
    id: "ROUND_ROBIN",
    label: "Round Robin (League Table)",
    desc: "Every team plays every other team; table standings",
  },
  {
    id: "SWISS",
    label: "Swiss System (3W Advance / 3L Elim)",
    desc: "Record-based rounds (CS Major / VCT format)",
  },
  {
    id: "GSL_GROUPS",
    label: "GSL Dual-Tournament Groups → Playoffs",
    desc: "4-team GSL groups into playoffs",
  },
]

function CreateTournamentModal({
  busy,
  onClose,
  onCreate,
}: {
  busy: boolean
  onClose: () => void
  onCreate: (params: any) => void
}) {
  const [name, setName] = useState("VANTA VALORANT INVITATIONAL 2026")
  const [game, setGame] = useState("VALORANT")
  const [customGame, setCustomGame] = useState("")
  const [season, setSeason] = useState("SEASON 01")
  const [formatType, setFormatType] = useState("KNOCKOUT")
  const [format, setFormat] = useState("Single Elimination Knockout · BO1")
  const [slots, setSlots] = useState("8")
  const [prizePool, setPrizePool] = useState("$50,000")
  const [region, setRegion] = useState("GLOBAL")
  const [registrationDeadline, setRegistrationDeadline] = useState(
    "2026-09-10 18:00 UTC",
  )
  const [startDate, setStartDate] = useState("2026-09-12 16:00 UTC")

  const inputClass =
    "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"

  const activeGame = game === "CUSTOM / OTHER" ? customGame || "ESPORTS" : game

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl border border-accent bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-accent">
              CREATE TOURNAMENT
            </span>
            <span className="font-mono text-[10px] text-muted">
              (GOD / DEMI_GOD)
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3.5 max-h-[72vh] overflow-y-auto pr-1">
          {/* Game Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted">
                COMPETITIVE GAME
              </label>
              <select
                className={`${inputClass} mt-1`}
                value={game}
                onChange={(e) => {
                  setGame(e.target.value)
                  if (e.target.value !== "CUSTOM / OTHER") {
                    setName(`VANTA ${e.target.value} CHAMPIONSHIP 2026`)
                  }
                }}
              >
                {GAME_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            {game === "CUSTOM / OTHER" ? (
              <div>
                <label className="font-mono text-[10px] text-muted">
                  CUSTOM GAME TITLE
                </label>
                <input
                  className={`${inputClass} mt-1`}
                  placeholder="Enter game title"
                  value={customGame}
                  onChange={(e) => setCustomGame(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="font-mono text-[10px] text-muted">
                  REGION / SERVER
                </label>
                <select
                  className={`${inputClass} mt-1`}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  {[
                    "GLOBAL",
                    "NA",
                    "EU",
                    "APAC",
                    "SA",
                    "MENA",
                    "KOREA",
                    "JAPAN",
                    "CHINA",
                  ].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tournament Name */}
          <div>
            <label className="font-mono text-[10px] text-muted">
              TOURNAMENT NAME
            </label>
            <input
              className={`${inputClass} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VANTA VALORANT INVITATIONAL 2026"
            />
          </div>

          {/* Format Type */}
          <div>
            <label className="font-mono text-[10px] text-muted">
              TOURNAMENT FORMAT TYPE
            </label>
            <select
              className={`${inputClass} mt-1 font-mono font-bold text-accent`}
              value={formatType}
              onChange={(e) => {
                setFormatType(e.target.value)
                const opt = FORMAT_OPTIONS.find((f) => f.id === e.target.value)
                if (opt) setFormat(`${opt.label} · BO1/BO3`)
              }}
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="mt-1 font-mono text-[9px] text-muted">
              {FORMAT_OPTIONS.find((f) => f.id === formatType)?.desc}
            </p>
          </div>

          {/* Dates: Registration End & Start Date */}
          <div className="grid grid-cols-2 gap-3 border border-border bg-background/40 p-3">
            <div>
              <label className="font-mono text-[9px] font-bold text-muted uppercase">
                REGISTRATION DEADLINE (END DATE)
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                placeholder="e.g. 2026-09-10 18:00 UTC"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold text-muted uppercase">
                TOURNAMENT START DATE
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="e.g. 2026-09-12 16:00 UTC"
              />
            </div>
          </div>

          {/* Slots, Prize, Season */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted">
                TEAM CAPACITY
              </label>
              <select
                className={`${inputClass} mt-1`}
                value={slots}
                onChange={(e) => setSlots(e.target.value)}
              >
                <option value="4">4 Teams</option>
                <option value="8">8 Teams</option>
                <option value="12">12 Teams</option>
                <option value="16">16 Teams</option>
                <option value="24">24 Teams</option>
                <option value="32">32 Teams</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted">
                PRIZE POOL
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="e.g. $50,000"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted">
                SEASON / SERIES
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="e.g. SEASON 01"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="border border-border px-4 py-2 font-mono text-xs text-muted hover:text-foreground"
          >
            CANCEL
          </button>
          <button
            disabled={busy || !name.trim()}
            onClick={() =>
              onCreate({
                name,
                game: activeGame,
                season,
                format,
                formatType,
                slots: Number(slots),
                prizePool,
                region,
                registrationDeadline,
                startDate,
              })
            }
            className="bg-accent px-5 py-2 font-mono text-xs font-bold text-accent-foreground disabled:opacity-50"
          >
            {busy ? "CREATING…" : "CREATE TOURNAMENT"}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditTournamentModal({
  t,
  busy,
  onClose,
  onEdit,
}: {
  t: any
  busy: boolean
  onClose: () => void
  onEdit: (params: any) => void
}) {
  const [name, setName] = useState(t.name || "")
  const [game, setGame] = useState(t.game || "VALORANT")
  const [season, setSeason] = useState(t.season || "SEASON 01")
  const [formatType, setFormatType] = useState(t.formatType || "KNOCKOUT")
  const [format, setFormat] = useState(
    t.format || "Single Elimination Knockout · BO1",
  )
  const [slots, setSlots] = useState(String(t.slots || 8))
  const [prizePool, setPrizePool] = useState(t.prizePool || "$50,000")
  const [region, setRegion] = useState(t.region || "GLOBAL")
  const [registrationDeadline, setRegistrationDeadline] = useState(
    t.registrationDeadline || "2026-09-10 18:00 UTC",
  )
  const [startDate, setStartDate] = useState(
    t.startDate || "2026-09-12 16:00 UTC",
  )
  const [status, setStatus] = useState(t.status || "DRAFT")

  const inputClass =
    "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl border border-accent bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-accent">
              EDIT TOURNAMENT SETTINGS
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3.5 max-h-[72vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted">
                COMPETITIVE GAME
              </label>
              <select
                className={`${inputClass} mt-1`}
                value={game}
                onChange={(e) => setGame(e.target.value)}
              >
                {GAME_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted">
                STAGE STATUS
              </label>
              <select
                className={`${inputClass} mt-1`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  "DRAFT",
                  "REGISTRATION_OPEN",
                  "REGISTRATION_CLOSED",
                  "ROSTER_LOCK",
                  "CHECK_IN_OPEN",
                  "CHECK_IN_CLOSED",
                  "SEEDING",
                  "BRACKET_LOCKED",
                  "LIVE",
                  "COMPLETED",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] text-muted">
              TOURNAMENT NAME
            </label>
            <input
              className={`${inputClass} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="font-mono text-[10px] text-muted">
              TOURNAMENT FORMAT TYPE
            </label>
            <select
              className={`${inputClass} mt-1 font-mono font-bold text-accent`}
              value={formatType}
              onChange={(e) => {
                setFormatType(e.target.value)
                const opt = FORMAT_OPTIONS.find((f) => f.id === e.target.value)
                if (opt) setFormat(`${opt.label} · BO1/BO3`)
              }}
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 border border-border bg-background/40 p-3">
            <div>
              <label className="font-mono text-[9px] font-bold text-muted uppercase">
                REGISTRATION DEADLINE
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
              />
            </div>
            <div>
              <label className="font-mono text-[9px] font-bold text-muted uppercase">
                START DATE
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted">
                TEAM CAPACITY
              </label>
              <select
                className={`${inputClass} mt-1`}
                value={slots}
                onChange={(e) => setSlots(e.target.value)}
              >
                <option value="4">4 Teams</option>
                <option value="8">8 Teams</option>
                <option value="12">12 Teams</option>
                <option value="16">16 Teams</option>
                <option value="24">24 Teams</option>
                <option value="32">32 Teams</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted">
                PRIZE POOL
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted">REGION</label>
              <select
                className={`${inputClass} mt-1`}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {[
                  "GLOBAL",
                  "NA",
                  "EU",
                  "APAC",
                  "SA",
                  "MENA",
                  "KOREA",
                  "JAPAN",
                  "CHINA",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="border border-border px-4 py-2 font-mono text-xs text-muted hover:text-foreground"
          >
            CANCEL
          </button>
          <button
            disabled={busy || !name.trim()}
            onClick={() =>
              onEdit({
                name,
                game,
                season,
                format,
                formatType,
                slots: Number(slots),
                prizePool,
                region,
                registrationDeadline,
                startDate,
                status,
              })
            }
            className="bg-accent px-5 py-2 font-mono text-xs font-bold text-accent-foreground disabled:opacity-50"
          >
            {busy ? "SAVING…" : "SAVE CHANGES"}
          </button>
        </div>
      </div>
    </div>
  )
}

function FixturesAdmin({
  matches,
  teams,
  busy,
  can,
  op,
}: {
  matches: Match[]
  teams: Team[]
  busy: boolean
  can: (p: string) => boolean
  op: (label: string, action: string, body?: any) => void
}) {
  const canManage = can("tournaments.manage")
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [teamA, setTeamA] = useState<string>("")
  const [teamB, setTeamB] = useState<string>("")
  const [time, setTime] = useState<string>("")
  const [format, setFormat] = useState<"BO1" | "BO3" | "BO5">("BO1")
  const [roundName, setRoundName] = useState<string>("")

  function startEditFixture(m: Match) {
    setEditingMatchId(m.id)
    setTeamA(m.a || "")
    setTeamB(m.b || "")
    setTime(m.time || "")
    setFormat(m.format || "BO1")
    setRoundName(m.round || "")
  }

  function saveFixture(matchId: string) {
    op(`Update Fixture ${matchId}`, "update-fixture", {
      matchId,
      teamAId: teamA || null,
      teamBId: teamB || null,
      time,
      format,
      roundName,
    })
    setEditingMatchId(null)
  }

  return (
    <div className="space-y-6">
      <div className="border border-border bg-surface p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
          <div>
            <Mono>TOURNAMENT FIXTURES &amp; MATCH-UPS</Mono>
            <p className="mt-1 text-xs text-muted">
              GOD &amp; DEMI_GOD match-up controls: pair any team against any
              team, change series formats, scheduled match times, or
              auto-generate pairings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => op("Generate format fixtures", "generate-bracket")}
              disabled={busy || !canManage}
              className={btn}
            >
              ⚡ AUTO-GENERATE BRACKET
            </button>
            <button
              onClick={() =>
                op("Randomize team seeds", "seed-teams", { method: "random" })
              }
              disabled={busy || !canManage || teams.length < 2}
              className={btn}
            >
              🎲 RANDOMIZE SEEDS
            </button>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="py-12 text-center">
            <Mono className="text-muted">NO FIXTURES GENERATED YET</Mono>
            <p className="mt-1 text-xs text-muted">
              Click &quot;Auto-Generate Bracket&quot; above to create match
              fixtures based on your selected tournament format.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {matches.map((m) => {
              const isEditing = editingMatchId === m.id
              const teamAObj = teams.find((x) => x.id === m.a)
              const teamBObj = teams.find((x) => x.id === m.b)

              return (
                <div
                  key={m.id}
                  className="border border-border bg-surface-raised p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">
                        {m.id}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        · {m.round}
                      </span>
                    </div>
                    <span className="border border-border bg-surface px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted">
                      {m.format || "BO1"}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 border border-accent/40 bg-accent/5 p-3">
                      <div>
                        <label className="font-mono text-[8px] text-muted">
                          ROUND TITLE
                        </label>
                        <input
                          className="w-full border border-border bg-background px-2 py-1 font-mono text-xs"
                          value={roundName}
                          onChange={(e) => setRoundName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-mono text-[8px] text-muted">
                            TEAM A
                          </label>
                          <select
                            className="w-full border border-border bg-background px-2 py-1 font-mono text-xs"
                            value={teamA}
                            onChange={(e) => setTeamA(e.target.value)}
                          >
                            <option value="">-- AWAITING (TBD) --</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                [{t.tag}] {t.name} (Seed {t.seed ?? "—"})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-mono text-[8px] text-muted">
                            TEAM B
                          </label>
                          <select
                            className="w-full border border-border bg-background px-2 py-1 font-mono text-xs"
                            value={teamB}
                            onChange={(e) => setTeamB(e.target.value)}
                          >
                            <option value="">-- AWAITING (TBD) --</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                [{t.tag}] {t.name} (Seed {t.seed ?? "—"})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-mono text-[8px] text-muted">
                            SERIES FORMAT
                          </label>
                          <select
                            className="w-full border border-border bg-background px-2 py-1 font-mono text-xs"
                            value={format}
                            onChange={(e) => setFormat(e.target.value as any)}
                          >
                            <option value="BO1">Best of 1 (BO1)</option>
                            <option value="BO3">Best of 3 (BO3)</option>
                            <option value="BO5">Best of 5 (BO5)</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-mono text-[8px] text-muted">
                            MATCH SCHEDULE / TIME
                          </label>
                          <input
                            className="w-full border border-border bg-background px-2 py-1 font-mono text-xs"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            placeholder="e.g. Sep 14, 18:00 UTC"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          onClick={() => setEditingMatchId(null)}
                          className="border border-border px-3 py-1 font-mono text-[10px] text-muted hover:text-foreground"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={() => saveFixture(m.id)}
                          className="bg-accent px-4 py-1 font-mono text-[10px] font-bold text-accent-foreground"
                        >
                          SAVE FIXTURE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border border-border/50 bg-background/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-muted">
                            {teamAObj?.seed != null ? `#${teamAObj.seed}` : "—"}
                          </span>
                          <span className="font-bold text-foreground text-xs">
                            {teamAObj
                              ? `${teamAObj.name} [${teamAObj.tag}]`
                              : "TBD"}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-accent">
                          {m.scoreA ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border border-border/50 bg-background/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-muted">
                            {teamBObj?.seed != null ? `#${teamBObj.seed}` : "—"}
                          </span>
                          <span className="font-bold text-foreground text-xs">
                            {teamBObj
                              ? `${teamBObj.name} [${teamBObj.tag}]`
                              : "TBD"}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-accent">
                          {m.scoreB ?? "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-muted">
                        <span>
                          {m.time || "SCHEDULED"} · {m.server}
                        </span>
                        {canManage && (
                          <button
                            onClick={() => startEditFixture(m)}
                            className="border border-border px-2 py-0.5 text-[9px] text-muted hover:border-accent hover:text-accent"
                          >
                            ✎ EDIT FIXTURE
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function AddTeamModal({
  busy,
  currentCount,
  maxSlots,
  onClose,
  onAdd,
}: {
  busy: boolean
  currentCount: number
  maxSlots: number
  onClose: () => void
  onAdd: (payload: any) => void
}) {
  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [region, setRegion] = useState("GLOBAL")
  const [seed, setSeed] = useState(String(currentCount + 1))
  const [contactEmail, setContactEmail] = useState("")
  const [registrationNotes, setRegistrationNotes] = useState("")

  // IGL
  const [iglName, setIglName] = useState("")
  const [iglIgn, setIglIgn] = useState("")
  const [iglDiscord, setIglDiscord] = useState("")
  const [iglRole, setIglRole] = useState("IGL")

  // 4 Starters
  const [members, setMembers] = useState([
    { name: "", inGameName: "", discordId: "", role: "DUELIST" },
    { name: "", inGameName: "", discordId: "", role: "INITIATOR" },
    { name: "", inGameName: "", discordId: "", role: "CONTROLLER" },
    { name: "", inGameName: "", discordId: "", role: "SENTINEL" },
  ])

  // Sub
  const [subName, setSubName] = useState("")
  const [subIgn, setSubIgn] = useState("")
  const [subDiscord, setSubDiscord] = useState("")

  const updateMember = (index: number, field: string, value: string) => {
    const updated = [...members]
    ;(updated[index] as any)[field] = value
    setMembers(updated)
  }

  const fillSampleTeam = () => {
    const samples = [
      {
        name: "Paper Rex",
        tag: "PRX",
        region: "APAC",
        igl: {
          name: "Alexandre Sallé",
          ign: "alecks#SG1",
          discord: "alecks_prx",
          role: "IGL",
        },
        m: [
          {
            name: "Jason Susanto",
            ign: "f0rsakeN#ID1",
            discord: "forsaken_prx",
            role: "FLEX",
          },
          {
            name: "Ilya Petrov",
            ign: "something#RU1",
            discord: "something_prx",
            role: "DUELIST",
          },
          {
            name: "Khalish Rusyaidi",
            ign: "d4v41#MY1",
            discord: "davai_prx",
            role: "INITIATOR",
          },
          {
            name: "Aaron Leonhart",
            ign: "mindfreak#ID1",
            discord: "mindfreak_prx",
            role: "CONTROLLER",
          },
        ],
        sub: {
          name: "Wang Jing Jie",
          ign: "Jinggg#SG1",
          discord: "jinggg_prx",
        },
      },
      {
        name: "Sentinels",
        tag: "SEN",
        region: "NA",
        igl: {
          name: "Tyson Ngo",
          ign: "TenZ#NA1",
          discord: "tenz_official",
          role: "IGL",
        },
        m: [
          {
            name: "Zachary Patrone",
            ign: "zekken#NA1",
            discord: "zekken_fps",
            role: "DUELIST",
          },
          {
            name: "Gustavo Rossi",
            ign: "Sacy#BR1",
            discord: "sacy_vlr",
            role: "INITIATOR",
          },
          {
            name: "Bryan Luna",
            ign: "pANcada#BR1",
            discord: "pancada_vlr",
            role: "CONTROLLER",
          },
          {
            name: "Jordan Montemurro",
            ign: "Zellsis#NA1",
            discord: "zellsis_vlr",
            role: "SENTINEL",
          },
        ],
        sub: { name: "Rahul Gosain", ign: "curry#NA1", discord: "curry_fps" },
      },
    ]

    const pick = samples[currentCount % samples.length]
    setName(pick.name)
    setTag(pick.tag)
    setRegion(pick.region)
    setIglName(pick.igl.name)
    setIglIgn(pick.igl.ign)
    setIglDiscord(pick.igl.discord)
    setIglRole(pick.igl.role)
    setMembers(
      pick.m.map((x) => ({
        name: x.name,
        inGameName: x.ign,
        discordId: x.discord,
        role: x.role,
      })),
    )
    setSubName(pick.sub.name)
    setSubIgn(pick.sub.ign)
    setSubDiscord(pick.sub.discord)
    setContactEmail(`ops@${pick.tag.toLowerCase()}.gg`)
    setRegistrationNotes(
      "Imported from Official Tournament Google Form submission",
    )
  }

  const inputClass =
    "w-full border border-border bg-background px-3 py-1.5 font-mono text-xs outline-none focus:border-accent"

  const handleSave = () => {
    if (!name.trim() || !tag.trim()) return
    const payload = {
      name: name.trim(),
      tag: tag.trim().toUpperCase(),
      region,
      seed: seed ? Number(seed) : currentCount + 1,
      contactEmail: contactEmail.trim() || undefined,
      registrationNotes: registrationNotes.trim() || undefined,
      igl: iglIgn.trim()
        ? {
            name: iglName.trim() || iglIgn.trim(),
            inGameName: iglIgn.trim(),
            discordId: iglDiscord.trim(),
            role: iglRole.trim() || "IGL",
          }
        : undefined,
      members: members
        .filter((m) => m.inGameName.trim())
        .map((m) => ({
          name: m.name.trim() || m.inGameName.trim(),
          inGameName: m.inGameName.trim(),
          discordId: m.discordId.trim(),
          role: m.role.trim() || "MEMBER",
        })),
      sub: subIgn.trim()
        ? {
            name: subName.trim() || subIgn.trim(),
            inGameName: subIgn.trim(),
            discordId: subDiscord.trim(),
          }
        : undefined,
    }
    onAdd(payload)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl border border-accent bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <span className="font-mono text-xs font-bold text-accent">
              ADD TEAM (GOOGLE FORM INGESTION)
            </span>
            <div className="font-mono text-[10px] text-muted">
              Slot {currentCount + 1} of {maxSlots}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fillSampleTeam}
              className="border border-accent/60 bg-accent/10 px-2 py-1 font-mono text-[9px] font-bold text-accent hover:bg-accent/20"
              title="Autofill a sample Valorant squad"
            >
              ⚡ AUTOFILL SAMPLE SQUAD
            </button>
            <button
              onClick={onClose}
              className="font-mono text-xs text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4 max-h-[72vh] overflow-y-auto pr-2">
          {/* Organization & Team Info */}
          <div className="border border-border/80 bg-background/60 p-3.5 space-y-3">
            <div className="font-mono text-[10px] font-bold tracking-wider text-accent uppercase">
              TEAM DETAILS
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="font-mono text-[9px] text-muted">
                  TEAM / ORG NAME *
                </label>
                <input
                  className={inputClass}
                  placeholder="e.g. Sentinels"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted">
                  TEAM TAG (3-5 CHARS) *
                </label>
                <input
                  className={inputClass}
                  placeholder="SEN"
                  maxLength={5}
                  value={tag}
                  onChange={(e) => setTag(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[9px] text-muted">
                  REGION
                </label>
                <select
                  className={inputClass}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  {["GLOBAL", "NA", "EU", "APAC", "SA", "MENA"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted">
                  SEED #
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  max="32"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* IGL Section */}
          <div className="border border-accent/40 bg-accent/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-accent">
                👑 TEAM IGL (IN-GAME LEADER)
              </span>
              <span className="font-mono text-[9px] text-muted">
                Google Form: Leader Section
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-mono text-[9px] text-muted">
                  REAL NAME
                </label>
                <input
                  className={inputClass}
                  placeholder="Tyson Ngo"
                  value={iglName}
                  onChange={(e) => setIglName(e.target.value)}
                />
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted">
                  VALORANT IGN + TAG *
                </label>
                <input
                  className={inputClass}
                  placeholder="TenZ#NA1"
                  value={iglIgn}
                  onChange={(e) => setIglIgn(e.target.value)}
                />
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted">
                  DISCORD USER ID
                </label>
                <input
                  className={inputClass}
                  placeholder="tenz_official"
                  value={iglDiscord}
                  onChange={(e) => setIglDiscord(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 4 Starting Players */}
          <div className="border border-border bg-background/60 p-3.5 space-y-2.5">
            <div className="font-mono text-[10px] font-bold text-muted uppercase tracking-wider">
              STARTING 4 PLAYERS (FROM FORM)
            </div>
            <div className="space-y-2">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-2 border-b border-border/40 pb-2"
                >
                  <div>
                    <label className="font-mono text-[8px] text-muted">
                      PLAYER #{i + 2} NAME
                    </label>
                    <input
                      className={inputClass}
                      placeholder={`Player ${i + 2}`}
                      value={m.name}
                      onChange={(e) => updateMember(i, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[8px] text-muted">
                      IGN + TAG (e.g. name#tag)
                    </label>
                    <input
                      className={inputClass}
                      placeholder="zekken#NA1"
                      value={m.inGameName}
                      onChange={(e) =>
                        updateMember(i, "inGameName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[8px] text-muted">
                      DISCORD ID
                    </label>
                    <input
                      className={inputClass}
                      placeholder="zekken_fps"
                      value={m.discordId}
                      onChange={(e) =>
                        updateMember(i, "discordId", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[8px] text-muted">
                      ROLE
                    </label>
                    <select
                      className={inputClass}
                      value={m.role}
                      onChange={(e) => updateMember(i, "role", e.target.value)}
                    >
                      {[
                        "DUELIST",
                        "INITIATOR",
                        "CONTROLLER",
                        "SENTINEL",
                        "FLEX",
                        "MEMBER",
                      ].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Substitute Section */}
          <div className="border border-warning/30 bg-warning/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-warning">
                SUBSTITUTE PLAYER (OPTIONAL)
              </span>
              <span className="font-mono text-[9px] text-muted">
                1 Sub Slot
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-mono text-[9px] text-muted">
                  SUB NAME
                </label>
                <input
                  className={inputClass}
                  placeholder="Rahul Gosain"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                />
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted">
                  SUB VALORANT IGN + TAG
                </label>
                <input
                  className={inputClass}
                  placeholder="curry#NA1"
                  value={subIgn}
                  onChange={(e) => setSubIgn(e.target.value)}
                />
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted">
                  SUB DISCORD ID
                </label>
                <input
                  className={inputClass}
                  placeholder="curry_fps"
                  value={subDiscord}
                  onChange={(e) => setSubDiscord(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="border border-border px-4 py-2 font-mono text-xs text-muted hover:text-foreground"
          >
            CANCEL
          </button>
          <button
            disabled={busy || !name.trim() || !tag.trim()}
            onClick={handleSave}
            className="bg-accent px-5 py-2 font-mono text-xs font-bold text-accent-foreground disabled:opacity-50"
          >
            {busy ? "ADDING TEAM…" : "SAVE TEAM TO TOURNAMENT"}
          </button>
        </div>
      </div>
    </div>
  )
}
