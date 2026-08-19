import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BootReadyMarker } from "@/components/boot-ready-marker";
import { BootRecoveryScript } from "@/components/boot-recovery-script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GRA Oversight Console",
  description: "Gambling Regulatory Authority — Kenya Raffle Oversight Platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BootRecoveryScript />
        <BootReadyMarker />
        {children}
      </body>
    </html>
  );
}
