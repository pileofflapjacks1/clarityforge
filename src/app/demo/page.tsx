"use client";

import { useState } from "react";
import Link from "next/link";
import { useForgeStore } from "@/lib/store";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DecisionQualityPanel } from "@/components/cognitive/decision-quality";
import { CognitiveStatePanel } from "@/components/cognitive/state-panel";

const STEPS = [
  {
    title: "Resting stream",
    body: "The mock engine is already running. Watch Engagement, Fatigue, Arousal, and Confidence drift. Decision Quality should sit near High or Medium.",
    run: () => useForgeStore.getState().setInjection("none"),
  },
  {
    title: "Inject fatigue",
    body: "Fatigue rises, quality usually drops to Low, and any order would ask for extra confirmation. This is the point of the desk: friction when the state is tired.",
    run: () => useForgeStore.getState().setInjection("fatigue"),
  },
  {
    title: "Inject stress",
    body: "High arousal forces Caution. The submit path slows down. ClarityForge will not block you unless you freeze — it just asks you to look again.",
    run: () => useForgeStore.getState().setInjection("stress"),
  },
  {
    title: "Anomaly spike",
    body: "A sudden jump is treated as Caution. In a later adapter this would catch a decoder glitch, not a personality flaw.",
    run: () => useForgeStore.getState().setInjection("anomaly"),
  },
  {
    title: "Hard Freeze",
    body: "Freeze kills every order intent immediately. Escape or F does the same from the keyboard.",
    run: () => useForgeStore.getState().freeze("Demo freeze."),
  },
  {
    title: "Release and return",
    body: "Release the freeze, restore a resting injection, and open the desk to construct a paper order.",
    run: () => {
      const s = useForgeStore.getState();
      s.unfreeze();
      s.setInjection("none");
    },
  },
];

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  function go(i: number) {
    const next = Math.max(0, Math.min(STEPS.length - 1, i));
    setStep(next);
    STEPS[next].run();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Guided demo</h1>
        <p className="mt-1 text-sm text-muted">
          A short tour of cognitive injections, Decision Quality, and Hard Freeze.
          Paper trading stays on the desk.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                Step {step + 1} / {STEPS.length}: {current.title}
              </CardTitle>
              <CardDescription>Injections are local and reversible</CardDescription>
            </div>
          </CardHeader>
          <p className="text-sm leading-relaxed">{current.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => go(step - 1)} disabled={step === 0}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(step + 1)}>Next</Button>
            ) : (
              <Button asChild>
                <Link href="/" className="no-underline">
                  Open the desk
                </Link>
              </Button>
            )}
          </div>
        </Card>
        <div className="space-y-4">
          <DecisionQualityPanel />
          <CognitiveStatePanel />
        </div>
      </div>
    </div>
  );
}
