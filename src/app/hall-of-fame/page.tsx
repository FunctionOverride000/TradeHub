"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  ShieldCheck, 
  Globe,
  Activity,
  ArrowUpRight,
  Loader2,
  Search,
  Users,
  Award,
  Star,
  ShieldAlert,
  Menu,
  X,
  LayoutDashboard,
  ArrowLeft,
  ChevronRight,
  Zap,
  Flame
} from 'lucide-react';

/**
 * MENGGUNAKAN ESM CDN:
 * Menjamin library dimuat dengan stabil di lingkungan pratinjau.
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

interface GlobalTrader {
  user_id: string;
  wallet_address: string;
  total_initial: number;
  total_current: number;
  total_deposit: number;
  total_profit: number;
  participation_count: number;
  avg_roi: number;
}

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
      console.error("Failed to load global Hall of Fame.");
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

      <header className="relative z-10 pt-20 lg:pt-32 pb-20 border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-xl sticky top-0">
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

      <main className="max-w-7xl mx-auto px-8 py-20 relative z-10 pb-48">
        
        {/* TOP 3 LEGENDS - Redesigned Premium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14 mb-24 items-end">
           {filteredTraders.slice(0, 3).map((t, idx) => {
             const isGold = idx === 0;
             const isSilver = idx === 1;
             const isBronze = idx === 2;
             
             return (
               <div 
                 key={t.user_id} 
                 onClick={() => safeNavigate(`/profile/${t.user_id}`)} 
                 className={`p-10 rounded-[3.5rem] border transition-all duration-700 cursor-pointer relative overflow-hidden group hover:-translate-y-4 animate-in fade-in slide-in-from-bottom-8 ${isGold ? 'bg-gradient-to-br from-[#FCD535]/10 to-[#0B0E11] border-[#FCD535]/40 shadow-[0_40px_80px_rgba(252,213,53,0.15)] order-2 md:h-[500px] flex flex-col justify-center' : 'bg-[#1E2329] border-[#2B3139] h-[400px] ' + (isSilver ? 'order-1' : 'order-3')}`}
                 style={{ animationDelay: `${idx * 150}ms` }}
               >
                  <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Trophy size={120} className={isGold ? 'text-[#FCD535]' : isSilver ? 'text-slate-400' : 'text-orange-600'} />
                  </div>
                  
                  <div className="relative z-10">
                     <div className={`w-20 h-20 rounded-3xl mb-10 flex items-center justify-center text-4xl font-black shadow-2xl border ${isGold ? 'bg-[#FCD535] text-black border-[#FCD535]' : 'bg-[#0B0E11] text-white border-[#2B3139]'}`}>
                        {idx + 1}
                     </div>
                     
                     <p className="text-[11px] font-black text-[#474D57] uppercase tracking-[0.4em] mb-3 italic">Master Identity</p>
                     <h3 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter mb-10 group-hover:text-[#FCD535] transition-colors truncate">
                       {t.wallet_address.slice(0, 14)}...
                     </h3>
                     
                     <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                        <div>
                           <p className="text-[10px] font-black text-[#474D57] uppercase mb-2 tracking-widest leading-none">Net Profit</p>
                           <p className="text-3xl font-black text-[#0ECB81] italic tracking-tighter">+{t.total_profit.toFixed(2)}<span className="text-xs not-italic ml-1">SOL</span></p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-[#474D57] uppercase mb-2 tracking-widest leading-none">Global ROI</p>
                           <p className="text-3xl font-black text-white italic tracking-tighter">+{t.avg_roi.toFixed(1)}%</p>
                        </div>
                     </div>
                  </div>
               </div>
             );
           })}
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
                      filteredTraders.map((t, idx) => {
                        const isAdjusted = t.total_deposit > 0;
                        return (
                          <tr key={t.user_id} className="hover:bg-[#2B3139]/40 transition-all group cursor-pointer" onClick={() => safeNavigate(`/profile/${t.user_id}`)}>
                             <td className="p-10">
                                <span className={`text-2xl lg:text-3xl font-black italic ${idx < 3 ? 'text-[#FCD535]' : 'text-[#474D57]'}`}>
                                  {idx < 9 ? `0${idx + 1}` : idx + 1}
                                </span>
                             </td>
                             <td className="p-10">
                                <div className="flex items-center gap-6">
                                   <div className="w-12 h-12 rounded-2xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[#848E9C] group-hover:text-[#FCD535] group-hover:border-[#FCD535]/30 transition-all shadow-inner"><Users size={20}/></div>
                                   <div className="flex flex-col">
                                      <span className="font-mono text-sm font-black text-[#EAECEF] group-hover:text-[#FCD535] transition-colors tracking-tight">
                                        {t.wallet_address.slice(0, 10)}...{t.wallet_address.slice(-10)}
                                      </span>
                                      <div className="flex items-center gap-3 mt-1.5">
                                         <span className="text-[8px] font-black text-[#0ECB81] uppercase tracking-[0.2em] bg-[#0ECB81]/10 px-2 py-0.5 rounded-md border border-[#0ECB81]/20 italic">On-Chain Evidence</span>
                                         {isAdjusted && (
                                           <span className="text-[8px] font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                             <ShieldAlert size={10}/> Anti-Cheat Verified
                                           </span>
                                         )}
                                      </div>
                                   </div>
                                </div>
                             </td>
                             <td className="p-10 text-right">
                                <span className="font-black text-white text-xs uppercase italic tracking-widest">{t.participation_count} Arenas</span>
                             </td>
                             <td className="p-10 text-right font-mono font-black text-white text-base">
                                {t.total_profit >= 0 ? '+' : ''}{t.total_profit.toFixed(3)} <span className="text-[10px] text-[#474D57] font-sans ml-1">SOL</span>
                             </td>
                             <td className="p-10 text-center">
                                <div className={`px-6 py-2.5 rounded-xl font-black text-[10px] lg:text-xs inline-block italic border shadow-lg ${t.total_profit >= 0 ? 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20 shadow-[#0ECB81]/5' : 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20 shadow-[#F6465D]/5'}`}>
                                   {t.total_profit >= 0 ? '▲' : '▼'} {Math.abs(t.avg_roi).toFixed(2)}%
                                </div>
                             </td>
                             <td className="p-10 text-right">
                                <button className="p-4 bg-[#0B0E11] border border-[#2B3139] rounded-2xl text-[#848E9C] group-hover:text-[#FCD535] group-hover:border-[#FCD535]/30 transition-all active:scale-90 shadow-inner">
                                   <ArrowUpRight size={20} />
                                </button>
                             </td>
                          </tr>
                        );
                      })
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
              Papan peringkat global TradeHub merekam setiap performa on-chain secara kumulatif. 
              Sistem **Clean ROI** kami secara otomatis memfilter deposit eksternal untuk memastikan bahwa hanya skill murni yang membawa Anda ke puncak hierarki.
           </p>
           
           <div className="flex flex-col sm:flex-row justify-center gap-6">
             <button onClick={() => safeNavigate('/')} className="px-16 py-6 bg-[#FCD535] text-black rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl shadow-[#FCD535]/10 active:scale-95 hover:bg-[#F0B90B] transition-all">RETURN TO HUB</button>
             <button onClick={() => safeNavigate('/handbook')} className="px-12 py-6 bg-transparent text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] border border-[#2B3139] hover:bg-[#2B3139] transition-all">PROTOCOL SPECS</button>
           </div>
        </div>
      </main>

      <footer className="py-32 text-center opacity-10 border-t border-[#2B3139]/30 flex flex-col items-center gap-4">
         <TrendingUp size={40} className="text-white" />
         <p className="text-[10px] font-black uppercase tracking-[1.5em] italic">TradeHub • Global Integrity Layer</p>
      </footer>
    </div>
  );
}