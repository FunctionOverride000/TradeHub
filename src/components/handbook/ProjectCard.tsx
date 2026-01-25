import React from 'react';
import { Link as LinkIcon } from 'lucide-react';

interface ProjectCardProps {
  icon: React.ReactNode;
  title: string;
  url: string;
  desc: string;
}

export default function ProjectCard({ icon, title, url, desc }: ProjectCardProps) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-6 p-8 bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] hover:border-[#FCD535]/40 hover:-translate-y-1 transition-all group shadow-xl">
       <div className="w-14 h-14 bg-[#0B0E11] rounded-2xl flex items-center justify-center border border-[#2B3139] shadow-inner group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <div>
          <h4 className="text-white font-black uppercase italic tracking-tight mb-2 flex items-center gap-3">
             {title} <LinkIcon size={12} className="text-[#474D57] group-hover:text-[#FCD535]" />
          </h4>
          <p className="text-xs text-[#848E9C] leading-relaxed font-medium italic">{desc}</p>
       </div>
    </a>
  );
}