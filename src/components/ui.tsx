import type { ReactNode } from "react";
import type { Player } from "../lib/supabase";

const STATUS_STYLES: Record<string, string> = {
  LIVE: "text-accent border-accent/40 bg-accent/5",
  COMPLETED: "text-muted border-border bg-surface-secondary",
  READY: "text-success border-success/30 bg-success/5",
  SCHEDULED: "text-muted border-border bg-transparent",
  DISPUTED: "text-danger border-danger/40 bg-danger/5",
  FORFEIT: "text-warning border-warning/40 bg-warning/5",
  REGISTRATION_OPEN: "text-accent border-accent/40 bg-accent/5",
  REGISTRATION_CLOSED: "text-muted border-border bg-surface-secondary",
  CRITICAL: "text-danger border-danger/40 bg-danger/5",
  WARNING: "text-warning border-warning/40 bg-warning/5",
  INFO: "text-info border-info/30 bg-info/5",
};

export function StatusChip({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "text-muted border-border";
  const live = status === "LIVE";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.15em] uppercase ${style}`}
    >
      {live && <span className="status-pulse inline-block size-1.5 rounded-full bg-accent" />}
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function SectionHeader({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between border-b border-border pb-4">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-xs tracking-[0.25em] text-accent">{index}</span>
        <h2 className="font-display text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-xs tracking-[0.1em] text-muted ${className}`}>{children}</span>
  );
}

export function PlayerCard({ p }: { p: Player }) {
  return (
    <div className="group relative flex flex-col border border-border bg-surface transition-all duration-300 hover:border-accent/50 hover:bg-surface-hover">
      <div className="grain relative aspect-[4/5] w-full overflow-hidden border-b border-border bg-[#0a0b0d]">
        {p.image ? (
          <>
            <img
              src={p.image}
              alt={`${p.handle} — ${p.name}`}
              loading="lazy"
              className="size-full object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
          </>
        ) : (
          <div className="flex size-full items-center justify-center bg-surface-secondary">
            <span className="relative z-10 font-display text-5xl font-black tracking-tighter text-border-strong">
              {(p.handle || "?").slice(0, 2)}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
          {p.game && (
            <span className="border border-border-strong bg-background/80 px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-foreground backdrop-blur-sm">
              {p.game}
            </span>
          )}
          <span className="border border-accent/40 bg-background/80 px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] text-accent backdrop-blur-sm">
            {p.role}
          </span>
        </div>
        {p.rank && (
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <span className="inline-block border border-border bg-background/90 px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-foreground backdrop-blur-sm">
              <span className="text-accent">◆ </span>{p.rank}
            </span>
          </div>
        )}
      </div>
      <div className="relative z-10 flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-2xl font-black tracking-tight">{p.handle}</h3>
            <Mono className="text-[10px]">{p.region}</Mono>
          </div>
          <div className="text-sm text-muted">{p.name}</div>
        </div>
        {p.winnings && (
          <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3">
            <span className="font-mono text-[10px] tracking-[0.15em] text-muted">EARNINGS</span>
            <span className="font-mono text-xs font-bold text-accent">{p.winnings}</span>
          </div>
        )}
      </div>
    </div>
  );
}
