import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCountUp, useInView } from "../lib/motion";

/**
 * Scroll-triggered reveal wrapper. Content rises + de-blurs into place; pass
 * `sweep` to also run a one-shot accent scan-line across the element as it
 * lands — reserve `sweep` for section-level moments, not every card, or it
 * stops feeling like a signal and starts feeling like noise.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  sweep = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  sweep?: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${sweep ? "reveal-sweep" : ""} ${inView ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

const GLYPHS = "!<>-_\\/[]{}—=+*^?#0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Terminal-style decode: characters resolve left-to-right out of noise into
 * the real string once the element scrolls into view. Built for short mono
 * labels and readouts (kickers, stat values) — not body copy.
 */
export function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [out, setOut] = useState(text);
  const done = useRef(false);

  useEffect(() => {
    if (!inView || done.current) return;
    done.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const chars = text.split("");
    const totalFrames = 14;
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      const revealCount = Math.floor((frame / totalFrames) * chars.length);
      setOut(
        chars
          .map((c, i) => (c === " " || i < revealCount ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (frame >= totalFrames) {
        setOut(text);
        clearInterval(id);
      }
    }, 32);
    return () => clearInterval(id);
  }, [inView, text]);

  return (
    <span ref={ref} className={className}>
      {out}
    </span>
  );
}

/** Renders a number that counts up (ease-out) once `start` flips true. */
export function CountUp({
  value,
  start,
  duration = 900,
  format,
}: {
  value: number;
  start: boolean;
  duration?: number;
  format?: (n: number) => string;
}) {
  const n = useCountUp(value, start, duration);
  return <>{format ? format(n) : n.toLocaleString()}</>;
}

/**
 * The site's signature interactive tell: four targeting-reticle corners
 * (same visual language as the roster photo cropper's crop guides) that
 * snap on with a slight stagger when a card is hovered or focused. Parent
 * needs `group` and `relative` (Tailwind's group-hover convention).
 */
export function HudCorners() {
  const corners = [
    { pos: "left-1.5 top-1.5", border: "border-l border-t", delay: 0 },
    { pos: "right-1.5 top-1.5", border: "border-r border-t", delay: 40 },
    { pos: "bottom-1.5 left-1.5", border: "border-b border-l", delay: 80 },
    { pos: "bottom-1.5 right-1.5", border: "border-b border-r", delay: 120 },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {corners.map((c) => (
        <span
          key={c.pos}
          className={`absolute size-2.5 ${c.pos} ${c.border} border-accent opacity-0 scale-75 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100`}
          style={{ transitionDelay: `${c.delay}ms` }}
        />
      ))}
    </span>
  );
}
