"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trophy, 
  ArrowRight, 
  Users, 
  Zap, 
  Loader2, 
  CheckCircle,
  TrendingUp,
  Clock,
  Wallet,
  ShieldCheck,
  LayoutDashboard,
  Plus,
  CreditCard,
  Target,
  BarChart3,
  Rocket,
  Menu,
  X,
  ChevronRight,
  Gift,
  Shield,
  Star,
  BookOpen,
  User,
  Activity,
  Cpu,
  Globe,
  Crown,
  Lock // Import Lock
} from 'lucide-react';

/**
 * MENGGUNAKAN ESM CDN:
 * Menjamin library dimuat dengan stabil di lingkungan preview tanpa node_modules lokal.
 */
import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '../lib/LanguageContext';

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
  access_type?: 'public' | 'private' | 'whitelist'; // Tipe akses real
}

interface GlobalStats {
  totalParticipants: number;
  totalVolume: number;
  activeArenas: number;
}

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [stats, setStats] = useState<GlobalStats>({
    totalParticipants: 0,
    totalVolume: 0,
    activeArenas: 0
  });

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 1. Sinkronisasi Sesi Auth
  useEffect(() => {
    if (!supabase) return; // Guard clause jika supabase belum init

    const getSession = async () => {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  // --- LOGIKA PRIORITAS STATUS ---
  const getStatusPriority = (start: string, end: string, now: Date) => {
    if (now >= new Date(start) && now <= new Date(end)) return 1; // Live
    if (now < new Date(start)) return 2; // Upcoming
    return 3; // Finished
  };

  // 2. Ambil Data Real-Time (DENGAN ERROR HANDLING YANG LEBIH BAIK)
  const fetchData = async () => {
    // Cek dulu apakah Client & URL valid, jika tidak skip fetch (penting saat build time)
    if (!supabase || !supabaseUrl || !supabaseAnonKey) {
        // console.warn("Supabase client not initialized. Skipping fetch."); // Optional log
        setIsLoading(false);
        return;
    }

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_paid', true);

      if (roomError) throw roomError;

      const now = new Date();
      
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

      const { data: partData, error: partError } = await supabase
        .from('participants')
        .select('initial_balance');

      if (partError) throw partError;

      const volume = (partData || []).reduce((acc, curr) => acc + Number(curr.initial_balance || 0), 0);
      
      setStats({
        totalParticipants: partData?.length || 0,
        totalVolume: volume,
        activeArenas: roomData?.length || 0
      });

    } catch (err: any) {
      // Log error sebagai warning agar tidak membingungkan saat build
      // console.warn("Fetch warning (non-critical):", err?.message || err); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    fetchData();
    const roomChannel = supabase.channel('landing-rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchData()).subscribe();
    const partChannel = supabase.channel('landing-parts').on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => fetchData()).subscribe();
    return () => { 
      supabase.removeChannel(roomChannel); 
      supabase.removeChannel(partChannel);
    };
  }, []);

  const getArenaStatusUI = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return { label: t.common.status.upcoming, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    if (now > endDate) return { label: t.common.status.finished, color: "bg-red-500/10 text-red-400 border-red-500/20" };
    return { label: t.common.status.live, color: "bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20", isLive: true };
  };

  const filteredRooms = rooms.filter(room => 
    room.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] font-sans text-[#EAECEF] selection:bg-[#FCD535]/30 relative overflow-x-hidden scroll-smooth">
      
      <style dangerouslySetInnerHTML={{ __html: `
        html { scroll-behavior: smooth !important; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0B0E11; }
        ::-webkit-scrollbar-thumb { background: #2B3139; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #FCD535; }
      `}} />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#FCD535]/5 to-transparent pointer-events-none opacity-40"></div>
      
      <nav className="sticky top-0 z-[100] bg-[#0B0E11]/80 backdrop-blur-xl border-b border-[#2B3139]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg shadow-[#FCD535]/20 group-hover:scale-110 transition-all duration-500 group-hover:rotate-6">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tighter text-[#EAECEF]">TradeHub</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 font-black text-[10px] uppercase tracking-[0.2em] text-[#848E9C]">
            <button onClick={() => safeNavigate('/hall-of-fame')} className="hover:text-[#FCD535] transition-all flex items-center gap-2 group">
              <Star size={14} className="group-hover:fill-[#FCD535] transition-all" /> {t.nav.hall_of_fame}
            </button>
            <button onClick={() => safeNavigate('/handbook')} className="hover:text-[#FCD535] transition-all flex items-center gap-2 group">
              <BookOpen size={14} /> {t.nav.handbook}
            </button>
            <a href="#how-it-works" className="hover:text-[#FCD535] transition-all flex items-center gap-2 group">
              <Target size={14} /> {t.nav.mechanism}
            </a>
            <a href="#competitions" className="hover:text-[#FCD535] transition-all flex items-center gap-2 group">
              <Trophy size={14} /> {t.nav.tournaments}
            </a>
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

            {user ? (
              <div className="flex items-center gap-3">
                <button onClick={() => safeNavigate('/admin/dashboard')} className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-[#1E2329] text-[#FCD535] rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#2B3139] border border-[#FCD535]/20 transition-all active:scale-95 shadow-inner">
                  <Shield size={14} /> {t.common.creator_hub}
                </button>
                <button onClick={() => safeNavigate('/dashboard')} className="hidden lg:flex items-center gap-2 px-6 py-2.5 bg-[#FCD535] text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#F0B90B] transition-all active:scale-95 shadow-xl shadow-[#FCD535]/10">
                  {t.common.dashboard}
                </button>
                <button onClick={() => safeNavigate(`/profile/${user.id}`)} className="p-2.5 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#848E9C] hover:text-[#FCD535] transition-all active:scale-90 group">
                  <User size={20} />
                </button>
              </div>
            ) : (
              <button onClick={() => safeNavigate('/auth')} className="hidden lg:block px-8 py-2.5 bg-[#1E2329] border border-[#2B3139] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#2B3139] transition-all active:scale-95">
                {t.common.login}
              </button>
            )}

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="lg:hidden p-2.5 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#FCD535] active:scale-90 transition-all"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 w-full bg-[#181A20] border-b border-[#2B3139] p-6 animate-in slide-in-from-top-2 duration-300 shadow-2xl z-[110]">
            <div className="flex flex-col gap-6 text-center">
               <button onClick={() => { safeNavigate('/hall-of-fame'); setIsMenuOpen(false); }} className="text-sm font-black uppercase tracking-widest text-[#848E9C] hover:text-[#FCD535] flex items-center justify-center gap-2">
                 <Star size={16} /> {t.nav.hall_of_fame}
               </button>
               <button onClick={() => { safeNavigate('/handbook'); setIsMenuOpen(false); }} className="text-sm font-black uppercase tracking-widest text-[#848E9C] hover:text-[#FCD535] flex items-center justify-center gap-2">
                 <BookOpen size={16} /> {t.nav.handbook}
               </button>
               <a href="#how-it-works" onClick={()=>setIsMenuOpen(false)} className="text-sm font-black uppercase tracking-widest text-[#848E9C] hover:text-[#FCD535] flex items-center justify-center gap-2">
                 <Target size={16} /> {t.nav.mechanism}
               </a>
               <a href="#competitions" onClick={()=>setIsMenuOpen(false)} className="text-sm font-black uppercase tracking-widest text-[#848E9C] hover:text-[#FCD535] flex items-center justify-center gap-2">
                 <Trophy size={16} /> {t.nav.tournaments}
               </a>
               <hr className="border-[#2B3139]" />
               {!user ? (
                 <button onClick={() => safeNavigate('/auth')} className="w-full py-4 bg-[#FCD535] text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">{t.common.start_now}</button>
               ) : (
                 <div className="flex flex-col gap-4">
                    <button onClick={() => safeNavigate('/dashboard')} className="w-full py-4 bg-[#FCD535] text-black rounded-2xl font-black uppercase text-xs tracking-widest">{t.common.dashboard}</button>
                    <button onClick={() => safeNavigate('/admin/dashboard')} className="w-full py-4 bg-[#1E2329] text-[#FCD535] border border-[#FCD535]/20 rounded-2xl font-black uppercase text-xs tracking-widest">{t.common.creator_hub}</button>
                 </div>
               )}
            </div>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-20 lg:pt-32 pb-24 lg:pb-48 overflow-hidden text-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:30px_30px] lg:bg-[size:50px_50px] opacity:10 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCD535] rounded-full blur-[180px] opacity-[0.05]"></div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FCD535]/10 text-[#FCD535] rounded-full font-black text-[9px] lg:text-[10px] uppercase tracking-[0.25em] mb-10 border border-[#FCD535]/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Activity size={14} /> {t.landing.tag}
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-9xl font-black text-white tracking-tighter mb-8 lg:mb-12 leading-[0.95] lg:leading-[0.85] italic animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {t.landing.title_1} <br className="hidden sm:block"/>
            <span className="text-[#FCD535]">{t.landing.title_2}</span>
          </h1>
          <p className="text-sm lg:text-lg text-[#848E9C] mb-12 lg:mb-16 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 px-4 italic">
            {t.landing.desc}
          </p>
          <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
              <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto px-4 sm:px-0">
                 {/* Tombol Buat Lomba dikembalikan menjadi Primary (Kuning) */}
                 <button onClick={() => safeNavigate('/buat-lomba')} className="w-full sm:w-auto px-12 py-5 bg-[#FCD535] text-black rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-[#F0B90B] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-2xl shadow-[#FCD535]/20 group">
                    {t.landing.cta_create} <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                 </button>
                 <button onClick={() => safeNavigate('/hall-of-fame')} className="w-full sm:w-auto px-12 py-5 bg-[#1E2329] text-white border border-[#2B3139] rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-[#2B3139] hover:border-[#474D57] transition-all flex items-center justify-center gap-3 active:scale-95">
                    {t.landing.cta_rank} <Star size={20} />
                 </button>
              </div>
              <p className="text-[9px] font-black text-[#474D57] uppercase tracking-[0.4em] flex items-center gap-2">
                 <ShieldCheck size={12} className="text-[#0ECB81]" /> {t.landing.audit}
              </p>
          </div>
        </div>
      </header>

      {/* --- STATS SECTION --- */}
      <section className="border-y border-[#2B3139] bg-[#181A20]/40 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16 text-center">
          <StatItem value={`${stats.totalVolume.toFixed(1)} SOL`} label={t.landing.stats.volume} icon={<TrendingUp size={24} className="text-[#0ECB81]" />} />
          <StatItem value={stats.totalParticipants.toLocaleString()} label={t.landing.stats.traders} icon={<Users size={24} className="text-[#3b82f6]" />} />
          <StatItem value={stats.activeArenas.toString()} label={t.landing.stats.arenas} icon={<Trophy size={24} className="text-[#FCD535]" />} />
          <StatItem value="100%" label={t.landing.stats.verified} icon={<ShieldCheck size={24} className="text-[#0ECB81]" />} />
        </div>
      </section>

      {/* --- POWERED BY SECTION --- */}
      <section className="py-20 lg:py-28 bg-[#0B0E11] border-b border-[#2B3139] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
           <div className="flex flex-col items-center gap-12">
              <div className="flex items-center gap-4">
                 <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#474D57]"></div>
                 <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#474D57] whitespace-nowrap">{t.landing.powered}</p>
                 <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#474D57]"></div>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-24 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                 <PartnerLogo name="Solana" img="/solana.png" />
                 <PartnerLogo name="Alchemy" img="/alchemy.jpeg" />
                 <PartnerLogo name="Phantom" img="/phantom.png" />
                 <PartnerLogo name="Helius" img="/helius.png" fallbackIcon={<Cpu size={24}/>} />
              </div>
           </div>
        </div>
      </section>

      {/* --- MECHANISM SECTION --- */}
      <section id="how-it-works" className="py-28 lg:py-48 bg-[#0B0E11] border-b border-[#2B3139] relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24 lg:mb-32 px-4">
            <h2 className="text-[10px] font-black text-[#FCD535] uppercase tracking-[0.5em] mb-4">{t.landing.mechanism.title_small}</h2>
            <p className="text-4xl lg:text-6xl font-black text-white italic uppercase tracking-tighter leading-none">{t.landing.mechanism.title_big}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
            <StepCard num="01" icon={<Target className="text-[#3b82f6]" />} title={t.landing.mechanism.step1} desc={t.landing.mechanism.desc1} />
            <StepCard num="02" icon={<BarChart3 className="text-[#0ECB81]" />} title={t.landing.mechanism.step2} desc={t.landing.mechanism.desc2} />
            <StepCard num="03" icon={<Rocket className="text-[#FCD535]" />} title={t.landing.mechanism.step3} desc={t.landing.mechanism.desc3} />
          </div>
        </div>
      </section>

      {/* --- ARENA GRID --- */}
      <section id="competitions" className="py-28 lg:py-48 bg-[#0B0E11] relative">
        <div className="max-w-7xl mx-auto px-6">
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
                className="w-full pl-16 pr-6 py-5 bg-[#1E2329] border border-[#2B3139] rounded-[1.5rem] text-sm font-bold focus:border-[#FCD535] outline-none transition-all shadow-inner placeholder:text-[#474D57]" 
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-8">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-[#FCD535] animate-spin opacity-20" />
                <TrendingUp className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#FCD535] w-6 h-6" />
              </div>
              <p className="text-[#848E9C] font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">{t.common.syncing}</p>
            </div>
          ) : (
            <>
              {/* GRID TERBATAS HANYA 2 ITEM (1 BARIS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 lg:gap-12">
                {filteredRooms.length === 0 ? (
                  <div className="col-span-full py-32 text-center text-[#474D57] font-black uppercase tracking-widest text-xs italic opacity-30">{t.landing.active_arenas.no_arena}</div>
                ) : (
                  filteredRooms.slice(0, 2).map((room) => {
                    const status = getArenaStatusUI(room.start_time, room.end_time);
                    return (
                      <div 
                        key={room.id} 
                        onClick={() => safeNavigate(`/lomba/${room.id}`)} 
                        className={`group bg-[#1E2329] rounded-[2.5rem] border ${room.is_boosted ? 'border-[#FCD535] shadow-[0_0_30px_rgba(252,213,53,0.1)]' : 'border-[#2B3139]'} p-8 lg:p-10 hover:border-[#FCD535]/50 transition-all duration-700 cursor-pointer shadow-2xl flex flex-col h-full hover:-translate-y-3 relative overflow-hidden`}
                      >
                        {/* --- LOGIKA BADGE REAL (PERBAIKAN DISINI) --- */}
                        <div className="absolute top-0 right-0 z-10 flex flex-col items-end">
                           {/* 1. Badge Featured (Boosted) */}
                           {room.is_boosted && (
                              <div className="bg-[#FCD535] text-black text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 mb-[1px] shadow-sm">
                                 <Rocket size={12} /> {t.common.featured}
                              </div>
                           )}
                           
                           {/* 2. Badge Private (Kunci) - HANYA JIKA access_type = private */}
                           {room.access_type === 'private' && (
                              <div className="bg-[#F6465D] text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 shadow-sm">
                                 <Lock size={12} /> {t.common.private}
                              </div>
                           )}
                           
                           {/* 3. Badge Whitelist (User) - HANYA JIKA access_type = whitelist */}
                           {room.access_type === 'whitelist' && (
                              <div className="bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl flex items-center gap-2 shadow-sm">
                                 <Users size={12} /> {t.common.whitelist}
                              </div>
                           )}
                        </div>

                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535]/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-10 mt-2">
                          <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform ${room.is_boosted ? 'bg-[#FCD535] text-black' : 'bg-[#0B0E11] text-[#FCD535] border border-[#2B3139]'}`}>
                            <Trophy size={28} />
                          </div>
                          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg ${status.color} flex items-center gap-2`}>
                             {status.isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-ping"></span>}
                             {status.label}
                          </div>
                        </div>
                        <h3 className="text-2xl lg:text-3xl font-black text-white mb-6 uppercase italic line-clamp-2 tracking-tighter leading-[0.9] group-hover:text-[#FCD535] transition-colors">{room.title}</h3>
                        <p className="text-xs text-[#848E9C] font-medium leading-relaxed line-clamp-3 mb-12 flex-1 italic">{room.description || t.landing.active_arenas.default_desc}</p>
                        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-[#2B3139]">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black text-[#474D57] uppercase tracking-widest">{t.common.rewards}</span>
                            <span className="text-lg font-black text-[#FCD535] italic truncate leading-none">{room.reward || "TBA"}</span>
                          </div>
                          <div className="flex flex-col gap-1.5 text-right">
                            <span className="text-[9px] font-black text-[#474D57] uppercase tracking-widest">{t.common.capital_req}</span>
                            <span className="text-lg font-black text-white font-mono leading-none">{room.min_balance} SOL</span>
                          </div>
                        </div>
                        <div className="mt-10 w-full py-5 bg-[#0B0E11] rounded-[1.25rem] flex items-center justify-center gap-3 border border-[#2B3139] group-hover:bg-[#2B3139] group-hover:border-[#FCD535]/30 transition-all shadow-inner">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-[#FCD535] transition-all">{t.common.enter_arena}</span>
                          <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform text-[#474D57] group-hover:text-[#FCD535]" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* TOMBOL EKSPLORASI - Selalu tampil dibawah daftar arena */}
              <div className="mt-20 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
                 {filteredRooms.length > 2 && (
                   <div className="mb-6 p-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl flex items-center gap-4 shadow-xl">
                      <div className="w-10 h-10 rounded-xl bg-[#FCD535]/10 flex items-center justify-center text-[#FCD535] border border-[#FCD535]/20">
                         <Search size={18} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#848E9C]">{t.landing.active_arenas.more.replace('{count}', (filteredRooms.length - 2).toString())}</p>
                   </div>
                 )}
                 {/* TOMBOL EXPLORE ARENAS BARU (Menggantikan yang transparan sebelumnya) */}
                 <button 
                   onClick={() => safeNavigate('/arenas')} 
                   className="px-12 py-6 bg-[#FCD535] text-black rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-[#F0B90B] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-2xl shadow-[#FCD535]/20 group"
                 >
                    EXPLORE ARENAS <Trophy size={20} className="group-hover:rotate-12 transition-transform" />
                 </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#181A20] py-20 lg:py-32 border-t border-[#2B3139] relative overflow-hidden text-center md:text-left">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FCD535]/30 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#FCD535] rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-[#FCD535]/20 cursor-pointer hover:rotate-12 transition-transform" onClick={() => safeNavigate('/')}><TrendingUp className="text-black w-8 h-8" /></div>
            <div>
              <p className="font-black text-2xl uppercase italic leading-none text-white tracking-tighter">TradeHub</p>
              <p className="text-[10px] text-[#474D57] font-black uppercase tracking-[0.4em] mt-2 italic">{t.landing.footer.network_protocol}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-8 lg:gap-12 text-[11px] font-black uppercase tracking-widest text-[#474D57]">
              <button onClick={() => safeNavigate('/hall-of-fame')} className="hover:text-[#FCD535] transition-all flex items-center gap-2 group">
                <Star size={14} className="group-hover:fill-current" /> Hall of Fame
              </button>
              <button onClick={() => safeNavigate('/handbook')} className="hover:text-[#FCD535] transition-all flex items-center gap-2">
                <BookOpen size={14} /> Handbook
              </button>
              <button onClick={() => safeNavigate('/dashboard')} className="hover:text-[#FCD535] transition-all flex items-center gap-2">
                <LayoutDashboard size={14} /> {t.nav.portfolio}
              </button>
          </div>
          <div className="space-y-4">
            <p className="text-[#474D57] text-[10px] font-black uppercase tracking-[0.2em]">{t.landing.footer.copyright}</p>
            <div className="flex justify-center md:justify-end gap-6 text-[10px] font-black uppercase text-[#474D57]">
               <a href="https://twitter.com/TradeHub_SOL" className="hover:text-white transition-colors">Twitter</a>
               <a href="https://discord.gg/zKjFNZdM" className="hover:text-white transition-colors">Discord</a>
               <a href="https://t.me/tradehub_proofofachievement" className="hover:text-white transition-colors">Telegram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- SUB KOMPONEN ---

function StatItem({ value, label, icon }: any) {
  return (
    <div className="flex flex-col items-center group relative">
      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#1E2329] rounded-[1.75rem] flex items-center justify-center mb-6 lg:mb-8 shadow-2xl border border-[#2B3139] group-hover:border-[#FCD535]/40 transition-all shadow-inner group-hover:scale-110 group-hover:-rotate-3 duration-500">
        {icon}
      </div>
      <p className="text-3xl lg:text-5xl font-black text-white italic tracking-tighter mb-2 uppercase leading-none">{value}</p>
      <p className="text-[8px] lg:text-[9px] font-black text-[#474D57] uppercase tracking-[0.4em] italic">{label}</p>
    </div>
  );
}

function StepCard({ num, icon, title, desc }: any) {
  return (
    <div className="bg-[#1E2329] p-10 lg:p-14 rounded-[3rem] border border-[#2B3139] relative group hover:border-[#FCD535]/30 transition-all shadow-2xl text-center md:text-left overflow-hidden">
       <div className="absolute -top-6 -right-6 text-7xl lg:text-9xl font-black text-white/5 italic leading-none group-hover:text-[#FCD535]/5 transition-colors">{num}</div>
       <div className="w-16 h-16 bg-[#0B0E11] mx-auto md:mx-0 rounded-[1.5rem] flex items-center justify-center mb-10 lg:mb-12 border border-[#2B3139] shadow-inner group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">{icon}</div>
       <h3 className="text-xl lg:text-2xl font-black text-white uppercase italic mb-5 leading-tight tracking-tight">{title}</h3>
       <p className="text-xs lg:text-sm text-[#848E9C] leading-relaxed font-medium italic">{desc}</p>
    </div>
  );
}

function PartnerLogo({ name, img, fallbackIcon }: { name: string, img: string, fallbackIcon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 group/logo">
       <div className="w-10 h-10 bg-[#1E2329] rounded-xl flex items-center justify-center border border-[#2B3139] group-hover/logo:border-[#FCD535]/30 transition-all shadow-inner">
          <img 
            src={img} 
            alt={`${name} Logo`} 
            className="w-6 h-6 object-contain" 
            onError={(e) => {
              (e.target as any).style.display = 'none';
              (e.target as any).nextSibling.style.display = 'flex';
            }}
          />
          <div style={{display: 'none'}} className="w-full h-full flex items-center justify-center text-[#848E9C]">
              {fallbackIcon || <Globe size={18}/>}
          </div>
       </div>
       <span className="font-black text-sm lg:text-base tracking-tighter text-[#848E9C] group-hover/logo:text-white transition-colors uppercase italic">{name}</span>
    </div>
  );
}