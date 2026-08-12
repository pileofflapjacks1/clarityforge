"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForgeStore } from "@/lib/store";

export function Onboarding() {
  const done = useForgeStore((s) => s.onboardingComplete);
  const hydrated = useForgeStore((s) => s.hydrated);
  const complete = useForgeStore((s) => s.completeOnboarding);

  if (!hydrated) return null;

  return (
    <Dialog open={!done} onOpenChange={(open) => { if (!open) complete(); }}>
      <DialogContent aria-describedby="onboard-desc">
        <DialogHeader>
          <DialogTitle>Welcome to ClarityForge</DialogTitle>
          <DialogDescription id="onboard-desc">
            A simulator-first, computer-side BCI trading companion. It is built
            for cognitive hygiene — not speed.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm leading-relaxed text-foreground">
          <li>
            <strong>Mock neural states.</strong> Engagement, fatigue, arousal, and
            calibrated confidence are generated locally. Real BCI input can later
            replace the generator without changing the desk.
          </li>
          <li>
            <strong>Decision Quality</strong> turns those states into High / Medium /
            Low / Caution. Low and Caution add confirmation steps. They never place
            an order for you.
          </li>
          <li>
            <strong>Paper trading only.</strong> Prices are a random walk. There is
            no brokerage connection and no real money.
          </li>
          <li>
            <strong>Privacy.</strong> Everything stays in this browser unless you
            export it. Hard Freeze (<span className="kbd">F</span> /{" "}
            <span className="kbd">Esc</span>) stops all order intent instantly.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted">
          Not a medical device. Not implant software. Not financial advice. Not
          affiliated with Neuralink.
        </p>
        <div className="mt-5 flex justify-end">
          <Button onClick={complete}>Enter the desk</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
