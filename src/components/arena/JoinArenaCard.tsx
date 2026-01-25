import React from 'react';
import { Zap, Key, Hourglass, Loader2 } from 'lucide-react';

interface JoinArenaCardProps {
  room: any;
  user: any;
  isEnded: boolean;
  walletInput: string;
  setWalletInput: (val: string) => void;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
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

  if (isEnded) {
    return (
       <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] p-10 text-center opacity-70">
          <div className="w-12 h-12 bg-[#2B3139] rounded-2xl flex items-center justify-center text-[#848E9C] mx-auto mb-4">
             <Hourglass size={24} />
          </div>
          <h3 className="text-lg font-black uppercase text-[#848E9C]">Kompetisi Berakhir</h3>
          <p className="text-xs text-[#474D57] mt-2">Pendaftaran sudah ditutup.</p>
       </div>
    );
  }

  return (
    <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#FCD535]/20 p-10 shadow-2xl relative overflow-hidden group">
       <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-[#FCD535] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-[#FCD535]/10">
            <Zap size={24} fill="currentColor" />
          </div>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Ikuti Turnamen</h2>
       </div>
       <p className="text-xs text-[#848E9C] font-medium mb-10 leading-relaxed">
         Pastikan saldo dompet Anda minimal <span className="text-[#FCD535] font-bold">{room.min_balance || 0} SOL</span> untuk dapat mendaftar.
       </p>
       <div className="space-y-5 relative z-10">
         
         <div className="space-y-2">
           <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Solana Wallet Address</label>
           <input 
             type="text" 
             placeholder="Masukkan alamat dompet Anda..."
             className="w-full px-6 py-5 bg-[#0B0E11] border border-[#2B3139] rounded-2xl text-[#EAECEF] text-sm font-mono focus:border-[#FCD535] outline-none transition-all"
             value={walletInput}
             onChange={(e) => setWalletInput(e.target.value)}
           />
         </div>

         {room.access_type === 'private' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
               <label className="text-[10px] font-black text-[#F6465D] uppercase tracking-widest ml-1 flex items-center gap-1"><Key size={10}/> Password Ruangan</label>
               <input 
                 type="password" 
                 placeholder="Masukkan kode rahasia..."
                 className="w-full px-6 py-5 bg-[#0B0E11] border border-[#F6465D]/30 rounded-2xl text-[#EAECEF] text-sm font-bold focus:border-[#F6465D] outline-none transition-all"
                 value={passwordInput}
                 onChange={(e) => setPasswordInput(e.target.value)}
               />
            </div>
         )}

         <button 
           onClick={handleJoinArena}
           disabled={isJoining}
           className="w-full bg-[#FCD535] text-black font-black py-5 rounded-2xl hover:bg-[#F0B90B] disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#FCD535]/10 active:scale-95 uppercase text-xs tracking-widest"
         >
           {isJoining 
             ? (statusMsg || <Loader2 className="animate-spin" size={20} />) 
             : (room.entry_fee && room.entry_fee > 0 ? `Bayar ${room.entry_fee} SOL & Join` : 'Konfirmasi & Ikut Lomba')
           }
         </button>
       </div>
    </div>
  );
}