import React from 'react';

interface ContentHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export default function ContentHeader({ title, subtitle, icon }: ContentHeaderProps) {
  return (
    <div className="flex items-center gap-8 mb-12 animate-in slide-in-from-left-4 duration-1000">
       <div className="w-20 h-20 bg-[#1E2329] rounded-[2rem] border border-[#2B3139] flex items-center justify-center shadow-2xl shadow-black/50 text-white shrink-0">{icon}</div>
       <div>
          <h2 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-none mb-3">{title}</h2>
          <p className="text-[11px] font-black text-[#FCD535] uppercase tracking-[0.5em] italic">{subtitle}</p>
       </div>
    </div>
  );
}