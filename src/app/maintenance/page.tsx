"use client";

import React from 'react';
import { Wrench, Clock, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden font-sans selection:bg-[#FCD535]/30">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCD535] rounded-full blur-[150px] opacity-[0.03] animate-pulse"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full space-y-8 animate-in fade-in zoom-in duration-700">
        
        {/* Animated Icon Container */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-[#FCD535]/20 rounded-full blur-xl group-hover:bg-[#FCD535]/30 transition-all duration-500 animate-pulse"></div>
            <div className="relative w-32 h-32 bg-[#1E2329] border border-[#2B3139] rounded-full flex items-center justify-center shadow-2xl">
                <Wrench className="w-14 h-14 text-[#FCD535] animate-[spin_10s_linear_infinite]" />
            </div>
            {/* Decorative Gears */}
            <div className="absolute -right-2 top-0 bg-[#1E2329] border border-[#2B3139] p-2 rounded-full shadow-lg animate-bounce delay-700">
               <div className="w-2 h-2 bg-[#FCD535] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase italic">
            System <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD535] to-[#F0B90B]">Upgrade</span>
          </h2>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#2B3139] to-transparent mx-auto"></div>
          <p className="text-[#848E9C] text-sm lg:text-base leading-relaxed">
            We are currently upgrading the TradeHub blockchain infrastructure for better performance. The system will be back online shortly.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-[#FCD535] text-xs font-bold uppercase tracking-widest bg-[#FCD535]/10 py-2 px-4 rounded-full border border-[#FCD535]/20 w-fit mx-auto">
             <Clock size={14} className="animate-pulse" /> Estimated: 2 Hours
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => window.location.reload()}
            className="group relative px-8 py-4 bg-[#FCD535] text-black font-black uppercase tracking-widest text-xs rounded-xl overflow-hidden hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-[#FCD535]/10"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative flex items-center justify-center gap-2">
               <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> 
               Check Status
            </span>
          </button>
        </div>

      </div>
      
      {/* Footer Decoration */}
      <div className="absolute bottom-10 text-[10px] font-black uppercase tracking-[0.3em] text-[#2B3139] animate-pulse">
         Protocol Maintenance Mode // 503
      </div>

    </div>
  )
}