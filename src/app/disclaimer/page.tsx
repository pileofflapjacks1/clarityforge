import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Disclaimer</h1>
      <Card>
        <CardHeader>
          <CardTitle>Research / simulation only</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            ClarityForge is a computer-side prototype in the Neura suite. It is
            not implant software, not a medical device, not software as a
            medical device (SaMD), and not affiliated with Neuralink or any
            implant vendor.
          </p>
          <p>
            All neural channels in this app are synthetic. They are not EEG,
            not decoded intention, and not a diagnosis of fatigue, stress, or
            fitness to decide. Do not use this software to make medical or
            safety-critical judgments.
          </p>
          <p>
            The market is a paper simulator. There is no brokerage connection,
            no live quotes, and no real-money routing. Nothing in ClarityForge
            is financial advice, an offer to trade, or a performance claim.
          </p>
          <p>
            Session data stays in this browser (localStorage and IndexedDB)
            unless you explicitly export it. There is no account and no cloud
            neural pipeline in the MVP.
          </p>
          <p>
            Hard Freeze disables order intent inside this page only. It does
            not control a broker, an implant, or another application.
          </p>
        </div>
      </Card>
    </div>
  );
}
