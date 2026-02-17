import React from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0E11] text-white overflow-hidden">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#2B3139_1px,transparent_1px),linear-gradient(to_bottom,#2B3139_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>
      
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-[#FCD535] rounded-full blur-[128px] opacity-[0.05] animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        
        {/* Animated Emblem */}
        <div className="relative">
            {/* Outer Glow Ring */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#FCD535]/0 via-[#FCD535]/10 to-[#FCD535]/0 rounded-full blur-xl animate-pulse"></div>
            
            <div className="relative w-24 h-24">
                {/* Rotating Border */}
                <div className="absolute inset-0 rounded-full border-2 border-t-[#FCD535] border-r-transparent border-b-[#FCD535]/30 border-l-transparent animate-spin"></div>
                
                {/* Inner Counter-Rotating Border */}
                <div className="absolute inset-2 rounded-full border-2 border-b-[#FCD535] border-l-transparent border-t-[#FCD535]/30 border-r-transparent animate-[spin_3s_linear_infinite_reverse]"></div>

                {/* Central Icon - Fixed: Removed solid yellow background box */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 flex items-center justify-center animate-pulse">
                         <Image 
                           src="/proofofachievement.png" 
                           alt="TradeHub Logo" 
                           width={56} 
                           height={56} 
                           className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(252,213,53,0.6)]"
                         />
                    </div>
                </div>
            </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center text-center space-y-3">
            <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-[#848E9C]">
                TRADEHUB
            </h2>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-[#1E2329]/50 border border-[#2B3139] rounded-full backdrop-blur-md">
                <Loader2 size={14} className="text-[#FCD535] animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#848E9C]">
                    System Loading...
                </span>
            </div>
        </div>
      </div>
    </div>
  );
}