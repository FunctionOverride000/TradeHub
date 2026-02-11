import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  trendUp: boolean;
  subValue?: string; // Kept as optional for compatibility if needed elsewhere, but mainly using trend/trendUp
}

export default function UserStatCard({ label, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-[#1E2329] p-6 lg:p-8 rounded-[2.5rem] border border-[#2B3139] shadow-2xl relative overflow-hidden group hover:border-[#FCD535]/30 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className="text-[#848E9C] text-[9px] font-black uppercase tracking-[0.2em]">{label}</div>
        <div className="p-2.5 bg-[#0B0E11] rounded-xl border border-[#2B3139] text-[#848E9C] group-hover:text-[#FCD535] transition-all shadow-inner">{icon}</div>
      </div>
      <div className="flex items-end gap-3 justify-center sm:justify-start">
        <span className="text-2xl lg:text-4xl font-black text-white italic tracking-tighter leading-none uppercase">{value}</span>
        <div className={`text-[8px] font-black mb-1 px-2 py-0.5 rounded-full border ${trendUp ? 'text-[#0ECB81] bg-[#0ECB81]/10 border-[#0ECB81]/20' : 'text-[#F6465D] bg-[#F6465D]/10 border-[#F6465D]/20'}`}>{trend}</div>
      </div>
    </div>
  );
}