import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";

// Menggunakan font Inter karena lebih stabil saat build di Vercel/Netlify
// daripada Geist yang sering gagal fetch dari Google Fonts.
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TradeHub",
  description: "Platform Kompetisi Trading Terdesentralisasi",
  icons: {
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
    // suppressHydrationWarning ditambahkan untuk mencegah warning mismatch pada beberapa browser
    <html lang="id" suppressHydrationWarning={true}>
      <body className={`${inter.className} antialiased bg-[#0B0E11] text-[#EAECEF]`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}