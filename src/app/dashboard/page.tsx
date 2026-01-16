"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Trophy, 
  User, 
  Settings as SettingsIcon, 
  LogOut, 
  CheckCircle, 
  Clock, 
  Download, 
  Share2, 
  Award, 
  Loader2, 
  Medal, 
  TrendingUp, 
  BarChart2, 
  Wallet, 
  Globe,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  PieChart,
  Copy,
  Check,
  Twitter,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
  Star,
  BookOpen
} from 'lucide-react';

/**
 * MENGGUNAKAN ESM CDN:
 * Menjamin stabilitas library di lingkungan pratinjau.
 */
import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';
import { useLanguage } from '../../lib/LanguageContext';
import { LanguageSwitcher } from '../../lib/LanguageSwitcher';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmvezylbaxlodkepstbj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmV6eWxiYXhsb2RrZXBzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTYxNzEsImV4cCI6MjA4MTU5MjE3MX0.a2_XxJKLRXrt_tn_UiMYTmpP1iGjul6OhaHI3IGzJCw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  };
}

export default function App() {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copyId, setCopyId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const subscriptionsRef = useRef<number[]>([]);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 1. Sinkronisasi Sesi Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) safeNavigate('/auth');
      else setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) safeNavigate('/auth');
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * OPTIMASI WEBSOCKET & LOGIKA ANTI-CHEAT:
   * ROI dihitung murni: (Current - Deposit - Initial) / Initial.
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

  // 2. Fetch Data Trading
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setIsSyncing(true);
        const { data, error } = await supabase
          .from('participants')
          .select(`*, rooms (title, is_premium)`)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });

        if (error) throw error;
        
        const baseEnriched = (data || []).map((item: any) => {
          const adjustedCurrent = item.current_balance - (item.total_deposit || 0);
          return {
            ...item,
            profit: item.initial_balance > 0 ? ((adjustedCurrent - item.initial_balance) / item.initial_balance) * 100 : 0
          };
        });

        setRegistrations(baseEnriched);
        setupRealTimeSync(baseEnriched);
      } catch (err: any) {
        setErrorMsg("Gagal memuat rekam jejak.");
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
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    safeNavigate('/auth');
  };

  const handleShareAchievement = async (item: ParticipantData) => {
    const profitVal = item.profit || 0;
    const arenaTitle = item.rooms?.title || "Trading Tournament";
    const arenaUrl = `${window.location.origin}/lomba/${item.room_id}`;
    const shareMessage = `Saya mencatat ROI Murni ${profitVal >= 0 ? '+' : ''}${profitVal.toFixed(2)}% di ${arenaTitle} via TradeHub! (Anti-Cheat Verified) 🚀 ${arenaUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const handleCopyLink = (item: ParticipantData) => {
    const arenaUrl = `${window.location.origin}/lomba/${item.room_id}`;
    navigator.clipboard.writeText(arenaUrl);
    setCopyId(item.id);
    setTimeout(() => setCopyId(null), 2000);
  };

  // Statistik Kumulatif
  const achievements = registrations.filter(r => r.status === 'verified');
  const winRate = achievements.length > 0 
    ? ((achievements.filter(r => (r.profit || 0) > 0).length / achievements.length) * 100).toFixed(1) 
    : "0";

  const getRankTier = () => {
    const wins = achievements.length;
    if (wins >= 50) return "Grandmaster";
    if (wins >= 20) return "Diamond";
    if (wins >= 10) return "Gold";
    if (wins >= 5) return "Silver";
    return "Bronze";
  };

  if (isLoading) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]"><Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" /></div>;

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30">
      
      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-[#181A20] border-r border-[#2B3139] flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl lg:shadow-none`}>
        <div className="p-8 border-b border-[#2B3139] flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><TrendingUp className="text-black w-6 h-6" /></div>
            <span className="font-bold text-xl tracking-tight text-[#EAECEF]">TradeHub</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#848E9C] hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          <SidebarLink Icon={LayoutDashboard} label={t.dashboard.sidebar.track_record} active />
          <SidebarLink onClick={() => safeNavigate('/dashboard/pnl')} Icon={BarChart2} label={t.dashboard.sidebar.pnl_analysis} />
          <SidebarLink onClick={() => safeNavigate('/dashboard/certificates')} Icon={Award} label={t.dashboard.sidebar.certificates} />
          <SidebarLink onClick={() => safeNavigate('/dashboard/wallet')} Icon={Wallet} label={t.dashboard.sidebar.wallet} />
          {/* MENU TAMBAHAN DENGAN IKON KONSISTEN */}
          <div className="pt-6 border-t border-[#2B3139]/50 mt-4 space-y-2">
             <SidebarLink onClick={() => safeNavigate('/hall-of-fame')} Icon={Star} label={t.dashboard.sidebar.hall_of_fame} />
             <SidebarLink onClick={() => safeNavigate('/handbook')} Icon={BookOpen} label={t.dashboard.sidebar.handbook} />
             <SidebarLink onClick={() => safeNavigate('/dashboard/settings')} Icon={SettingsIcon} label={t.dashboard.sidebar.settings} />
          </div>
        </nav>
        <div className="p-6 border-t border-[#2B3139]">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139] rounded-xl transition font-medium text-sm">
            <LogOut size={18} /> <span>{t.dashboard.sidebar.logout}</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <main className="flex-1 flex flex-col lg:ml-72 min-w-0 bg-[#0B0E11] relative overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

        <header className="relative z-50 px-6 lg:px-8 py-6 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#FCD535] active:scale-95 transition-all"><Menu size={20}/></button>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#EAECEF]">{t.dashboard.header.trading_portfolio}</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {/* TOMBOL KE PROFIL PUBLIK DENGAN IKON */}
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
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-12">
            <StatCard label={t.dashboard.stats.tournaments} value={achievements.length} icon={<Trophy size={20} className="text-[#FCD535]" />} trend={t.dashboard.stats.total_wins} trendUp={true} />
            <StatCard label={t.dashboard.stats.win_rate} value={`${winRate}%`} icon={<BarChart2 size={20} className="text-[#0ECB81]" />} trend={t.dashboard.stats.accuracy} trendUp={true} />
            <StatCard label={t.dashboard.stats.rank_tier} value={getRankTier()} icon={<Medal size={20} className="text-[#70C1B3]" />} trend={t.dashboard.stats.current} trendUp={true} />
            <StatCard label={t.dashboard.stats.security} value="Elite" icon={<ShieldCheck size={20} className="text-[#3b82f6]" />} trend={t.dashboard.stats.anti_deposit} trendUp={true} />
          </div>

          <div className="space-y-8">
            <h2 className="text-[10px] font-black text-[#474D57] flex items-center justify-center sm:justify-start gap-2 px-2 uppercase tracking-[0.4em] mb-4">{t.dashboard.records.title}</h2>
            
            {registrations.map((item) => {
              const profitVal = item.profit || 0;
              const isAdjusted = (item.total_deposit || 0) > 0;
              return (
                <div key={item.id} className="bg-[#1E2329] border border-[#2B3139] hover:border-[#FCD535]/30 rounded-[2.5rem] p-6 lg:p-10 transition-all duration-300 group flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
                  <div className="w-20 h-20 bg-[#0B0E11] rounded-3xl flex items-center justify-center border border-[#474D57] text-[#FCD535] shadow-inner shrink-0"><Trophy size={32} /></div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">{item.rooms?.title}</h3>
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
                     <button onClick={() => safeNavigate(`/lomba/${item.room_id}`)} className="p-4 bg-[#0B0E11] border border-[#2B3139] rounded-2xl text-[#848E9C] hover:text-[#FCD535] transition-all active:scale-90"><ArrowUpRight size={20} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ Icon, label, active = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 font-black cursor-pointer text-xs uppercase tracking-widest ${active ? 'bg-[#2B3139] text-[#FCD535] shadow-lg border border-[#FCD535]/10' : 'text-[#848E9C] hover:bg-[#2B3139] hover:text-[#EAECEF]'}`}>
      <Icon size={18} /> <span>{label}</span>
    </div>
  );
}

function StatCard({ label, value, icon, trend, trendUp }: any) {
  return (
    <div className="bg-[#1E2329] p-6 lg:p-8 rounded-[2.5rem] border border-[#2B3139] shadow-2xl relative overflow-hidden group hover:border-[#FCD535]/30 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className="text-[#848E9C] text-[9px] font-black uppercase tracking-[0.2em]">{label}</div>
        <div className="p-2.5 bg-[#0B0E11] rounded-xl border border-[#2B3139] text-[#848E9C] group-hover:text-[#FCD535] transition-all shadow-inner">{icon}</div>
      </div>
      <div className="flex items-end gap-3 justify-center sm:justify-start">
        <span className="text-2xl lg:text-4xl font-black text-white italic tracking-tighter leading-none uppercase">{value}</span>
        <div className={`text-[8px] font-black mb-1 px-2 py-0.5 rounded-full border ${trendUp ? 'text-[#0ECB81] bg-[#0ECB81]/10 border-[#0ECB81]/20' : 'text-[#F6465D] bg-[#F6465D]/10 border-[#F6465D]/20'}`}>{trend}</div>
      </div>
    </div>
  );
}