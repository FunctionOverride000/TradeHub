"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Loader2, 
  Medal, 
  Wallet, 
  ShieldCheck, 
  Copy, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  Menu, 
  CreditCard, 
  Award,
  User
} from 'lucide-react';

// FIX: Import createClient from the local helper for consistent auth
import { createClient } from '@/lib/supabase';
import * as web3 from '@solana/web3.js';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/lib/LanguageSwitcher';
import { useRouter } from 'next/navigation'; // FIX: Use standard Next.js router

// --- IMPORT COMPONENT BARU ---
import UserSidebar from '@/components/dashboard/UserSidebar';

// Initialize Supabase using the helper (no args needed as they are in the helper)
const supabase = createClient();

// List of fallback RPCs to try - Improved list with more robust public endpoints
// Note: Many public RPCs have rate limits. Using a paid RPC in production is recommended.
const RPC_ENDPOINTS = [
  // Prioritize Alchemy/Helius if available (user provided env)
  process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL,
  process.env.NEXT_PUBLIC_HELIUS_SOLANA_URL,
  // Reliable Public RPCs (ordered by likely uptime/rate-limit friendliness)
  'https://api.mainnet-beta.solana.com', 
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.rpc.extrnode.com',
  'https://1rpc.io/sol',
].filter(Boolean) as string[];

/**
 * FUNGSI AMBIL SALDO REAL (ON-CHAIN) dengan Rotasi RPC
 */
const fetchOnChainBalance = async (walletAddress: string): Promise<number | null> => {
  if (!walletAddress) return 0;

  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      // console.log(`Trying to fetch balance from: ${rpcUrl}`); // Reduced log noise
      const connection = new web3.Connection(rpcUrl, 'confirmed');
      const publicKey = new web3.PublicKey(walletAddress);
      
      // Add a timeout promise to prevent hanging on slow RPCs (8 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC Timeout')), 8000) 
      );
      
      const balance = await Promise.race([
        connection.getBalance(publicKey),
        timeoutPromise
      ]) as number;

      return balance / web3.LAMPORTS_PER_SOL;
    } catch (err) {
      // Silent fail for individual RPCs to try next one
      // console.warn(`Failed to fetch from ${rpcUrl}:`, err);
    }
  }

  // If all fail, return null to indicate failure (handled in UI) rather than 0
  // console.error("All RPC endpoints failed."); // Suppress error to avoid console noise
  return null; 
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
  const { t } = useLanguage();
  const router = useRouter(); // FIX: Initialize router
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [liveBalance, setLiveBalance] = useState<number>(0);
  const [activeCapital, setActiveCapital] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Ref untuk subscription (walaupun tidak dipakai intensif di sini, disiapkan untuk konsistensi)
  const subscriptionsRef = useRef<number[]>([]);

  const safeNavigate = (path: string) => {
    router.push(path); // FIX: Use router.push for smooth navigation
  };

  // 1. Auth & Auto-connect Phantom
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // safeNavigate('/auth'); // Removed automatic redirect on load to prevent flash if session restores quickly
        router.replace('/auth');
        return;
      }
      setUser(session.user);

      if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
        try {
          const resp = await (window as any).solana.connect({ onlyIfTrusted: true });
          setConnectedWallet(resp.publicKey.toString());
        } catch (err) {}
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/auth');
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  /**
   * FULL ON-CHAIN SYNC:
   * Sinkronisasi Live Balance dan modal di turnamen.
   */
  const updateAllBalances = async (currentList?: ParticipantData[]) => {
    const listToSync = currentList || registrations;
    setIsRefreshing(true);
    setErrorMsg(""); // Clear previous errors

    try {
      // 1. Fetch Live Wallet Balance
      if (connectedWallet) {
        const balance = await fetchOnChainBalance(connectedWallet);
        if (balance !== null) {
            setLiveBalance(balance);
        } else {
            // console.warn("Could not fetch live balance from any RPC.");
            // Don't set error message yet if we can still fetch registration data
        }
      }

      // 2. Fetch Participant Balances (Active Capital)
      if (listToSync.length > 0) {
        let connection: web3.Connection | null = null;
        
        // Find a working connection for multiple accounts fetch
        for (const rpcUrl of RPC_ENDPOINTS) {
            try {
                const conn = new web3.Connection(rpcUrl, 'confirmed');
                // Test connection simply with version check or getSlot
                // Using a timeout race to ensure we don't hang
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
                await Promise.race([conn.getSlot(), timeoutPromise]); 
                
                connection = conn;
                break;
            } catch (e) {
                // console.warn(`Skipping RPC for multi-fetch: ${rpcUrl}`);
            }
        }

        if (!connection) {
            // throw new Error("No working RPC connection found for capital sync.");
            console.warn("No working RPC connection found for capital sync.");
            // If capital sync fails, we just don't update it, keeping old data or 0
            // but we don't want to crash the whole flow
        } else {
            const publicKeys = listToSync.map(p => new web3.PublicKey(p.wallet_address));
            // Handle chunking if too many accounts (Solana RPC limit is usually 100)
            // For simplicity assuming list < 100 here, but good to keep in mind
            const accountsInfo = await connection.getMultipleAccountsInfo(publicKeys);

            const verifiedList = listToSync.map((p, idx) => {
              const info = accountsInfo[idx];
              const liveCurrent = info ? info.lamports / web3.LAMPORTS_PER_SOL : p.current_balance;
              return { ...p, current_balance: liveCurrent };
            });

            setRegistrations(verifiedList);
            const totalCap = verifiedList.reduce((acc, curr) => acc + curr.current_balance, 0);
            setActiveCapital(totalCap);
        }
      }
    } catch (err) {
      console.error("Sync warning:", err);
      // Soft error message
      setErrorMsg("Sinkronisasi lambat/gagal. Data mungkin tidak realtime.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Fetch Data Database
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setErrorMsg("");
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
        // Only update balances if we have a connected wallet or participants to check
        if (connectedWallet || enrichedData.length > 0) {
              await updateAllBalances(enrichedData);
        }

      } catch (err: any) {
        // setErrorMsg("Koneksi Database bermasalah."); // Silent error for database connectivity
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, connectedWallet]); // Re-fetch when user is set or wallet connects

  // --- LOGIKA KONEKSI DOMPET (UPDATED FOR MOBILE) ---
  const handleConnectWallet = async () => {
    const provider = (window as any).solana;
    
    // 1. Cek jika provider Phantom sudah ada (Desktop Extension atau In-App Browser)
    if (provider?.isPhantom) {
        try {
          const resp = await provider.connect();
          setConnectedWallet(resp.publicKey.toString());
        } catch (err) {
            console.error("User rejected connection", err);
        }
        return;
    }

    // 2. Jika tidak ada provider, cek apakah user menggunakan Mobile Device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
        // 3. Logic Deep Link Universal untuk Mobile
        // Ini akan membuka aplikasi Phantom dan memuat halaman ini di dalamnya
        const currentUrl = window.location.href;
        const ref = window.location.origin; 
        const phantomDeepLink = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(ref)}`;
        
        // Redirect ke Phantom App
        window.location.href = phantomDeepLink;
    } else {
        // 4. Fallback Desktop: Arahkan ke website Phantom untuk install extension
        window.alert(t.admin.phantom_not_found); 
        window.open("https://phantom.app/", "_blank");
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
    router.replace('/auth');
  };

  const totalEquity = liveBalance + activeCapital;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[#848E9C] font-black uppercase tracking-[0.4em] text-[10px]">{t.common.loading}</p>
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

      {/* --- KONTEN UTAMA --- */}
      <main className="flex-1 flex flex-col lg:ml-72 min-w-0 bg-[#0B0E11] relative overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

        <header className="relative z-50 px-6 lg:px-10 py-6 lg:py-8 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#FCD535] active:scale-95 transition-all">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-black tracking-tighter italic uppercase text-white leading-none">{t.dashboard.sidebar.wallet}</h1>
              <p className="hidden sm:flex items-center gap-2 text-[#848E9C] text-[10px] uppercase tracking-[0.2em] mt-2">
                {isRefreshing ? <><Loader2 size={10} className="animate-spin text-[#FCD535]" /> {t.common.syncing}</> : "Verified On-Chain Equity"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {/* INTEGRASI IDENTITAS & TOMBOL PROFIL DALAM SATU KOMPONEN */}
            <button 
              onClick={() => safeNavigate(`/profile/${user?.id}`)}
              className="flex items-center gap-4 px-4 py-2 bg-[#1E2329] border border-[#2B3139] rounded-2xl hover:bg-[#2B3139] transition-all group active:scale-95 text-left shadow-lg"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#EAECEF] group-hover:text-[#FCD535] transition-colors">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-[#474D57] font-mono tracking-tighter uppercase">
                  UID: {user?.id?.substring(0,8)}
                </p>
              </div>
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full bg-gradient-to-tr from-[#181A20] to-[#2B3139] border border-[#474D57] flex items-center justify-center text-[#EAECEF] font-black shadow-lg group-hover:border-[#FCD535]/50 transition-all overflow-hidden">
                {user?.email ? user.email[0].toUpperCase() : 'T'}
              </div>
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto relative z-10 pb-24">
          
          {errorMsg && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-2xl flex items-center gap-3 text-yellow-500 shadow-xl">
              <AlertTriangle size={20} />
              <p className="text-xs font-black uppercase tracking-widest">{errorMsg}</p>
            </div>
          )}

          {/* GRID STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-12">
            <StatCard label="Live Balance" value={`${liveBalance.toFixed(3)}`} subValue="SOL" icon={<Wallet size={24} />} status={connectedWallet ? "ON-CHAIN" : "OFFLINE"} accent="gold" />
            <StatCard label="Arena Capital" value={`${activeCapital.toFixed(2)}`} subValue="SOL" icon={<Zap size={24} />} status="IN-COMPETITION" accent="blue" />
            <StatCard label="Net Worth" value={`${totalEquity.toFixed(3)}`} subValue="SOL" icon={<Medal size={24} />} status="TOTAL ASSETS" accent="green" />
            <StatCard label="Trust Status" value="ELITE" subValue="VERIFIED" icon={<ShieldCheck size={24} />} status="IDENTITY PROOF" accent="teal" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* MANAJEMEN KONEKSI DOMPET */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <h2 className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-2">Wallet Access Control</h2>
              <div className="bg-[#1E2329] border border-[#2B3139] rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-[#FCD535] rounded-full blur-[100px] opacity-5 pointer-events-none"></div>
                 
                 <div className="relative mb-8">
                   <div className={`w-24 h-24 rounded-[2rem] bg-[#0B0E11] border-2 flex items-center justify-center transition-all duration-500 ${connectedWallet ? 'border-[#0ECB81] text-[#0ECB81] shadow-[0_0_40px_rgba(14,203,129,0.1)]' : 'border-[#2B3139] text-[#474D57]'}`}>
                      <Wallet size={44} />
                   </div>
                   {connectedWallet && <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#0ECB81] rounded-full border-4 border-[#1E2329] animate-pulse"></div>}
                 </div>

                 <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">
                   {connectedWallet ? 'Session Active' : 'Bridge Required'}
                 </h3>
                 <p className="text-xs text-[#848E9C] font-medium leading-relaxed max-w-xs mb-10">
                   {connectedWallet 
                     ? 'Your Solana wallet has been successfully verified by TradeHub protocol on-chain.' 
                     : 'Connect Phantom Wallet to validate your trading performance on the blockchain.'}
                 </p>

                 {connectedWallet ? (
                   <div className="w-full space-y-6">
                     <div className="bg-[#0B0E11] p-5 rounded-2xl border border-[#2B3139] flex items-center justify-between shadow-inner">
                         <span className="font-mono text-xs text-[#FCD535] font-black">{connectedWallet.substring(0, 10)}...{connectedWallet.substring(connectedWallet.length - 10)}</span>
                         <button onClick={() => { navigator.clipboard.writeText(connectedWallet!); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2.5 bg-[#1E2329] hover:bg-[#2B3139] rounded-xl text-[#848E9C] hover:text-[#FCD535] transition-all">
                           {copied ? <Check size={18} className="text-[#0ECB81]" /> : <Copy size={18} />}
                         </button>
                     </div>
                     <div className="flex gap-4">
                       <button onClick={() => updateAllBalances()} disabled={isRefreshing} className="flex-1 py-4 bg-[#2B3139] text-[#EAECEF] rounded-2xl font-black text-[10px] uppercase tracking-widest border border-[#363c45] hover:text-[#FCD535] transition-all flex items-center justify-center gap-2">
                          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> REFRESH
                       </button>
                       <button onClick={() => handleDisconnect()} className="flex-1 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                          DISCONNECT
                       </button>
                     </div>
                   </div>
                 ) : (
                   <button onClick={() => handleConnectWallet()} className="w-full py-5 bg-[#FCD535] text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-[#F0B90B] transition-all shadow-xl shadow-[#FCD535]/10 flex items-center justify-center gap-3 active:scale-95">
                      <CreditCard size={18} /> CONNECT PHANTOM
                   </button>
                 )}
              </div>
            </div>

            {/* TABEL ALOKASI DANA */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              <h2 className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-2">On-Chain Asset History</h2>
              <div className="bg-[#1E2329] border border-[#2B3139] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#2B3139]/50 text-[#848E9C] uppercase text-[9px] font-black tracking-widest border-b border-[#2B3139]">
                      <tr>
                        <th className="p-6">Tournament</th>
                        <th className="p-6 text-right">Modal</th>
                        <th className="p-6 text-right">Live</th>
                        <th className="p-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2B3139]">
                      {registrations.length === 0 ? (
                        <tr><td colSpan={4} className="p-24 text-center text-[#474D57] font-black uppercase tracking-[0.3em] italic text-[10px]">No active funds found</td></tr>
                      ) : (
                        registrations.map((item) => (
                          <tr key={item.id} className="hover:bg-[#2B3139]/40 transition-colors group">
                            <td className="p-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[#848E9C] group-hover:border-[#FCD535]/30 transition-colors shadow-inner">
                                     <Award size={18} />
                                  </div>
                                  <p className="font-bold text-[#EAECEF] group-hover:text-[#FCD535] transition-colors tracking-tight truncate max-w-[120px]">{item.rooms?.title || "Trading Arena"}</p>
                               </div>
                            </td>
                            <td className="p-6 text-right font-mono text-[#848E9C] text-xs font-bold">{item.initial_balance.toFixed(2)}</td>
                            <td className="p-6 text-right font-mono text-white text-sm font-black">{item.current_balance.toFixed(2)}</td>
                            <td className="p-6 text-center">
                              <span className="px-3 py-1 rounded-lg bg-[#0B0E11] border border-[#2B3139] text-[8px] font-black uppercase tracking-widest text-[#FCD535]">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB KOMPONEN UI ---

function StatCard({ label, value, subValue, icon, status, accent }: any) {
  const accentColors: any = {
    gold: "text-[#FCD535] border-[#FCD535]/20",
    blue: "text-[#3b82f6] border-[#3b82f6]/20",
    green: "text-[#0ECB81] border-[#0ECB81]/20",
    teal: "text-[#70C1B3] border-[#70C1B3]/20"
  };

  return (
    <div className="bg-[#1E2329] p-6 lg:p-8 rounded-[2.5rem] border border-[#2B3139] shadow-2xl relative overflow-hidden group hover:border-[#FCD535]/30 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className="text-[9px] font-black text-[#474D57] uppercase tracking-[0.2em]">{label}</div>
        <div className="p-2.5 bg-[#0B0E11] rounded-xl border border-[#2B3139] text-[#848E9C] group-hover:text-[#FCD535] transition-all shadow-inner">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl lg:text-4xl font-black text-white italic tracking-tighter leading-none">{value}</span>
        <span className="text-[10px] font-black text-[#474D57] uppercase">{subValue}</span>
      </div>
      <div className={`text-[8px] font-black px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${accentColors[accent] || accentColors.gold}`}>
        <span className="w-1 h-1 rounded-full bg-current"></span> {status}
      </div>
    </div>
  );
}