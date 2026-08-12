import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://clarityforge.vercel.app",
  ),
  title: "ClarityForge — BCI paper-trading companion",
  description:
    "Simulator-first, computer-side BCI trading companion. Mock cognitive states, Decision Quality, intent-native paper orders. Research only. Not a medical device. Not a brokerage. Not affiliated with Neuralink.",
  keywords: [
    "ClarityForge",
    "BCI",
    "paper trading",
    "decision quality",
    "Neura Suite",
    "Neurabeach",
    "simulator",
  ],
  openGraph: {
    title: "ClarityForge — cognitive hygiene for paper trading",
    description:
      "Mock neural states, Decision Quality friction, and intent-native paper orders. Research / simulation only.",
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "ClarityForge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClarityForge",
    description:
      "BCI paper-trading companion. Simulator-first. Not a medical device. Not a brokerage.",
    images: ["/og.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
