"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { createClient } from '@/lib/supabase';
import { Globe, Activity, Trophy, ShieldCheck } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

export function StatsSection() {
  const { t } = useLanguage();
  const supabase = createClient();
  
  const [stats, setStats] = useState({
    activeArenas: 0,
    // Default fallback values (angka terakhir yang diketahui)
    globalSolanaVolume: 4107884050, 
    solanaMarketCap: 70000000000,   
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch Real Data untuk Arena dari Database Supabase
    const fetchArenaData = async () => {
      try {
        const now = new Date().toISOString();
        const { count: arenaCount, error } = await supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('is_paid', true)
          .gt('end_time', now);

        if (error) throw error;

        if (isMounted) {
          setStats(prev => ({ ...prev, activeArenas: arenaCount || 0 }));
        }
      } catch (error) {
        // Silent catch for arena
      }
    };

    // 2. Fetch Real Market Data dengan Sistem Cadangan (Backup)
    const fetchMarketData = async () => {
      // OPSI 1: Coba CoinGecko Dulu
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
        
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_vol=true&include_market_cap=true', {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (isMounted && data && data.solana) {
              setStats(prev => ({
                ...prev,
                globalSolanaVolume: data.solana.usd_24h_vol || prev.globalSolanaVolume,
                solanaMarketCap: data.solana.usd_market_cap || prev.solanaMarketCap
              }));
              return; // Sukses! Keluar dari fungsi, tidak perlu coba opsi 2
            }
        }
      } catch (e) {
        // CoinGecko gagal/limit, lanjut ke Opsi 2...
      }

      // OPSI 2: Fallback ke CoinCap API (Jika CoinGecko Gagal)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('https://api.coincap.io/v2/assets/solana', { 
            signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const json = await response.json();
            const data = json.data;
            if (isMounted && data) {
                setStats(prev => ({
                    ...prev,
                    globalSolanaVolume: parseFloat(data.volumeUsd24Hr) || prev.globalSolanaVolume,
                    solanaMarketCap: parseFloat(data.marketCapUsd) || prev.solanaMarketCap
                }));
            }
        }
      } catch (e) {
        // Semua API gagal, biarkan data lama (tidak update)
      }
    };

    const initData = async () => {
        await Promise.allSettled([fetchArenaData(), fetchMarketData()]);
        if (isMounted) setLoading(false);
    };

    initData();

    // Interval Update Cepat (Setiap 15 Detik)
    // Aman karena kita punya backup API jika salah satu kena rate limit
    const marketInterval = setInterval(fetchMarketData, 15000);
    
    // Subscribe ke perubahan real-time pada tabel rooms
    const channel = supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchArenaData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      clearInterval(marketInterval);
    };
  }, []);

  return (
    <section className="border-y border-[#2B3139] bg-[#181A20]/40 backdrop-blur-md relative overflow-hidden">
      <div className="absolute inset-0 bg-[#FCD535]/5 blur-3xl opacity-10 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16 text-center relative z-10">
        
        <StatItem 
          value={loading ? "..." : <AnimatedCounter value={stats.globalSolanaVolume} prefix="$" decimals={0} />} 
          label="Global SOL 24H Volume" 
          icon={<Globe size={24} className="text-[#0ECB81]" />} 
          sub="Real-time Market Data"
        />
        
        <StatItem 
          value={loading ? "..." : <AnimatedCounter value={stats.solanaMarketCap} prefix="$" decimals={0} />} 
          label="Solana Market Cap" 
          icon={<Activity size={24} className="text-[#3b82f6]" />} 
          sub="Global Ecosystem Value"
        />

        <StatItem 
          value={loading ? "..." : <AnimatedCounter value={stats.activeArenas} />} 
          label={t.landing.stats.arenas} 
          icon={<Trophy size={24} className="text-[#FCD535]" />} 
          sub="Live on TradeHub"
        />
        
        <StatItem 
          value="100%" 
          label="Verified Payouts" 
          icon={<ShieldCheck size={24} className="text-[#0ECB81]" />} 
          sub="Smart Contract Secured"
        />
      </div>
    </section>
  );
}

function StatItem({ value, label, icon, sub }: any) {
  return (
    <div className="flex flex-col items-center group relative p-4">
      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#1E2329] rounded-[1.75rem] flex items-center justify-center mb-6 lg:mb-8 shadow-2xl border border-[#2B3139] group-hover:border-[#FCD535]/40 transition-all shadow-inner group-hover:scale-110 group-hover:-rotate-6 duration-500 z-10 relative">
        {icon}
        <div className="absolute inset-0 bg-[#FCD535]/10 rounded-[1.75rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
      <div className="text-2xl lg:text-4xl font-black text-white italic tracking-tighter mb-2 uppercase leading-none group-hover:text-[#FCD535] transition-colors">{value}</div>
      <p className="text-[9px] lg:text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em]">{label}</p>
      {sub && <p className="text-[8px] font-bold text-[#474D57] uppercase tracking-wider mt-1">{sub}</p>}
    </div>
  );
}