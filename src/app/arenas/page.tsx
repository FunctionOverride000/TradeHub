"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trophy, 
  ArrowLeft, 
  Loader2, 
  TrendingUp, 
  Clock, 
  Zap, 
  Filter, 
  ArrowRight, 
  ShieldCheck, 
  Activity, 
  User, 
  Star, 
  BookOpen, 
  LayoutDashboard, 
  ChevronRight, 
  Globe, 
  Rocket, 
  Crown,  
  Lock,   
  Users,
  Ticket // Menambahkan Import Ticket
} from 'lucide-react';

/**
 * MENGGUNAKAN ESM CDN:
 * Menjamin library dimuat dengan stabil di lingkungan preview tanpa node_modules lokal.
 */
import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '../../lib/LanguageContext';

// --- KONFIGURASI SUPABASE ---
// Gunakan nilai default kosong jika env var tidak ada (untuk build safety)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Hanya inisialisasi client jika URL & Key valid
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
  entry_fee?: number; // Pastikan field ini ada
  participants_count?: number;
}

/**
 * PROPS DEFINITION FOR NEXT.JS 15:
 * Menambahkan tipe props eksplisit untuk memuaskan validator rute Next.js.
 */
interface PageProps {
  params: Promise<any>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function ArenasExplorer(props: PageProps) {
  // Unused props but declared to satisfy Next.js 15 type validation
  const _params = React.use(props.params);
  const _searchParams = React.use(props.searchParams);

  const { t, language, setLanguage } = useLanguage();
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

  // --- LOGIKA PRIORITAS STATUS (Sama seperti Lobby) ---
  const getStatusPriority = (start: string, end: string, now: Date) => {
    if (now >= new Date(start) && now <= new Date(end)) return 1; // Live
    if (now < new Date(start)) return 2; // Upcoming
    return 3; // Finished
  };

  const fetchData = async () => {
    // 1. Safety Check: Jika supabase client tidak ada (misal saat build tanpa env), stop.
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

      // --- SORTING LOGIC: Boosted -> Status -> CreatedAt ---
      const sortedRooms = (roomData || []).sort((a, b) => {
        // 1. Boosted First
        if (a.is_boosted !== b.is_boosted) {
            return (a.is_boosted ? -1 : 1);
        }
        // 2. Status Priority
        const statusA = getStatusPriority(a.start_time, a.end_time, now);
        const statusB = getStatusPriority(b.start_time, b.end_time, now);
        if (statusA !== statusB) return statusA - statusB;
        // 3. Created At
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRooms(sortedRooms);
    } catch (err: any) {
      // 2. Error Handling yang aman (Warning instead of Error)
      // console.warn("Fetch warning (non-critical):", err?.message || err);
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
            {/* Language Switcher */}
            <div className="flex items-center gap-2 bg-[#1E2329] border border-[#2B3139] rounded-xl p-1">
              <button
                onClick={() => setLanguage('id')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  language === 'id' 
                    ? 'bg-[#FCD535] text-black' 
                    : 'text-[#848E9C] hover:text-white'
                }`}
              >
                ID
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  language === 'en' 
                    ? 'bg-[#FCD535] text-black' 
                    : 'text-[#848E9C] hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
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
           <FilterButton active={filter === 'upcoming'} onClick={() => setFilter('upcoming')} label={t.common.status.mendatang} count={rooms.filter(r => getArenaStatus(r.start_time, r.end_time).label === t.common.status.upcoming).length} />
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
              filteredRooms.map((room, idx) => {
                const status = getArenaStatus(room.start_time, room.end_time);
                return (
                  <div 
                    key={room.id} 
                    onClick={() => safeNavigate(`/lomba/${room.id}`)} 
                    className={`group bg-[#1E2329] rounded-[2.5rem] border ${room.is_boosted ? 'border-[#FCD535] shadow-[0_0_30px_rgba(252,213,53,0.1)]' : 'border-[#2B3139]'} p-8 lg:p-10 hover:border-[#FCD535]/50 transition-all duration-700 cursor-pointer shadow-2xl flex flex-col h-full hover:-translate-y-3 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* --- BADGES (FEATURED / PRIVATE / WHITELIST) --- */}
                    <div className="absolute top-0 right-0 z-10 flex flex-col items-end">
                       {room.is_boosted && (
                          <div className="bg-[#FCD535] text-black text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 mb-[1px] shadow-sm">
                             <Rocket size={12} /> Featured
                          </div>
                       )}
                       {room.access_type === 'private' && (
                          <div className="bg-[#F6465D] text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 shadow-sm">
                             <Lock size={12} /> Private
                          </div>
                       )}
                       {room.access_type === 'whitelist' && (
                          <div className="bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 shadow-sm">
                             <Users size={12} /> Whitelist
                          </div>
                       )}
                    </div>

                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex justify-between items-start mb-10">
                      <div className={`w-12 h-12 bg-[#0B0E11] rounded-2xl flex items-center justify-center text-[#FCD535] border border-[#2B3139] shadow-inner group-hover:rotate-6 transition-transform`}>
                        <Trophy size={24} />
                      </div>
                      <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${status.color} flex items-center gap-2`}>
                         {status.isLive && <span className="inline-block w-1 h-1 rounded-full bg-[#0ECB81] animate-ping"></span>}
                         {status.label}
                      </div>
                    </div>
                    
                    <h3 className="text-xl lg:text-2xl font-black text-white mb-4 uppercase italic line-clamp-1 tracking-tighter group-hover:text-[#FCD535] transition-colors">{room.title}</h3>
                    
                    {/* IMPLEMENTASI BADGE TIKET (ENTRY FEE) */}
                    {room.entry_fee && room.entry_fee > 0 ? (
                        <div className="mb-6 inline-flex bg-[#FCD535]/10 text-[#FCD535] border border-[#FCD535]/20 px-3 py-1 rounded-lg text-[10px] font-bold items-center gap-1">
                            <Ticket size={12} /> Entry: {room.entry_fee} SOL
                        </div>
                    ) : (
                        <p className="text-xs text-[#848E9C] font-medium leading-relaxed line-clamp-3 mb-10 flex-1 italic">{room.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#2B3139]">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-[#474D57] uppercase tracking-widest mb-1">{t.explorer.rewards}</span>
                        <span className="text-base font-black text-[#FCD535] italic truncate leading-none">{room.reward}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] font-black text-[#474D57] uppercase tracking-widest mb-1">{t.explorer.entry}</span>
                        <span className="text-base font-black text-white font-mono leading-none">{room.min_balance} SOL</span>
                      </div>
                    </div>
                    
                    <div className="mt-8 w-full py-4 bg-[#0B0E11] rounded-2xl flex items-center justify-center gap-2 border border-[#2B3139] group-hover:bg-[#2B3139] group-hover:border-[#FCD535]/30 transition-all shadow-inner">
                      {/* PERBAIKAN: Menggunakan text hardcoded 'ENTER ARENA' karena key enter_btn tidak ada di types */}
                      <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-[#FCD535]">ENTER ARENA</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })
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