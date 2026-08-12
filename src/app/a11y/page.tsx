import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function A11yPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accessibility</h1>
        <p className="mt-1 text-sm text-muted">
          ClarityForge is keyboard-first. Neural intent is a future input, not a requirement.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Scorecard (MVP)</CardTitle>
            <CardDescription>Honest, not certified</CardDescription>
          </div>
        </CardHeader>
        <ul className="space-y-2 text-sm">
          <li>Visible focus rings on interactive controls.</li>
          <li>
            Hard Freeze from keyboard: <span className="kbd">F</span> (when not typing) and{" "}
            <span className="kbd">Esc</span>.
          </li>
          <li>Skip link to main content.</li>
          <li>Gauges expose <code className="font-mono">role=&quot;meter&quot;</code> and valuetext.</li>
          <li>Order sliders are labelled and operable with arrow keys (Radix).</li>
          <li>Dialogs use Radix focus trap and labelled titles.</li>
          <li>Reduced-motion media query disables non-essential animation.</li>
          <li>Color is not the only Decision Quality cue — the band is written out.</li>
          <li>Minimum control height ~44px on primary actions.</li>
        </ul>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Known gaps</CardTitle>
        </CardHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>The price chart is visual; quotes are also available as text above it.</li>
          <li>No screen-reader-only live region for every neural tick (by design — too noisy).</li>
          <li>Tablet usable; phone is not a target for this MVP.</li>
        </ul>
      </Card>
    </div>
  );
}
