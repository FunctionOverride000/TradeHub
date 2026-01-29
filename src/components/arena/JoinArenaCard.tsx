"use client";

import React from 'react';
import { 
  Rocket, 
  Wallet, 
  Lock, 
  Ticket, 
  Loader2, 
  Coins 
} from 'lucide-react';

interface JoinArenaCardProps {
  room: any;
  user: any;
  isEnded: boolean;
  walletInput: string;
  setWalletInput: (v: string) => void;
  passwordInput: string;
  setPasswordInput: (v: string) => void;
  isJoining: boolean;
  statusMsg: string;
  handleJoinArena: () => void;
}

export default function JoinArenaCard({
  room,
  user,
  isEnded,
  walletInput,
  setWalletInput,
  passwordInput,
  setPasswordInput,
  isJoining,
  statusMsg,
  handleJoinArena
}: JoinArenaCardProps) {

  // Jika lomba sudah berakhir
  if (isEnded) {
    return (
      <div className="bg-[#1E2329] border border-[#2B3139] rounded-3xl p-8 text-center shadow-lg">
        <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Tournament Ended</h3>
        <p className="text-[#848E9C] text-xs">Registration is closed.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1E2329] border border-[#2B3139] rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535]/5 rounded-full blur-[50px] pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center text-black shadow-lg shadow-[#FCD535]/20">
          <Rocket size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Join Tournament</h2>
          <p className="text-[10px] text-[#848E9C]">Enter the arena and prove your skills.</p>
        </div>
      </div>

      <div className="space-y-5 relative z-10">
        
        {/* Min Balance Info */}
        <div className="bg-[#0B0E11]/50 border border-[#2B3139] rounded-xl p-3 flex items-start gap-3">
          <Coins className="text-[#FCD535] mt-0.5" size={16} />
          <p className="text-[10px] text-[#848E9C] leading-relaxed">
            Ensure your wallet balance is at least <strong className="text-[#EAECEF]">{room?.min_balance || 0} SOL</strong> to register.
          </p>
        </div>

        {/* Entry Fee Info */}
        {room?.entry_fee > 0 && (
          <div className="bg-[#0B0E11]/50 border border-[#2B3139] rounded-xl p-3 flex items-start gap-3">
            <Ticket className="text-[#FCD535] mt-0.5" size={16} />
            <p className="text-[10px] text-[#848E9C] leading-relaxed">
              Entry Ticket Fee: <strong className="text-[#EAECEF]">{room.entry_fee} SOL</strong> (One-time payment).
            </p>
          </div>
        )}

        {/* Input Wallet */}
        <div>
          <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1 mb-1.5 block">
            Solana Wallet Address
          </label>
          <div className="relative">
            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474D57]" size={16} />
            <input 
              type="text" 
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="Paste your wallet address..." 
              className="w-full bg-[#0B0E11] pl-11 pr-4 py-3.5 rounded-xl border border-[#2B3139] focus:border-[#FCD535] outline-none text-[#EAECEF] text-xs font-mono transition-all placeholder-[#2B3139]"
            />
          </div>
        </div>

        {/* Input Password (Private Only) */}
        {room?.access_type === 'private' && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1 mb-1.5 block">
              Room Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474D57]" size={16} />
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..." 
                className="w-full bg-[#0B0E11] pl-11 pr-4 py-3.5 rounded-xl border border-[#2B3139] focus:border-[#FCD535] outline-none text-[#EAECEF] text-xs font-mono transition-all placeholder-[#2B3139]"
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <button 
          onClick={handleJoinArena}
          disabled={isJoining}
          className="w-full bg-[#FCD535] hover:bg-[#ffe066] text-black font-black py-4 rounded-xl transition-all shadow-lg shadow-[#FCD535]/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em]"
        >
          {isJoining ? <Loader2 className="animate-spin" size={16} /> : "Confirm & Join Arena"}
        </button>

        {/* Status Message */}
        {statusMsg && (
          <p className="text-center text-[10px] font-bold text-[#FCD535] animate-pulse">
            {statusMsg}
          </p>
        )}

      </div>
    </div>
  );
}