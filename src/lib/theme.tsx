import { createContext, useContext, useEffect, useState, type Context, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";

export type ThemeDef = {
  id: string;
  name: string;
  genre: string;
  mode: ThemeMode;
  /** Short operative description shown in the catalogue. */
  note: string;
  /** Display typeface — used to preview the theme's own font in the catalogue. */
  font: string;
  /** Preview swatch: [ground, surface, accent]. */
  swatch: [string, string, string];
};

// The catalogue. "obsidian" is the original Tactical Obsidian stance and stays
// the default — everything else is an additive genre skin (see index.css).
export const THEMES: ThemeDef[] = [
  {
    id: "obsidian", name: "Tactical Obsidian", genre: "Milsim / Classified", mode: "dark",
    note: "Archivo · sharp edges · signal-lime. The house stance.",
    font: "'Archivo', sans-serif",
    swatch: ["#08090a", "#0e1012", "#d6ff2e"],
  },
  {
    id: "inferno", name: "Inferno", genre: "FPS / Arena Shooter", mode: "dark",
    note: "Saira Condensed · industrial · molten red on scorched black.",
    font: "'Saira Condensed', sans-serif",
    swatch: ["#0c0708", "#150a0b", "#ff3b2f"],
  },
  {
    id: "neon", name: "Neon Grid", genre: "Cyberpunk / Arcade", mode: "dark",
    note: "Orbitron · futurist · electric cyan on a midnight circuit.",
    font: "'Orbitron', sans-serif",
    swatch: ["#060814", "#0b0f22", "#00eaff"],
  },
  {
    id: "verdant", name: "Verdant Protocol", genre: "Survival / Strategy", mode: "dark",
    note: "Zilla Slab · rugged serif · signal green in deep pine.",
    font: "'Zilla Slab', serif",
    swatch: ["#070b09", "#0c110e", "#4ade80"],
  },
  {
    id: "royale", name: "Gold Royale", genre: "Battle Royale", mode: "dark",
    note: "Cinzel · regal serif · imperial gold on charcoal.",
    font: "'Cinzel', serif",
    swatch: ["#0b0a07", "#12100b", "#ffc21f"],
  },
  {
    id: "synthwave", name: "Synthwave", genre: "Retro / Racing", mode: "dark",
    note: "Audiowide · retro-round · hot magenta on twilight violet.",
    font: "'Audiowide', sans-serif",
    swatch: ["#120a1f", "#1a0f2e", "#ff2fd0"],
  },
  {
    id: "arclight", name: "Arclight", genre: "Daylight Ops", mode: "light",
    note: "Sora · clean geometric · inked mono on bone.",
    font: "'Sora', sans-serif",
    swatch: ["#f4f5f6", "#ffffff", "#121417"],
  },
  {
    id: "frost", name: "Frostline", genre: "Winter / Sim", mode: "light",
    note: "Fraunces · soft serif · glacier cyan on ice.",
    font: "'Fraunces', serif",
    swatch: ["#eef3f7", "#ffffff", "#0891b2"],
  },
];

export const DEFAULT_THEME = "obsidian";
const STORAGE_KEY = "vanta.theme";

type ThemeState = {
  theme: string;
  themes: ThemeDef[];
  current: ThemeDef;
  setTheme: (id: string) => void;
};

const g = globalThis as unknown as { __vantaThemeCtx?: Context<ThemeState | null> };
const ThemeContext = g.__vantaThemeCtx ?? (g.__vantaThemeCtx = createContext<ThemeState | null>(null));

function apply(id: string) {
  document.documentElement.setAttribute("data-theme", id);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof localStorage === "undefined") return DEFAULT_THEME;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME;
  });

  useEffect(() => { apply(theme); }, [theme]);

  const setTheme = (id: string) => {
    if (!THEMES.some((t) => t.id === id)) return;
    setThemeState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  };

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, themes: THEMES, current, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
