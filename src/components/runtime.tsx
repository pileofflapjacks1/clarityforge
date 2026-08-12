"use client";

import { useEffect } from "react";
import { useForgeStore } from "@/lib/store";

/** Hydrates local state and starts the simulator loops. */
export function Runtime() {
  const hydrate = useForgeStore((s) => s.hydrate);
  const start = useForgeStore((s) => s.start);
  const stop = useForgeStore((s) => s.stop);
  const freeze = useForgeStore((s) => s.freeze);
  const hydrated = useForgeStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
    start();
    return () => stop();
  }, [hydrate, start, stop]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (e.key === "Escape") {
        freeze("Hard Freeze via Escape.");
        return;
      }
      if (typing) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        freeze("Hard Freeze via keyboard.");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [freeze]);

  if (!hydrated) return null;
  return null;
}
