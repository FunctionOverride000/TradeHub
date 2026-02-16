"use client";

import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { Globe } from 'lucide-react';

export function PoweredBy() {
  const { t } = useLanguage();
  return (
    <section className="py-20 lg:py-28 bg-[#0B0E11] border-b border-[#2B3139] relative overflow-hidden group">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
            <div className="flex flex-col items-center gap-12">
              <div className="flex items-center gap-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#474D57]"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#474D57] whitespace-nowrap group-hover:text-[#848E9C] transition-colors">{t.landing.powered}</p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#474D57]"></div>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-24 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-1000">
                  <PartnerLogo name="Solana" img="/solana.png" />
                  <PartnerLogo name="Alchemy" img="/alchemy.jpeg" />
                  <PartnerLogo name="Phantom" img="/phantom.png" />
                  <PartnerLogo name="Helius" img="/helius.png" />
                  <PartnerLogo name="GMGN.AI" img="/gmgn.png" />
              </div>
            </div>
        </div>
    </section>
  );
}

function PartnerLogo({ name, img, fallbackIcon }: { name: string, img: string, fallbackIcon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 group/logo cursor-default">
       <div className="w-10 h-10 bg-[#1E2329] rounded-xl flex items-center justify-center border border-[#2B3139] group-hover/logo:border-[#FCD535]/30 group-hover/logo:shadow-[0_0_15px_rgba(252,213,53,0.1)] transition-all shadow-inner">
          <img 
            src={img} 
            alt={`${name} Logo`} 
            className="w-6 h-6 object-contain" 
            onError={(e) => {
              (e.target as any).style.display = 'none';
              (e.target as any).nextSibling.style.display = 'flex';
            }}
          />
          <div style={{display: 'none'}} className="w-full h-full flex items-center justify-center text-[#848E9C]">
              {fallbackIcon || <Globe size={18}/>}
          </div>
       </div>
       <span className="font-black text-sm lg:text-base tracking-tighter text-[#848E9C] group-hover/logo:text-white transition-colors uppercase italic">{name}</span>
    </div>
  );
}