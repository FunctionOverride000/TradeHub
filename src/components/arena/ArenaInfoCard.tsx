import React from 'react';
import { 
  Trophy, 
  Coins, 
  Clock, 
  Award, 
  Users, 
  Lock, 
  Ticket, 
  Gift, 
  AlignLeft, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';

interface ArenaInfoCardProps {
  room: any;
  participantCount: number;
  isEnded: boolean;
}

export default function ArenaInfoCard({ room, participantCount, isEnded }: ArenaInfoCardProps) {

  const renderRewardStatus = () => {
    if (!isEnded || !room?.distribution_status) return null;

    if (room.distribution_status === 'distributed') {
      return (
        <div className="mb-8 p-6 bg-gradient-to-r from-[#0ECB81]/10 to-[#0ECB81]/20 border border-[#0ECB81] rounded-3xl animate-in fade-in zoom-in duration-500">
           <div className="flex items-start gap-4">
              <div className="bg-[#0ECB81] p-3 rounded-full text-black shadow-lg shadow-[#0ECB81]/20">
                 <CheckCircle size={24} />
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-black uppercase text-[#0ECB81] mb-2 tracking-tight">Hadiah Telah Cair!</h3>
                 <p className="text-xs text-[#848E9C] mb-4">
                    Sistem otomatis telah mengirimkan reward ke dompet pemenang secara on-chain.
                 </p>
                 {room.distribution_tx_hash && (
                   <a 
                     href={`https://solscan.io/tx/${room.distribution_tx_hash}`} 
                     target="_blank" 
                     rel="noreferrer"
                     className="inline-flex items-center gap-2 bg-[#0ECB81] text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#0be08d] transition-colors"
                   >
                      <ExternalLink size={14} /> Lihat Bukti Transaksi
                   </a>
                 )}
              </div>
           </div>
        </div>
      );
    }

    if (room.distribution_status === 'processing' || room.distribution_status === 'pending') {
      return (
        <div className="mb-8 p-6 bg-gradient-to-r from-[#FCD535]/10 to-[#FCD535]/20 border border-[#FCD535] rounded-3xl animate-pulse">
           <div className="flex items-center gap-4">
              <div className="bg-[#FCD535] p-3 rounded-full text-black">
                 <Loader2 size={24} className="animate-spin" />
              </div>
              <div>
                 <h3 className="text-lg font-black uppercase text-[#FCD535] mb-1 tracking-tight">Memproses Hadiah...</h3>
                 <p className="text-xs text-[#848E9C]">
                    Sistem sedang memverifikasi pemenang dan mengirimkan SOL secara otomatis. Harap tunggu.
                 </p>
              </div>
           </div>
        </div>
      );
    }
    
    if (room.distribution_status.includes('failed')) {
       return (
        <div className="mb-8 p-6 bg-gradient-to-r from-[#F6465D]/10 to-[#F6465D]/20 border border-[#F6465D] rounded-3xl">
           <div className="flex items-center gap-4">
              <div className="bg-[#F6465D] p-3 rounded-full text-white">
                 <AlertCircle size={24} />
              </div>
              <div>
                 <h3 className="text-lg font-black uppercase text-[#F6465D] mb-1 tracking-tight">Distribusi Tertunda</h3>
                 <p className="text-xs text-[#848E9C]">
                    Terjadi kendala teknis. Admin akan memproses manual secepatnya.
                 </p>
              </div>
           </div>
        </div>
       )
    }

    return null;
  };

  return (
    <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] p-10 shadow-2xl relative overflow-hidden">
       <div className="absolute top-0 right-0 w-48 h-48 bg-[#FCD535] rounded-full blur-[100px] opacity-5 pointer-events-none"></div>
       
       <div className="flex flex-wrap items-center gap-3 mb-8">
         {room.access_type === 'private' ? (
            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-[#F6465D] text-white border-[#F6465D] flex items-center gap-2">
               <Lock size={12}/> Private Room
            </span>
         ) : room.access_type === 'whitelist' ? (
            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-purple-600 text-white border-purple-600 flex items-center gap-2">
               <Users size={12}/> Invite Only
            </span>
         ) : (
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${room.is_premium ? 'bg-[#FCD535] text-black border-[#FCD535]' : 'bg-[#181A20] text-[#848E9C] border-[#2B3139]'}`}>
              {room.is_premium ? 'Premium Only' : 'Public Access'}
            </span>
         )}

         {room.entry_fee && room.entry_fee > 0 ? (
            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-[#FCD535] text-black border-[#FCD535] flex items-center gap-2">
               <Ticket size={12}/> Fee: {room.entry_fee} SOL
            </span>
         ) : (
            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-[#0ECB81] text-black border-[#0ECB81]">
               FREE ENTRY
            </span>
         )}

         {isEnded ? (
            <div className="flex items-center gap-2 text-[#848E9C] text-[10px] font-black uppercase tracking-widest bg-[#2B3139] px-3 py-1.5 rounded-xl border border-[#474D57]">
               Selesai
            </div>
         ) : (
            <div className="flex items-center gap-2 text-[#0ECB81] text-[10px] font-black uppercase tracking-widest bg-[#0ECB81]/10 px-3 py-1.5 rounded-xl border border-[#0ECB81]/20">
               <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse"></span> Arena Live
            </div>
         )}
       </div>

       <h1 className="text-4xl font-black leading-[1.1] mb-8 text-white tracking-tighter uppercase italic">{room.title}</h1>
       
       <div className="mb-8 p-6 bg-gradient-to-br from-[#FCD535] to-[#F0B90B] rounded-3xl shadow-xl shadow-[#FCD535]/10 flex items-center gap-6 group transform hover:scale-[1.02] transition-all">
          <div className="w-14 h-14 bg-black/20 rounded-2xl flex items-center justify-center text-black group-hover:rotate-12 transition-transform">
            <Gift size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-black/60 uppercase tracking-widest leading-none mb-1">Hadiah Utama</p>
            <p className="text-2xl font-black text-black uppercase italic tracking-tighter">
               {room.reward_token_amount && room.reward_token_amount > 0 
                  ? `${room.reward_token_amount} ${room.reward_token_symbol || 'SOL'}` 
                  : room.reward || "TBA"}
            </p>
          </div>
       </div>
       
       {renderRewardStatus()}

       <div className="mb-10 bg-[#0B0E11] p-6 rounded-[1.5rem] border border-[#2B3139]">
          <div className="flex items-center gap-2 mb-4 text-[#FCD535]">
            <AlignLeft size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#848E9C]">Detail & Aturan Arena</span>
          </div>
          <p className="text-sm text-[#848E9C] leading-relaxed whitespace-pre-wrap">
            {room.description || "Tidak ada deskripsi tambahan untuk arena ini."}
          </p>
       </div>

       <div className="space-y-4 mb-10">
          <DetailRow icon={<Coins size={16} />} label="Syarat Saldo" value={`${room.min_balance || 0} SOL`} highlight={true} />
          <DetailRow icon={<Clock size={16} />} label="Mulai" value={new Date(room.start_time).toLocaleDateString()} />
          <DetailRow icon={<Award size={16} />} label="Selesai" value={new Date(room.end_time).toLocaleDateString()} />
          <DetailRow icon={<Users size={16} />} label="Trader" value={`${participantCount} Peserta`} />
       </div>

       <div className="pt-8 border-t border-[#2B3139]">
         <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] mb-3">Arena Creator Signature</p>
         <p className="text-[10px] font-mono text-[#848E9C] break-all bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] shadow-inner">{room.creator_wallet}</p>
       </div>
    </div>
  );
}

function DetailRow({ icon, label, value, highlight = false }: { icon: any, label: string, value: string, highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-5 bg-[#0B0E11] rounded-[1.25rem] border ${highlight ? 'border-[#FCD535]/30 shadow-lg shadow-[#FCD535]/5' : 'border-[#2B3139]'} hover:border-[#474D57] transition-all group shadow-sm`}>
      <div className="flex items-center gap-4">
        <div className={`group-hover:text-[#FCD535] transition-colors bg-[#181A20] p-2 rounded-lg ${highlight ? 'text-[#FCD535]' : 'text-[#474D57]'}`}>{icon}</div>
        <span className="text-[10px] font-black text-[#474D57] uppercase tracking-widest">{label}</span>
      </div>
      <span className={`font-mono text-sm font-black tracking-tight ${highlight ? 'text-[#FCD535]' : 'text-[#EAECEF]'}`}>{value}</span>
    </div>
  );
}