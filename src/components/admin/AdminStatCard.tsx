import React from 'react';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function AdminStatCard({ label, value, icon }: AdminStatCardProps) {
  return (
    <div className="bg-[#1E2329] p-6 lg:p-10 rounded-[2.5rem] border border-[#2B3139] shadow-2xl group hover:border-[#FCD535]/30 transition-all relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535] rounded-full blur-[80px] opacity-0 group-hover:opacity-5 transition-opacity"></div>
      <div className="flex justify-between items-start mb-6">
        <div className="text-[9px] lg:text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] italic">{label}</div>
        <div className="p-3 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#848E9C] group-hover:text-[#FCD535] transition-all shadow-inner">{icon}</div>
      </div>
      <p className="text-3xl lg:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">{value}</p>
    </div>
  );
}