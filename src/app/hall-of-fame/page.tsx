"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  Search, 
  Star, 
  Flame,
  Clock, // Icon baru untuk waktu
  Gift,  // Icon baru untuk hadiah
  CheckCircle2 // Icon untuk status aktif
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/lib/LanguageSwitcher';

// --- IMPORT NEW COMPONENTS ---
import TopTraderCard, { GlobalTrader } from '@/components/hall-of-fame/TopTraderCard';
import TraderRow from '@/components/hall-of-fame/TraderRow';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

export default function HallOfFamePage() {
  const { t } = useLanguage();
  const [traders, setTraders] = useState<GlobalTrader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  
  const subscriptionsRef = useRef<number[]>([]);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // --- HELPER: HITUNG JADWAL DISTRIBUSI BERIKUTNYA ---
  const getNextDistributionDate = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    // Jadwal: 1 April, 1 Juli, 1 Oktober, 1 Januari (Tahun Depan)
    const quarters = [
      new Date(currentYear, 3, 1), // April (Bulan index 3)
      new Date(currentYear, 6, 1), // Juli
      new Date(currentYear, 9, 1), // Oktober
      new Date(currentYear + 1, 0, 1) // Januari next year
    ];
    
    // Cari tanggal pertama yang lebih besar dari hari ini
    const nextDate = quarters.find(d => d > now) || quarters[0];
    
    // Format tanggal (English US untuk format internasional)
    return nextDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /**
   * GLOBAL REAL-TIME SYNC:
   * Memantau baki on-chain untuk Top 10 trader secara live dengan staggered delay.
   */
  const setupGlobalSync = (list: GlobalTrader[]) => {
    if (!SOLANA_RPC || list.length === 0) return;
    const connection = new web3.Connection(SOLANA_RPC, 'confirmed');

    subscriptionsRef.current.forEach(id => {
      try { connection.removeAccountChangeListener(id); } catch(e) {}
    });
    subscriptionsRef.current = [];

    list.slice(0, 10).forEach((trader, index) => {
      setTimeout(() => {
        try {
          const pubKey = new web3.PublicKey(trader.wallet_address);
          const subId = connection.onAccountChange(pubKey, (info) => {
            const newBalance = info.lamports / web3.LAMPORTS_PER_SOL;
            
            setTraders(prev => {
              const updated = prev.map(t => {
                if (t.wallet_address === trader.wallet_address) {
                  const diff = newBalance - t.total_current;
                  const newTotalCurrent = t.total_current + diff;
                  const adjustedTotalCurrent = newTotalCurrent - t.total_deposit;
                  const newTotalProfit = adjustedTotalCurrent - t.total_initial;
                  
                  return { 
                    ...t, 
                    total_current: newTotalCurrent,
                    total_profit: newTotalProfit,
                    avg_roi: t.total_initial > 0 ? (newTotalProfit / t.total_initial) * 100 : 0
                  };
                }
                return t;
              });
              return [...updated].sort((a, b) => b.total_profit - a.total_profit);
            });
          }, 'confirmed');
          subscriptionsRef.current.push(subId);
        } catch (e) {
          console.warn(`Gagal sinkronisasi blockchain untuk ${trader.wallet_address}`);
        }
      }, index * 200);
    });
  };

  const fetchGlobalStats = async () => {
    if (!supabase) {
        setIsLoading(false);
        return;
    }

    try {
      setIsSyncing(true);
      const { data, error } = await supabase.from('participants').select('*');
      if (error) throw error;

      const traderMap: Record<string, GlobalTrader> = {};

      (data || []).forEach((p: any) => {
        if (!traderMap[p.user_id]) {
          traderMap[p.user_id] = {
            user_id: p.user_id,
            wallet_address: p.wallet_address,
            total_initial: 0,
            total_current: 0,
            total_deposit: 0,
            total_profit: 0,
            participation_count: 0,
            avg_roi: 0
          };
        }
        
        const t = traderMap[p.user_id];
        t.total_initial += Number(p.initial_balance);
        t.total_current += Number(p.current_balance);
        t.total_deposit += Number(p.total_deposit || 0);
        t.participation_count += 1;
      });

      const sortedTraders = Object.values(traderMap).map(t => {
        const adjustedCurrent = t.total_current - t.total_deposit;
        const totalProfit = adjustedCurrent - t.total_initial;
        return {
          ...t,
          total_profit: totalProfit,
          avg_roi: t.total_initial > 0 ? (totalProfit / t.total_initial) * 100 : 0
        };
      }).sort((a, b) => b.total_profit - a.total_profit);

      setTraders(sortedTraders);
      setupGlobalSync(sortedTraders);

    } catch (err) {
       // Silent error
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
    return () => {
      subscriptionsRef.current.forEach(id => {
        try {
          const connection = new web3.Connection(SOLANA_RPC);
          connection.removeAccountChangeListener(id);
        } catch(e) {}
      });
    };
  }, []);

  const filteredTraders = traders.filter(t => 
    t.wallet_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin w-14 h-14 text-[#FCD535] mb-6 opacity-20" />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#848E9C] animate-pulse">Scanning Global Ledger...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30 relative overflow-x-hidden">
      
      {/* GLOW DECORATIONS - Static premium feeling */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#FCD535]/5 to-transparent pointer-events-none opacity-40"></div>
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

      <header className="relative z-10 pt-20 lg:pt-32 pb-10 border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-6 animate-in slide-in-from-left-4 duration-700">
             <button onClick={() => safeNavigate('/')} className="p-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl text-[#848E9C] hover:text-[#FCD535] transition-all active:scale-90 shadow-xl group">
                 <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
             </button>
             <div>
                 <div className="flex items-center gap-3 text-[#FCD535] font-black text-[10px] uppercase tracking-[0.4em] mb-3">
                    <Star size={14} fill="currentColor" /> {t.nav.hall_of_fame}
                 </div>
                 <h1 className="text-4xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">Global <span className="text-[#FCD535]">Rankings</span></h1>
             </div>
           </div>

           <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto animate-in slide-in-from-right-4 duration-700">
              <LanguageSwitcher />
              <div className="relative group w-full md:w-96">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors" size={20} />
                 <input 
                   type="text" placeholder="Search master trader..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                   className="w-full pl-16 pr-6 py-5 bg-[#1E2329] border border-[#2B3139] text-[#EAECEF] rounded-[1.5rem] focus:border-[#FCD535] outline-none transition-all font-bold text-sm shadow-inner placeholder:text-[#474D57]"
                 />
              </div>
              <div className="hidden lg:flex items-center gap-2 bg-[#0ECB81]/10 px-6 py-4 rounded-2xl border border-[#0ECB81]/20 shadow-lg">
                 <span className="w-1.5 h-1.5 bg-[#0ECB81] rounded-full animate-ping mr-2"></span>
                 <span className="text-[10px] font-black text-[#0ECB81] uppercase tracking-widest">Network Auditor Live</span>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10 relative z-10 pb-48">
        
        {/* --- BANNER PEMBERITAHUAN DISTRIBUSI REWARD --- */}
        <div className="mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="bg-gradient-to-r from-[#FCD535]/10 to-[#FCD535]/5 border border-[#FCD535]/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
              {/* Background Effect */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCD535]/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-[#FCD535]/20 transition-all duration-1000"></div>
              
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
                 <div className="w-20 h-20 bg-[#FCD535]/20 rounded-[2rem] flex items-center justify-center text-[#FCD535] shadow-[0_0_30px_rgba(252,213,53,0.3)] shrink-0 animate-bounce delay-1000 duration-[3000ms]">
                    <Gift size={36} strokeWidth={2.5} />
                 </div>
                 <div>
                    <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                       <span className="bg-[#FCD535] text-black text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">Quarterly Reward</span>
                       <span className="text-[#0ECB81] text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Active Protocol</span>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Global Profit Share Program</h3>
                    <p className="text-sm text-[#848E9C] font-medium max-w-xl mt-2 leading-relaxed">
                       Top 3 Master Traders automatically receive a <span className="text-[#FCD535] font-bold">20% share of total platform revenue</span>. 
                       Distribution is executed directly to wallets every quarter without manual claiming.
                    </p>
                 </div>
              </div>

              <div className="flex flex-col items-center bg-[#0B0E11]/80 backdrop-blur-sm px-8 py-5 rounded-3xl border border-[#FCD535]/20 relative z-10 shadow-2xl min-w-[200px]">
                 <Clock size={24} className="text-[#FCD535] mb-2 animate-pulse" />
                 <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em] mb-1">Next Payout</p>
                 <p className="text-lg font-black text-white">{getNextDistributionDate()}</p>
              </div>
           </div>
        </div>

        {/* TOP 3 LEGENDS - Redesigned Premium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14 mb-24 items-end">
           {filteredTraders.slice(0, 3).map((t, idx) => (
              <TopTraderCard 
                 key={t.user_id} 
                 trader={t} 
                 index={idx} 
                 onClick={() => safeNavigate(`/profile/${t.user_id}`)} 
              />
           ))}
        </div>

        {/* RANKING LIST TABLE - Redesigned with Glass-morphism */}
        <div className="bg-[#1E2329]/60 backdrop-blur-md rounded-[3rem] lg:rounded-[4rem] border border-[#2B3139] overflow-hidden shadow-2xl relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
           <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[900px]">
                 <thead className="bg-[#2B3139]/80 text-[#848E9C] uppercase font-black text-[10px] tracking-widest border-b border-[#2B3139]">
                    <tr>
                       <th className="p-10">Rank</th>
                       <th className="p-10">Master Trader</th>
                       <th className="p-10 text-right">Participation</th>
                       <th className="p-10 text-right">Aggregate Profit</th>
                       <th className="p-10 text-center">ROI Analytics</th>
                       <th className="p-10 text-right">Proof</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-[#2B3139]">
                    {filteredTraders.length === 0 ? (
                      <tr><td colSpan={6} className="p-40 text-center text-[#474D57] font-black uppercase tracking-[0.5em] italic opacity-30 text-xs">Zero legendary records found in the current ledger scan.</td></tr>
                    ) : (
                      filteredTraders.map((t, idx) => (
                         <TraderRow 
                            key={t.user_id} 
                            trader={t} 
                            index={idx} 
                            onClick={() => safeNavigate(`/profile/${t.user_id}`)} 
                         />
                      ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Enhanced Proof Section */}
        <div className="mt-32 p-12 lg:p-20 bg-gradient-to-br from-[#1E2329] to-[#0B0E11] border border-[#2B3139] rounded-[4rem] text-center shadow-2xl relative overflow-hidden group">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(252,213,53,0.03),transparent)] pointer-events-none group-hover:opacity-100 transition-opacity"></div>
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FCD535]/20 to-transparent"></div>
           
           <Flame size={64} className="mx-auto mb-10 text-[#FCD535] opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700" />
           
           <h3 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter mb-6 leading-none">Elite Reputation Protocol</h3>
           <p className="text-sm text-[#848E9C] leading-relaxed max-w-2xl mx-auto italic mb-14 font-medium">
             TradeHub&apos;s global leaderboard records every on-chain performance cumulatively. 
             Our **Clean ROI** system automatically filters external deposits to ensure that only pure skill takes you to the top of the hierarchy.
           </p>
           
           <div className="flex flex-col sm:flex-row justify-center gap-6">
             <button onClick={() => safeNavigate('/')} className="px-16 py-6 bg-[#FCD535] text-black rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl shadow-[#FCD535]/10 active:scale-95 hover:bg-[#F0B90B] transition-all">RETURN TO HUB</button>
             <button onClick={() => safeNavigate('/handbook')} className="px-12 py-6 bg-transparent text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] border border-[#2B3139] hover:bg-[#2B3139] transition-all">PROTOCOL SPECS</button>
           </div>
        </div>
      </main>

      <footer className="py-32 text-center opacity-10 border-t border-[#2B3139]/30 flex flex-col items-center gap-4">
         <p className="text-[10px] font-black uppercase tracking-[1.5em] italic">TradeHub • Global Integrity Layer</p>
      </footer>
    </div>
  );
}