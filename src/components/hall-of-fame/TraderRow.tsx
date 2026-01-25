"use client";

import React from 'react';
import { Users, ShieldAlert, ArrowUpRight } from 'lucide-react';
import type { GlobalTrader } from './TopTraderCard';

interface TraderRowProps {
  trader: GlobalTrader;
  index: number;
  onClick: () => void;
}

export default function TraderRow({ trader, index, onClick }: TraderRowProps) {
  const isAdjusted = trader.total_deposit > 0;
  
  return (
    <tr className="hover:bg-[#2B3139]/40 transition-all group cursor-pointer" onClick={onClick}>
      <td className="p-10">
         <span className={`text-2xl lg:text-3xl font-black italic ${index < 3 ? 'text-[#FCD535]' : 'text-[#474D57]'}`}>
            {index < 9 ? `0${index + 1}` : index + 1}
         </span>
      </td>
      <td className="p-10">
         <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[#848E9C] group-hover:text-[#FCD535] group-hover:border-[#FCD535]/30 transition-all shadow-inner"><Users size={20}/></div>
            <div className="flex flex-col">
               <span className="font-mono text-sm font-black text-[#EAECEF] group-hover:text-[#FCD535] transition-colors tracking-tight">
                  {trader.wallet_address.slice(0, 10)}...{trader.wallet_address.slice(-10)}
               </span>
               <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[8px] font-black text-[#0ECB81] uppercase tracking-[0.2em] bg-[#0ECB81]/10 px-2 py-0.5 rounded-md border border-[#0ECB81]/20 italic">On-Chain Evidence</span>
                  {isAdjusted && (
                    <span className="text-[8px] font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                       <ShieldAlert size={10}/> Anti-Cheat Verified
                    </span>
                  )}
               </div>
            </div>
         </div>
      </td>
      <td className="p-10 text-right">
         <span className="font-black text-white text-xs uppercase italic tracking-widest">{trader.participation_count} Arenas</span>
      </td>
      <td className="p-10 text-right font-mono font-black text-white text-base">
         {trader.total_profit >= 0 ? '+' : ''}{trader.total_profit.toFixed(3)} <span className="text-[10px] text-[#474D57] font-sans ml-1">SOL</span>
      </td>
      <td className="p-10 text-center">
         <div className={`px-6 py-2.5 rounded-xl font-black text-[10px] lg:text-xs inline-block italic border shadow-lg ${trader.total_profit >= 0 ? 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20 shadow-[#0ECB81]/5' : 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20 shadow-[#F6465D]/5'}`}>
            {trader.total_profit >= 0 ? '▲' : '▼'} {Math.abs(trader.avg_roi).toFixed(2)}%
         </div>
      </td>
      <td className="p-10 text-right">
         <button className="p-4 bg-[#0B0E11] border border-[#2B3139] rounded-2xl text-[#848E9C] group-hover:text-[#FCD535] group-hover:border-[#FCD535]/30 transition-all active:scale-90 shadow-inner">
            <ArrowUpRight size={20} />
         </button>
      </td>
    </tr>
  );
}