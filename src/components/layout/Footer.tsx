"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { 
  TrendingUp, 
  Star, 
  BookOpen, 
  LayoutDashboard, 
  ArrowUpRight, 
  Shield, 
  FileText, 
  Flag 
} from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();
  const router = useRouter();

  const safeNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <footer className="bg-[#181A20] relative overflow-hidden text-center md:text-left border-t border-[#2B3139]">
      {/* Top Gradient Line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FCD535]/50 to-transparent shadow-[0_0_10px_rgba(252,213,53,0.5)]" />
      
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20 flex flex-col lg:flex-row justify-between items-center gap-12 lg:gap-0 relative z-10">
        
        {/* BRAND SECTION (LEFT) */}
        <div className="flex flex-col md:flex-row items-center gap-6 lg:flex-1">
          <button 
            onClick={() => safeNavigate('/')}
            className="w-16 h-16 bg-[#FCD535] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FCD535]/20 hover:scale-105 hover:rotate-3 transition-all duration-300 group"
          >
            <TrendingUp className="text-black w-8 h-8 group-hover:scale-110 transition-transform" />
          </button>
          
          <div className="text-center md:text-left">
            <h2 className="font-black text-3xl uppercase italic leading-none text-white tracking-tighter">
              TradeHub
            </h2>
            <p className="text-[10px] text-[#848E9C] font-black uppercase tracking-[0.3em] mt-2">
              {t.landing.footer.network_protocol || "Verified On-Chain Reputations"}
            </p>
            <p className="text-[10px] text-[#474D57] font-bold mt-1.5 tracking-wide">
              © {new Date().getFullYear()} TradeHub. All rights reserved.
            </p>
          </div>
        </div>

        {/* NAVIGATION LINKS (CENTER) */}
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 lg:gap-x-10 text-[11px] font-black uppercase tracking-widest text-[#848E9C] lg:flex-[2] lg:justify-center">
           <NavLink icon={Star} label="Hall of Fame" onClick={() => safeNavigate('/hall-of-fame')} />
           <NavLink icon={BookOpen} label="Handbook" onClick={() => safeNavigate('/handbook')} />
           <NavLink icon={LayoutDashboard} label={t.nav.portfolio || "Dashboard"} onClick={() => safeNavigate('/dashboard')} />
           <NavLink icon={FileText} label="Terms" onClick={() => safeNavigate('/terms')} />
           <NavLink icon={Shield} label="Privacy" onClick={() => safeNavigate('/privacy')} />
           <NavLink icon={Flag} label="Reports" onClick={() => safeNavigate('/report')} />
        </nav>

        {/* SOCIALS (RIGHT) */}
        <div className="flex flex-col items-center lg:items-end gap-4 lg:flex-1">
          <p className="text-[10px] font-black uppercase text-[#474D57] tracking-widest mb-1 hidden lg:block">Community</p>
          <div className="flex gap-6 text-[10px] font-black uppercase text-[#848E9C]">
             <SocialLink href="https://twitter.com/TradeHub_SOL" label="Twitter" />
             <SocialLink href="https://discord.gg/zKjFNZdM" label="Discord" />
             <SocialLink href="https://t.me/tradehub_proofofachievement" label="Telegram" />
          </div>
        </div>

      </div>
    </footer>
  );
}

// Helper Components
function NavLink({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className="flex items-center gap-2 hover:text-[#FCD535] transition-colors duration-200 group"
    >
      <Icon size={14} className="group-hover:text-[#FCD535] transition-colors" />
      <span>{label}</span>
    </button>
  );
}

function SocialLink({ href, label }: { href: string, label: string }) {
    return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-[#FCD535] transition-colors flex items-center gap-1.5 group py-2"
        >
            {label} 
            <ArrowUpRight size={10} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
        </a>
    )
}