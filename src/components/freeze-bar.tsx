"use client";

import { Snowflake, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useForgeStore } from "@/lib/store";

export function FreezeBar() {
  const frozen = useForgeStore((s) => s.frozen);
  const freeze = useForgeStore((s) => s.freeze);
  const unfreeze = useForgeStore((s) => s.unfreeze);

  return (
    <div
      className={
        frozen
          ? "border-b border-[color-mix(in_srgb,var(--danger)_50%,var(--border))] bg-[var(--danger-dim)]"
          : "border-b border-border bg-panel"
      }
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm text-muted">
          {frozen ? (
            <span className="font-medium text-danger">
              Hard Freeze is on. Order intent is disabled until you release it.
            </span>
          ) : (
            <>
              Safety is armed. Press <span className="kbd">F</span> or{" "}
              <span className="kbd">Esc</span> to freeze all order intent immediately.
            </>
          )}
        </p>
        {frozen ? (
          <Button variant="secondary" size="sm" onClick={unfreeze}>
            <Unlock className="h-4 w-4" />
            Release freeze
          </Button>
        ) : (
          <Button variant="freeze" size="sm" onClick={() => freeze()}>
            <Snowflake className="h-4 w-4" />
            Hard Freeze
          </Button>
        )}
      </div>
    </div>
  );
}
