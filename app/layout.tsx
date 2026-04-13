import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Sonner } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Restaurant Lead CRM",
  description: "Production-ready CRM for restaurant sales leads",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-zinc-50">
        {children}
        <Sonner />
      </body>
    </html>
  );
}
