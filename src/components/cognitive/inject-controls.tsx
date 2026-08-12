"use client";

import { useForgeStore } from "@/lib/store";
import type { NeuralInjection } from "@/lib/types";
import type { CognitiveChannel } from "@/lib/neural/generator";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const INJECTIONS: { id: NeuralInjection; label: string }[] = [
  { id: "none", label: "Resting" },
  { id: "high_engagement", label: "Engaged" },
  { id: "fatigue", label: "Fatigue" },
  { id: "stress", label: "Stress" },
  { id: "calm", label: "Very calm" },
  { id: "overconfident", label: "Overconfident" },
  { id: "underconfident", label: "Underconfident" },
  { id: "anomaly", label: "Anomaly" },
];

const CHANNELS: { id: CognitiveChannel; label: string }[] = [
  { id: "engagement", label: "Engagement" },
  { id: "fatigue", label: "Fatigue" },
  { id: "arousal", label: "Arousal" },
  { id: "confidence", label: "Confidence" },
];

export function InjectControls() {
  const injection = useForgeStore((s) => s.injection);
  const setInjection = useForgeStore((s) => s.setInjection);
  const overrides = useForgeStore((s) => s.overrides);
  const setOverride = useForgeStore((s) => s.setOverride);
  const impulse = useForgeStore((s) => s.impulse);
  const cognitive = useForgeStore((s) => s.cognitive);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>State injector</CardTitle>
          <CardDescription>For testing safety and friction — not a live decoder</CardDescription>
        </div>
      </CardHeader>
      <div className="flex flex-wrap gap-1.5">
        {INJECTIONS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={injection === item.id ? "default" : "secondary"}
            aria-pressed={injection === item.id}
            onClick={() => setInjection(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {CHANNELS.map((ch) => {
          const pinned = overrides[ch.id];
          const value = pinned ?? cognitive[ch.id];
          return (
            <div key={ch.id}>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor={`inj-${ch.id}`}>{ch.label}</Label>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {Math.round(value)}
                  {pinned != null ? " · pinned" : ""}
                </span>
              </div>
              <Slider
                id={`inj-${ch.id}`}
                min={0}
                max={100}
                step={1}
                value={[Math.round(value)]}
                onValueChange={([v]) => setOverride(ch.id, v)}
                aria-label={`Pin ${ch.label}`}
              />
              <div className="mt-1 flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => impulse(ch.id, 25)}>
                  +25
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOverride(ch.id, null)}>
                  Release
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
