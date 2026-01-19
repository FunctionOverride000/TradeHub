"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Wallet, 
  TrendingUp, 
  ArrowLeft, 
  Loader2, 
  RefreshCw, 
  Users, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Award, 
  Clock, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  AlignLeft, 
  Gift, 
  Coins, 
  Lock, 
  Key,   
  Ticket,
  ExternalLink,
  Hourglass
} from 'lucide-react';

// Pastikan library ini sudah diinstall: npm install @supabase/supabase-js @solana/web3.js
import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';

// Menggunakan alias @/lib agar path lebih aman dan tidak error saat folder dipindah
// Jika error berlanjut, pastikan file LanguageContext.tsx ada di folder src/lib
import { useLanguage } from '@/lib/LanguageContext';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmvezylbaxlodkepstbj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmV6eWxiYXhsb2RrZXBzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTYxNzEsImV4cCI6MjA4MTU5MjE3MX0.a2_XxJKLRXrt_tn_UiMYTmpP1iGjul6OhaHI3IGzJCw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- KONFIGURASI BLOCKCHAIN ---
const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';
const PLATFORM_TREASURY = "DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg"; // Wallet Developer (Tax 10%)

const fetchSolBalance = async (walletAddress: string): Promise<number> => {
  if (!walletAddress || !SOLANA_RPC) return 0;
  try {
    const connection = new web3.Connection(SOLANA_RPC, 'confirmed');
    const publicKey = new web3.PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / web3.LAMPORTS_PER_SOL;
  } catch (err) {
    console.warn("Gagal mengambil saldo on-chain:", err);
    return 0;
  }
};

interface Room {
  id: string;
  title: string;
  description: string;
  reward: string;      
  min_balance: number; 
  creator_wallet: string; // Wallet Kreator (Terima 90%)
  start_time: string;
  end_time: string;
  is_premium: boolean;
  access_type?: 'public' | 'private' | 'whitelist';
  room_password?: string;
  whitelist?: string[];
  entry_fee?: number; // Harga Tiket Masuk
  // --- KOLOM BARU UNTUK REWARD OTOMATIS ---
  reward_token_amount?: number;
  reward_token_symbol?: string;
  distribution_status?: string; // 'pending', 'processing', 'distributed', 'failed'
  distribution_tx_hash?: string;
  winners_info?: any[]; // JSON info pemenang
}

interface Participant {
  id: string;
  wallet_address: string;
  initial_balance: number;
  current_balance: number;
  total_deposit: number; 
  joined_at: string;
  profit?: number;
}

export default function ArenaDetailPage() {
  const { t } = useLanguage(); 
  const [arenaId, setArenaId] = useState<string>("");
  const [room, setRoom] = useState<Room | null>(null);
  const [walletInput, setWalletInput] = useState('');
  const [passwordInput, setPasswordInput] = useState(''); 
  const [isJoining, setIsJoining] = useState(false);
  const [statusMsg, setStatusMsg] = useState(''); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [user, setUser] = useState<any>(null);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathSegments = window.location.pathname.split('/');
      const currentId = pathSegments[pathSegments.length - 1];
      if (currentId && currentId !== 'lomba') {
        setArenaId(currentId);
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!arenaId) return;

    const fetchArenaData = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', arenaId)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        await refreshLeaderboard();
      } catch (err) {
        console.error("Gagal sinkronisasi arena:", err);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchArenaData();

    const channel = supabase
      .channel(`arena-live-${arenaId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'participants', 
        filter: `room_id=eq.${arenaId}` 
      }, () => {
        refreshLeaderboard();
      })
      // Listen juga ke perubahan status room (untuk update status reward)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${arenaId}`
      }, (payload) => {
        setRoom(payload.new as Room);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [arenaId]);

  const syncLeaderboardWithChain = async (currentList: Participant[]) => {
    if (currentList.length === 0 || !SOLANA_RPC) return;
    
    setIsRefreshing(true);
    try {
      const connection = new web3.Connection(SOLANA_RPC, 'confirmed');
      const publicKeys = currentList.map(p => new web3.PublicKey(p.wallet_address));
      const accountsInfo = await connection.getMultipleAccountsInfo(publicKeys);
      
      const updatedList = currentList.map((p, index) => {
        const info = accountsInfo[index];
        const liveBalance = info ? info.lamports / web3.LAMPORTS_PER_SOL : p.current_balance;
        
        const adjustedCurrent = liveBalance - (p.total_deposit || 0);

        return {
          ...p,
          current_balance: liveBalance,
          profit: p.initial_balance > 0 
            ? ((adjustedCurrent - p.initial_balance) / p.initial_balance) * 100 
            : 0
        };
      });

      updatedList.sort((a, b) => (b.profit || 0) - (a.profit || 0));
      setParticipants(updatedList);
    } catch (err) {
      console.error("Gagal sinkronisasi on-chain:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', arenaId);

      if (error) throw error;

      const baseData = (data || []).map((p: any) => {
        const adjustedCurrent = p.current_balance - (p.total_deposit || 0);
        return {
          ...p,
          profit: p.initial_balance > 0 
            ? ((adjustedCurrent - p.initial_balance) / p.initial_balance) * 100 
            : 0
        };
      });

      setParticipants(baseData);
      await syncLeaderboardWithChain(baseData);
    } catch (err) {
      console.error("Gagal memuat papan skor:", err);
    }
  };

  const processTicketPayment = async (fee: number): Promise<boolean> => {
    try {
      const provider = (window as any).solana;
      if (!provider?.isPhantom) {
        alert("Phantom Wallet tidak ditemukan!");
        return false;
      }
      
      setStatusMsg("Menyiapkan tiket...");
      await provider.connect();
      const senderPublicKey = provider.publicKey;
      const connection = new web3.Connection(SOLANA_RPC, 'confirmed');

      const feeLamports = Math.round(fee * web3.LAMPORTS_PER_SOL);
      const devShare = Math.round(feeLamports * 0.10); // 10% Dev
      const creatorShare = feeLamports - devShare;     // 90% Creator

      const transaction = new web3.Transaction();

      transaction.add(
        web3.SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: new web3.PublicKey(PLATFORM_TREASURY),
          lamports: devShare,
        })
      );

      if (room?.creator_wallet) {
          transaction.add(
            web3.SystemProgram.transfer({
              fromPubkey: senderPublicKey,
              toPubkey: new web3.PublicKey(room.creator_wallet),
              lamports: creatorShare,
            })
          );
      } else {
          transaction.add(
            web3.SystemProgram.transfer({
              fromPubkey: senderPublicKey,
              toPubkey: new web3.PublicKey(PLATFORM_TREASURY),
              lamports: creatorShare,
            })
          );
      }

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;

      setStatusMsg("Konfirmasi pembayaran di wallet...");
      const { signature } = await provider.signAndSendTransaction(transaction);
      
      setStatusMsg("Verifikasi blockchain...");
      await connection.confirmTransaction(signature, 'confirmed');
      
      return true;
    } catch (err: any) {
      console.error(err);
      alert("Gagal bayar tiket: " + err.message);
      return false;
    }
  };

  const handleJoinArena = async () => {
    if (!user) {
      alert("Harap masuk ke akun Anda untuk ikut berkompetisi!");
      safeNavigate('/auth');
      return;
    }
    
    if (!walletInput || walletInput.trim().length < 32) {
      return alert("Alamat dompet Solana tidak valid!");
    }

    if (room?.access_type === 'private') {
       if (passwordInput !== room.room_password) {
         return alert("⛔ Password Ruangan Salah!");
       }
    }

    if (room?.access_type === 'whitelist') {
       const allowedWallets = room.whitelist || [];
       const isAllowed = allowedWallets.some(w => w.trim().toLowerCase() === walletInput.trim().toLowerCase());
       if (!isAllowed) {
         return alert("⛔ Akses Ditolak. Wallet ini tidak ada di Whitelist.");
       }
    }
    
    setIsJoining(true);
    try {
      const currentBalance = await fetchSolBalance(walletInput.trim());

      if (room && currentBalance < (room.min_balance || 0)) {
        throw new Error(`Saldo Anda (${currentBalance.toFixed(2)} SOL) kurang dari syarat minimum arena ini (${room.min_balance} SOL).`);
      }

      if (room?.entry_fee && room.entry_fee > 0) {
          const paid = await processTicketPayment(room.entry_fee);
          if (!paid) {
             setIsJoining(false);
             setStatusMsg("");
             return; 
          }
      }

      setStatusMsg("Mendaftarkan peserta...");
      const { error } = await supabase.from('participants').insert({
        room_id: arenaId,
        user_id: user.id,
        wallet_address: walletInput.trim(),
        initial_balance: currentBalance,
        current_balance: currentBalance,
        total_deposit: 0,
        status: 'verified'
      });

      if (error) {
        if (error.code === '23505') throw new Error("Dompet ini sudah terdaftar di arena ini.");
        throw error;
      }

      alert(`Berhasil Terdaftar! Snapshot saldo: ${currentBalance.toFixed(4)} SOL`);
      setWalletInput("");
      setPasswordInput("");
      await refreshLeaderboard();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat mendaftar.");
    } finally {
      setIsJoining(false);
      setStatusMsg("");
    }
  };

  // --- RENDER COMPONENT HELPERS ---
  
  const isEnded = room ? new Date(room.end_time) < new Date() : false;

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

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-[#FCD535] opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="text-[#FCD535] w-6 h-6 animate-pulse" />
          </div>
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-[#848E9C] animate-pulse text-center">
          Menyelaraskan Arena On-Chain...
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11] text-[#EAECEF] p-6 text-center">
        <div className="w-20 h-20 bg-[#F6465D]/10 rounded-3xl flex items-center justify-center mb-6 border border-[#F6465D]/20">
          <AlertCircle className="w-10 h-10 text-[#F6465D]" />
        </div>
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tight">Arena Tidak Ditemukan</h1>
        <button onClick={() => safeNavigate('/')} className="px-10 py-4 bg-[#2B3139] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#363c45] transition-all">Kembali ke Lobby Utama</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 pb-32">
        <button 
          onClick={() => safeNavigate('/')}
          className="group flex items-center gap-3 text-[#848E9C] hover:text-[#FCD535] mb-12 transition-all font-black text-[10px] uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Kembali ke Lobby Utama
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Kolom Kiri: Detail Arena */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] p-10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-[#FCD535] rounded-full blur-[100px] opacity-5 pointer-events-none"></div>
               
               <div className="flex flex-wrap items-center gap-3 mb-8">
                 {/* --- BADGE LOGIKA --- */}
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

                 {/* BADGE TIKET */}
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
               
               {/* BANNER HADIAH UTAMA */}
               {/* Update: Tampilkan Reward Otomatis jika ada, fallback ke teks manual */}
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
               
               {/* STATUS DISTRIBUSI HADIAH (HANYA MUNCUL SETELAH SELESAI) */}
               {renderRewardStatus()}

               {/* BLOK DESKRIPSI ARENA */}
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
                  <DetailRow icon={<Users size={16} />} label="Trader" value={`${participants.length} Peserta`} />
               </div>

               <div className="pt-8 border-t border-[#2B3139]">
                 <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] mb-3">Arena Creator Signature</p>
                 <p className="text-[10px] font-mono text-[#848E9C] break-all bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] shadow-inner">{room.creator_wallet}</p>
               </div>
            </div>

            {/* Kotak Registrasi (Sembunyikan jika sudah selesai) */}
            {!isEnded ? (
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
                   
                   {/* INPUT WALLET */}
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

                   {/* --- INPUT PASSWORD (KHUSUS PRIVATE ROOM) --- */}
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
            ) : (
               <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] p-10 text-center opacity-70">
                  <div className="w-12 h-12 bg-[#2B3139] rounded-2xl flex items-center justify-center text-[#848E9C] mx-auto mb-4">
                     <Hourglass size={24} />
                  </div>
                  <h3 className="text-lg font-black uppercase text-[#848E9C]">Kompetisi Berakhir</h3>
                  <p className="text-xs text-[#474D57] mt-2">Pendaftaran sudah ditutup.</p>
               </div>
            )}
          </div>

          {/* Kolom Kanan: Papan Skor Real-Time */}
          <div className="lg:col-span-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#1E2329] rounded-3xl flex items-center justify-center border border-[#2B3139] shadow-xl">
                  <TrendingUp className="text-[#0ECB81] w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">On-Chain Leaderboard</h2>
                  <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.3em]">Live Verification Network</p>
                </div>
              </div>
              <button 
                onClick={() => refreshLeaderboard()}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-3 text-[10px] font-black text-[#FCD535] uppercase tracking-widest bg-[#1E2329] px-6 py-4 rounded-2xl border border-[#2B3139] hover:bg-[#2B3139] transition-all hover:shadow-lg active:scale-95 shadow-black/20 disabled:opacity-50"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? 'Menyinkronkan...' : 'Segarkan Peringkat'}
              </button>
            </div>

            <div className="bg-[#1E2329] rounded-[3rem] overflow-hidden border border-[#2B3139] shadow-2xl relative">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#2B3139] text-[#848E9C] text-[10px] font-black uppercase tracking-[0.2em] border-b border-[#363c45]">
                    <tr>
                      <th className="p-8">Rank</th>
                      <th className="p-8">Trader Identity</th>
                      <th className="p-8 text-right">Initial (SOL)</th>
                      <th className="p-8 text-right">Current (SOL)</th>
                      <th className="p-8 text-right">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B3139]">
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-32 text-center">
                          <div className="flex flex-col items-center gap-6 opacity-30">
                            <div className="w-20 h-20 bg-[#2B3139] rounded-full flex items-center justify-center border border-[#474D57]">
                               <ShieldCheck size={40} className="text-[#848E9C]" />
                            </div>
                            <div className="space-y-1">
                               <p className="text-lg font-black uppercase tracking-widest text-[#848E9C]">Menunggu Trader Pertama</p>
                               <p className="text-xs font-medium text-[#474D57]">Jadilah yang pertama untuk mendominasi arena ini!</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      participants.map((p, index) => {
                        const isTop3 = index < 3;
                        // Cek apakah user ini adalah salah satu pemenang yang sudah terdata di database (jika sudah distribusikan)
                        const winnerData = room?.winners_info?.find((w: any) => w.wallet === p.wallet_address);

                        return (
                          <tr key={p.id} className={`hover:bg-[#2B3139]/60 transition-all group cursor-default ${winnerData ? 'bg-[#0ECB81]/5' : ''}`}>
                            <td className="p-8 font-black">
                              <div className="flex items-center gap-4">
                                {isTop3 ? (
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-lg ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : index === 1 ? 'bg-slate-300' : 'bg-orange-600'}`}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                  </div>
                                ) : (
                                  <span className="text-sm font-mono text-[#474D57] ml-4 font-black">#{index + 1}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-8">
                               <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[10px] font-black text-[#FCD535] group-hover:border-[#FCD535]/50 transition-colors">W</div>
                                 <div className="flex flex-col">
                                   <span className="font-mono text-sm text-[#EAECEF] group-hover:text-[#FCD535] transition-colors font-bold tracking-tight">
                                     {p.wallet_address.slice(0, 10)}...{p.wallet_address.slice(-10)}
                                   </span>
                                   <span className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mt-1 italic flex items-center gap-1">
                                      {winnerData ? (
                                         <span className="text-[#0ECB81] flex items-center gap-1"><CheckCircle size={10}/> Reward: {winnerData.amount.toFixed(2)} SOL</span>
                                      ) : 'On-Chain Verified'}
                                   </span>
                                 </div>
                               </div>
                            </td>
                            <td className="p-8 text-right font-mono text-xs text-[#848E9C] font-bold">{p.initial_balance?.toFixed(3)}</td>
                            <td className="p-8 text-right font-mono text-sm text-[#EAECEF] font-black">
                               {p.current_balance?.toFixed(3)}
                            </td>
                            <td className="p-8 text-right">
                              <div className="inline-flex flex-col items-end">
                                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs italic ${p.profit! >= 0 ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#F6465D]/10 text-[#F6465D]'}`}>
                                    {p.profit! >= 0 ? '▲' : '▼'} {Math.abs(p.profit!).toFixed(2)}%
                                  </div>
                                  <span className="text-[9px] font-bold text-[#474D57] uppercase tracking-tighter mt-1">Pure ROI</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
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