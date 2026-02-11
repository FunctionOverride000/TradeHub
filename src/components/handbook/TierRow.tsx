import React from 'react';

interface TierRowProps {
  label: string;
  req: string;
  color: string;
  badge: string;
}

export default function TierRow({ label, req, color, badge }: TierRowProps) {
  return (
    <tr className="hover:bg-[#2B3139]/40 transition-colors group">
       <td className={`p-8 font-black italic text-sm ${color}`}>{label}</td>
       <td className="p-8 text-[#848E9C] text-xs font-bold italic tracking-wide hidden md:table-cell">{req}</td>
       <td className="p-8 text-right"><span className="px-5 py-2 bg-[#0B0E11] rounded-xl border border-[#2B3139] text-[#FCD535] text-[10px] font-black tracking-widest shadow-lg group-hover:border-[#FCD535]/30 transition-all">{badge}</span></td>
    </tr>
  );
}