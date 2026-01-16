 import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Import Provider Bahasa yang baru dibuat
import { LanguageProvider } from "../lib/LanguageContext"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeHub - Proof of Achievement",
  description: "Platform Kompetisi Trading Terdesentralisasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B0E11] text-[#EAECEF]`}
      >
        {/* Bungkus aplikasi dengan LanguageProvider agar fitur bahasa tersedia global */}
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}