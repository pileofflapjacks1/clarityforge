"use client";

import { DisclaimerBanner } from "./disclaimer-banner";
import { AppNav } from "./app-nav";
import { FreezeBar } from "./freeze-bar";
import { Onboarding } from "./onboarding";
import { Runtime } from "./runtime";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-full flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Runtime />
        <DisclaimerBanner />
        <AppNav />
        <FreezeBar />
        <Onboarding />
        <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5">
          {children}
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted">
          ClarityForge · NeuraBeach suite · Research / simulation only · Not a
          medical device · Not a brokerage · Not affiliated with Neuralink ·{" "}
          <a href="https://neurabeach.com">neurabeach.com</a>
        </footer>
      </div>
    </TooltipProvider>
  );
}
