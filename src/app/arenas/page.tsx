"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ArrowLeft, 
  Loader2, 
  TrendingUp, 
  Globe
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '../../lib/LanguageContext';
import ArenaCard from '../../components/arenas/ArenaCard';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

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
  entry_fee?: number; 
  participants_count?: number;
}

interface PageProps {
  params: Promise<any>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function ArenasExplorer(props: PageProps) {
  const _params = React.use(props.params);
  const _searchParams = React.use(props.searchParams);

  const { t } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'finished'>('all');
  const [user, setUser] = useState<any>(null);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  useEffect(() => {
    if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    }
  }, []);

  const getStatusPriority = (start: string, end: string, now: Date) => {
    if (now >= new Date(start) && now <= new Date(end)) return 1; 
    if (now < new Date(start)) return 2; 
    return 3; 
  };

  const fetchData = async () => {
    if (!supabase) {
        setIsLoading(false);
        return;
    }

    try {
      const { data: roomData, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_paid', true);

      if (error) throw error;

      const now = new Date();

      const sortedRooms = (roomData || []).sort((a, b) => {
        if (a.is_boosted !== b.is_boosted) {
            return (a.is_boosted ? -1 : 1);
        }
        const statusA = getStatusPriority(a.start_time, a.end_time, now);
        const statusB = getStatusPriority(b.start_time, b.end_time, now);
        if (statusA !== statusB) return statusA - statusB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRooms(sortedRooms);
    } catch (err: any) {
       // Silent error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getArenaStatus = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return { label: t.common.status.upcoming, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    if (now > endDate) return { label: t.common.status.finished, color: "bg-red-500/10 text-red-400 border-red-500/20" };
    return { label: t.common.status.live, color: "bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20", isLive: true };
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.title.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getArenaStatus(room.start_time, room.end_time);
    
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && status.label === 'Live') ||
      (filter === 'upcoming' && status.label === 'Upcoming') ||
      (filter === 'finished' && status.label === 'Finished');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#0B0E11] font-sans text-[#EAECEF] selection:bg-[#FCD535]/30 relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-[100] bg-[#0B0E11]/80 backdrop-blur-xl border-b border-[#2B3139]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-all duration-500">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tighter text-[#EAECEF]">TradeHub</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => safeNavigate('/')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-[#848E9C] hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
            >
              <ArrowLeft size={14} /> {t.common.back}
            </button>
            {user ? (
              <button onClick={() => safeNavigate('/dashboard')} className="px-6 py-2.5 bg-[#FCD535] text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#F0B90B] transition-all shadow-xl shadow-[#FCD535]/10">
                {t.common.dashboard}
              </button>
            ) : (
              <button onClick={() => safeNavigate('/auth')} className="px-8 py-2.5 bg-[#1E2329] border border-[#2B3139] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#2B3139] transition-all">
                {t.common.login}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="animate-in slide-in-from-left-4 duration-700">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FCD535]/10 text-[#FCD535] rounded-full font-black text-[9px] uppercase tracking-widest mb-4 border border-[#FCD535]/20">
                <Globe size={12} /> {t.explorer.subtitle}
             </div>
             <h1 className="text-4xl lg:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">{t.explorer.title} <span className="text-[#FCD535]">Arenas</span></h1>
          </div>

          {/* Search Box */}
          <div className="relative group w-full md:w-96 animate-in slide-in-from-right-4 duration-700">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors" size={20} />
             <input 
               type="text" 
               placeholder={t.explorer.search_placeholder} 
               value={searchTerm} 
               onChange={(e) => setSearchTerm(e.target.value)} 
               className="w-full pl-16 pr-6 py-5 bg-[#1E2329] border border-[#2B3139] rounded-[1.5rem] text-sm font-bold focus:border-[#FCD535] outline-none transition-all shadow-inner placeholder:text-[#474D57]" 
             />
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="flex bg-[#1E2329]/50 p-1.5 rounded-[1.5rem] border border-[#2B3139] mb-12 overflow-x-auto no-scrollbar w-fit animate-in fade-in duration-1000">
           <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label={t.explorer.all_arenas} count={rooms.length} />
           <FilterButton active={filter === 'active'} onClick={() => setFilter('active')} label={t.common.status.live} count={rooms.filter(r => getArenaStatus(r.start_time, r.end_time).label === t.common.status.live).length} />
           <FilterButton active={filter === 'upcoming'} onClick={() => setFilter('upcoming')} label={t.common.status.upcoming} count={rooms.filter(r => getArenaStatus(r.start_time, r.end_time).label === t.common.status.upcoming).length} />
           <FilterButton active={filter === 'finished'} onClick={() => setFilter('finished')} label={t.common.status.finished} count={rooms.filter(r => getArenaStatus(r.start_time, r.end_time).label === t.common.status.finished).length} />
        </div>

        {/* Grid Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin opacity-30" />
            <p className="text-[#848E9C] font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">{t.explorer.syncing}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {filteredRooms.length === 0 ? (
              <div className="col-span-full py-40 text-center flex flex-col items-center gap-6 bg-[#1E2329]/20 rounded-[3rem] border border-[#2B3139] border-dashed">
                 <Search size={48} className="text-[#2B3139]" />
                 <div className="space-y-1">
                   <p className="text-white font-black uppercase italic tracking-widest">{t.explorer.not_found}</p>
                   <p className="text-[#848E9C] text-xs font-medium italic">{t.explorer.not_found_desc}</p>
                 </div>
              </div>
            ) : (
              filteredRooms.map((room, idx) => (
                 <ArenaCard 
                    key={room.id}
                    room={room}
                    index={idx}
                    status={getArenaStatus(room.start_time, room.end_time)}
                    t={t}
                    onClick={() => safeNavigate(`/arena/${room.id}`)}
                 />
              ))
            )}
          </div>
        )}
      </main>

      {/* --- FOOTER --- */}
      <footer className="py-20 text-center opacity-20 border-t border-[#2B3139]/30">
          <p className="text-[10px] font-black uppercase tracking-[1.5em] italic">{t.explorer.footer}</p>
      </footer>
    </div>
  );
}

function FilterButton({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count: number }) {
  return (
    <button 
      onClick={onClick} 
      className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${active ? 'bg-[#2B3139] text-[#FCD535] shadow-lg border border-[#FCD535]/10' : 'text-[#848E9C] hover:text-white'}`}
    >
      {label}
      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${active ? 'bg-[#FCD535] text-black' : 'bg-[#0B0E11] text-[#474D57]'}`}>{count}</span>
    </button>
  );
}