"use client";

import { useForgeStore } from "@/lib/store";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightsPanel() {
  const insights = useForgeStore((s) => s.insights);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Heuristic memory</CardTitle>
          <CardDescription>Personal patterns from paper decisions — never a scolding</CardDescription>
        </div>
      </CardHeader>
      <ul className="space-y-3">
        {insights.map((i) => (
          <li key={i.id}>
            <p className="text-sm font-medium">{i.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{i.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
