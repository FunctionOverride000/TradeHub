import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Import Provider Bahasa
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
  title: "TradeHub",
  description: "Platform Kompetisi Trading Terdesentralisasi",
  icons: {
    // Pastikan file icon.png ada di folder PUBLIC
    icon: '/proofofachievement.svg', 
    shortcut: '/proofofachievement.svg',
    apple: '/proofofachievement.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B0E11] text-[#EAECEF]`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}