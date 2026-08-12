import { FORMULA_DOCS } from "@/lib/neural/formulas";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">How it works</h1>
        <p className="mt-1 text-sm text-muted">
          Inspectable research heuristics. Not clinical models. Not trading signals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Computer-side only</CardDescription>
          </div>
        </CardHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>Mock neural engine</strong> synthesizes Engagement, Fatigue, Arousal, and
            Calibrated Confidence as mean-reverting channels with optional injections.
          </li>
          <li>
            <strong>Decision Quality</strong> folds those channels into one band and decides
            how much confirmation an order needs. It never auto-trades.
          </li>
          <li>
            <strong>Intent order construction</strong> uses sliders and discrete confirms that
            can later map to NeuralBridge intent vectors.
          </li>
          <li>
            <strong>Paper engine</strong> walks a handful of symbols and fills simulated tickets
            against cash and positions in the browser.
          </li>
          <li>
            <strong>Heuristic memory</strong> stores the state at fill time and, after a short
            mark-to-market, notes personal patterns without judging.
          </li>
        </ol>
      </Card>

      {Object.values(FORMULA_DOCS).map((doc) => (
        <Card key={doc.name}>
          <CardHeader>
            <div>
              <CardTitle>{doc.name}</CardTitle>
              <CardDescription>Research proxy</CardDescription>
            </div>
          </CardHeader>
          <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed">
            {doc.formula}
          </pre>
          <p className="mt-3 text-sm text-muted">{doc.notes}</p>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Where a real BCI would plug in</CardTitle>
          </div>
        </CardHeader>
        <p className="text-sm leading-relaxed text-muted">
          Keep <code className="font-mono text-accent">CognitiveState</code> stable. Replace{" "}
          <code className="font-mono text-accent">SyntheticCognitiveGenerator.next()</code> with
          decoded features from NeuralBridge (see{" "}
          <code className="font-mono text-accent">src/lib/adapter/neurabridge-stub.ts</code>) and
          call <code className="font-mono text-accent">ingestCognitive()</code>. Order sliders
          already correspond to <code className="font-mono text-accent">velocity_2d</code> and
          confirm buttons to <code className="font-mono text-accent">switch_binary</code> /{" "}
          <code className="font-mono text-accent">class_label</code>.
        </p>
      </Card>
    </div>
  );
}
