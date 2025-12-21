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
  ShieldCheck, 
  ExternalLink,
  Link,
  Unlink,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

/**
 * Catatan Teknis: Menggunakan impor standar. 
 * Pastikan dependensi ini tersedia di environment Anda.
 */
import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = 'https://vmvezylbaxlodkepstbj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmV6eWxiYXhsb2RrZXBzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTYxNzEsImV4cCI6MjA4MTU5MjE3MX0.a2_XxJKLRXrt_tn_UiMYTmpP1iGjul6OhaHI3IGzJCw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * FUNGSI AMBIL SALDO REAL (ON-CHAIN)
 * Mengambil data Lamports asli dari Solana Mainnet via RPC.
 */
const fetchOnChainBalance = async (walletAddress: string): Promise<number> => {
  if (!walletAddress) return 0;
  
  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana'
  ];

  for (const endpoint of rpcEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [walletAddress]
        })
      });
      
      if (!response.ok) continue;

      const data = await response.json();
      if (data && data.result) {
        // Konversi Lamports ke SOL (1 SOL = 10^9 lamports)
        return Number(data.result.value) / 1000000000;
      }
    } catch (err) {
      console.warn(`Gagal mengakses RPC ${endpoint}`);
    }
  }
  return 0;
};

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
  };
}

export default function WalletPage() {
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [liveBalance, setLiveBalance] = useState<number>(0);
  const [activeCapital, setActiveCapital] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // Fungsi Copy Alamat Wallet
  const handleCopy = () => {
    if (connectedWallet) {
      navigator.clipboard.writeText(connectedWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. Auth & Re-connect Phantom Otomatis
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        safeNavigate('/auth');
        return;
      }
      setUser(session.user);

      if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
        try {
          const resp = await (window as any).solana.connect({ onlyIfTrusted: true });
          setConnectedWallet(resp.publicKey.toString());
        } catch (err) {
          console.log("Auto-connect memerlukan persetujuan manual.");
        }
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
      if (!session) safeNavigate('/auth');
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Ambil Data Transaksi Real dari Database & Hitung Active Capital
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('participants')
          .select(`*, rooms (title, is_premium)`)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });

        if (error) throw error;
        
        const enrichedData = (data || []).map((item: any) => ({
          ...item,
          profit: item.initial_balance > 0 
            ? ((item.current_balance - item.initial_balance) / item.initial_balance) * 100 
            : 0
        }));

        setRegistrations(enrichedData);

        // KALKULASI ACTIVE CAPITAL NYATA (Total modal awal dari semua partisipasi)
        const totalCapital = enrichedData.reduce((acc, curr) => acc + Number(curr.initial_balance || 0), 0);
        setActiveCapital(totalCapital);

      } catch (err: any) {
        console.error("Gagal memuat data dari database:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Sinkronisasi Real-time Database
    const channel = supabase
      .channel('wallet-real-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `user_id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // 3. Sinkronisasi Saldo On-Chain Nyata
  useEffect(() => {
    if (connectedWallet) {
      updateLiveBalance();
    } else {
      setLiveBalance(0);
    }
  }, [connectedWallet]);

  const updateLiveBalance = async () => {
    if (!connectedWallet) return;
    setIsRefreshing(true);
    setErrorMsg("");
    try {
      const balance = await fetchOnChainBalance(connectedWallet);
      setLiveBalance(balance);
      
      // Jika RPC gagal mengembalikan data asli
      if (balance === 0 && registrations.length > 0) {
        setErrorMsg("Node RPC Solana sedang membatasi akses (Rate Limit). Saldo asli mungkin tidak tampil sementara.");
      }
    } catch (err) {
      console.error("Kesalahan koneksi blockchain:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnectWallet = async () => {
    const provider = (window as any).solana;
    if (!provider?.isPhantom) {
      alert("Phantom Wallet tidak ditemukan! Silakan pasang ekstensi Phantom.");
      window.open("https://phantom.app/", "_blank");
      return;
    }
    setIsRefreshing(true);
    try {
      const resp = await provider.connect();
      setConnectedWallet(resp.publicKey.toString());
    } catch (err) {
      console.error("Persetujuan koneksi ditolak pengguna.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if ((window as any).solana) {
      await (window as any).solana.disconnect();
      setConnectedWallet(null);
      setLiveBalance(0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    safeNavigate('/auth');
  };

  // --- LOGIKA KALKULASI TOTAL EQUITY NYATA ---
  // Total Equity = Saldo asli di Phantom + Total modal awal yang sedang dipakai turnamen
  const totalEquity = liveBalance + activeCapital;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[#848E9C] font-bold tracking-[0.2em] uppercase text-xs">Mengkalkulasi Aset Nyata...</p>
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
          <SidebarLink onClick={() => safeNavigate('/dashboard')} Icon={LayoutDashboard} label="Track Record" />
          <SidebarLink onClick={() => safeNavigate('/dashboard/pnl')} Icon={BarChart2} label="PnL Analysis" />
          <SidebarLink onClick={() => safeNavigate('/dashboard/certificates')} Icon={Award} label="Certificates" />
          <SidebarLink Icon={Wallet} label="Wallet" active />
          <SidebarLink Icon={Settings} label="Settings" />
        </nav>

        <div className="p-6 border-t border-[#2B3139]">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139] rounded-xl transition font-medium text-sm">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#0B0E11] relative">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:20 pointer-events-none"></div>

        <header className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#EAECEF]">Dompet Saya</h1>
            <p className="text-[#848E9C] text-sm">Verifikasi On-Chain & Rekaman Bursa Nyata</p>
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
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl flex items-center gap-3 text-yellow-400 animate-pulse">
              <AlertTriangle size={20} className="shrink-0" />
              <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* REAL ASSET STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <StatCard 
              label="Live Balance" 
              value={`${liveBalance.toFixed(4)} SOL`} 
              icon={<Wallet className="text-[#FCD535]" />} 
              trend={connectedWallet ? "On-Chain Nyata" : "Offline"}
              trendUp={connectedWallet !== null}
            />
            <StatCard 
              label="Active Capital" 
              value={`${activeCapital.toFixed(2)} SOL`} 
              icon={<TrendingUp className="text-[#3b82f6]" />} 
              trend="Modal di Lomba"
              trendUp={activeCapital > 0}
            />
            <StatCard 
              label="Total Equity" 
              value={`${totalEquity.toFixed(4)} SOL`} 
              icon={<Medal className="text-[#0ECB81]" />} 
              trend="Aset Bersih Real"
              trendUp={true}
            />
            <StatCard 
              label="Rank Tier" 
              value="Elite" 
              icon={<ShieldCheck className="text-[#70C1B3]" />} 
              trend="Verified User"
              trendUp={true}
            />
          </div>

          {/* WALLET CONNECTION MANAGEMENT */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#EAECEF] flex items-center gap-2">
                <ShieldCheck className="text-[#0ECB81]" size={20}/> 
                Wallet Management
              </h2>
              {connectedWallet && (
                <button 
                  onClick={updateLiveBalance}
                  disabled={isRefreshing}
                  className="text-sm text-[#FCD535] hover:underline flex items-center gap-1.5 transition-all"
                >
                  Refresh Balance {isRefreshing && <Loader2 size={12} className="animate-spin" />}
                </button>
              )}
            </div>
            
            <div className="bg-[#1E2329] border border-[#2B3139] hover:border-[#FCD535] rounded-xl p-6 transition-all duration-300 group flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-black/30">
              <div className="shrink-0 relative">
                <div className={`w-16 h-16 bg-[#2B3139] rounded-lg flex items-center justify-center border border-[#474D57] group-hover:border-[#FCD535] transition-colors ${connectedWallet ? 'text-[#0ECB81]' : 'text-[#848E9C]'}`}>
                  <Wallet size={28} />
                </div>
              </div>
              
              <div className="flex-1 w-full text-center md:text-left">
                <h3 className="text-lg font-bold text-[#EAECEF]">
                  {connectedWallet ? 'Phantom Wallet Terhubung' : 'Dompet Belum Terhubung'}
                </h3>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-1">
                  {connectedWallet ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#848E9C] bg-[#0B0E11] px-3 py-1 rounded border border-[#2B3139]">
                        {connectedWallet.slice(0, 12)}...{connectedWallet.slice(-12)}
                      </span>
                      <button 
                        onClick={handleCopy}
                        className="p-1.5 bg-[#2B3139] hover:bg-[#363c45] rounded-md text-[#848E9C] hover:text-[#FCD535] transition-all"
                        title="Salin Alamat"
                      >
                        {copied ? <Check size={14} className="text-[#0ECB81]" /> : <Copy size={14} />}
                      </button>
                      <button 
                        onClick={() => window.open(`https://solscan.io/account/${connectedWallet}`, '_blank')}
                        className="p-1.5 bg-[#2B3139] hover:bg-[#363c45] rounded-md text-[#FCD535] hover:text-[#F0B90B] transition-colors"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#848E9C]">Hubungkan dompet Solana Anda untuk melihat saldo secara real-time.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                 {!connectedWallet ? (
                   <button 
                    onClick={handleConnectWallet}
                    disabled={isRefreshing}
                    className="flex-1 md:flex-none px-6 py-3 bg-[#FCD535] text-black rounded-lg font-bold text-sm transition-all hover:bg-[#F0B90B] active:scale-95 shadow-lg shadow-[#FCD535]/10"
                   >
                     {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : 'Connect Phantom'}
                   </button>
                 ) : (
                   <button 
                    onClick={handleDisconnect}
                    className="flex-1 md:flex-none px-6 py-3 bg-[#2B3139] text-[#F6465D] border border-[#F6465D]/20 rounded-lg font-bold text-sm transition-all hover:bg-[#F6465D] hover:text-white active:scale-95"
                   >
                     Disconnect
                   </button>
                 )}
              </div>
            </div>
          </div>

          {/* PARTICIPATION HISTORY (REAL DATA FROM DB) */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-[#EAECEF] flex items-center gap-2 mb-6">
              <Clock size={20} className="text-[#FCD535]"/> Participation Funds History
            </h2>
            
            {registrations.length === 0 ? (
              <div className="bg-[#181A20] border border-dashed border-[#2B3139] rounded-xl p-8 text-center text-[#848E9C]">
                Belum ada data partisipasi yang ditemukan di database.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {registrations.map((item) => {
                  const pnl = (item.current_balance - item.initial_balance).toFixed(4);
                  const isProfit = Number(pnl) >= 0;

                  return (
                    <div key={item.id} className="bg-[#1E2329] border border-[#2B3139] hover:border-[#FCD535] rounded-xl p-6 transition-all duration-300 group flex flex-col md:flex-row items-center gap-6 shadow-sm">
                      <div className="shrink-0">
                        <div className="w-12 h-12 bg-[#2B3139] rounded-lg flex items-center justify-center border border-[#474D57] group-hover:border-[#FCD535] transition-colors text-[#848E9C]">
                          <BarChart2 size={24} />
                        </div>
                      </div>
                      
                      <div className="flex-1 w-full text-center md:text-left">
                        <h3 className="text-lg font-bold text-[#EAECEF]">
                          {item.rooms?.title || "Trading Tournament Nyata"}
                        </h3>
                        <p className="text-xs text-[#848E9C] mt-1 font-medium italic">Wallet: {item.wallet_address.slice(0,8)}...{item.wallet_address.slice(-8)}</p>
                        <p className="text-xs text-[#848E9C] mt-0.5">Modal Awal Lomba: {item.initial_balance.toFixed(2)} SOL</p>
                      </div>

                      <div className="flex gap-8 border-t md:border-t-0 md:border-l border-[#2B3139] pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-center">
                        <div className="text-center">
                          <p className="text-[10px] text-[#848E9C] uppercase font-bold tracking-wider">PnL Result</p>
                          <p className={`text-lg font-bold font-mono ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {isProfit ? '+' : ''}{pnl} SOL
                          </p>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <p className="text-[10px] text-[#848E9C] uppercase font-bold tracking-wider">Status</p>
                          <p className="text-lg font-bold text-[#EAECEF] uppercase text-[10px] mt-1">
                            <span className="px-2 py-0.5 rounded bg-[#2B3139] border border-[#363c45] tracking-widest font-black">
                              {item.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SHARED UI COMPONENTS ---

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
    <div className="bg-[#1E2329] p-5 rounded-xl border border-[#2B3139] shadow-sm hover:border-[#474D57] transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="text-[#848E9C] text-[10px] font-black uppercase tracking-[0.1em]">{label}</div>
        <div className="p-1.5 bg-[#0B0E11] rounded-md border border-[#2B3139]">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <div className="text-2xl font-black text-[#EAECEF] tracking-tighter">{value}</div>
        <div className={`text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded-full ${trendUp === true ? 'text-[#0ECB81] bg-[#0ECB81]/10' : trendUp === false ? 'text-[#F6465D] bg-[#F6465D]/10' : 'text-[#848E9C] bg-[#2B3139]'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}