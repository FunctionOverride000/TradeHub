import React from 'react';

interface NavCardProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export default function NavCard({ active, onClick, icon, title, desc }: NavCardProps) {
  return (
    <div onClick={onClick} className={`p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden ${active ? 'bg-[#1E2329] border-[#FCD535]/40 shadow-2xl scale-[1.02]' : 'bg-transparent border-[#2B3139] hover:border-[#474D57]'}`}>
       {active && <div className="absolute top-0 right-0 w-24 h-24 bg-[#FCD535]/5 rounded-full blur-2xl"></div>}
       <div className="flex items-center gap-5 mb-4 relative z-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${active ? 'bg-[#FCD535] text-black shadow-lg shadow-[#FCD535]/20 rotate-6' : 'bg-[#0B0E11] text-[#848E9C] border border-[#2B3139]'}`}>{icon}</div>
          <h3 className={`font-black uppercase italic tracking-tighter text-base transition-colors duration-500 ${active ? 'text-white' : 'text-[#848E9C]'}`}>{title}</h3>
       </div>
       <p className="text-[10px] text-[#474D57] font-black uppercase tracking-widest leading-relaxed relative z-10">{desc}</p>
    </div>
  );
}