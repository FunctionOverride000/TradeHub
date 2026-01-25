import React from 'react';

interface GuideStepProps {
  num: string;
  title: string;
  desc: string;
}

export default function GuideStep({ num, title, desc }: GuideStepProps) {
  return (
    <div className="flex items-start gap-8 p-8 rounded-[2.5rem] bg-[#1E2329]/40 border border-[#2B3139] hover:border-[#FCD535]/20 transition-all group shadow-xl">
       <div className="text-3xl font-black text-[#2B3139] group-hover:text-[#FCD535]/20 transition-colors italic leading-none pt-1">{num}</div>
       <div>
          <h4 className="text-white font-black uppercase italic tracking-tight mb-2 group-hover:text-[#FCD535] transition-colors">{title}</h4>
          <p className="text-xs text-[#848E9C] leading-relaxed font-medium italic">{desc}</p>
       </div>
    </div>
  );
}