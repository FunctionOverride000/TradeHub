"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { TrendingUp, Star, BookOpen, LayoutDashboard, ArrowUpRight } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();
  const router = useRouter();

  const safeNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <footer className="bg-[#181A20] py-20 lg:py-32 border-t border-[#2B3139] relative overflow-hidden text-center md:text-left">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FCD535]/30 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-16 relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#FCD535] rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-[#FCD535]/20 cursor-pointer hover:rotate-12 transition-transform group" onClick={() => safeNavigate('/')}>
              <TrendingUp className="text-black w-8 h-8 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="font-black text-2xl uppercase italic leading-none text-white tracking-tighter">TradeHub</p>
            <p className="text-[10px] text-[#474D57] font-black uppercase tracking-[0.4em] mt-2 italic">{t.landing.footer.network_protocol}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-8 lg:gap-12 text-[11px] font-black uppercase tracking-widest text-[#474D57]">
            <button onClick={() => safeNavigate('/hall-of-fame')} className="hover:text-[#FCD535] transition-all flex items-center gap-2 group">
              <Star size={14} className="group-hover:fill-current" /> Hall of Fame
            </button>
            <button onClick={() => safeNavigate('/handbook')} className="hover:text-[#FCD535] transition-all flex items-center gap-2">
              <BookOpen size={14} /> Handbook
            </button>
            <button onClick={() => safeNavigate('/dashboard')} className="hover:text-[#FCD535] transition-all flex items-center gap-2">
              <LayoutDashboard size={14} /> {t.nav.portfolio}
            </button>
        </div>
        <div className="space-y-4">
          <p className="text-[#474D57] text-[10px] font-black uppercase tracking-[0.2em]">{t.landing.footer.copyright}</p>
          <div className="flex justify-center md:justify-end gap-6 text-[10px] font-black uppercase text-[#474D57]">
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
        <a href={href} className="hover:text-white transition-colors flex items-center gap-1 group">
            {label} <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all" />
        </a>
    )
}