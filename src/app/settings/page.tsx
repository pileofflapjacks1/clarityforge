"use client";

import { useRef } from "react";
import { useForgeStore } from "@/lib/store";
import { SYMBOL_UNIVERSE } from "@/lib/trading/symbols";
import { downloadText } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ConfirmationStrictness, ThemeMode } from "@/lib/types";

export default function SettingsPage() {
  const settings = useForgeStore((s) => s.settings);
  const update = useForgeStore((s) => s.updateSettings);
  const updateThresholds = useForgeStore((s) => s.updateThresholds);
  const resetAll = useForgeStore((s) => s.resetAllData);
  const exportSession = useForgeStore((s) => s.exportSession);
  const importSession = useForgeStore((s) => s.importSession);
  const reopen = useForgeStore((s) => s.reopenOnboarding);
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleSymbol(sym: string, on: boolean) {
    const next = on
      ? Array.from(new Set([...settings.enabledSymbols, sym]))
      : settings.enabledSymbols.filter((s) => s !== sym);
    if (next.length === 0) return;
    update({ enabledSymbols: next });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Thresholds, confirmation strictness, and the paper universe. All stored locally.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Dark is the default. Light is optional.</CardDescription>
          </div>
        </CardHeader>
        <Label htmlFor="theme">Theme</Label>
        <Select
          value={settings.theme}
          onValueChange={(v) => update({ theme: v as ThemeMode })}
        >
          <SelectTrigger id="theme" className="mt-1 max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cognitive thresholds</CardTitle>
            <CardDescription>
              When these trip, Decision Quality adds friction. They are research knobs, not clinical cutoffs.
            </CardDescription>
          </div>
        </CardHeader>
        <Thresh
          label="Fatigue high"
          value={settings.thresholds.fatigueHigh}
          onChange={(v) => updateThresholds({ fatigueHigh: v })}
        />
        <Thresh
          label="Arousal high"
          value={settings.thresholds.arousalHigh}
          onChange={(v) => updateThresholds({ arousalHigh: v })}
        />
        <Thresh
          label="Arousal low"
          value={settings.thresholds.arousalLow}
          onChange={(v) => updateThresholds({ arousalLow: v })}
        />
        <Thresh
          label="Engagement low"
          value={settings.thresholds.engagementLow}
          onChange={(v) => updateThresholds({ engagementLow: v })}
        />
        <Thresh
          label="Anomaly jump"
          value={settings.thresholds.anomalyDelta}
          onChange={(v) => updateThresholds({ anomalyDelta: v })}
        />
        <Thresh
          label="High quality min"
          value={settings.thresholds.highMin}
          onChange={(v) => updateThresholds({ highMin: v })}
        />
        <Thresh
          label="Medium quality min"
          value={settings.thresholds.mediumMin}
          onChange={(v) => updateThresholds({ mediumMin: v })}
        />
        <Thresh
          label="Low quality min"
          value={settings.thresholds.lowMin}
          onChange={(v) => updateThresholds({ lowMin: v })}
        />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Confirmation strictness</CardTitle>
            <CardDescription>How much friction Low / Caution adds before a paper submit.</CardDescription>
          </div>
        </CardHeader>
        <Select
          value={settings.strictness}
          onValueChange={(v) => update({ strictness: v as ConfirmationStrictness })}
        >
          <SelectTrigger className="max-w-xs" aria-label="Confirmation strictness">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relaxed">Relaxed</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="strict">Strict</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Symbol universe</CardTitle>
            <CardDescription>Paper symbols only. No live feed.</CardDescription>
          </div>
        </CardHeader>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SYMBOL_UNIVERSE.map((s) => {
            const on = settings.enabledSymbols.includes(s.symbol);
            return (
              <li key={s.symbol} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <div className="font-mono text-sm">{s.symbol}</div>
                  <div className="text-xs text-muted">{s.name}</div>
                </div>
                <Switch
                  checked={on}
                  onCheckedChange={(v) => toggleSymbol(s.symbol, v)}
                  aria-label={`Toggle ${s.symbol}`}
                />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Privacy &amp; data</CardTitle>
            <CardDescription>
              All data stays in this browser unless you export it. Import never leaves the machine.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              downloadText(
                `clarityforge-session-${new Date().toISOString().slice(0, 10)}.json`,
                exportSession(),
              )
            }
          >
            Export session
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import session
          </Button>
          <Button variant="secondary" onClick={reopen}>
            Replay onboarding
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Clear all local ClarityForge data and reset the simulator?")) {
                resetAll();
              }
            }}
          >
            Reset all data
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const ok = importSession(text);
            if (!ok) window.alert("That file does not look like a ClarityForge export.");
            e.target.value = "";
          }}
        />
      </Card>
    </div>
  );
}

function Thresh({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-xs tabular-nums">{value}</span>
      </div>
      <Slider min={5} max={95} step={1} value={[value]} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  );
}
