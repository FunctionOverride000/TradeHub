"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  X, 
  CheckCircle, 
  Info,
  ShieldAlert,
  Share2, // Ikon share umum
  Twitter, // Mencoba import ikon Twitter
  Copy
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';

// Menggunakan relative path manual (../../../) menggantikan alias (@/)
import { useLanguage } from '../../../lib/LanguageContext';

// --- IMPORT KOMPONEN ---
// Menggunakan relative path manual (../../../)
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
  user_id?: string;
}

// Interface untuk State Alert
interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onConfirm?: () => void;
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

  // STATE UNTUK COUNTDOWN TIMER
  const [timeLeft, setTimeLeft] = useState<string>("");

  // STATE UNTUK CUSTOM ALERT POPUP
  const [alertConfig, setAlertConfig] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // --- HELPER UNTUK ALERT ---
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', onConfirm?: () => void) => {
    setAlertConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const closeAlert = () => {
    if (alertConfig.onConfirm) {
      alertConfig.onConfirm();
    }
    setAlertConfig(prev => ({ ...prev, isOpen: false, onConfirm: undefined }));
  };

  // --- FUNGSI SHARE KHUSUS TWITTER (X) ---
  const handleShareToTwitter = () => {
    if (!room) return;

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    
    // Format Tanggal Singkat
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
    };

    const startTime = formatDate(room.start_time);
    
    // Teks Tweet (Dioptimalkan agar pas dengan limit Twitter + Link)
    const tweetText = `🔥 I CHALLENGE YOU TO A TRADING BATTLE! 🔥\n\n` +
    `I just joined the "${room.title}" Arena on Solana.\n\n` +
    `💰 Pool: ${room.reward}\n` +
    `📅 Start: ${startTime}\n` +
    `📉 Min Bal: ${room.min_balance} SOL\n\n` +
    `Prove your skills! @TradeHub_SOL 🚀`;

    // Membuat URL Intent Twitter
    // encodeURIComponent penting agar karakter khusus (spasi, enter, emoji) terbaca benar
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

    // Membuka jendela baru
    window.open(twitterIntentUrl, '_blank', 'width=550,height=400,noopener,noreferrer');
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

  // --- LOGIC COUNTDOWN TIMER ---
  useEffect(() => {
    if (!room?.end_time) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(room.end_time).getTime();
      const distance = end - now;

      // Jika waktu sudah habis
      if (distance < 0) {
        setTimeLeft("ENDED");
        return;
      }

      // Jika waktu tinggal kurang dari 24 jam (86,400,000 milidetik)
      if (distance < 86400000) {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Format Tampilan: 23j 59m 59d
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        // Jika masih lebih dari 24 jam, tidak perlu menampilkan countdown detail
        setTimeLeft(""); 
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  // --- CHECK IF USER IS ALREADY REGISTERED ---
  const isRegistered = useMemo(() => {
    if (!user || participants.length === 0) return false;
    return participants.some(p => p.user_id === user.id);
  }, [user, participants]);

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
        showAlert("Wallet Not Found", "Phantom Wallet not found! Please install it.", "error");
        return false;
      }
      setStatusMsg("Preparing ticket...");
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
      setStatusMsg("Confirm payment in wallet...");
      const { signature } = await provider.signAndSendTransaction(transaction);
      setStatusMsg("Verifying on blockchain...");
      await connection.confirmTransaction(signature, 'confirmed');
      return true;
    } catch (err: any) {
      showAlert("Payment Failed", "Failed to pay ticket: " + err.message, "error");
      return false;
    }
  };

  const handleJoinArena = async () => {
    if (!user) {
      showAlert(
        "Login Required", 
        "Please log in to your account to compete!", 
        "warning",
        () => safeNavigate('/auth')
      );
      return;
    }
    
    if (!walletInput || walletInput.trim().length < 32) {
      return showAlert("Invalid Input", "Invalid Solana wallet address!", "error");
    }

    if (room?.access_type === 'private' && passwordInput !== room.room_password) {
       return showAlert("Access Denied", "Incorrect Room Password!", "error");
    }

    if (room?.access_type === 'whitelist') {
       const allowedWallets = room.whitelist || [];
       const isAllowed = allowedWallets.some(w => w.trim().toLowerCase() === walletInput.trim().toLowerCase());
       if (!isAllowed) return showAlert("Access Denied", "Your wallet is not in the Whitelist.", "error");
    }
    
    setIsJoining(true);
    try {
      const currentBalance = await fetchSolBalance(walletInput.trim());
      if (room && currentBalance < (room.min_balance || 0)) {
        throw new Error(`Your balance (${currentBalance.toFixed(2)} SOL) is below the minimum requirement.`);
      }

      if (room?.entry_fee && room.entry_fee > 0) {
          const paid = await processTicketPayment(room.entry_fee);
          if (!paid) {
             setIsJoining(false);
             setStatusMsg("");
             return; 
          }
      }

      setStatusMsg("Registering participant...");
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
        if (error.code === '23505') throw new Error("This wallet is already registered in this arena.");
        throw error;
      }
      
      showAlert("Success!", `Successfully Registered! Balance snapshot: ${currentBalance.toFixed(4)} SOL`, "success");
      
      setWalletInput("");
      setPasswordInput("");
      await refreshLeaderboard();
    } catch (err: any) {
      showAlert("Registration Failed", err.message || "An error occurred during registration.", "error");
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
          Syncing Arena On-Chain...
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
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tight">Arena Not Found</h1>
        <button onClick={() => safeNavigate('/')} className="px-10 py-4 bg-[#2B3139] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#363c45] transition-all">Back to Main Lobby</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

      {/* --- CUSTOM ALERT MODAL --- */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1E2329] border border-[#2B3139] rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button 
              onClick={closeAlert}
              className="absolute top-4 right-4 text-[#848E9C] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              {/* Icon Container */}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 shadow-lg ${
                alertConfig.type === 'error' ? 'bg-red-500/10 text-red-500 shadow-red-500/10' :
                alertConfig.type === 'success' ? 'bg-green-500/10 text-green-500 shadow-green-500/10' :
                alertConfig.type === 'warning' ? 'bg-orange-500/10 text-orange-500 shadow-orange-500/10' :
                'bg-[#FCD535]/10 text-[#FCD535] shadow-[#FCD535]/10'
              }`}>
                {alertConfig.type === 'error' && <ShieldAlert size={32} />}
                {alertConfig.type === 'success' && <CheckCircle size={32} />}
                {alertConfig.type === 'warning' && <AlertCircle size={32} />}
                {alertConfig.type === 'info' && <Info size={32} />}
              </div>
              
              {/* Title & Message */}
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">
                  {alertConfig.title}
                </h3>
                <p className="text-xs text-[#848E9C] leading-relaxed font-medium">
                  {alertConfig.message}
                </p>
              </div>

              {/* Action Button */}
              <button 
                onClick={closeAlert}
                className={`w-full py-3 mt-4 font-black uppercase text-xs tracking-[0.2em] rounded-xl transition-all active:scale-95 shadow-lg ${
                  alertConfig.type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' :
                  alertConfig.type === 'success' ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' :
                  'bg-[#FCD535] hover:bg-[#ffe066] text-black shadow-[#FCD535]/20'
                }`}
              >
                {alertConfig.type === 'success' ? 'Great!' : 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 pb-32">
        
        {/* --- HEADER NAVIGASI & SHARE (DIPERBARUI) --- */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => safeNavigate('/')}
            className="group flex items-center gap-3 text-[#848E9C] hover:text-[#FCD535] transition-all font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            Back to Main Lobby
          </button>

          {/* Tombol Share ke Twitter */}
          <button 
            onClick={handleShareToTwitter}
            className="flex items-center gap-2 px-4 py-2 bg-[#2B3139]/50 hover:bg-[#FCD535]/10 text-[#848E9C] hover:text-[#FCD535] border border-[#2B3139] hover:border-[#FCD535]/50 rounded-xl transition-all active:scale-95 group"
          >
            {/* Fallback ke Share2 jika Twitter icon tidak ada */}
            <Share2 size={16} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">Share on 𝕏</span>
          </button>
        </div>

        {/* --- FITUR BARU: COUNTDOWN 24 JAM --- */}
        {timeLeft && timeLeft !== "ENDED" && (
            <div className="mb-8 w-full bg-gradient-to-r from-[#F6465D]/20 to-[#FF9F43]/20 border border-[#F6465D]/50 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-[0_0_30px_rgba(246,70,93,0.1)]">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#F6465D]/20 rounded-xl text-[#F6465D] animate-pulse">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm md:text-base font-black text-[#F6465D] uppercase tracking-widest">Time is Running Out!</h3>
                        <p className="text-[10px] md:text-xs text-[#EAECEF] opacity-80 mt-1">
                            This arena will automatically close in less than 24 hours.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(246,70,93,0.5)]">
                        {timeLeft}
                    </span>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-4 space-y-8">
             <ArenaInfoCard 
               room={room} 
               participantCount={participants.length} 
               isEnded={isEnded} 
             />
             
             {/* --- LOGIC SHOW/HIDE JOIN CARD --- */}
             {isRegistered ? (
               <div className="bg-[#1E2329] border border-[#2B3139] rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-[#0ECB81]/5 rounded-full blur-[50px] pointer-events-none"></div>
                  <div className="w-16 h-16 bg-[#0ECB81]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#0ECB81]/20 shadow-[0_0_15px_rgba(14,203,129,0.1)]">
                    <CheckCircle className="text-[#0ECB81] w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">You're In!</h3>
                  <p className="text-[#848E9C] text-xs font-medium leading-relaxed mb-6">
                    You have successfully joined this tournament. Your wallet is linked and ready to trade.
                  </p>
                  <div className="bg-[#0B0E11]/50 border border-[#2B3139] rounded-xl p-4">
                    <p className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mb-1">Linked Wallet</p>
                    <p className="text-[#EAECEF] font-mono text-[10px] break-all">
                        {participants.find(p => p.user_id === user.id)?.wallet_address}
                    </p>
                  </div>
               </div>
             ) : (
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
             )}
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