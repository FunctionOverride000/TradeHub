"use client";

import React from 'react';
import { 
  Trophy, 
  Rocket, 
  Lock,   
  Users,
  Globe,
  Ticket,
  ArrowRight
} from 'lucide-react';

interface Room {
  id: string;
  title: string;
  description: string;
  reward: string;
  min_balance: number;
  start_time: string;
  end_time: string;
  is_premium: boolean;
  is_boosted?: boolean; 
  access_type?: 'public' | 'private' | 'whitelist';
  entry_fee?: number; 
}

interface ArenaCardProps {
  room: Room;
  index: number;
  status: { label: string; color: string; isLive?: boolean };
  t: any; // Translation object
  onClick: () => void;
}

export default function ArenaCard({ room, index, status, t, onClick }: ArenaCardProps) {
  return (
    <div 
      onClick={onClick} 
      className={`group bg-[#1E2329] rounded-[2.5rem] border ${room.is_boosted ? 'border-[#FCD535] shadow-[0_0_30px_rgba(252,213,53,0.1)]' : 'border-[#2B3139]'} p-8 lg:p-10 hover:border-[#FCD535]/50 transition-all duration-700 cursor-pointer shadow-2xl flex flex-col h-full hover:-translate-y-3 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* --- BADGES (FEATURED / PRIVATE / WHITELIST) --- */}
      <div className="absolute top-0 right-0 z-10 flex flex-col items-end">
         {room.is_boosted && (
            <div className="bg-[#FCD535] text-black text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 mb-[1px] shadow-sm">
               <Rocket size={12} /> Featured
            </div>
         )}
         {room.access_type === 'private' && (
            <div className="bg-[#F6465D] text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 shadow-sm">
               <Lock size={12} /> Private
            </div>
         )}
         {room.access_type === 'whitelist' && (
            <div className="bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 shadow-sm">
               <Users size={12} /> Whitelist
            </div>
         )}
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-start mb-10">
        <div className={`w-12 h-12 bg-[#0B0E11] rounded-2xl flex items-center justify-center text-[#FCD535] border border-[#2B3139] shadow-inner group-hover:rotate-6 transition-transform`}>
          <Trophy size={24} />
        </div>
        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${status.color} flex items-center gap-2`}>
           {status.isLive && <span className="inline-block w-1 h-1 rounded-full bg-[#0ECB81] animate-ping"></span>}
           {status.label}
        </div>
      </div>
      
      <h3 className="text-xl lg:text-2xl font-black text-white mb-4 uppercase italic line-clamp-1 tracking-tighter group-hover:text-[#FCD535] transition-colors">{room.title}</h3>
      
      {/* BADGE TIKET (ENTRY FEE) */}
      {room.entry_fee && room.entry_fee > 0 ? (
          <div className="mb-6 inline-flex bg-[#FCD535]/10 text-[#FCD535] border border-[#FCD535]/20 px-3 py-1 rounded-lg text-[10px] font-bold items-center gap-1">
              <Ticket size={12} /> Entry: {room.entry_fee} SOL
          </div>
      ) : (
          <p className="text-xs text-[#848E9C] font-medium leading-relaxed line-clamp-3 mb-10 flex-1 italic">{room.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#2B3139]">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-[#474D57] uppercase tracking-widest mb-1">{t.explorer.rewards}</span>
          <span className="text-base font-black text-[#FCD535] italic truncate leading-none">{room.reward}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[8px] font-black text-[#474D57] uppercase tracking-widest mb-1">{t.explorer.entry}</span>
          <span className="text-base font-black text-white font-mono leading-none">{room.min_balance} SOL</span>
        </div>
      </div>
      
      <div className="mt-8 w-full py-4 bg-[#0B0E11] rounded-2xl flex items-center justify-center gap-2 border border-[#2B3139] group-hover:bg-[#2B3139] group-hover:border-[#FCD535]/30 transition-all shadow-inner">
        <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-[#FCD535]">ENTER ARENA</span>
        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}