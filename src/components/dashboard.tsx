"use client";

import { CognitiveStatePanel } from "@/components/cognitive/state-panel";
import { DecisionQualityPanel } from "@/components/cognitive/decision-quality";
import { InjectControls } from "@/components/cognitive/inject-controls";
import { MarketPane } from "@/components/trading/price-chart";
import { OrderConstruction } from "@/components/trading/order-construction";
import { PortfolioPanel } from "@/components/trading/portfolio-panel";
import { FillsPanel, OpenOrdersPanel } from "@/components/trading/order-history";
import { InsightsPanel } from "@/components/heuristics/insights-panel";
import { SessionLog } from "@/components/session-log";
import { useForgeStore } from "@/lib/store";

export function Dashboard() {
  const hydrated = useForgeStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_1fr_minmax(0,20rem)]">
        <Skeleton />
        <Skeleton className="min-h-[28rem]" />
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Desk</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Monitor mock cognitive state, keep Decision Quality in view, and
          construct paper orders with intent-style controls. Nothing here is a
          live market or a medical reading.
        </p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,20rem)]">
        <div className="space-y-4">
          <DecisionQualityPanel />
          <CognitiveStatePanel />
          <InjectControls />
        </div>
        <div className="space-y-4">
          <MarketPane />
          <OrderConstruction />
        </div>
        <div className="space-y-4">
          <PortfolioPanel />
          <OpenOrdersPanel />
          <InsightsPanel />
          <FillsPanel />
          <SessionLog />
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`min-h-[12rem] animate-pulse rounded-xl border border-border bg-panel ${className}`}
      aria-hidden
    />
  );
}
