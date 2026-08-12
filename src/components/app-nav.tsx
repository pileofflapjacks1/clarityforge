"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SimulatorBadge } from "./simulator-badge";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Desk" },
  { href: "/history", label: "History" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/settings", label: "Settings" },
  { href: "/demo", label: "Demo" },
];

export function AppNav() {
  const path = usePathname();
  return (
    <header className="border-b border-border bg-panel/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-panel-2 font-mono text-sm text-accent">
            CF
          </span>
          <span className="text-base font-semibold tracking-tight text-foreground">
            ClarityForge
          </span>
        </Link>
        <SimulatorBadge />
        <nav aria-label="Primary" className="ml-auto flex flex-wrap items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm no-underline",
                  active
                    ? "bg-panel-2 font-semibold text-foreground"
                    : "text-muted hover:bg-panel-2 hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
