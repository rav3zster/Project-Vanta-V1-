// Lightweight, dependency-free animation primitives. Everything here respects
// `prefers-reduced-motion` and degrades gracefully with no IntersectionObserver.

import { useEffect, useRef, useState } from "react";

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * True once the element has scrolled into the viewport. Fires once and stays
 * true — this is a reveal trigger, not a repeating visibility flag.
 */
export function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || reducedMotion()) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px", ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, inView] as const;
}

/** Animates from 0 to `value` (ease-out-cubic) once `start` flips true. */
export function useCountUp(value: number, start: boolean, duration = 900) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!start || started.current) return;
    started.current = true;
    if (reducedMotion() || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, value, duration]);

  return display;
}
