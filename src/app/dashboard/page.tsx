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
  AlertTriangle
} from 'lucide-react';
// Import sekarang akan berhasil karena file src/lib/supabase.ts sudah dibuat ulang di atas
import { supabase } from '../../lib/supabase'; 

interface ParticipantData {
  id: string;
  room_id: string;
  status: string; // 'pending', 'verified', 'rejected'
  wallet_address: string;
  joined_at: string;
  initial_balance: number;
  current_balance: number;
  profit?: number; 
  // Field hasil join dengan tabel rooms
  rooms?: {
    title: string;
    is_premium: boolean;
  };
}

export default function TradingAchievementDashboard() {
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 1. Cek Auth Session
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
  }, []);

  // 2. Fetch Data Trading
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setErrorMsg(""); // Reset error
        
        // Query dengan join ke tabel rooms
        const { data, error } = await supabase
          .from('participants')
          .select(`
            *,
            rooms (
              title,
              is_premium
            )
          `)
          .eq('user_id', user.id) // Filter berdasarkan user login
          .order('joined_at', { ascending: false });

        if (error) throw error;
        
        // Hitung profit untuk tampilan
        const enrichedData = (data || []).map((item: any) => ({
          ...item,
          profit: item.initial_balance > 0 
            ? ((item.current_balance - item.initial_balance) / item.initial_balance) * 100 
            : 0
        }));

        setRegistrations(enrichedData);
      } catch (err: any) {
        console.error("Error Detail:", err);
        setErrorMsg(err.message || "Gagal mengambil data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Realtime Subscription
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData(); // Refresh jika ada perubahan
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    safeNavigate('/auth');
  };

  // --- LOGIKA HITUNG STATISTIK ---
  const achievements = registrations.filter(r => r.status === 'verified');
  const pending = registrations.filter(r => r.status === 'pending' || !r.status);
  
  const winningTrades = achievements.filter(r => (r.profit || 0) > 0).length;
  const winRate = achievements.length > 0 
    ? ((winningTrades / achievements.length) * 100).toFixed(1) 
    : "0";

  const getRankTier = () => {
    const wins = achievements.length;
    if (wins >= 50) return "Grandmaster";
    if (wins >= 20) return "Diamond";
    if (wins >= 10) return "Gold";
    if (wins >= 5) return "Silver";
    return "Bronze";
  };
  const rankTier = getRankTier();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[#848E9C] font-bold tracking-[0.2em] uppercase text-xs">Loading Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30">
      {/* Sidebar */}
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
          <SidebarLink Icon={LayoutDashboard} label="Track Record" active />
          <SidebarLink Icon={Award} label="PnL Analysis" />
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
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>

        <header className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#EAECEF]">Trading Portfolio</h1>
            <p className="text-[#848E9C] text-sm">Verified On-Chain & Exchange Records</p>
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

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <StatCard 
              label="Tournaments Won" 
              value={achievements.length} 
              icon={<Trophy className="text-[#FCD535]" />} 
              trend="+12%"
              trendUp={true}
            />
            <StatCard 
              label="Win Rate" 
              value={`${winRate}%`} 
              icon={<BarChart2 className="text-[#0ECB81]" />} 
              trend="+2.4%"
              trendUp={true}
            />
            <StatCard 
              label="Active/Pending" 
              value={pending.length} 
              icon={<Clock className="text-[#F6465D]" />} 
              trend="In Progress"
              trendUp={false}
            />
            <StatCard 
              label="Rank Tier" 
              value={rankTier} 
              icon={<Medal className="text-[#70C1B3]" />} 
              trend="Current Rank"
              trendUp={true}
            />
          </div>

          {/* VERIFIED RECORDS */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#EAECEF] flex items-center gap-2">
                <CheckCircle className="text-[#0ECB81]" size={20}/> 
                Verified Achievements
              </h2>
            </div>
            
            {achievements.length === 0 ? (
              <div className="bg-[#181A20] border border-dashed border-[#2B3139] rounded-xl p-8 text-center text-[#848E9C]">
                Belum ada prestasi yang diverifikasi.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {achievements.map((item) => {
                  const pnl = (item.current_balance - item.initial_balance).toFixed(2);
                  const profitVal = item.profit || 0;
                  const profitColor = profitVal >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]';
                  const dateDisplay = item.joined_at;

                  return (
                    <div key={item.id} className="bg-[#1E2329] border border-[#2B3139] hover:border-[#FCD535] rounded-xl p-6 transition-all duration-300 group flex flex-col md:flex-row items-center gap-6">
                      <div className="shrink-0 relative">
                        <div className="w-16 h-16 bg-[#2B3139] rounded-lg flex items-center justify-center border border-[#474D57] group-hover:border-[#FCD535] transition-colors">
                          <Trophy className="text-[#FCD535]" size={28} />
                        </div>
                      </div>
                      
                      <div className="flex-1 w-full text-center md:text-left">
                        <h3 className="text-lg font-bold text-[#EAECEF]">
                          {item.rooms?.title || "Trading Tournament"}
                        </h3>
                        <p className="text-xs text-[#848E9C] mt-1">Joined: {dateDisplay ? new Date(dateDisplay).toLocaleDateString() : '-'}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 rounded bg-[#0ECB81]/10 text-[#0ECB81] text-[10px] font-bold uppercase border border-[#0ECB81]/20">
                          Verified
                        </span>
                      </div>

                      <div className="flex gap-8 border-t md:border-t-0 md:border-l border-[#2B3139] pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-center">
                        <div className="text-center">
                          <p className="text-[10px] text-[#848E9C] uppercase font-bold">ROI</p>
                          <p className={`text-lg font-bold ${profitColor}`}>
                            {profitVal > 0 ? '+' : ''}{profitVal.toFixed(2)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#848E9C] uppercase font-bold">PnL</p>
                          <p className={`text-lg font-bold ${profitColor}`}>
                            {Number(pnl) > 0 ? '+' : ''}{pnl} SOL
                          </p>
                        </div>
                      </div>
                      
                      <button className="px-4 py-2 bg-[#2B3139] hover:bg-[#474D57] text-[#EAECEF] rounded-lg text-sm font-medium transition flex items-center gap-2">
                        <Share2 size={14} /> <span className="hidden md:inline">Share</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PENDING / ACTIVE */}
          {pending.length > 0 && (
            <div className="bg-[#181A20] rounded-2xl border border-[#2B3139] overflow-hidden">
               <div className="px-6 py-4 border-b border-[#2B3139] flex items-center justify-between">
                 <h2 className="text-sm font-bold text-[#EAECEF] flex items-center gap-2">
                   <Clock size={16} className="text-[#FCD535]"/> Active & Pending
                 </h2>
               </div>
               <div className="divide-y divide-[#2B3139]">
                  {pending.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-[#2B3139]/50 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded bg-[#2B3139] flex items-center justify-center text-[#848E9C]">
                          <BarChart2 size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-[#EAECEF] text-sm">
                            {item.rooms?.title || "Tournament #" + item.room_id.slice(0,4)}
                          </p>
                          <p className="text-xs text-[#848E9C]">
                            Wallet: {item.wallet_address.substring(0,6)}...
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-[#FCD535]/10 text-[#FCD535] text-[10px] font-bold uppercase rounded">
                        In Progress
                      </span>
                    </div>
                  ))}
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

function SidebarLink({ Icon, label, active = false }: { Icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium cursor-pointer text-sm ${
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
        <div className={`text-xs font-bold mb-1 ${trendUp ? 'text-[#0ECB81]' : 'text-[#848E9C]'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}

const CalendarIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;