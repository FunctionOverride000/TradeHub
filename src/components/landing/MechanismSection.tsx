"use client";

import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { Target, BarChart3, Rocket } from 'lucide-react';

export function MechanismSection() {
  const { t } = useLanguage();
  
  return (
    <section id="how-it-works" className="py-28 lg:py-48 bg-[#0B0E11] border-b border-[#2B3139] relative overflow-hidden">
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none animate-pulse-glow"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-24 lg:mb-32 px-4">
          <h2 className="text-[10px] font-black text-[#FCD535] uppercase tracking-[0.5em] mb-4">{t.landing.mechanism.title_small}</h2>
          <p className="text-4xl lg:text-6xl font-black text-white italic uppercase tracking-tighter leading-none drop-shadow-lg">{t.landing.mechanism.title_big}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          <StepCard num="01" icon={<Target className="text-[#3b82f6]" />} title={t.landing.mechanism.step1} desc={t.landing.mechanism.desc1} />
          <StepCard num="02" icon={<BarChart3 className="text-[#0ECB81]" />} title={t.landing.mechanism.step2} desc={t.landing.mechanism.desc2} />
          <StepCard num="03" icon={<Rocket className="text-[#FCD535]" />} title={t.landing.mechanism.step3} desc={t.landing.mechanism.desc3} />
        </div>
      </div>
    </section>
  );
}

function StepCard({ num, icon, title, desc }: any) {
  return (
    <div className="bg-[#1E2329] p-8 lg:p-12 rounded-[2.5rem] border border-[#2B3139] relative group hover:border-[#FCD535]/30 transition-all shadow-2xl text-center md:text-left overflow-hidden hover:-translate-y-2 duration-300">
       <div className="absolute -top-6 -right-6 text-8xl lg:text-9xl font-black text-white/5 italic leading-none group-hover:text-[#FCD535]/5 transition-colors select-none">{num}</div>
       <div className="w-16 h-16 bg-[#0B0E11] mx-auto md:mx-0 rounded-[1.5rem] flex items-center justify-center mb-8 lg:mb-10 border border-[#2B3139] shadow-inner group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 relative z-10">
           {icon}
       </div>
       <h3 className="text-xl lg:text-2xl font-black text-white uppercase italic mb-4 leading-tight tracking-tight group-hover:text-[#FCD535] transition-colors">{title}</h3>
       <p className="text-xs lg:text-sm text-[#848E9C] leading-relaxed font-medium italic">{desc}</p>
    </div>
  );
}