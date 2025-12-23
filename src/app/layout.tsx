import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const brandSans = Manrope({
  variable: "--font-brand-sans",
  subsets: ["latin"],
  display: "swap",
});

const brandDisplay = Fraunces({
  variable: "--font-brand-display",
  subsets: ["latin"],
  display: "swap",
});

const brandMono = JetBrains_Mono({
  variable: "--font-brand-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Outside Your Bubble",
  description: "Outside Your Bubble (OYB) surfaces verified perspectives beyond your usual feed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[color:var(--background)]">
      <body
        className={`${brandSans.variable} ${brandDisplay.variable} ${brandMono.variable} min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]`}
      >
        <div className="min-h-screen bg-[radial-gradient(1000px_circle_at_top,_rgba(14,116,144,0.18),_transparent_55%),radial-gradient(1000px_circle_at_bottom,_rgba(202,138,4,0.16),_transparent_60%)]">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
