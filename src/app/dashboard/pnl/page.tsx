"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Trophy, 
  User, 
  Settings, 
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
  PieChart
} from 'lucide-react';
// Jalur impor yang diperbaiki untuk memastikan resolusi modul berhasil
import { supabase } from '../../../lib/supabase'; 

interface ParticipantData {
  id: string;
  room_id: string;
  status: string; // 'pending', 'verified', 'rejected'
  wallet_address: string;
  joined_at: string;
  initial_balance: number;
  current_balance: number;
  profit?: number; 
  rooms?: {
    title: string;
    is_premium: boolean;
  };
}

export default function PnLAnalysisPage() {
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Helper navigasi aman
  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 1. Cek Auth Session (Konsisten dengan Dashboard)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        safeNavigate('/auth');
      } else {
        setUser(session.user);
      }
    };
    checkUser();

    // Listener jika status login berubah
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session) safeNavigate('/auth');
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Data Trading (Logika PnL dengan Struktur Tampilan Dashboard)
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setErrorMsg("");
        const { data, error } = await supabase
          .from('participants')
          .select(`
            *,
            rooms (
              title,
              is_premium
            )
          `)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: true }); // Ascending untuk visualisasi timeline

        if (error) throw error;
        
        const enrichedData = (data || []).map((item: any) => ({
          ...item,
          profit: item.initial_balance > 0 
            ? ((item.current_balance - item.initial_balance) / item.initial_balance) * 100 
            : 0
        }));

        setRegistrations(enrichedData);
      } catch (err: any) {
        console.error("Error Detail:", err);
        setErrorMsg(err.message || "Gagal mengambil data trading.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    safeNavigate('/auth');
  };

  // --- KALKULASI STATISTIK ANALISIS ---
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
        <p className="text-[#848E9C] font-bold tracking-[0.2em] uppercase text-xs">Menganalisis Portofolio...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30">
      {/* Sidebar - Identik dengan Dashboard Utama */}
      <aside className="hidden md:flex flex-col w-72 bg-[#181A20] border-r border-[#2B3139]">
        <div className="p-8 border-b border-[#2B3139]">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-lg flex items-center justify-center shadow-lg shadow-[#FCD535]/10">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#EAECEF]">TradeHub</span>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <SidebarLink onClick={() => safeNavigate('/dashboard')} Icon={LayoutDashboard} label="Track Record" />
          <SidebarLink onClick={() => safeNavigate('/dashboard/pnl')} Icon={BarChart2} label="PnL Analysis" active />
          <SidebarLink Icon={Award} label="Certificates" />
          <SidebarLink Icon={Wallet} label="Wallet" />
          <SidebarLink Icon={Settings} label="Settings" />
        </nav>

        <div className="p-6 border-t border-[#2B3139]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139] rounded-xl transition font-medium text-sm"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0B0E11] relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:20 pointer-events-none"></div>

        <header className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#EAECEF]">PnL Analysis</h1>
            <p className="text-[#848E9C] text-sm">Verified On-Chain Performance Analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-[#EAECEF]">{user?.email?.split('@')[0] || 'Trader'}</p>
              <p className="text-xs text-[#848E9C] font-mono">UID: {user?.id?.substring(0,8)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#2B3139] border border-[#474D57] flex items-center justify-center text-[#EAECEF] font-bold">
              {user?.email ? user.email[0].toUpperCase() : 'T'}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto relative z-10">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400">
              <AlertTriangle size={20} />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Row 1: Stats Overview - Gaya Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <StatCard 
              label="Net Profit" 
              value={`${netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)} SOL`} 
              icon={<Activity className={netPnL >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"} />} 
              trend={`${totalROI.toFixed(2)}% ROI`}
              trendUp={netPnL >= 0}
            />
            <StatCard 
              label="Win Rate" 
              value={`${winRate}%`} 
              icon={<PieChart className="text-[#3b82f6]" />} 
              trend={`${winSessions} Wins`}
              trendUp={Number(winRate) >= 50}
            />
            <StatCard 
              label="Best Trade" 
              value={`+${bestTrade.toFixed(2)}%`} 
              icon={<ArrowUpRight className="text-[#0ECB81]" />} 
              trend="Single Record"
              trendUp={true}
            />
            <StatCard 
              label="Current Equity" 
              value={`${totalCurrent.toFixed(2)} SOL`} 
              icon={<Wallet className="text-[#FCD535]" />} 
              trend="Current Balance"
              trendUp={null}
            />
          </div>

          {/* Row 2: Performance Visualizer */}
          <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-8 mb-12 shadow-xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-bold text-[#EAECEF] uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="text-[#FCD535]" size={18} /> Equity Growth Timeline
              </h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-[#0B0E11] rounded-lg text-[10px] font-bold text-[#848E9C] border border-[#2B3139] uppercase">Lifetime</span>
              </div>
            </div>

            {/* Custom Bar Chart Visualizer */}
            <div className="h-64 flex items-end gap-2 md:gap-4 border-b border-[#2B3139] pb-2 relative">
              {registrations.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-[#474D57] italic text-sm">Belum ada data turnamen untuk dianalisis</div>
              ) : (
                registrations.map((item, idx) => {
                  const pnl = Number(item.current_balance) - Number(item.initial_balance);
                  const height = Math.min(Math.abs(pnl) * 35 + 15, 100); 
                  return (
                    <div key={item.id || idx} className="flex-1 group relative">
                       <div 
                        style={{ height: `${height}%` }}
                        className={`w-full rounded-t-md transition-all duration-500 cursor-pointer ${pnl >= 0 ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/80 shadow-[0_-4px_10px_rgba(14,203,129,0.1)]' : 'bg-[#F6465D] hover:bg-[#F6465D]/80 shadow-[0_-4px_10px_rgba(246,70,93,0.1)]'}`}
                       ></div>
                       {/* Tooltip Gaya Dashboard */}
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                          <div className="bg-[#181A20] text-white text-[10px] p-3 rounded-xl shadow-2xl whitespace-nowrap border border-[#2B3139]">
                             <p className="font-bold border-b border-[#2B3139] pb-1 mb-1">{item.rooms?.title || "Tournament"}</p>
                             <p className={pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                               {pnl >= 0 ? 'Laba:' : 'Rugi:'} {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL
                             </p>
                          </div>
                       </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex justify-between mt-4 text-[10px] text-[#474D57] font-bold uppercase tracking-widest">
              <span>Start</span>
              <span>Evolution of Capital</span>
              <span>Current</span>
            </div>
          </div>

          {/* Row 3: Breakdown Table - Identik dengan Dashboard */}
          <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[#2B3139]">
              <h2 className="text-sm font-bold text-[#EAECEF] uppercase tracking-wider">Tournament Records</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#2B3139] text-[#848E9C] uppercase text-[10px] font-bold border-b border-[#363c45]">
                  <tr>
                    <th className="p-5">Tournament Title</th>
                    <th className="p-5 text-right">Start Balance</th>
                    <th className="p-5 text-right">Final Balance</th>
                    <th className="p-5 text-right">Net PnL (SOL)</th>
                    <th className="p-5 text-right">ROI %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3139]">
                  {registrations.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-[#848E9C] italic">Tidak ada riwayat transaksi yang ditemukan.</td></tr>
                  ) : (
                    registrations.map((item) => {
                      const pnl = Number(item.current_balance) - Number(item.initial_balance);
                      const roi = Number(item.initial_balance) > 0 ? (pnl / Number(item.initial_balance)) * 100 : 0;
                      return (
                        <tr key={item.id} className="hover:bg-[#2B3139]/50 transition-colors">
                          <td className="p-5 font-bold text-[#EAECEF]">{item.rooms?.title || "Trading Tournament"}</td>
                          <td className="p-5 text-right font-mono text-[#848E9C]">{Number(item.initial_balance).toFixed(3)}</td>
                          <td className="p-5 text-right font-mono text-[#EAECEF]">{Number(item.current_balance).toFixed(3)}</td>
                          <td className={`p-5 text-right font-bold font-mono ${pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)}
                          </td>
                          <td className="p-5 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${roi >= 0 ? 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20' : 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20'}`}>
                              {roi >= 0 ? '▲' : '▼'} {roi.toFixed(2)}%
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
      </main>
    </div>
  );
}

// --- SUB COMPONENTS - Identik dengan Dashboard Utama ---

function SidebarLink({ Icon, label, active = false, onClick }: { Icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium cursor-pointer text-sm ${
      active ? 'bg-[#2B3139] text-[#FCD535]' : 'text-[#848E9C] hover:bg-[#2B3139] hover:text-[#EAECEF]'
    }`}>
      <Icon size={18} />
      <span>{label}</span>
    </div>
  );
}

function StatCard({ label, value, icon, trend, trendUp }: any) {
  return (
    <div className="bg-[#1E2329] p-5 rounded-xl border border-[#2B3139]">
      <div className="flex justify-between items-start mb-2">
        <div className="text-[#848E9C] text-xs font-bold uppercase tracking-wider">{label}</div>
        {icon}
      </div>
      <div className="flex items-end gap-3">
        <div className="text-2xl font-bold text-[#EAECEF]">{value}</div>
        <div className={`text-xs font-bold mb-1 ${trendUp === true ? 'text-[#0ECB81]' : trendUp === false ? 'text-[#F6465D]' : 'text-[#848E9C]'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}