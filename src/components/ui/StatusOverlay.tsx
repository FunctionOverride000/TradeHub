"use client";

import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface StatusOverlayProps {
  status: 'idle' | 'paying' | 'confirming' | 'saving' | 'success' | 'error';
  onNavigate: (path: string) => void;
}

export default function StatusOverlay({ status, onNavigate }: StatusOverlayProps) {
  if (status === 'idle' || status === 'error') return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#0B0E11]/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 md:p-10 animate-in fade-in duration-300">
      {status === 'success' ? (
        <div className="animate-in zoom-in duration-500 flex flex-col items-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0ECB81] rounded-full flex items-center justify-center mb-6 shadow-xl shadow-[#0ECB81]/20">
            <CheckCircle2 size={32} className="text-black" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase italic text-white mb-2">Arena Published!</h2>
          <p className="text-[#848E9C] text-sm mb-8">Funded & Activated on Blockchain.</p>
          <button 
            onClick={() => onNavigate('/admin/dashboard')} 
            className="w-full max-w-xs py-4 bg-[#FCD535] text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F0B90B] transition-all active:scale-95 shadow-lg"
          >
            MANAGE MY ARENA
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-[#FCD535] animate-spin mb-6" />
          <h2 className="text-xl md:text-2xl font-black uppercase italic text-white mb-2">
            {status === 'paying' ? "Waiting for Wallet..." : 
             status === 'confirming' ? "Verifying Payment..." : 
             "Creating Arena..."}
          </h2>
          <p className="text-[#848E9C] text-xs md:text-sm">
             {status === 'paying' ? "Please approve transaction in Phantom" : "Transferring Fee + Reward Pool..."}
          </p>
        </div>
      )}
    </div>
  );
}