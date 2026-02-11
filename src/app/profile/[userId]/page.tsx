"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  BarChart2, 
  Wallet, 
  ShieldCheck, 
  Globe,
  Activity,
  ArrowUpRight,
  Medal,
  CheckCircle2,
  Share2,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  User,
  ArrowLeft,
  Zap,
  Star,
  Copy,
  Check
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';

// Manual relative import path
import { useLanguage } from '../../../lib/LanguageContext';
import StatBadge from '../../../components/profile/StatBadge';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

interface Achievement {
  id: string;
  room_id: string;
  wallet_address: string;
  initial_balance: number;
  current_balance: number;
  total_deposit: number;
  joined_at: string;
  status: string;
  profit: number;
  rooms?: {
    title: string;
    end_time: string;
  }
}

// Interface untuk data baru dari tabel user_stats
interface UserStats {
  user_level: number;
  user_xp: number;
  creator_level: number;
  creator_xp: number;
  referral_code: string;
  total_referrals: number;
}

/**
 * Halaman Profil Publik Trader (Versi Anti-Cheat & Real-Time & Gamifikasi)
 */
export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = React.use(params);
  const userId = resolvedParams.userId;

  const { t } = useLanguage(); 
  const [history, setHistory] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [traderName, setTraderName] = useState("Elite Trader");
  const [traderWallet, setTraderWallet] = useState<string>(""); 
  const [copied, setCopied] = useState(false);
  const [isIdInvalid, setIsIdInvalid] = useState(false);
  
  const subscriptionsRef = useRef<number[]>([]);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // FUNGSI SHARE KE TWITTER / X (UPDATED DENGAN REFERRAL)
  const shareProfile = () => {
    if (typeof window !== 'undefined') {
      // Base URL
      let profileUrl = window.location.href;
      
      // Jika punya kode referral, tambahkan ke link
      if (stats?.referral_code) {
         // Bersihkan URL dari parameter lama jika ada
         const baseUrl = window.location.origin + window.location.pathname;
         profileUrl = `${baseUrl}?ref=${stats.referral_code}`;
      }

      const profitDisplay = history.reduce((acc, curr) => acc + (curr.profit || 0), 0).toFixed(1);
      
      const text = `🔥 Check out this trader's reputation on @TradeHub_SOL!\n\n🚀 Total ROI: +${profitDisplay}% (Verified)\n⭐ Level: ${stats?.user_level || 1} (XP: ${stats?.user_xp || 0})\n🛡️ Anti-Cheat: ACTIVE\n\nJoin & Compete here 👇\n${profileUrl}\n\n#Solana #TradeHub #ProofOfSkill`;
      
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const openSolscan = () => {
    if (traderWallet) {
        window.open(`https://solscan.io/account/${traderWallet}`, '_blank');
    } else {
        alert("Wallet address not found for this user.");
    }
  };

  const copyReferralCode = () => {
     if (stats?.referral_code) {
        navigator.clipboard.writeText(stats.referral_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
     }
  };

  const setupPublicSync = (list: Achievement[]) => {
    if (!SOLANA_RPC || list.length === 0) return;
    const connection = new web3.Connection(SOLANA_RPC, 'confirmed');

    subscriptionsRef.current.forEach(id => {
      try { connection.removeAccountChangeListener(id); } catch(e) {}
    });
    subscriptionsRef.current = [];

    list.slice(0, 10).forEach((item, index) => {
      setTimeout(() => {
        try {
          const pubKey = new web3.PublicKey(item.wallet_address);
          const subId = connection.onAccountChange(pubKey, (info) => {
            const newBalance = info.lamports / web3.LAMPORTS_PER_SOL;
            setHistory(prev => prev.map(p => {
              if (p.wallet_address === item.wallet_address) {
                const adjustedCurrent = newBalance - (p.total_deposit || 0);
                const netProfit = p.initial_balance > 0 
                  ? ((adjustedCurrent - p.initial_balance) / p.initial_balance) * 100 
                  : 0;
                return { ...p, current_balance: newBalance, profit: netProfit };
              }
              return p;
            }));
          }, 'confirmed');
          subscriptionsRef.current.push(subId);
        } catch (e) {
          console.warn("WebSocket sub error:", e);
        }
      }, index * 200);
    });
  };

  useEffect(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      setIsIdInvalid(true);
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      if (!supabase) {
          setLoading(false);
          return;
      }

      try {
        // 1. Fetch Data Partisipasi (History)
        const { data: participantsData, error: partError } = await supabase
          .from('participants')
          .select(`*, rooms!inner (title, end_time)`)
          .eq('user_id', userId)
          .order('joined_at', { ascending: false });

        if (partError) throw partError;

        const enriched = (participantsData || []).map((p: any) => {
          const adjustedCurrent = p.current_balance - (p.total_deposit || 0);
          return {
            ...p,
            profit: p.initial_balance > 0 ? ((adjustedCurrent - p.initial_balance) / p.initial_balance) * 100 : 0
          };
        });

        setHistory(enriched);
        setupPublicSync(enriched);

        if (participantsData && participantsData.length > 0) {
          const wallet = participantsData[0].wallet_address;
          setTraderWallet(wallet);
          setTraderName(`Trader ${wallet.slice(0, 6)}...${wallet.slice(-4)}`);
        }

        // 2. Fetch Data Statistik User (XP & Level)
        const { data: statsData, error: statsError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        // Jika data stats belum ada (user lama), mungkin perlu dibuatkan via trigger atau default
        if (statsData) {
            setStats(statsData);
        } else if (!statsError) {
             // Opsional: Handle jika user belum punya row di user_stats
        }

      } catch (err: any) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();

    return () => {
      subscriptionsRef.current.forEach(id => {
        try {
          const connection = new web3.Connection(SOLANA_RPC);
          connection.removeAccountChangeListener(id);
        } catch(e) {}
      });
    };
  }, [userId]);

  // Statistik Kumulatif
  const totalVerifiedProfit = history.reduce((acc, curr) => acc + (curr.profit || 0), 0);
  const verifiedWins = history.filter(h => (h.profit || 0) > 0).length;
  
  const winRatePercent = history.length > 0 
    ? ((verifiedWins / history.length) * 100).toFixed(1)
    : "0";

  // Tentukan Rank/Tier berdasarkan Level Database atau Wins manual
  const userLevel = stats?.user_level || 1;
  
  const getRankLabel = (level: number) => {
      if (level >= 50) return { label: "Grandmaster", color: "text-red-500", bg: "bg-red-500/10" };
      if (level >= 20) return { label: "Elite", color: "text-[#FCD535]", bg: "bg-[#FCD535]/10" };
      if (level >= 10) return { label: "Pro", color: "text-[#0ECB81]", bg: "bg-[#0ECB81]/10" };
      return { label: "Rookie", color: "text-[#3b82f6]", bg: "bg-[#3b82f6]/10" };
  };
  
  const rank = getRankLabel(userLevel);

  if (loading) return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin w-14 h-14 text-[#FCD535] mb-6 opacity-30" />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#848E9C]">Loading Profile Data...</p>
    </div>
  );

  if (isIdInvalid) return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-[#F6465D]/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-[#F6465D]/20 shadow-xl">
        <AlertTriangle className="w-12 h-12 text-[#F6465D]" />
      </div>
      <h2 className="text-4xl font-black text-white mb-4 uppercase italic tracking-tighter">Invalid ID</h2>
      <p className="text-[#848E9C] mb-12 max-w-sm font-medium leading-relaxed uppercase tracking-widest text-xs">Identity not found within TradeHub protocol.</p>
      <button onClick={() => safeNavigate('/')} className="px-12 py-5 bg-[#2B3139] text-[#EAECEF] rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] border border-[#363c45] hover:bg-[#FCD535] hover:text-black transition-all shadow-2xl">RETURN TO LOBBY</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30 relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

      <header className="relative z-10 pt-24 pb-32 overflow-hidden border-b border-[#2B3139]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[#FCD535] rounded-full blur-[180px] opacity-[0.03] pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-8 flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-24">
           
           {/* Avatar & Level Area */}
           <div className="relative shrink-0 flex flex-col items-center">
              <div className="absolute inset-0 bg-[#FCD535] rounded-full blur-[60px] opacity-10"></div>
              <div className="w-48 h-48 lg:w-56 lg:h-56 bg-gradient-to-br from-[#FCD535] to-orange-600 rounded-[4rem] p-1.5 shadow-2xl relative z-10">
                 <div className="w-full h-full bg-[#0B0E11] rounded-[3.8rem] flex items-center justify-center overflow-hidden border border-white/5">
                    <User size={100} className="text-[#2B3139] opacity-50" />
                 </div>
              </div>
              
              {/* Level Badge */}
              <div className="absolute -bottom-4 bg-[#1E2329] text-white text-[10px] font-black px-6 py-3 rounded-2xl border-4 border-[#0B0E11] flex items-center gap-3 shadow-2xl z-20">
                 <div className="flex items-center gap-1 text-[#FCD535]">
                    <Zap size={14} fill="currentColor" />
                    <span className="text-sm">LVL {stats?.user_level || 1}</span>
                 </div>
                 <div className="h-4 w-px bg-[#2B3139]"></div>
                 <span className="text-[#848E9C]">{stats?.user_xp || 0} XP</span>
              </div>
           </div>

           {/* Trader Identity */}
           <div className="text-center lg:text-left flex-1 min-w-0 w-full">
              <div className="mb-10">
                 <h1 className="text-5xl lg:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.85] mb-6 drop-shadow-2xl">{traderName}</h1>
                 
                 <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4">
                    <span className="font-mono text-[10px] lg:text-xs text-[#848E9C] bg-[#1E2329] px-5 py-3 rounded-2xl border border-[#2B3139] shadow-inner tracking-widest uppercase">ID: {userId.substring(0, 8).toUpperCase()}...</span>
                    <div className={`px-5 py-3 rounded-2xl border font-black text-[11px] uppercase tracking-widest ${rank.color} ${rank.bg} border-current/20 shadow-lg`}>
                       {rank.label}
                    </div>
                    {/* Referral Code Badge */}
                    {stats?.referral_code && (
                        <div 
                           onClick={copyReferralCode}
                           className="px-5 py-3 rounded-2xl border border-[#FCD535]/30 bg-[#FCD535]/5 text-[#FCD535] font-black text-[11px] uppercase tracking-widest cursor-pointer hover:bg-[#FCD535]/10 transition-colors flex items-center gap-2 group"
                        >
                           REF: {stats.referral_code}
                           {copied ? <Check size={14}/> : <Copy size={14} className="opacity-50 group-hover:opacity-100"/>}
                        </div>
                    )}
                 </div>
              </div>
              
              {/* Statistik Ringkasan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 mb-14">
                 <StatBadge icon={<Trophy className="text-[#FCD535]" />} label="Total ROI" value={`${totalVerifiedProfit.toFixed(1)}%`} highlight={true} />
                 <StatBadge icon={<TrendingUp className="text-[#0ECB81]" />} label="Win Rate" value={`${winRatePercent}%`} />
                 <StatBadge icon={<Medal className="text-[#3b82f6]" />} label="Total XP" value={stats?.user_xp || 0} />
              </div>

              {/* Aksi Berbagi */}
              <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                 <button onClick={shareProfile} className="bg-[#FCD535] text-black px-12 py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-[#F0B90B] transition-all shadow-2xl shadow-[#FCD535]/20 flex items-center justify-center gap-4 active:scale-95">
                    <Share2 size={22} /> SHARE REPUTATION
                 </button>
                 <button 
                    onClick={openSolscan} 
                    className="px-10 py-6 bg-[#1E2329]/80 border border-[#2B3139] text-[#848E9C] rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:text-white transition-all flex items-center justify-center gap-4 shadow-xl"
                 >
                    SOLANA SCAN <Globe size={20} />
                 </button>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-28 relative z-10 pb-48">
        <div className="flex items-center justify-between mb-20">
           <div className="space-y-4">
              <div className="flex items-center gap-4 text-[#FCD535] font-black text-[12px] uppercase tracking-[0.5em]">
                 <Activity size={24} /> On-Chain Record
              </div>
              <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Competitive History</h2>
           </div>
           <div className="hidden md:flex items-center gap-2 bg-[#0ECB81]/10 px-4 py-2 rounded-xl border border-[#0ECB81]/20">
              <span className="w-1.5 h-1.5 bg-[#0ECB81] rounded-full animate-pulse mr-2"></span>
              <span className="text-[9px] font-black text-[#0ECB81] uppercase tracking-widest">Live Performance Auditor</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
           {history.length === 0 ? (
             <div className="col-span-full text-center py-40 bg-[#1E2329]/40 rounded-[4rem] border border-[#2B3139] border-dashed shadow-2xl flex flex-col items-center">
                <BarChart2 className="w-24 h-24 text-[#2B3139] mb-10 opacity-30 animate-pulse" />
                <p className="text-2xl font-black text-[#848E9C] uppercase tracking-[0.4em]">No Activity Detected</p>
             </div>
           ) : (
             history.map((item) => {
               const isAdjusted = (item.total_deposit || 0) > 0;
               return (
                 <div key={item.id} className="bg-[#1E2329] p-12 rounded-[4rem] border border-[#2B3139] hover:border-[#FCD535]/50 transition-all duration-700 group relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FCD535]/5 to-transparent rounded-bl-full pointer-events-none group-hover:opacity-30 transition-opacity"></div>
                    
                    <div className="flex justify-between items-start mb-14">
                       <div className="w-20 h-20 bg-[#0B0E11] rounded-[2.5rem] flex items-center justify-center border border-[#2B3139] group-hover:scale-110 transition-transform duration-700 shadow-inner">
                          <Trophy className="text-[#FCD535] w-10 h-10" />
                       </div>
                       <div className="text-right">
                          <span className="text-[11px] font-black text-[#474D57] uppercase tracking-[0.3em] block mb-3 italic">Verified Date</span>
                          <span className="text-[#EAECEF] text-xs font-mono font-black bg-[#0B0E11] px-6 py-3 rounded-2xl border border-[#2B3139] shadow-inner">
                             {new Date(item.joined_at).toLocaleDateString()}
                          </span>
                       </div>
                    </div>

                    <h3 className="text-3xl lg:text-4xl font-black text-white mb-4 leading-none group-hover:text-[#FCD535] transition-colors tracking-tight uppercase italic truncate">
                       {item.rooms?.title}
                    </h3>
                    
                    <div className="flex flex-wrap gap-3 mb-14">
                       {isAdjusted && (
                         <span className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase border border-yellow-500/20 tracking-widest flex items-center gap-2 shadow-lg shadow-yellow-500/5">
                            <ShieldAlert size={12}/> Cleaned ROI (Deposit Filtered)
                         </span>
                       )}
                       <span className="px-3 py-1.5 rounded-lg bg-[#0ECB81]/10 text-[#0ECB81] text-[9px] font-black uppercase border border-[#0ECB81]/20 tracking-widest">On-Chain Evidence</span>
                    </div>

                    <div className="grid grid-cols-2 gap-12 pt-12 border-t border-[#2B3139]">
                       <div className="space-y-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#474D57] italic">Return ROI %</p>
                          <p className={`text-4xl font-black italic tracking-tighter ${item.profit >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                             {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)}%
                          </p>
                       </div>
                       <div className="space-y-3 text-right">
                          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#474D57] italic">Pure PnL</p>
                          <p className="text-4xl font-black text-white italic tracking-tighter leading-none uppercase">
                             {(item.current_balance - item.total_deposit - item.initial_balance).toFixed(2)} <span className="text-xs text-[#474D57] not-italic ml-1">SOL</span>
                          </p>
                       </div>
                    </div>

                    <button onClick={() => safeNavigate(`/arena/${item.room_id}`)} className="mt-14 w-full py-6 bg-[#0B0E11] border border-[#2B3139] rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] hover:border-[#FCD535] hover:text-[#FCD535] transition-all flex items-center justify-center gap-3 active:scale-95 group/btn">
                       VERIFY PROOF <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </button>
                 </div>
               );
             })
           )}
        </div>

        {/* Floating Navigation */}
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-8">
           <button onClick={() => safeNavigate('/')} className="w-full bg-[#181A20]/95 backdrop-blur-2xl text-[#EAECEF] py-7 rounded-[3rem] text-[12px] font-black uppercase tracking-[0.6em] flex items-center justify-center gap-5 hover:bg-[#FCD535] hover:text-black transition-all border border-white/5 shadow-2xl active:scale-95 group">
              <ArrowLeft size={22} className="group-hover:-translate-x-2 transition-transform" /> RETURN TO HUB
           </button>
        </div>
      </main>
    </div>
  );
}