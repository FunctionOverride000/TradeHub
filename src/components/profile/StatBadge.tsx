import React from 'react';

interface StatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}

export default function StatBadge({ icon, label, value, highlight = false }: StatBadgeProps) {
  return (
    <div className={`bg-[#1E2329]/60 p-8 rounded-[3rem] border border-[#2B3139] flex items-center gap-8 min-w-[260px] shadow-2xl group hover:border-[#FCD535]/30 transition-all ${highlight ? 'border-[#FCD535]/20 bg-[#FCD535]/5' : ''}`}>
       <div className="w-16 h-16 bg-[#0B0E11] rounded-[2rem] flex items-center justify-center border border-[#2B3139] group-hover:scale-110 transition-transform shadow-inner shrink-0">
          {icon}
       </div>
       <div className="overflow-hidden">
          <p className="text-[11px] font-black text-[#474D57] uppercase tracking-[0.3em] mb-2 italic">{label}</p>
          <p className={`text-3xl lg:text-4xl font-black italic tracking-tighter truncate leading-none uppercase ${highlight ? 'text-[#FCD535]' : 'text-white'}`}>{value}</p>
       </div>
    </div>
  );
}