"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  User, 
  Loader2, 
  BarChart2, 
  Wallet, 
  AlertTriangle, 
  Activity, 
  ArrowUpRight, 
  PieChart, 
  Menu
} from 'lucide-react';

// PERBAIKAN: Import createClient dari lib/supabase agar menggunakan cookie-based auth
// Ini mencegah konflik dengan middleware dan redirect loop
import { createClient } from '@/lib/supabase';
import * as web3 from '@solana/web3.js';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/lib/LanguageSwitcher';
import { useRouter } from 'next/navigation';

// --- IMPORT COMPONENT ---
import UserSidebar from '@/components/dashboard/UserSidebar';

const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

interface ParticipantData {
  id: string;
  room_id: string;
  status: string;
  wallet_address: string;
  joined_at: string;
  initial_balance: number;
  current_balance: number;
  profit?: number; 
  rooms?: {
    title: string;
    is_premium: boolean;
    // HAPUS 'status' DARI SINI KARENA TIDAK ADA DI DB
  };
}

export default function PnLAnalysisPage() {
  const { t } = useLanguage();
  const router = useRouter();
  // Inisialisasi client Supabase yang benar (Cookie-based)
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const subscriptionsRef = useRef<number[]>([]);

  const safeNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  // 1. Sinkronisasi Sesi Auth
  useEffect(() => {
    const init = async () => {
      // Menggunakan getUser() lebih aman untuk server-side validation token di cookie
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.replace('/auth');
      } else {
        setUser(user);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/auth');
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router]); // Tambahkan router ke dependency array

  const syncPnLWithBlockchain = async (baseData: ParticipantData[]) => {
    if (baseData.length === 0 || !SOLANA_RPC) return;
    setIsSyncing(true);
    try {
      const connection = new web3.Connection(SOLANA_RPC, 'confirmed');
      const publicKeys = baseData.map(p => new web3.PublicKey(p.wallet_address));
      
      // Jika tidak ada public keys valid, return
      if (publicKeys.length === 0) return;

      const accountsInfo = await connection.getMultipleAccountsInfo(publicKeys);

      const liveData = baseData.map((p, idx) => {
        const info = accountsInfo[idx];
        const liveBalance = info ? info.lamports / web3.LAMPORTS_PER_SOL : p.current_balance;
        return {
          ...p,
          current_balance: liveBalance,
          profit: p.initial_balance > 0 
            ? ((liveBalance - p.initial_balance) / p.initial_balance) * 100 
            : 0
        };
      });
      setRegistrations(liveData);
    } catch (err) {
      console.error("Gagal sinkronisasi PnL:", err);
      setErrorMsg("Failed to sync on-chain.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Fetch Data Trading
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setErrorMsg("");
        // PERBAIKAN: Hapus kolom 'status' dari query select rooms karena tidak ada di DB
        const { data, error } = await supabase
          .from('participants')
          .select(`*, rooms (title, is_premium)`) 
          .eq('user_id', user.id)
          .order('joined_at', { ascending: true });

        if (error) throw error;
        
        const baseEnriched = (data || []).map((item: any) => ({
          ...item,
          profit: item.initial_balance > 0 
            ? ((item.current_balance - item.initial_balance) / item.initial_balance) * 100 
            : 0
        }));

        setRegistrations(baseEnriched);
        await syncPnLWithBlockchain(baseEnriched);

      } catch (err: any) {
        console.error("Data fetch error:", err);
        setErrorMsg("Gagal mengambil data trading.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // --- KALKULASI STATISTIK ---
  const totalInitial = registrations.reduce((acc, curr) => acc + Number(curr.initial_balance), 0);
  const totalCurrent = registrations.reduce((acc, curr) => acc + Number(curr.current_balance), 0);
  const netPnL = totalCurrent - totalInitial;
  const totalROI = totalInitial > 0 ? (netPnL / totalInitial) * 100 : 0;

  const winSessions = registrations.filter(d => Number(d.current_balance) > Number(d.initial_balance)).length;
  const winRate = registrations.length > 0 ? ((winSessions / registrations.length) * 100).toFixed(1) : "0";

  const bestTrade = registrations.length > 0 
    ? Math.max(...registrations.map(d => Number(d.profit || 0)))
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[#848E9C] font-black uppercase tracking-[0.4em] text-[10px]">Mengkalkulasi Performa...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30 relative overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <UserSidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        safeNavigate={safeNavigate}
        handleLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col lg:ml-72 min-w-0 bg-[#0B0E11] relative overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

        <header className="relative z-50 px-6 lg:px-10 py-6 lg:py-8 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#FCD535] active:scale-95 transition-all"><Menu size={22}/></button>
            <div>
              <h1 className="text-xl lg:text-3xl font-black tracking-tighter italic uppercase text-white leading-none">{t.dashboard.sidebar.pnl_analysis}</h1>
              <p className="hidden sm:flex items-center gap-2 text-[#848E9C] text-[10px] uppercase tracking-[0.2em] mt-2">
                {isSyncing ? <><Loader2 size={10} className="animate-spin text-[#FCD535]" /> {t.common.syncing}</> : "Verified Performance Ledger"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {/* INTEGRASI IDENTITAS & TOMBOL PROFIL */}
            <button 
              onClick={() => safeNavigate(`/profile/${user?.id}`)}
              className="flex items-center gap-4 px-4 py-2 bg-[#1E2329] border border-[#2B3139] rounded-2xl hover:bg-[#2B3139] transition-all group active:scale-95 text-left"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#EAECEF] group-hover:text-[#FCD535] transition-colors">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-[#474D57] font-mono tracking-tighter uppercase">
                  UID: {user?.id?.substring(0,8)}
                </p>
              </div>
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full bg-gradient-to-tr from-[#181A20] to-[#2B3139] border border-[#474D57] flex items-center justify-center text-[#EAECEF] font-black shadow-lg group-hover:border-[#FCD535]/50 transition-all">
                {user?.email ? user.email[0].toUpperCase() : 'T'}
              </div>
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-10 max-w-7xl mx-auto relative z-10 pb-24">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-2xl flex items-center gap-3 text-yellow-500 shadow-xl">
              <AlertTriangle size={20} />
              <p className="text-xs font-black uppercase tracking-widest">{errorMsg}</p>
            </div>
          )}

          {/* GRID STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-8 mb-8 lg:mb-12">
            <StatCard label="Net Profit" value={`${netPnL >= 0 ? '+' : ''}${netPnL.toFixed(3)}`} subValue="SOL" icon={<Activity size={20} />} status={`${totalROI.toFixed(1)}% ROI`} accent={netPnL >= 0 ? "green" : "red"} />
            <StatCard label="Win Rate" value={`${winRate}`} subValue="%" icon={<PieChart size={20} />} status={`${winSessions} WINS`} accent="blue" />
            <StatCard label="Best Trade" value={`+${bestTrade.toFixed(1)}`} subValue="%" icon={<ArrowUpRight size={20} />} status="RECORD" accent="gold" />
            <StatCard label="Equity" value={`${totalCurrent.toFixed(1)}`} subValue="SOL" icon={<Wallet size={20} />} status="ON-CHAIN" accent="teal" />
          </div>

          {/* Equity Growth Timeline */}
          <div className="mb-8 lg:mb-12">
            <h2 className="text-[9px] lg:text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-2 mb-4">Equity Growth Timeline</h2>
            <div className="bg-[#1E2329] border border-[#2B3139] rounded-[1.5rem] lg:rounded-[2.5rem] p-5 lg:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCD535] rounded-full blur-[150px] opacity-5 pointer-events-none"></div>
              
              <div className="flex justify-between items-center mb-6 lg:mb-10 relative z-10">
                <div className="flex items-center gap-2 lg:gap-3">
                   <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[#FCD535] shadow-inner"><BarChart2 size={16} /></div>
                   <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-[#848E9C]">Market Visualization</span>
                </div>
                <span className="px-2 py-1 bg-[#0B0E11] rounded-lg text-[8px] lg:text-[9px] font-black text-[#FCD535] border border-[#FCD535]/20 uppercase tracking-widest">Live Data</span>
              </div>

              <div className="h-48 lg:h-72 flex items-end gap-1 md:gap-5 border-b border-[#2B3139] pb-4 relative z-10">
                {registrations.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#474D57] gap-3">
                      <Activity size={32} className="opacity-20 animate-pulse" />
                      <p className="italic text-[10px] font-medium uppercase tracking-widest opacity-30">{t.common.loading}</p>
                  </div>
                ) : (
                  registrations.map((item, idx) => {
                    const pnl = Number(item.current_balance) - Number(item.initial_balance);
                    const height = Math.min(Math.max(Math.abs(pnl) * 60 + 20, 10), 100); 
                    return (
                      <div key={item.id || idx} className="flex-1 group relative h-full flex flex-col justify-end">
                          <div 
                           style={{ height: `${height}%` }}
                           className={`w-full rounded-t-sm lg:rounded-t-xl transition-all duration-700 cursor-pointer ${pnl >= 0 ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/80 shadow-[0_0_20px_rgba(14,203,129,0.1)]' : 'bg-[#F6465D] hover:bg-[#F6465D]/80 shadow-[0_0_20px_rgba(246,70,93,0.1)]'}`}
                          ></div>
                          
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:block z-50 pointer-events-none">
                             <div className="bg-[#181A20] text-white text-[10px] p-4 lg:p-5 rounded-[1rem] lg:rounded-[1.5rem] shadow-2xl border border-[#2B3139] min-w-[140px] lg:min-w-[160px]">
                                <p className="font-black border-b border-[#2B3139] pb-2 mb-3 text-[#FCD535] uppercase tracking-wider truncate">{item.rooms?.title || "Trading Room"}</p>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between gap-4 text-[#848E9C] font-bold">
                                    <span>START:</span>
                                    <span className="font-mono text-[#EAECEF]">{Number(item.initial_balance).toFixed(2)}</span>
                                  </div>
                                  <div className={`flex justify-between gap-4 font-black ${pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                                    <span>CURRENT:</span>
                                    <span className="font-mono">{Number(item.current_balance).toFixed(2)}</span>
                                  </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    )
                  })
                )}
              </div>
              <p className="mt-4 lg:mt-8 text-[8px] lg:text-[9px] font-black text-[#474D57] uppercase tracking-[0.4em] text-center italic">Verified Growth Vector (Blockchain Sync)</p>
            </div>
          </div>

          {/* Historical Breakdown */}
          <div className="flex flex-col gap-4 lg:gap-6">
            <h2 className="text-[9px] lg:text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-2">Historical Breakdown</h2>
            <div className="bg-[#1E2329] border border-[#2B3139] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#2B3139]/50 text-[#848E9C] uppercase text-[8px] lg:text-[9px] font-black tracking-widest border-b border-[#2B3139]">
                    <tr>
                      <th className="p-4 lg:p-8">Arena</th>
                      <th className="p-4 lg:p-8 text-right">Start</th>
                      <th className="p-4 lg:p-8 text-right">Live</th>
                      <th className="p-4 lg:p-8 text-right hidden sm:table-cell">PnL</th>
                      <th className="p-4 lg:p-8 text-center">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B3139]">
                    {registrations.length === 0 ? (
                      <tr><td colSpan={5} className="p-16 lg:p-24 text-center text-[#474D57] font-black uppercase tracking-[0.4em] italic text-[10px]">No historical data found</td></tr>
                    ) : (
                      registrations.map((item) => {
                        const pnl = Number(item.current_balance) - Number(item.initial_balance);
                        const roi = Number(item.initial_balance) > 0 ? (pnl / Number(item.initial_balance)) * 100 : 0;
                        return (
                          <tr key={item.id} className="hover:bg-[#2B3139]/40 transition-colors group cursor-default">
                            <td className="p-4 lg:p-8">
                               <div className="flex items-center gap-3 lg:gap-4">
                                  <div className="hidden sm:flex w-8 lg:w-10 h-8 lg:h-10 rounded-lg lg:rounded-xl bg-[#0B0E11] border border-[#2B3139] items-center justify-center text-[#848E9C] group-hover:border-[#FCD535]/30 transition-colors">
                                     <Trophy size={16} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                     <p className="font-bold text-[#EAECEF] group-hover:text-[#FCD535] transition-colors tracking-tight truncate max-w-[120px] lg:max-w-[180px] text-xs lg:text-sm">{item.rooms?.title || "Trading Room"}</p>
                                     <p className="text-[8px] lg:text-[10px] text-[#474D57] font-mono mt-0.5 uppercase tracking-tighter truncate">CID: {item.id.slice(0,8)}...</p>
                                  </div>
                               </div>
                            </td>
                            <td className="p-4 lg:p-8 text-right font-mono text-[#848E9C] text-[10px] lg:text-xs font-bold">{Number(item.initial_balance).toFixed(2)}</td>
                            <td className="p-4 lg:p-8 text-right font-mono text-white text-xs lg:text-sm font-black">{Number(item.current_balance).toFixed(2)}</td>
                            <td className={`p-4 lg:p-8 text-right font-black font-mono text-[10px] lg:text-sm hidden sm:table-cell ${pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(3)}
                            </td>
                            <td className="p-4 lg:p-8 text-center">
                              <span className={`px-2 lg:px-4 py-1 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-widest border ${roi >= 0 ? 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20' : 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20'}`}>
                                {roi >= 0 ? '▲' : '▼'} {Math.abs(roi).toFixed(1)}%
                              </span>
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

function StatCard({ label, value, subValue, icon, status, accent }: any) {
  const accentColors: any = {
    gold: "text-[#FCD535] border-[#FCD535]/20",
    blue: "text-[#3b82f6] border-[#3b82f6]/20",
    green: "text-[#0ECB81] border-[#0ECB81]/20",
    red: "text-[#F6465D] border-[#F6465D]/20",
    teal: "text-[#70C1B3] border-[#70C1B3]/20"
  };

  return (
    <div className="bg-[#1E2329] p-4 sm:p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2.5rem] border border-[#2B3139] shadow-2xl relative overflow-hidden group hover:border-[#FCD535]/30 transition-all">
      <div className="flex justify-between items-start mb-3 lg:mb-6">
        <div className="text-[8px] lg:text-[9px] font-black text-[#474D57] uppercase tracking-[0.2em]">{label}</div>
        <div className="hidden sm:flex p-2.5 bg-[#0B0E11] rounded-xl border border-[#2B3139] text-[#848E9C] group-hover:text-[#FCD535] transition-all shadow-inner">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1 lg:gap-2 mb-2 lg:mb-4">
        <span className="text-lg sm:text-2xl lg:text-4xl font-black text-white italic tracking-tighter leading-none">{value}</span>
        <span className="text-[8px] lg:text-[10px] font-black text-[#474D57] uppercase">{subValue}</span>
      </div>
      <div className={`text-[7px] lg:text-[8px] font-black px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-md lg:rounded-lg border inline-flex items-center gap-1 ${accentColors[accent] || accentColors.gold}`}>
        <span className="w-1 h-1 rounded-full bg-current"></span> {status}
      </div>
    </div>
  );
}