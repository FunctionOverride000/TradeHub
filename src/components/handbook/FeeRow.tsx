import React from 'react';

interface FeeRowProps {
  label: string;
  fee: string;
  desc: string;
}

export default function FeeRow({ label, fee, desc }: FeeRowProps) {
  return (
    <div className="p-8 bg-[#0B0E11] rounded-[2rem] border border-[#2B3139] flex items-center justify-between group hover:border-[#FCD535]/30 transition-all shadow-inner relative overflow-hidden">
       <div className="absolute inset-y-0 left-0 w-1 bg-[#FCD535] opacity-0 group-hover:opacity-100 transition-opacity"></div>
       <div className="space-y-1.5 relative z-10">
          <p className="text-sm font-black text-white uppercase italic tracking-tight">{label}</p>
          <p className="text-[10px] text-[#474D57] font-black uppercase tracking-[0.2em]">{desc}</p>
       </div>
       <div className="text-right relative z-10">
          <p className="text-2xl font-black text-[#FCD535] italic tracking-tighter leading-none mb-1">{fee}</p>
          <p className="text-[9px] font-black text-[#474D57] uppercase tracking-[0.3em]">Network Standard</p>
       </div>
    </div>
  );
}