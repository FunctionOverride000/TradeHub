"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';

// PERBAIKAN: Menggunakan relative path manual (../../../) menggantikan alias (@/)
import { useLanguage } from '../../../lib/LanguageContext';

// --- IMPORT KOMPONEN ---
// PERBAIKAN: Menggunakan relative path manual (../../../)
import ArenaInfoCard from '../../../components/arena/ArenaInfoCard';
import JoinArenaCard from '../../../components/arena/JoinArenaCard';
import LeaderboardTable from '../../../components/arena/LeaderboardTable';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';
const PLATFORM_TREASURY = "DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg";

const fetchSolBalance = async (walletAddress: string): Promise<number> => {
  if (!walletAddress || !SOLANA_RPC) return 0;
  try {
    const connection = new web3.Connection(SOLANA_RPC, 'confirmed');
    const publicKey = new web3.PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / web3.LAMPORTS_PER_SOL;
  } catch (err) {
    return 0;
  }
};

interface Room {
  id: string;
  title: string;
  description: string;
  reward: string;      
  min_balance: number; 
  creator_wallet: string;
  start_time: string;
  end_time: string;
  is_premium: boolean;
  access_type?: 'public' | 'private' | 'whitelist';
  room_password?: string;
  whitelist?: string[];
  entry_fee?: number;
  reward_token_amount?: number;
  reward_token_symbol?: string;
  distribution_status?: string;
  distribution_tx_hash?: string;
  winners_info?: any[];
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
         console.error("Error fetching arena:", err);
      } finally {
        setIsPageLoading(false);
      }
    };
    fetchArenaData();

    const channel = supabase
      .channel(`arena-live-${arenaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${arenaId}` }, () => {
        refreshLeaderboard();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${arenaId}` }, (payload) => {
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
       console.error("Chain sync error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshLeaderboard = async () => {
    try {
      const { data, error } = await supabase.from('participants').select('*').eq('room_id', arenaId);
      if (error) throw error;
      const baseData = (data || []).map((p: any) => {
        const adjustedCurrent = p.current_balance - (p.total_deposit || 0);
        return {
          ...p,
          profit: p.initial_balance > 0 ? ((adjustedCurrent - p.initial_balance) / p.initial_balance) * 100 : 0
        };
      });
      setParticipants(baseData);
      await syncLeaderboardWithChain(baseData);
    } catch (err) {
       console.error("Leaderboard refresh error:", err);
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
      const devShare = Math.round(feeLamports * 0.10); 
      const creatorShare = feeLamports - devShare; 

      const transaction = new web3.Transaction();
      transaction.add(web3.SystemProgram.transfer({ fromPubkey: senderPublicKey, toPubkey: new web3.PublicKey(PLATFORM_TREASURY), lamports: devShare }));

      if (room?.creator_wallet) {
          transaction.add(web3.SystemProgram.transfer({ fromPubkey: senderPublicKey, toPubkey: new web3.PublicKey(room.creator_wallet), lamports: creatorShare }));
      } else {
          transaction.add(web3.SystemProgram.transfer({ fromPubkey: senderPublicKey, toPubkey: new web3.PublicKey(PLATFORM_TREASURY), lamports: creatorShare }));
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

    if (room?.access_type === 'private' && passwordInput !== room.room_password) {
       return alert("⛔ Password Ruangan Salah!");
    }

    if (room?.access_type === 'whitelist') {
       const allowedWallets = room.whitelist || [];
       const isAllowed = allowedWallets.some(w => w.trim().toLowerCase() === walletInput.trim().toLowerCase());
       if (!isAllowed) return alert("⛔ Akses Ditolak. Wallet ini tidak ada di Whitelist.");
    }
    
    setIsJoining(true);
    try {
      const currentBalance = await fetchSolBalance(walletInput.trim());
      if (room && currentBalance < (room.min_balance || 0)) {
        throw new Error(`Saldo Anda (${currentBalance.toFixed(2)} SOL) kurang dari syarat minimum.`);
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

  const isEnded = room ? new Date(room.end_time) < new Date() : false;

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
          
          <div className="lg:col-span-4 space-y-8">
             <ArenaInfoCard 
                room={room} 
                participantCount={participants.length} 
                isEnded={isEnded} 
             />
             <JoinArenaCard 
                room={room}
                user={user}
                isEnded={isEnded}
                walletInput={walletInput}
                setWalletInput={setWalletInput}
                passwordInput={passwordInput}
                setPasswordInput={setPasswordInput}
                isJoining={isJoining}
                statusMsg={statusMsg}
                handleJoinArena={handleJoinArena}
             />
          </div>

          <LeaderboardTable 
             participants={participants}
             room={room}
             isRefreshing={isRefreshing}
             refreshLeaderboard={refreshLeaderboard}
          />
          
        </div>
      </main>
    </div>
  );
}