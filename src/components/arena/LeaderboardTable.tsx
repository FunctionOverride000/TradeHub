import React from 'react';
import { TrendingUp, RefreshCw, ShieldCheck, CheckCircle, LineChart } from 'lucide-react';

interface Participant {
  id: string;
  wallet_address: string;
  initial_balance: number;
  current_balance: number;
  total_deposit: number;
  profit?: number;
}

interface LeaderboardTableProps {
  participants: Participant[];
  room: any;
  isRefreshing: boolean;
  refreshLeaderboard: () => void;
}

export default function LeaderboardTable({ participants, room, isRefreshing, refreshLeaderboard }: LeaderboardTableProps) {
  
  // Handle row click (Solscan)
  const handleRowClick = (walletAddress: string) => {
    if (!walletAddress) return;
    const url = `https://solscan.io/account/${walletAddress}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // --- FUNGSI BARU: Handle Track Click (GMGN.ai) ---
  // Menggunakan GMGN.ai karena Dexscreener tidak memiliki fitur profil wallet.
  // GMGN sangat detail untuk melihat "wallet ini sedang trade token apa".
  const handleTrackClick = (e: React.MouseEvent, walletAddress: string) => {
    e.stopPropagation();
    if (!walletAddress) return;
    const url = `https://gmgn.ai/sol/address/${walletAddress}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="lg:col-span-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#1E2329] rounded-3xl flex items-center justify-center border border-[#2B3139] shadow-xl">
            <TrendingUp className="text-[#0ECB81] w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">On-Chain Leaderboard</h2>
            <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.3em]">Live Verification Network</p>
          </div>
        </div>
        <button 
          onClick={refreshLeaderboard}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-3 text-[10px] font-black text-[#FCD535] uppercase tracking-widest bg-[#1E2329] px-6 py-4 rounded-2xl border border-[#2B3139] hover:bg-[#2B3139] transition-all hover:shadow-lg active:scale-95 shadow-black/20 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? 'Menyinkronkan...' : 'Segarkan Peringkat'}
        </button>
      </div>

      <div className="bg-[#1E2329] rounded-[3rem] overflow-hidden border border-[#2B3139] shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#2B3139] text-[#848E9C] text-[10px] font-black uppercase tracking-[0.2em] border-b border-[#363c45]">
              <tr>
                <th className="p-8">Rank</th>
                <th className="p-8">Trader Identity</th>
                <th className="p-8 text-right">Initial (SOL)</th>
                <th className="p-8 text-right">Current (SOL)</th>
                <th className="p-8 text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3139]">
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-30">
                      <div className="w-20 h-20 bg-[#2B3139] rounded-full flex items-center justify-center border border-[#474D57]">
                         <ShieldCheck size={40} className="text-[#848E9C]" />
                      </div>
                      <div className="space-y-1">
                         <p className="text-lg font-black uppercase tracking-widest text-[#848E9C]">Menunggu Trader Pertama</p>
                         <p className="text-xs font-medium text-[#474D57]">Jadilah yang pertama untuk mendominasi arena ini!</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                participants.map((p, index) => {
                  const isTop3 = index < 3;
                  const winnerData = room?.winners_info?.find((w: any) => w.wallet === p.wallet_address);

                  return (
                    <tr 
                        key={p.id} 
                        onClick={() => handleRowClick(p.wallet_address)}
                        className={`hover:bg-[#2B3139]/60 transition-all group cursor-pointer ${winnerData ? 'bg-[#0ECB81]/5' : ''}`}
                        title="Click row for Solscan, click icon for GMGN Trade Tracker"
                    >
                      <td className="p-8 font-black">
                        <div className="flex items-center gap-4">
                          {isTop3 ? (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-lg ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : index === 1 ? 'bg-slate-300' : 'bg-orange-600'}`}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </div>
                          ) : (
                            <span className="text-sm font-mono text-[#474D57] ml-4 font-black">#{index + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-8">
                          <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[10px] font-black text-[#FCD535] group-hover:border-[#FCD535]/50 transition-colors">W</div>
                           <div className="flex flex-col">
                             <div className="flex items-center gap-3">
                                <span className="font-mono text-sm text-[#EAECEF] group-hover:text-[#FCD535] transition-colors font-bold tracking-tight">
                                  {p.wallet_address.slice(0, 10)}...{p.wallet_address.slice(-10)}
                                </span>
                                {/* TOMBOL TRACKER (GMGN.AI) */}
                                <button
                                  onClick={(e) => handleTrackClick(e, p.wallet_address)}
                                  className="p-1.5 rounded-lg bg-[#2B3139] text-[#848E9C] hover:bg-[#FCD535] hover:text-black transition-all hover:scale-110 active:scale-95 border border-[#474D57] hover:border-[#FCD535]"
                                  title="Analyze Trades on GMGN.ai"
                                >
                                  <LineChart size={12} strokeWidth={3} />
                                </button>
                             </div>
                             <span className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mt-1 italic flex items-center gap-1">
                                {winnerData ? (
                                   <span className="text-[#0ECB81] flex items-center gap-1"><CheckCircle size={10}/> Reward: {winnerData.amount.toFixed(2)} SOL</span>
                                ) : 'On-Chain Verified'}
                             </span>
                           </div>
                          </div>
                      </td>
                      <td className="p-8 text-right font-mono text-xs text-[#848E9C] font-bold">{p.initial_balance?.toFixed(3)}</td>
                      <td className="p-8 text-right font-mono text-sm text-[#EAECEF] font-black">
                          {p.current_balance?.toFixed(3)}
                      </td>
                      <td className="p-8 text-right">
                        <div className="inline-flex flex-col items-end">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs italic ${p.profit! >= 0 ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#F6465D]/10 text-[#F6465D]'}`}>
                              {p.profit! >= 0 ? '▲' : '▼'} {Math.abs(p.profit!).toFixed(2)}%
                            </div>
                            <span className="text-[9px] font-bold text-[#474D57] uppercase tracking-tighter mt-1">Pure ROI</span>
                        </div>
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
  );
}