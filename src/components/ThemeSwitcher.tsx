import { useEffect, useRef, useState } from "react";
import { useTheme } from "../lib/theme";
import { Mono } from "./ui";

export function ThemeSwitcher() {
  const { themes, theme, current, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-expanded={open}
        className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] tracking-[0.15em] text-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        <span className="flex items-center gap-1">
          {current.swatch.map((c, i) => (
            <span key={i} className="size-2.5 border border-border-strong" style={{ background: c }} />
          ))}
        </span>
        <span className="hidden sm:inline">THEME</span>
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 z-[80] border border-border-strong bg-surface shadow-2xl shadow-black/40 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[300px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Mono className="text-foreground">THEME CATALOGUE</Mono>
            <Mono>{themes.length} SKINS</Mono>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {themes.map((tdef) => {
              const active = tdef.id === theme;
              return (
                <button
                  key={tdef.id}
                  onClick={() => { setTheme(tdef.id); setOpen(false); }}
                  className={`flex w-full items-center gap-3 border p-2.5 text-left transition-colors ${
                    active ? "border-accent bg-accent/5" : "border-transparent hover:bg-surface-hover"
                  }`}
                >
                  <span
                    className="grid size-11 shrink-0 grid-cols-2 overflow-hidden border border-border-strong"
                    aria-hidden="true"
                  >
                    <span style={{ background: tdef.swatch[0] }} />
                    <span style={{ background: tdef.swatch[1] }} />
                    <span className="col-span-2 h-2.5" style={{ background: tdef.swatch[2] }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold tracking-tight" style={{ fontFamily: tdef.font }}>{tdef.name}</span>
                      <span className={`font-mono text-[9px] tracking-[0.12em] ${active ? "text-accent" : "text-border-strong"}`}>
                        {tdef.mode === "light" ? "LIGHT" : "DARK"}
                      </span>
                    </span>
                    <span className="mt-0.5 block font-mono text-[9px] tracking-[0.12em] text-accent/80">{tdef.genre}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">{tdef.note}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
