"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  User, 
  Loader2, 
  Medal, 
  BarChart2, 
  ArrowUpRight, 
  Menu, 
  ShieldCheck, 
  ShieldAlert, 
  Crown, 
  CheckCircle,
  Zap,
  Star,
  Copy,
  Check,
  Users,
  Wallet,
  TrendingUp,
  Activity,
  Calendar
} from 'lucide-react';

// PERBAIKAN: Import createClient dari lib/supabase agar menggunakan cookie-based auth
// Ini mencegah konflik dengan middleware dan redirect loop
import { createClient } from '@/lib/supabase';
import * as web3 from '@solana/web3.js';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/lib/LanguageSwitcher';

// --- IMPORT KOMPONEN ---
import UserSidebar from '@/components/dashboard/UserSidebar';
import UserStatCard from '@/components/dashboard/UserStatCard';

const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

interface ParticipantData {
  id: string;
  room_id: string;
  status: string; 
  wallet_address: string;
  joined_at: string;
  initial_balance: number;
  current_balance: number;
  total_deposit: number; // ANTI-CHEAT
  profit?: number; 
  rooms?: {
    title: string;
    is_premium: boolean;
    distribution_status?: string;
    winners_info?: any[];
    // status?: string; // Removed incorrect field
  };
}

interface UserStats {
  user_level: number;
  user_xp: number;
  referral_code: string;
  total_referrals: number;
  total_sol_rewards_claimed?: number; // Tambahkan jika perlu
  rank?: number; // Tambahkan jika perlu
}

export default function DashboardPage() {
  const { t } = useLanguage();
  // Inisialisasi client Supabase yang benar (Cookie-based)
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<ParticipantData[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  
  const subscriptionsRef = useRef<number[]>([]);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 1. Sinkronisasi Sesi Auth
  useEffect(() => {
    const initAuth = async () => {
      // Menggunakan getUser() lebih aman untuk server-side validation token di cookie
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        safeNavigate('/auth');
      } else {
        setUser(user);
      }
    };
    initAuth();

    // Listener auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) safeNavigate('/auth');
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  /**
   * OPTIMASI WEBSOCKET & LOGIKA ANTI-CHEAT
   */
  const setupRealTimeSync = (list: ParticipantData[]) => {
    if (!SOLANA_RPC || list.length === 0) return;
    
    const connection = new web3.Connection(SOLANA_RPC, 'confirmed');

    subscriptionsRef.current.forEach(id => {
      try { connection.removeAccountChangeListener(id); } catch(e) {}
    });
    subscriptionsRef.current = [];

    list.forEach((item, index) => {
      setTimeout(() => {
        try {
          const pubKey = new web3.PublicKey(item.wallet_address);
          const subId = connection.onAccountChange(pubKey, (accountInfo) => {
            const newBalance = accountInfo.lamports / web3.LAMPORTS_PER_SOL;
            
            setRegistrations(prev => prev.map(p => {
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
        } catch (e) {}
      }, index * 150); 
    });
  };

  // 2. Fetch Data Trading & Stats
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        setIsSyncing(true);
        // A. Fetch Participants
        // FIX: Removed 'status' from rooms select because it doesn't exist in the rooms table schema
        const { data: participantsData, error: partError } = await supabase
          .from('participants')
          .select(`*, rooms (title, is_premium, distribution_status, winners_info)`)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });

        if (partError) {
            console.error("Supabase Participants Error:", partError);
            throw partError;
        }
        
        const baseEnriched = (participantsData || []).map((item: any) => {
          const adjustedCurrent = item.current_balance - (item.total_deposit || 0);
          return {
            ...item,
            profit: item.initial_balance > 0 ? ((adjustedCurrent - item.initial_balance) / item.initial_balance) * 100 : 0
          };
        });

        setRegistrations(baseEnriched);
        setupRealTimeSync(baseEnriched);

        // B. Fetch User Stats (XP, Level, Referral)
        // Gunakan maybeSingle() untuk menghindari error jika data belum ada
        const { data: statsData, error: statsError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (statsError) {
            console.error("Supabase User Stats Error:", statsError);
        }

        // Jika statsData ada, set stats. Jika null, biarkan null (akan dirender loading atau empty state)
        if (statsData) {
            setStats(statsData);
        } else {
            // Optional: Set default stats for new users if not found in DB
             setStats({
                user_level: 1,
                user_xp: 0,
                referral_code: 'NEW',
                total_referrals: 0,
                total_sol_rewards_claimed: 0
             });
        }

      } catch (err: any) {
        console.error("Fetch Error Detail:", JSON.stringify(err, null, 2));
        setErrorMsg("Gagal memuat data.");
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    };
    fetchData();

    return () => {
      subscriptionsRef.current.forEach(id => {
        try {
          const connection = new web3.Connection(SOLANA_RPC);
          connection.removeAccountChangeListener(id);
        } catch(e) {}
      });
    };
  }, [user]); // Dependency user memastikan fetch jalan setelah user ada

  const handleLogout = async () => {
    await supabase.auth.signOut();
    safeNavigate('/auth');
  };

  const copyReferral = () => {
    if (stats?.referral_code) {
        navigator.clipboard.writeText(stats.referral_code);
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  // Statistik Kumulatif
  const achievements = registrations.filter(r => r.status === 'verified');
  const winRate = achievements.length > 0 
    ? ((achievements.filter(r => (r.profit || 0) > 0).length / achievements.length) * 100).toFixed(1) 
    : "0";

  // Level Logic untuk Tier Badge
  const getRankTier = () => {
    const level = stats?.user_level || 1;
    if (level >= 50) return { label: "Grandmaster", color: "text-[#FF4500]" };
    if (level >= 20) return { label: "Diamond", color: "text-[#3b82f6]" };
    if (level >= 10) return { label: "Gold", color: "text-[#FCD535]" };
    if (level >= 5) return { label: "Silver", color: "text-[#C0C0C0]" };
    return { label: "Bronze", color: "text-[#CD7F32]" };
  };
  const rank = getRankTier();

  const getWinnerStatus = (item: ParticipantData) => {
    if (!item.rooms?.winners_info) return null;
    const winRecord = item.rooms.winners_info.find((w: any) => w.wallet === item.wallet_address);
    if (winRecord) {
       return { rank: winRecord.rank, amount: winRecord.amount };
    }
    return null;
  };

  // Kalkulasi XP Progress
  const currentLevel = stats?.user_level || 1;
  const currentXp = stats?.user_xp || 0;
  // Rumus Level: Level = Floor(Sqrt(XP / 100)) + 1
  // Maka XP untuk mencapai level saat ini = 100 * (Level-1)^2
  const xpForCurrentLevel = 100 * Math.pow(currentLevel - 1, 2);
  // XP untuk mencapai level berikutnya = 100 * (Level)^2
  const xpForNextLevel = 100 * Math.pow(currentLevel, 2);
  
  // Persentase progress bar
  const progressPercent = Math.min(100, Math.max(0, ((currentXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100));

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11] text-[#EAECEF]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#848E9C]">Loading Dashboard...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30">
      
      {/* --- SIDEBAR --- */}
      <UserSidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        safeNavigate={safeNavigate}
        handleLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col lg:ml-72 min-w-0 bg-[#0B0E11] relative overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

        <header className="relative z-50 px-6 lg:px-8 py-6 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#FCD535] active:scale-95 transition-all"><Menu size={20}/></button>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#EAECEF]">{t.dashboard.header.trading_portfolio}</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button 
              onClick={() => safeNavigate(`/profile/${user?.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#FCD535] hover:bg-[#2B3139] transition-all shadow-lg active:scale-95"
            >
              <User size={14} /> {t.dashboard.header.view_profile}
            </button>
            <div className="flex items-center gap-3 px-3 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-lg">
               <span className="w-1.5 h-1.5 bg-[#0ECB81] rounded-full animate-pulse"></span>
               <span className="text-[10px] font-black uppercase text-[#0ECB81] tracking-widest hidden sm:inline">{t.dashboard.header.anti_cheat_active}</span>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto relative z-10 pb-24 text-center sm:text-left">
          
          {/* --- XP & LEVEL SECTION --- */}
          {stats && (
            <div className="bg-gradient-to-r from-[#1E2329] to-[#0B0E11] rounded-[2.5rem] p-8 mb-10 border border-[#2B3139] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCD535]/5 rounded-full blur-[80px] pointer-events-none"></div>
               
               <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                  {/* Badge Level */}
                  <div className="relative">
                     <div className="w-24 h-24 rounded-full border-4 border-[#2B3139] flex items-center justify-center bg-[#0B0E11] text-[#FCD535] shadow-xl">
                        <Zap size={40} fill="currentColor" />
                     </div>
                     <div className="absolute -bottom-2 -right-2 bg-[#FCD535] text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                        LVL {currentLevel}
                     </div>
                  </div>

                  <div className="flex-1 w-full space-y-4">
                      <div className="flex justify-between items-end">
                         <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{rank.label}</h2>
                            <p className="text-[#848E9C] text-xs font-medium">Next Level: {xpForNextLevel} XP</p>
                         </div>
                         <div className="text-right">
                            <span className="text-[#FCD535] font-black text-xl">{currentXp} XP</span>
                            <span className="text-[#474D57] text-xs font-bold block">TOTAL EXPERIENCE</span>
                         </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-4 w-full bg-[#0B0E11] rounded-full overflow-hidden border border-[#2B3139]">
                         <div 
                           className="h-full bg-gradient-to-r from-[#FCD535] to-orange-500 transition-all duration-1000 ease-out relative"
                           style={{ width: `${progressPercent}%` }}
                         >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                         </div>
                      </div>
                  </div>

                  {/* Referral Card */}
                  <div className="w-full md:w-auto flex flex-col gap-3">
                      <div className="bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] text-center min-w-[160px]">
                         <p className="text-[9px] text-[#474D57] font-black uppercase tracking-widest mb-1">REFERRAL CODE</p>
                         <div 
                           onClick={copyReferral}
                           className="flex items-center justify-center gap-2 cursor-pointer hover:text-[#FCD535] transition-colors text-[#EAECEF] font-mono font-bold text-sm"
                         >
                            {stats.referral_code}
                            {copiedRef ? <Check size={14} className="text-[#0ECB81]"/> : <Copy size={14}/>}
                         </div>
                      </div>
                      <div className="text-[9px] text-[#848E9C] text-center">
                          Total Referrals: <span className="text-white font-bold">{stats.total_referrals}</span>
                      </div>
                  </div>
               </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-12">
            <UserStatCard label={t.dashboard.stats.tournaments} value={achievements.length} icon={<Trophy size={20} className="text-[#FCD535]" />} trend={t.dashboard.stats.total_wins} trendUp={true} />
            <UserStatCard label={t.dashboard.stats.win_rate} value={`${winRate}%`} icon={<BarChart2 size={20} className="text-[#0ECB81]" />} trend={t.dashboard.stats.accuracy} trendUp={true} />
            <UserStatCard label={t.dashboard.stats.rank_tier} value={rank.label} icon={<Medal size={20} className={rank.color} />} trend={t.dashboard.stats.current} trendUp={true} />
            <UserStatCard label="Total XP" value={stats?.user_xp || 0} icon={<Star size={20} className="text-[#3b82f6]" />} trend="Career Points" trendUp={true} />
          </div>

          <div className="space-y-8">
            <h2 className="text-[10px] font-black text-[#474D57] flex items-center justify-center sm:justify-start gap-2 px-2 uppercase tracking-[0.4em] mb-4">{t.dashboard.records.title}</h2>
            
            {registrations.length === 0 ? (
               <div className="p-12 text-center bg-[#1E2329]/50 rounded-[2rem] border border-[#2B3139] border-dashed">
                  <p className="text-[#474D57] font-bold text-sm italic">No records found. Join an arena to start building your legacy.</p>
               </div>
            ) : (
               registrations.map((item) => {
                 const profitVal = item.profit || 0;
                 const isAdjusted = (item.total_deposit || 0) > 0;
                 const winData = getWinnerStatus(item);

                 return (
                   <div key={item.id} className={`bg-[#1E2329] border ${winData ? 'border-[#FCD535]/50 shadow-[0_0_20px_rgba(252,213,53,0.1)]' : 'border-[#2B3139]'} hover:border-[#FCD535]/30 rounded-[2.5rem] p-6 lg:p-10 transition-all duration-300 group flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden`}>
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border shadow-inner shrink-0 ${winData ? 'bg-[#FCD535] text-black border-[#FCD535]' : 'bg-[#0B0E11] border-[#474D57] text-[#FCD535]'}`}>
                          {winData ? <Crown size={32} fill="currentColor"/> : <Trophy size={32} />}
                      </div>
                      
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2 leading-none flex items-center justify-center md:justify-start gap-3">
                           {item.rooms?.title}
                           {winData && (
                              <span className="bg-[#FCD535] text-black text-[9px] px-2 py-1 rounded-md uppercase tracking-widest font-black flex items-center gap-1">
                                 Rank #{winData.rank}
                              </span>
                           )}
                        </h3>
                        
                        {winData && (
                           <p className="text-[#FCD535] text-xs font-bold mb-4 flex items-center justify-center md:justify-start gap-2">
                              <CheckCircle size={14} /> Reward Paid: {winData.amount} SOL
                           </p>
                        )}

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                          <span className="px-3 py-1 rounded-lg bg-[#0ECB81]/10 text-[#0ECB81] text-[9px] font-black uppercase border border-[#0ECB81]/20 tracking-widest">{t.dashboard.records.verified_ledger}</span>
                          {isAdjusted && <span className="px-3 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase border border-yellow-500/20 flex items-center gap-1"><ShieldAlert size={10}/> {t.dashboard.records.anti_cheat_filtered}</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-12 border-t md:border-t-0 md:border-l border-[#2B3139] pt-6 md:pt-0 md:pl-12 w-full md:w-auto justify-center">
                          <div className="text-center">
                              <p className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mb-1 italic">{t.dashboard.records.clean_roi}</p>
                              <p className={`text-4xl font-black italic tracking-tighter ${profitVal >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                                 {profitVal >= 0 ? '+' : ''}{profitVal.toFixed(2)}%
                              </p>
                          </div>
                          <button onClick={() => safeNavigate(`/arena/${item.room_id}`)} className="p-4 bg-[#0B0E11] border border-[#2B3139] rounded-2xl text-[#848E9C] hover:text-[#FCD535] transition-all active:scale-90"><ArrowUpRight size={20} /></button>
                      </div>
                   </div>
                 );
               })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}