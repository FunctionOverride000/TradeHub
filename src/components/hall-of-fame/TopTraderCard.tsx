"use client";

import React from 'react';
import { Trophy } from 'lucide-react';

export interface GlobalTrader {
  user_id: string;
  wallet_address: string;
  total_initial: number;
  total_current: number;
  total_deposit: number;
  total_profit: number;
  participation_count: number;
  avg_roi: number;
}

interface TopTraderCardProps {
  trader: GlobalTrader;
  index: number;
  onClick: () => void;
}

export default function TopTraderCard({ trader, index, onClick }: TopTraderCardProps) {
  const isGold = index === 0;
  const isSilver = index === 1;
  const isBronze = index === 2;

  return (
    <div 
      onClick={onClick} 
      className={`p-10 rounded-[3.5rem] border transition-all duration-700 cursor-pointer relative overflow-hidden group hover:-translate-y-4 animate-in fade-in slide-in-from-bottom-8 ${isGold ? 'bg-gradient-to-br from-[#FCD535]/10 to-[#0B0E11] border-[#FCD535]/40 shadow-[0_40px_80px_rgba(252,213,53,0.15)] order-2 md:h-[500px] flex flex-col justify-center' : 'bg-[#1E2329] border-[#2B3139] h-[400px] ' + (isSilver ? 'order-1' : 'order-3')}`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
         <Trophy size={120} className={isGold ? 'text-[#FCD535]' : isSilver ? 'text-slate-400' : 'text-orange-600'} />
      </div>
      
      <div className="relative z-10">
         <div className={`w-20 h-20 rounded-3xl mb-10 flex items-center justify-center text-4xl font-black shadow-2xl border ${isGold ? 'bg-[#FCD535] text-black border-[#FCD535]' : 'bg-[#0B0E11] text-white border-[#2B3139]'}`}>
            {index + 1}
         </div>
         
         <p className="text-[11px] font-black text-[#474D57] uppercase tracking-[0.4em] mb-3 italic">Master Identity</p>
         <h3 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter mb-10 group-hover:text-[#FCD535] transition-colors truncate">
           {trader.wallet_address.slice(0, 14)}...
         </h3>
         
         <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
           <div>
              <p className="text-[10px] font-black text-[#474D57] uppercase mb-2 tracking-widest leading-none">Net Profit</p>
              <p className="text-3xl font-black text-[#0ECB81] italic tracking-tighter">+{trader.total_profit.toFixed(2)}<span className="text-xs not-italic ml-1">SOL</span></p>
           </div>
           <div>
              <p className="text-[10px] font-black text-[#474D57] uppercase mb-2 tracking-widest leading-none">Global ROI</p>
              <p className="text-3xl font-black text-white italic tracking-tighter">+{trader.avg_roi.toFixed(1)}%</p>
           </div>
         </div>
      </div>
   </div>
  );
}