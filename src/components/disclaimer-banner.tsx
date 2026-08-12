import Link from "next/link";

/** Persistent, non-dismissible disclaimer — required for all Neura suite apps. */
export function DisclaimerBanner() {
  return (
    <div
      role="note"
      aria-label="Research simulation disclaimer"
      className="border-b border-[color-mix(in_srgb,var(--caution)_45%,var(--border))] bg-[color-mix(in_srgb,var(--caution)_16%,var(--background))] px-3 py-2.5 text-center text-xs leading-snug sm:text-sm"
    >
      <strong className="font-semibold">Research / simulation only.</strong> Not a
      medical device. Not implant software. Not a brokerage. Not financial
      advice. Not affiliated with Neuralink. All neural data is synthetic.{" "}
      <Link
        href="/disclaimer"
        className="font-semibold text-foreground underline underline-offset-2"
      >
        Full disclaimer
      </Link>
    </div>
  );
}
