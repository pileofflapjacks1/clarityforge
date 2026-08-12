import { cn } from "@/lib/utils";
import type { QualityBand } from "@/lib/types";

export function Badge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function QualityBadge({ band }: { band: QualityBand }) {
  const styles: Record<QualityBand, string> = {
    high: "border-[color-mix(in_srgb,var(--ok)_55%,var(--border))] bg-[var(--ok-dim)] text-ok",
    medium: "border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] bg-[var(--accent-dim)] text-accent",
    low: "border-[color-mix(in_srgb,var(--low)_55%,var(--border))] bg-[color-mix(in_srgb,var(--low)_16%,transparent)] text-low",
    caution:
      "border-[color-mix(in_srgb,var(--caution)_55%,var(--border))] bg-[var(--caution-dim)] text-caution",
  };
  const label = { high: "High", medium: "Medium", low: "Low", caution: "Caution" }[band];
  return <Badge className={styles[band]}>{label}</Badge>;
}
