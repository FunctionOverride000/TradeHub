"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Award, 
  TrendingUp, 
  BarChart2, 
  Wallet, 
  ShieldCheck, 
  Globe,
  Activity,
  ArrowUpRight,
  Medal,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Loader2,
  MapPin,
  Calendar,
  Share2,
  Zap,
  AlertTriangle,
  User,
  ArrowLeft
} from 'lucide-react';

/**
 * MENGGUNAKAN IMPOR STANDAR:
 * Kami berasumsi lingkungan proyek Anda memiliki paket-paket ini terinstal.
 * Jika ralat resolusi berlanjut, pastikan menjalankan 'npm install @supabase/supabase-js @solana/web3.js'.
 */
import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmvezylbaxlodkepstbj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmV6eWxiYXhsb2RrZXBzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTYxNzEsImV4cCI6MjA4MTU5MjE3MX0.a2_XxJKLRXrt_tn_UiMYTmpP1iGjul6OhaHI3IGzJCw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

interface Achievement {
  id: string;
  room_id: string;
  wallet_address: string;
  initial_balance: number;
  current_balance: number;
  total_deposit: number; // Variabel Anti-Cheat
  joined_at: string;
  status: string;
  profit: number;
  rooms?: {
    title: string;
    end_time: string;
  }
}

/**
 * Halaman Profil Publik Trader (Versi Anti-Cheat & Real-Time)
 * Mendukung standar Next.js 15 dengan unwrapping params asinkron.
 */
export default function App({ params }: { params: Promise<{ userId: string }> }) {
  // Melakukan unwrap params sesuai standar Next.js terbaru
  const resolvedParams = React.use(params);
  const userId = resolvedParams.userId;

  const [history, setHistory] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [traderName, setTraderName] = useState("Elite Trader");
  const [copied, setCopied] = useState(false);
  const [isIdInvalid, setIsIdInvalid] = useState(false);
  
  const subscriptionsRef = useRef<number[]>([]);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  const copyProfileLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * REAL-TIME PUBLIC SYNC:
   * Memantau perubahan saldo di blockchain untuk update ROI secara live.
   */
  const setupPublicSync = (list: Achievement[]) => {
    if (!SOLANA_RPC || list.length === 0) return;
    const connection = new web3.Connection(SOLANA_RPC, 'confirmed');

    // Membersihkan subskripsi lama
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
                // RUMUS ANTI-CHEAT: ROI murni setelah memotong deposit luar
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

  // 1. Ambil Data Profil & Riwayat dari Database
  useEffect(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      setIsIdInvalid(true);
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      try {
        const { data, error } = await supabase
          .from('participants')
          .select(`*, rooms!inner (title, end_time)`)
          .eq('user_id', userId)
          .order('joined_at', { ascending: false });

        if (error) throw error;

        const enriched = (data || []).map((p: any) => {
          const adjustedCurrent = p.current_balance - (p.total_deposit || 0);
          return {
            ...p,
            profit: p.initial_balance > 0 ? ((adjustedCurrent - p.initial_balance) / p.initial_balance) * 100 : 0
          };
        });

        setHistory(enriched);
        setupPublicSync(enriched);

        if (data && data.length > 0) {
          const wallet = data[0].wallet_address;
          setTraderName(`Trader ${wallet.slice(0, 6)}...${wallet.slice(-4)}`);
        }
      } catch (err) {
        console.error("Fetch error:", err);
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

  // Statistik Kumulatif (ROI Bersih)
  const totalVerifiedProfit = history.reduce((acc, curr) => acc + (curr.profit || 0), 0);
  const avgROI = history.length > 0 ? totalVerifiedProfit / history.length : 0;
  const verifiedWins = history.filter(h => (h.profit || 0) > 0).length;
  
  // Perbaikan winRatePercent agar terdefinisi dengan benar di scope komponen
  const winRatePercent = history.length > 0 
    ? ((verifiedWins / history.length) * 100).toFixed(1)
    : "0";

  const getRank = () => {
    if (verifiedWins >= 20) return { label: "Grandmaster", color: "text-red-500", bg: "bg-red-500/10" };
    if (verifiedWins >= 10) return { label: "Elite Trader", color: "text-[#FCD535]", bg: "bg-[#FCD535]/10" };
    return { label: "Pro Trader", color: "text-[#0ECB81]", bg: "bg-[#0ECB81]/10" };
  };
  const rank = getRank();

  if (loading) return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin w-14 h-14 text-[#FCD535] mb-6 opacity-30" />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#848E9C]">Otorisasi Ledger Jaringan...</p>
    </div>
  );

  if (isIdInvalid) return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-[#F6465D]/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-[#F6465D]/20 shadow-xl">
        <AlertTriangle className="w-12 h-12 text-[#F6465D]" />
      </div>
      <h2 className="text-4xl font-black text-white mb-4 uppercase italic tracking-tighter">ID Tidak Sah</h2>
      <p className="text-[#848E9C] mb-12 max-w-sm font-medium leading-relaxed uppercase tracking-widest text-xs">Identitas tidak ditemukan dalam protokol TradeHub.</p>
      <button onClick={() => safeNavigate('/')} className="px-12 py-5 bg-[#2B3139] text-[#EAECEF] rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] border border-[#363c45] hover:bg-[#FCD535] hover:text-black transition-all shadow-2xl">KEMBALI KE LOBBY</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30 relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

      <header className="relative z-10 pt-24 pb-32 overflow-hidden border-b border-[#2B3139]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[#FCD535] rounded-full blur-[180px] opacity-[0.03] pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-8 flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-24">
           
           {/* Avatar Area */}
           <div className="relative shrink-0">
              <div className="absolute inset-0 bg-[#FCD535] rounded-full blur-[60px] opacity-10"></div>
              <div className="w-48 h-48 lg:w-56 lg:h-56 bg-gradient-to-br from-[#FCD535] to-orange-600 rounded-[4rem] p-1.5 shadow-2xl relative z-10">
                 <div className="w-full h-full bg-[#0B0E11] rounded-[3.8rem] flex items-center justify-center overflow-hidden border border-white/5">
                    <User size={100} className="text-[#2B3139] opacity-50" />
                 </div>
              </div>
              <div className="absolute -bottom-4 -right-4 lg:-right-8 bg-[#0ECB81] text-black text-[11px] font-black px-6 py-3 rounded-2xl border-8 border-[#0B0E11] flex items-center gap-2 shadow-2xl z-20 transform hover:scale-110 transition-transform">
                 <ShieldCheck size={18} /> VERIFIED PRO
              </div>
           </div>

           {/* Trader Identity */}
           <div className="text-center lg:text-left flex-1 min-w-0">
              <div className="mb-10">
                 <h1 className="text-5xl lg:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.85] mb-6 drop-shadow-2xl">{traderName}</h1>
                 <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4">
                    <span className="font-mono text-[10px] lg:text-xs text-[#848E9C] bg-[#1E2329] px-5 py-3 rounded-2xl border border-[#2B3139] shadow-inner tracking-widest uppercase">ID: {userId.substring(0, 18).toUpperCase()}...</span>
                    <div className={`px-5 py-3 rounded-2xl border font-black text-[11px] uppercase tracking-widest ${rank.color} ${rank.bg} border-current/20 shadow-lg`}>
                       {rank.label}
                    </div>
                 </div>
              </div>
              
              {/* Statistik Ringkasan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 mb-14">
                 <StatBadge icon={<Trophy className="text-[#FCD535]" />} label="Total ROI" value={`${totalVerifiedProfit.toFixed(1)}%`} highlight={true} />
                 <StatBadge icon={<TrendingUp className="text-[#0ECB81]" />} label="Win Rate" value={`${winRatePercent}%`} />
                 <StatBadge icon={<Medal className="text-[#3b82f6]" />} label="Verified Wins" value={verifiedWins} />
              </div>

              {/* Aksi Berbagi */}
              <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                 <button onClick={copyProfileLink} className="bg-[#FCD535] text-black px-12 py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-[#F0B90B] transition-all shadow-2xl shadow-[#FCD535]/20 flex items-center justify-center gap-4 active:scale-95">
                    {copied ? <CheckCircle2 size={22} /> : <Share2 size={22} />} 
                    {copied ? 'PAUTAN DISALIN' : 'BAGIKAN REPUTASI'}
                 </button>
                 <button onClick={() => window.open('https://solscan.io', '_blank')} className="px-10 py-6 bg-[#1E2329]/80 border border-[#2B3139] text-[#848E9C] rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:text-white transition-all flex items-center justify-center gap-4 shadow-xl">
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
                 <Activity size={24} /> Rekod On-Chain
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
                <p className="text-2xl font-black text-[#848E9C] uppercase tracking-[0.4em]">Tiada Aktiviti Dikesan</p>
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

                    <button onClick={() => safeNavigate(`/lomba/${item.room_id}`)} className="mt-14 w-full py-6 bg-[#0B0E11] border border-[#2B3139] rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] hover:border-[#FCD535] hover:text-[#FCD535] transition-all flex items-center justify-center gap-3 active:scale-95 group/btn">
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
              <ArrowLeft size={22} className="group-hover:-translate-x-2 transition-transform" /> KEMBALI KE HUB
           </button>
        </div>
      </main>
    </div>
  );
}

/**
 * Sub-komponen Stat Badge (Header Profil)
 */
function StatBadge({ icon, label, value, highlight = false }: { icon: React.ReactNode, label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className={`bg-[#1E2329]/60 p-8 rounded-[3rem] border border-[#2B3139] flex items-center gap-8 min-w-[260px] shadow-2xl group hover:border-[#FCD535]/30 transition-all ${highlight ? 'border-[#FCD535]/20 bg-[#FCD535]/5' : ''}`}>
       <div className="w-18 h-18 bg-[#0B0E11] rounded-[2rem] flex items-center justify-center border border-[#2B3139] group-hover:scale-110 transition-transform shadow-inner shrink-0">
          {icon}
       </div>
       <div className="overflow-hidden">
          <p className="text-[11px] font-black text-[#474D57] uppercase tracking-[0.3em] mb-2 italic">{label}</p>
          <p className={`text-3xl lg:text-4xl font-black italic tracking-tighter truncate leading-none uppercase ${highlight ? 'text-[#FCD535]' : 'text-white'}`}>{value}</p>
       </div>
    </div>
  );
}