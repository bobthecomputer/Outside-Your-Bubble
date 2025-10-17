import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className="bg-neutral-950">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-neutral-950 text-neutral-100`}>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(76,29,149,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(8,145,178,0.12),_transparent_40%)]">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
