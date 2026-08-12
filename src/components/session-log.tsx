"use client";

import { useMemo } from "react";
import { useForgeStore } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SessionLog({ limit = 8 }: { limit?: number }) {
  const allLog = useForgeStore((s) => s.log);
  const log = useMemo(() => allLog.slice(0, limit), [allLog, limit]);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Session log</CardTitle>
          <CardDescription>Local events only</CardDescription>
        </div>
      </CardHeader>
      {log.length === 0 ? (
        <p className="text-sm text-muted">Quiet so far.</p>
      ) : (
        <ul className="space-y-1.5">
          {log.map((e, i) => (
            <li key={`${e.t}-${i}`} className="text-xs leading-snug">
              <span className="font-mono text-muted">{formatTime(e.t)}</span>{" "}
              <span className="text-accent">{e.kind}</span> — {e.message}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
