"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { TrendingUp, Star, BookOpen, LayoutDashboard, ArrowUpRight, Shield, FileText } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();
  const router = useRouter();

  const safeNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <footer className="bg-[#181A20] py-20 lg:py-24 border-t border-[#2B3139] relative overflow-hidden text-center md:text-left">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FCD535]/30 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row justify-between items-center gap-12 lg:gap-0 relative z-10">
        
        {/* BRAND SECTION (LEFT) */}
        <div className="flex items-center gap-5 lg:flex-1">
          <div className="w-14 h-14 bg-[#FCD535] rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-[#FCD535]/20 cursor-pointer hover:rotate-12 transition-transform group" onClick={() => safeNavigate('/')}>
              <TrendingUp className="text-black w-8 h-8 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-left">
            <p className="font-black text-2xl uppercase italic leading-none text-white tracking-tighter">TradeHub</p>
            <p className="text-[10px] text-[#474D57] font-black uppercase tracking-[0.4em] mt-2 italic">{t.landing.footer.network_protocol}</p>
            <p className="text-[10px] text-[#474D57] font-bold mt-1 tracking-wide">© 2026 TradeHub • Verified On-Chain Reputations.</p>
          </div>
        </div>

        {/* NAVIGATION LINKS (CENTER) - Now includes Terms & Privacy */}
        <div className="flex flex-wrap justify-center gap-6 lg:gap-8 text-[11px] font-black uppercase tracking-widest text-[#474D57] lg:flex-[2]">
            <button onClick={() => safeNavigate('/hall-of-fame')} className="hover:text-[#FCD535] transition-all flex items-center gap-2 group">
              <Star size={14} className="group-hover:fill-current" /> Hall of Fame
            </button>
            <button onClick={() => safeNavigate('/handbook')} className="hover:text-[#FCD535] transition-all flex items-center gap-2">
              <BookOpen size={14} /> Handbook
            </button>
            <button onClick={() => safeNavigate('/dashboard')} className="hover:text-[#FCD535] transition-all flex items-center gap-2">
              <LayoutDashboard size={14} /> {t.nav.portfolio}
            </button>
            <button onClick={() => safeNavigate('/terms')} className="hover:text-[#FCD535] transition-all flex items-center gap-2">
              <FileText size={14} /> Terms
            </button>
            <button onClick={() => safeNavigate('/privacy')} className="hover:text-[#FCD535] transition-all flex items-center gap-2">
              <Shield size={14} /> Privacy
            </button>
        </div>

        {/* SOCIALS (RIGHT) */}
        <div className="flex flex-col items-center lg:items-end gap-6 lg:flex-1">
          {/* Social Links Row */}
          <div className="flex gap-8 text-[10px] font-black uppercase text-[#848E9C]">
             <SocialLink href="https://twitter.com/TradeHub_SOL" label="Twitter" />
             <SocialLink href="https://discord.gg/zKjFNZdM" label="Discord" />
             <SocialLink href="https://t.me/tradehub_proofofachievement" label="Telegram" />
          </div>
        </div>

      </div>
    </footer>
  );
}

function SocialLink({ href, label }: any) {
    return (
        <a href={href} className="hover:text-[#FCD535] transition-colors flex items-center gap-1 group">
            {label} <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all" />
        </a>
    )
}