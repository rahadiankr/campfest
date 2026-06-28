import type { Metadata } from "next";
import { Bebas_Neue, JetBrains_Mono, Work_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { BottomNavigation } from "@/components/bottom-navigation";
import { cn } from "@/lib/utils";

import "./globals.css";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  weight: "400",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Camp Connect",
  description: "Registrasi dan koneksi peserta camping youth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn(
        "h-full",
        "antialiased",
        bebasNeue.variable,
        workSans.variable,
        jetBrainsMono.variable,
      )}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          <main className="flex-1 pb-24">{children}</main>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
