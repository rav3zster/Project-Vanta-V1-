import { useState } from "react";
import { type Player } from "../lib/supabase";
import { Mono } from "./ui";

interface PlayerDossierProps {
  player: Player;
  onClose: () => void;
}

// Generate realistic default pro gear & sens specs based on game & handle if not explicitly set
export function getResolvedPlayerTelemetry(p: Player) {
  const game = (p.game || "VALORANT").toUpperCase();
  const handleHash = p.handle.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Tactical defaults based on game genre
  if (game.includes("VALORANT")) {
    const dpi = p.settings?.dpi || (handleHash % 2 === 0 ? "800 DPI" : "400 DPI");
    const sens = p.settings?.sensitivity || (handleHash % 2 === 0 ? "0.314" : "0.628");
    const edpi = p.settings?.edpi || (handleHash % 2 === 0 ? "251.2 eDPI" : "251.2 eDPI");
    const resolution = p.settings?.resolution || "1920 × 1080 (16:9)";
    const crosshair =
      p.settings?.crosshair ||
      "0;P;c;1;h;0;0t;1;0l;4;0v;4;0g;0;0o;2;0a;1;0f;0;1b;0";

    return {
      settings: {
        dpi,
        sensitivity: sens,
        edpi,
        scopedSens: p.settings?.scopedSens || "1.0",
        pollingRate: p.settings?.pollingRate || "1000 Hz",
        resolution,
        crosshair,
      },
      gear: {
        mouse: p.gear?.mouse || "Logitech G Pro X Superlight 2 (Wireless)",
        mousepad: p.gear?.mousepad || "Artisan Ninja FX Zero Soft XL (Black)",
        keyboard: p.gear?.keyboard || "Wooting 60HE+ Rapid Trigger (L45)",
        headset: p.gear?.headset || "HyperX Cloud III Wireless Gaming Headset",
        monitor: p.gear?.monitor || "BenQ ZOWIE XL2566K (360Hz DyAc⁺)",
      },
      stats: {
        kd: p.stats?.kd || (1.28 + (handleHash % 30) / 100).toFixed(2),
        winRate: p.stats?.winRate || `${62 + (handleHash % 20)}%`,
        headshotPct: p.stats?.headshotPct || `${28 + (handleHash % 14)}%`,
        acs: p.stats?.acs || `${235 + (handleHash % 45)} ACS`,
        signaturePick: p.stats?.signaturePick || (p.role === "DUELIST" ? "Jett / Raze" : p.role === "SENTINEL" ? "Killjoy / Cypher" : p.role === "INITIATOR" ? "Sova / Fade" : "Omen / Astra"),
        matchesPlayed: p.stats?.matchesPlayed || 120 + (handleHash % 90),
        trophies: p.stats?.trophies || (handleHash % 4) + 1,
      },
    };
  }

  if (game.includes("CS2") || game.includes("COUNTER")) {
    const dpi = p.settings?.dpi || "400 DPI";
    const sens = p.settings?.sensitivity || "1.75";
    const edpi = p.settings?.edpi || "700 eDPI";
    return {
      settings: {
        dpi,
        sensitivity: sens,
        edpi,
        scopedSens: p.settings?.scopedSens || "1.0",
        pollingRate: p.settings?.pollingRate || "1000 Hz",
        resolution: p.settings?.resolution || "1280 × 960 (4:3 Stretched)",
        crosshair: p.settings?.crosshair || "CSGO-U3bKz-N4z67-k9MhF-mO3tV-e7mAE",
      },
      gear: {
        mouse: p.gear?.mouse || "Razer Viper V3 Pro (Wireless 8K)",
        mousepad: p.gear?.mousepad || "SteelSeries QcK Heavy Large",
        keyboard: p.gear?.keyboard || "Razer Huntsman V3 Pro TKL (Analog)",
        headset: p.gear?.headset || "Sennheiser HD 560S Reference Audio",
        monitor: p.gear?.monitor || "ZOWIE XL2546K (240Hz DyAc⁺)",
      },
      stats: {
        kd: p.stats?.kd || (1.24 + (handleHash % 25) / 100).toFixed(2),
        winRate: p.stats?.winRate || `${64 + (handleHash % 15)}%`,
        headshotPct: p.stats?.headshotPct || `${58 + (handleHash % 15)}%`,
        acs: p.stats?.acs || `1.28 Rating 2.0`,
        signaturePick: p.stats?.signaturePick || "AK-47 / AWP",
        matchesPlayed: p.stats?.matchesPlayed || 160 + (handleHash % 80),
        trophies: p.stats?.trophies || (handleHash % 5) + 1,
      },
    };
  }

  // MOBA / DOTA / LOL default
  return {
    settings: {
      dpi: p.settings?.dpi || "1600 DPI",
      sensitivity: p.settings?.sensitivity || "50 Windows / Default",
      edpi: p.settings?.edpi || "Camera Pan: 3500",
      scopedSens: p.settings?.scopedSens || "N/A",
      pollingRate: p.settings?.pollingRate || "1000 Hz",
      resolution: p.settings?.resolution || "2560 × 1440 (16:9 QHD)",
      crosshair: p.settings?.crosshair || "Custom Tactical Cursor 1.2x",
    },
    gear: {
      mouse: p.gear?.mouse || "Logitech G Pro X Superlight 2",
      mousepad: p.gear?.mousepad || "Lethal Gaming Gear Saturn Pro",
      keyboard: p.gear?.keyboard || "Custom Keychron Q1 Pro Custom Switches",
      headset: p.gear?.headset || "Audio-Technica ATH-M50x Professional",
      monitor: p.gear?.monitor || "ASUS ROG Swift OLED PG27AQDM (240Hz)",
    },
    stats: {
      kd: p.stats?.kd || `${(3.8 + (handleHash % 20) / 10).toFixed(1)} KDA`,
      winRate: p.stats?.winRate || `${66 + (handleHash % 18)}%`,
      headshotPct: p.stats?.headshotPct || "9.4 CS/min",
      acs: p.stats?.acs || "742 GPM",
      signaturePick: p.stats?.signaturePick || (game.includes("DOTA") ? "Invoker / Shadow Fiend" : "Ahri / LeBlanc"),
      matchesPlayed: p.stats?.matchesPlayed || 210 + (handleHash % 120),
      trophies: p.stats?.trophies || (handleHash % 6) + 1,
    },
  };
}

export function PlayerDossier({ player, onClose }: PlayerDossierProps) {
  const [activeTab, setActiveTab] = useState<"SETTINGS" | "GEAR" | "PERFORMANCE">("SETTINGS");
  const [copiedCode, setCopiedCode] = useState(false);

  const telemetry = getResolvedPlayerTelemetry(player);

  const handleCopyCrosshair = () => {
    if (telemetry.settings.crosshair) {
      navigator.clipboard.writeText(telemetry.settings.crosshair);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  return (
    <div className="relative flex flex-col bg-surface transition-all size-full animate-bundle">
      {/* Top Header Strip with Close Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/60 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="status-pulse inline-block size-2 rounded-full bg-accent" />
          <Mono className="text-accent text-[11px] font-bold">OPERATOR DOSSIER // {player.handle}</Mono>
          <span className="hidden sm:inline font-mono text-[10px] text-muted">ID: {player.region}</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.15em] text-muted transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
          title="Close dossier"
        >
          <span>✕</span>
          <span className="hidden sm:inline">CLOSE DOSSIER</span>
        </button>
      </div>

      {/* Operator Title Card Banner — compact to preserve scroll space below */}
      <div className="border-b border-border bg-surface-secondary/50 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="border border-accent/40 bg-background/80 px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] text-accent">
                {player.game || "VALORANT"}
              </span>
              <span className="border border-border bg-background/80 px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] text-foreground">
                {player.role}
              </span>
              {player.rank && (
                <span className="border border-border bg-background/80 px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] text-accent">
                  ◆ {player.rank}
                </span>
              )}
            </div>
            <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-foreground leading-tight">
              {player.handle}
            </h2>
            <div className="font-mono text-[10px] text-muted">
              {player.name ? `${player.name} · ` : ""}Signed to {player.region} Competitive House
            </div>
          </div>
          <div className="shrink-0 border border-border bg-surface px-3 py-1.5 text-right">
            <div className="font-mono text-[9px] tracking-[0.1em] text-muted">CAREER EARNINGS</div>
            <div className="font-mono text-base font-bold text-accent">{player.winnings || "$0"}</div>
          </div>
        </div>
      </div>

      {/* Tabs Toolbar */}
      <div className="flex border-b border-border bg-surface/80">
        {[
          { id: "SETTINGS", label: "⚙ SENSITIVITY & SETTINGS" },
          { id: "GEAR", label: "🎧 BATTLE GEAR RIG" },
          { id: "PERFORMANCE", label: "📊 PERFORMANCE STATS" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative flex-1 px-3 py-3 font-mono text-[10px] sm:text-[11px] tracking-[0.15em] transition-colors ${
              activeTab === tab.id
                ? "font-bold text-accent bg-accent/5"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      {/* Tab Panels — flex-1 + overflow-y-auto so content scrolls inside the fixed panel */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* TAB 1: SENSITIVITY & MOUSE SETTINGS */}
        {activeTab === "SETTINGS" && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "DPI (CPI)", value: telemetry.settings.dpi, sub: "Hardware sensor", accent: false },
                { label: "IN-GAME SENSITIVITY", value: telemetry.settings.sensitivity, sub: "Raw input enabled", accent: true },
                { label: "EFFECTIVE DPI (eDPI)", value: telemetry.settings.edpi, sub: "DPI × In-Game Sens", accent: false },
                { label: "SCOPED SENS MULT.", value: telemetry.settings.scopedSens, sub: "ADS / Sniper ratio", accent: false },
                { label: "USB POLLING RATE", value: telemetry.settings.pollingRate, sub: "1.0ms reporting", accent: false },
                { label: "DISPLAY RESOLUTION", value: telemetry.settings.resolution, sub: "Competitive ratio", accent: false },
              ].map(({ label, value, sub, accent }) => (
                <div key={label} className="border border-border bg-background/60 px-3 py-2.5">
                  <div className="font-mono text-[9px] tracking-[0.12em] text-muted">{label}</div>
                  <div className={`mt-0.5 font-display text-base font-black leading-tight ${accent ? "text-accent" : "text-foreground"}`}>{value}</div>
                  <div className="mt-0.5 font-mono text-[9px] text-muted/70">{sub}</div>
                </div>
              ))}
            </div>

            {/* Crosshair Profile Strip */}
            <div className="border border-border bg-surface-secondary p-4">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 font-mono text-[10px] font-bold tracking-[0.15em] text-accent">
                    CROSSHAIR PROFILE CODE
                  </span>
                  <span className="hidden truncate font-mono text-[10px] text-muted sm:block">
                    · Official Match Config
                  </span>
                </div>
                <button
                  onClick={handleCopyCrosshair}
                  className="shrink-0 bg-accent px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.1em] text-accent-foreground transition-opacity hover:opacity-90 active:scale-95"
                >
                  {copiedCode ? "✓ COPIED" : "📋 COPY CODE"}
                </button>
              </div>
              {/* break-all wraps the code string inside the box — no horizontal overflow */}
              <div className="mt-2.5 rounded-sm bg-background/90 p-2.5">
                <code className="block break-all font-mono text-[11px] leading-relaxed text-muted selection:bg-accent selection:text-background">
                  {telemetry.settings.crosshair}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRO BATTLE GEAR RIG */}
        {activeTab === "GEAR" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-4 border border-border bg-background/60 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-surface text-xl">
                🖱️
              </div>
              <div className="min-w-0 flex-1">
                <Mono className="text-[9px] text-muted">GAMING MOUSE</Mono>
                <div className="mt-0.5 font-display text-base font-bold text-foreground">{telemetry.gear.mouse}</div>
                <div className="mt-0.5 text-xs text-muted">Ultra-lightweight wireless optical switch</div>
              </div>
            </div>

            <div className="flex items-start gap-4 border border-border bg-background/60 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-surface text-xl">
                ⬛
              </div>
              <div className="min-w-0 flex-1">
                <Mono className="text-[9px] text-muted">MOUSEPAD / MAT</Mono>
                <div className="mt-0.5 font-display text-base font-bold text-foreground">{telemetry.gear.mousepad}</div>
                <div className="mt-0.5 text-xs text-muted">Control-speed hybrid weave surface</div>
              </div>
            </div>

            <div className="flex items-start gap-4 border border-border bg-background/60 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-surface text-xl">
                ⌨️
              </div>
              <div className="min-w-0 flex-1">
                <Mono className="text-[9px] text-muted">MECHANICAL KEYBOARD</Mono>
                <div className="mt-0.5 font-display text-base font-bold text-foreground">{telemetry.gear.keyboard}</div>
                <div className="mt-0.5 text-xs text-muted">Hall Effect analog switches with 0.1mm actuation</div>
              </div>
            </div>

            <div className="flex items-start gap-4 border border-border bg-background/60 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-surface text-xl">
                🎧
              </div>
              <div className="min-w-0 flex-1">
                <Mono className="text-[9px] text-muted">AUDIO HEADSET / IEMS</Mono>
                <div className="mt-0.5 font-display text-base font-bold text-foreground">{telemetry.gear.headset}</div>
                <div className="mt-0.5 text-xs text-muted">Spatial soundstage tuned for footsteps and pinouts</div>
              </div>
            </div>

            <div className="sm:col-span-2 flex items-start gap-4 border border-border bg-background/60 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-surface text-xl">
                🖥️
              </div>
              <div className="min-w-0 flex-1">
                <Mono className="text-[9px] text-muted">ESPORTS TOURNAMENT MONITOR</Mono>
                <div className="mt-0.5 font-display text-base font-bold text-accent">{telemetry.gear.monitor}</div>
                <div className="mt-0.5 text-xs text-muted">Fast TN panel with dynamic motion blur reduction</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PERFORMANCE STATS & CAREER */}
        {activeTab === "PERFORMANCE" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border border-border bg-background/60 p-4 text-center">
                <Mono className="text-[9px] text-muted">WIN RATE</Mono>
                <div className="mt-1 font-display text-2xl font-black text-accent">{telemetry.stats.winRate}</div>
              </div>

              <div className="border border-border bg-background/60 p-4 text-center">
                <Mono className="text-[9px] text-muted">K/D / RATING</Mono>
                <div className="mt-1 font-display text-2xl font-black text-foreground">{telemetry.stats.kd}</div>
              </div>

              <div className="border border-border bg-background/60 p-4 text-center">
                <Mono className="text-[9px] text-muted">HEADSHOT / CS</Mono>
                <div className="mt-1 font-display text-2xl font-black text-foreground">{telemetry.stats.headshotPct}</div>
              </div>

              <div className="border border-border bg-background/60 p-4 text-center">
                <Mono className="text-[9px] text-muted">COMBAT METRIC</Mono>
                <div className="mt-1 font-display text-2xl font-black text-accent">{telemetry.stats.acs}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-border bg-background/60 p-4">
                <Mono className="text-[9px] text-muted">SIGNATURE AGENT / CHAMPION</Mono>
                <div className="mt-1 font-display text-lg font-bold text-foreground">{telemetry.stats.signaturePick}</div>
                <div className="mt-0.5 text-xs text-muted">Primary tournament comfort pick</div>
              </div>

              <div className="border border-border bg-background/60 p-4">
                <Mono className="text-[9px] text-muted">OFFICIAL MATCHES &amp; TROPHIES</Mono>
                <div className="mt-1 font-display text-lg font-bold text-accent">
                  {telemetry.stats.matchesPlayed} Matches · {telemetry.stats.trophies} Major Trophies
                </div>
                <div className="mt-0.5 text-xs text-muted">Tier 1 verified tournament record</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
