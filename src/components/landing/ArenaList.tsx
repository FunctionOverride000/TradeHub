"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { createClient } from '@/lib/supabase';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { 
  Search, Loader2, TrendingUp, Rocket, Lock, 
  Users, Trophy, ArrowRight 
} from 'lucide-react';

interface Room {
  id: string;
  title: string;
  description: string;
  reward: string;
  min_balance: number;
  creator_wallet: string;
  start_time: string;
  end_time: string;
  is_premium: boolean;
  created_at: string;
  is_paid: boolean;
  is_boosted?: boolean; 
  access_type?: 'public' | 'private' | 'whitelist';
}

export function ArenaList() {
  const { t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const safeNavigate = (path: string) => {
    router.push(path);
  };

  const getArenaStatusUI = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return { label: t.common.status.upcoming, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    if (now > endDate) return { label: t.common.status.finished, color: "bg-red-500/10 text-red-400 border-red-500/20" };
    return { label: t.common.status.live, color: "bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20", isLive: true };
  };

  const fetchData = async () => {
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_paid', true);

      if (roomError) throw roomError;

      const sortedRooms = (roomData || []).sort((a, b) => {
        if (a.is_boosted !== b.is_boosted) return (a.is_boosted ? -1 : 1);
        const getStatusPriority = (start: string, end: string) => {
           const n = new Date(); const s = new Date(start); const e = new Date(end);
           if (n >= s && n <= e) return 1; if (n < s) return 2; return 3;
        };
        const statusA = getStatusPriority(a.start_time, a.end_time);
        const statusB = getStatusPriority(b.start_time, b.end_time);
        if (statusA !== statusB) return statusA - statusB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRooms(sortedRooms);
    } catch (err) {
      // Silent error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const roomChannel = supabase.channel('landing-rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchData()).subscribe();
    return () => { 
        supabase.removeChannel(roomChannel); 
    };
  }, []);

  const filteredRooms = rooms.filter(room => 
    room.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section id="competitions" className="py-28 lg:py-48 bg-[#0B0E11] relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 lg:mb-24 gap-10">
          <div className="px-4 md:px-0">
            <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tight mb-4 uppercase italic leading-none">{t.landing.active_arenas.title}</h2>
            <p className="text-[#848E9C] text-sm lg:text-base font-medium tracking-wide italic mt-4">{t.landing.active_arenas.subtitle}</p>
          </div>
          <div className="relative group w-full md:w-96 px-4 md:px-0">
            <Search className="absolute left-10 md:left-6 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder={t.landing.active_arenas.search} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-16 pr-6 py-5 bg-[#1E2329] border border-[#2B3139] rounded-[1.5rem] text-sm font-bold focus:border-[#FCD535] outline-none transition-all shadow-inner placeholder:text-[#474D57] group-hover:border-[#474D57]" 
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-8">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-[#FCD535] animate-spin opacity-20" />
              <TrendingUp className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#FCD535] w-6 h-6 animate-pulse" />
            </div>
            <p className="text-[#848E9C] font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">{t.common.syncing}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 lg:gap-12">
              {filteredRooms.length === 0 ? (
                <div className="col-span-full py-32 text-center text-[#474D57] font-black uppercase tracking-widest text-xs italic opacity-30">{t.landing.active_arenas.no_arena}</div>
              ) : (
                filteredRooms.slice(0, 2).map((room) => {
                  const status = getArenaStatusUI(room.start_time, room.end_time);
                  return (
                    <SpotlightCard 
                      key={room.id} 
                      isBoosted={room.is_boosted}
                      onClick={() => safeNavigate(`/arena/${room.id}`)} 
                      className="p-8 lg:p-10 flex flex-col h-full cursor-pointer hover:-translate-y-2 group"
                    >
                      <div className="absolute top-0 right-0 z-10 flex flex-col items-end">
                         {room.is_boosted && (
                           <div className="bg-[#FCD535] text-black text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 mb-[1px] shadow-lg shadow-[#FCD535]/20">
                               <Rocket size={12} /> {t.common.featured}
                           </div>
                         )}
                         {room.access_type === 'private' && (
                           <div className="bg-[#F6465D] text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 shadow-sm">
                               <Lock size={12} /> {t.common.private}
                           </div>
                         )}
                         {room.access_type === 'whitelist' && (
                           <div className="bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 shadow-sm">
                               <Users size={12} /> {t.common.whitelist}
                           </div>
                         )}
                      </div>

                      <div className="flex justify-between items-start mb-10 mt-2 relative z-10">
                        <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform duration-500 ${room.is_boosted ? 'bg-[#FCD535] text-black' : 'bg-[#0B0E11] text-[#FCD535] border border-[#2B3139]'}`}>
                          <Trophy size={28} />
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg ${status.color} flex items-center gap-2 backdrop-blur-sm`}>
                           {status.isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-ping"></span>}
                           {status.label}
                        </div>
                      </div>

                      <h3 className="text-2xl lg:text-3xl font-black text-white mb-6 uppercase italic line-clamp-2 tracking-tighter leading-[0.9] group-hover:text-[#FCD535] transition-colors relative z-10">{room.title}</h3>
                      <p className="text-xs text-[#848E9C] font-medium leading-relaxed line-clamp-3 mb-12 flex-1 italic relative z-10">{room.description || t.landing.active_arenas.default_desc}</p>
                      
                      <div className="grid grid-cols-2 gap-6 pt-8 border-t border-[#2B3139]/50 relative z-10">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-black text-[#474D57] uppercase tracking-widest">{t.common.rewards}</span>
                          <span className="text-lg font-black text-[#FCD535] italic truncate leading-none drop-shadow-sm">{room.reward || "TBA"}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 text-right">
                          <span className="text-[9px] font-black text-[#474D57] uppercase tracking-widest">{t.common.capital_req}</span>
                          <span className="text-lg font-black text-white font-mono leading-none">{room.min_balance} SOL</span>
                        </div>
                      </div>

                      <div className="mt-10 w-full py-5 bg-[#0B0E11] rounded-[1.25rem] flex items-center justify-center gap-3 border border-[#2B3139] group-hover:bg-[#2B3139] group-hover:border-[#FCD535]/30 transition-all shadow-inner relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-[#FCD535] transition-all">{t.common.enter_arena}</span>
                        <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform text-[#474D57] group-hover:text-[#FCD535]" />
                      </div>
                    </SpotlightCard>
                  );
                })
              )}
            </div>

            <div className="mt-20 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
                {filteredRooms.length > 2 && (
                  <div className="mb-6 p-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl flex items-center gap-4 shadow-xl">
                     <div className="w-10 h-10 rounded-xl bg-[#FCD535]/10 flex items-center justify-center text-[#FCD535] border border-[#FCD535]/20">
                        <Search size={18} />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#848E9C]">{t.landing.active_arenas.more.replace('{count}', (filteredRooms.length - 2).toString())}</p>
                  </div>
                )}
                <button 
                  onClick={() => safeNavigate('/arenas')} 
                  className="px-12 py-6 bg-[#FCD535] text-black rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-[#ffe066] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-2xl shadow-[#FCD535]/20 group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-4">EXPLORE ARENAS <Trophy size={20} className="group-hover:rotate-12 transition-transform" /></span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"></div>
                </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}