import React from 'react';

interface SocialCardProps {
  icon: React.ReactNode;
  name: string;
  desc: string;
  link: string;
  color: string;
}

export default function SocialCard({ icon, name, desc, link, color }: SocialCardProps) {
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="p-8 bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] hover:border-white/20 transition-all group flex flex-col items-center text-center hover:-translate-y-2 shadow-2xl relative overflow-hidden">
       <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${color}`}></div>
       <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg ${color}`}>
          {icon}
       </div>
       <h4 className="text-white font-black uppercase italic tracking-tight mb-2">{name}</h4>
       <p className="text-[10px] text-[#848E9C] leading-relaxed font-black uppercase tracking-widest">{desc}</p>
    </a>
  );
}