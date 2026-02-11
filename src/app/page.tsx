"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  Lock,
  ArrowUpRight,
  Link2
} from 'lucide-react';

// FIX: Import helper client yang benar (Cookie-based)
import { createClient } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';
import { useRouter } from 'next/navigation';

// --- TYPE DEFINITIONS ---
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

interface GlobalStats {
  activeArenas: number;
  globalSolanaVolume: number; 
  globalActiveTraders: number; 
}

// --- UTILS COMPONENT: SPOTLIGHT CARD ---
const SpotlightCard = ({ children, className = "", onClick, isBoosted = false }: any) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden rounded-[2.5rem] bg-[#1E2329] border border-[#2B3139] transition-all duration-300 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${isBoosted ? 'rgba(252, 213, 53, 0.15)' : 'rgba(255, 255, 255, 0.06)'}, transparent 40%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
};

// --- UTILS COMPONENT: ANIMATED COUNTER ---
const AnimatedCounter = ({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalDuration = 2000;
    const incrementTime = 16; 
    const steps = totalDuration / incrementTime;
    const increment = end / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setDisplayValue(start);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  const formatted = new Intl.NumberFormat('en-US', { 
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals 
  }).format(displayValue);

  return <span>{prefix}{formatted}{suffix}</span>;
};

export default function LandingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  // Init client supabase
  const supabase = createClient();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // State untuk Navbar Scroll Logic
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Global stats (simulated Solana data)
  const [stats, setStats] = useState<GlobalStats>({
    activeArenas: 0,
    globalSolanaVolume: 2450000000, 
    globalActiveTraders: 15400000, 
  });

  const safeNavigate = (path: string) => {
    router.push(path);
  };

  // 1. Auth Sync - Cek user session saat load
  useEffect(() => {
    const getSession = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Navbar scroll logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // 3. Data fetching
  const fetchData = async () => {
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_paid', true);

      if (roomError) throw roomError;

      const now = new Date();
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

      const randomVolFluctuation = Math.floor(Math.random() * 50000000);
      const randomUserFluctuation = Math.floor(Math.random() * 5000);

      setStats(prev => ({
        activeArenas: roomData?.length || 0,
        globalSolanaVolume: 2450000000 + randomVolFluctuation, 
        globalActiveTraders: 15400000 + randomUserFluctuation 
      }));

    } catch (err) {
      // Silent error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        globalSolanaVolume: prev.globalSolanaVolume + Math.floor(Math.random() * 100000 - 40000),
        globalActiveTraders: prev.globalActiveTraders + Math.floor(Math.random() * 10 - 2)
      }));
    }, 5000);

    const roomChannel = supabase.channel('landing-rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchData()).subscribe();
    return () => { 
        clearInterval(interval);
        supabase.removeChannel(roomChannel); 
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
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-10px) rotate(45deg); }
        }
        .animate-chain-float { animation: float 4s ease-in-out infinite; }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        .animate-pulse-glow { animation: pulse-glow 6s ease-in-out infinite; }
      `}} />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* NAVBAR */}
      <nav 
        className={`fixed top-0 left-0 w-full z-[100] transition-transform duration-500 ease-in-out border-b border-[#2B3139]/50
          ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}
          bg-[#0B0E11]/60 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0B0E11]/40
        `}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg shadow-[#FCD535]/10 group-hover:scale-110 transition-all duration-500 group-hover:rotate-6">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tighter text-[#EAECEF] group-hover:text-white transition-colors">TradeHub</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 font-black text-[10px] uppercase tracking-[0.2em] text-[#848E9C]">
            <NavButton onClick={() => safeNavigate('/hall-of-fame')} icon={<Star size={14} />} label={t.nav.hall_of_fame} />
            <NavButton onClick={() => safeNavigate('/handbook')} icon={<BookOpen size={14} />} label={t.nav.handbook} />
            <NavLink href="#how-it-works" icon={<Target size={14} />} label={t.nav.mechanism} />
            <NavLink href="#competitions" icon={<Trophy size={14} />} label={t.nav.tournaments} />
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              // JIKA USER LOGIN: TAMPILKAN TOMBOL DASHBOARD & PROFIL
              <div className="flex items-center gap-3">
                <button onClick={() => safeNavigate('/admin/dashboard')} className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-[#1E2329] text-[#FCD535] rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#2B3139] border border-[#FCD535]/20 transition-all active:scale-95 shadow-inner hover:shadow-[#FCD535]/10 hover:border-[#FCD535]/50">
                  <Shield size={14} /> {t.common.creator_hub}
                </button>
                <button onClick={() => safeNavigate('/dashboard')} className="hidden lg:flex items-center gap-2 px-6 py-2.5 bg-[#FCD535] text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#F0B90B] transition-all active:scale-95 shadow-xl shadow-[#FCD535]/10 hover:shadow-[#FCD535]/30">
                  {t.common.dashboard}
                </button>
                <button onClick={() => safeNavigate(`/profile/${user.id}`)} className="p-2.5 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#848E9C] hover:text-[#FCD535] hover:border-[#FCD535]/30 transition-all active:scale-90 group">
                  <User size={20} className="group-hover:drop-shadow-[0_0_8px_rgba(252,213,53,0.5)] transition-all" />
                </button>
              </div>
            ) : (
              // JIKA USER BELUM LOGIN: TAMPILKAN TOMBOL LOGIN
              <button onClick={() => safeNavigate('/auth')} className="hidden lg:block px-8 py-2.5 bg-[#1E2329] border border-[#2B3139] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#2B3139] hover:border-white/20 transition-all active:scale-95">
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

        {/* MOBILE MENU */}
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

      {/* Hero section */}
      <header className="relative pt-24 lg:pt-36 pb-24 lg:pb-48 overflow-hidden text-center z-10">
        
        {/* GRID BACKGROUND */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-100 pointer-events-none [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]"></div>
        
        {/* Glow center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCD535] rounded-full blur-[250px] opacity-[0.03]"></div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E2329]/50 text-[#FCD535] rounded-full font-black text-[9px] lg:text-[10px] uppercase tracking-[0.25em] mb-10 border border-[#2B3139] animate-in fade-in slide-in-from-bottom-4 duration-700 hover:bg-[#FCD535]/5 transition-colors cursor-default select-none backdrop-blur-sm">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FCD535] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FCD535]"></span>
            </span>
            {t.landing.tag}
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-9xl font-black text-white tracking-tighter mb-8 lg:mb-12 leading-[0.95] lg:leading-[0.85] italic animate-in fade-in slide-in-from-bottom-8 duration-1000 select-none drop-shadow-2xl">
            {t.landing.title_1} <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD535] to-[#F0B90B] relative inline-block">
                {t.landing.title_2}
                
                {/* --- ANIMASI RANTAI (ON-CHAIN) --- */}
                <a 
                    href="https://solscan.io/account/DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute -top-6 -right-12 lg:-top-10 lg:-right-24 flex items-center justify-center opacity-80 scale-75 lg:scale-100 cursor-pointer hover:opacity-100 transition-opacity"
                    title="View On-Chain"
                >
                    <div className="relative w-16 h-16 lg:w-24 lg:h-24">
                        <Link2 className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 text-[#FCD535] animate-chain-float" style={{ animationDelay: '0s' }} />
                        <Link2 className="absolute top-4 left-4 lg:top-7 lg:left-7 w-8 h-8 lg:w-12 lg:h-12 text-[#F0B90B] animate-chain-float" style={{ animationDelay: '1s' }} />
                    </div>
                </a>

            </span>
          </h1>
          
          <p className="text-sm lg:text-lg text-[#848E9C] mb-12 lg:mb-16 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 px-4 italic">
            {t.landing.desc}
          </p>
          
          <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
              <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto px-4 sm:px-0">
                  {/* CTA BUTTON LOGIC */}
                  {!user ? (
                    <button onClick={() => safeNavigate('/auth')} className="w-full sm:w-auto px-12 py-5 bg-[#FCD535] text-black rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-[#ffe066] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-[#FCD535]/20 hover:shadow-[#FCD535]/40 group relative overflow-hidden">
                       <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"></div>
                       <span className="relative flex items-center gap-3">{t.landing.cta_create} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
                    </button>
                  ) : (
                    <button onClick={() => safeNavigate('/dashboard')} className="w-full sm:w-auto px-12 py-5 bg-[#FCD535] text-black rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-[#ffe066] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-[#FCD535]/20 hover:shadow-[#FCD535]/40 group relative overflow-hidden">
                       <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"></div>
                       <span className="relative flex items-center gap-3">{t.common.dashboard} <LayoutDashboard size={18} /></span>
                    </button>
                  )}
                  
                  <button onClick={() => safeNavigate('/hall-of-fame')} className="w-full sm:w-auto px-12 py-5 bg-[#1E2329] text-white border border-[#2B3139] rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-[#2B3139] hover:border-[#FCD535]/50 transition-all flex items-center justify-center gap-3 active:scale-95 group">
                    {t.landing.cta_rank} <Star size={18} className="text-[#848E9C] group-hover:text-[#FCD535] transition-colors" />
                  </button>
              </div>
              
              <div className="flex items-center gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500">
                  <p className="text-[9px] font-black text-[#474D57] uppercase tracking-[0.4em] flex items-center gap-2">
                    <ShieldCheck size={12} className="text-[#0ECB81]" /> {t.landing.audit}
                  </p>
                  <div className="h-1 w-1 rounded-full bg-[#474D57]"></div>
                  <p className="text-[9px] font-black text-[#474D57] uppercase tracking-[0.4em] flex items-center gap-2">
                    <Zap size={12} className="text-[#FCD535]" /> Instant Payout
                  </p>
              </div>
          </div>
        </div>
      </header>

      {/* --- STATS SECTION --- */}
      <section className="border-y border-[#2B3139] bg-[#181A20]/40 backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 bg-[#FCD535]/5 blur-3xl opacity-10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16 text-center relative z-10">
          
          <StatItem 
            value={<AnimatedCounter value={stats.globalSolanaVolume} prefix="$" decimals={0} />} 
            label="Global SOL 24H Volume" 
            icon={<Globe size={24} className="text-[#0ECB81]" />} 
            sub="Real-time Market Data"
          />
          <StatItem 
            value={<AnimatedCounter value={stats.globalActiveTraders} />} 
            label="Active Solana Wallets" 
            icon={<Users size={24} className="text-[#3b82f6]" />} 
            sub="Global Ecosystem"
          />
          <StatItem 
            value={<AnimatedCounter value={stats.activeArenas} />} 
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

      {/* --- POWERED BY SECTION --- */}
      <section className="py-20 lg:py-28 bg-[#0B0E11] border-b border-[#2B3139] relative overflow-hidden group">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
            <div className="flex flex-col items-center gap-12">
              <div className="flex items-center gap-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#474D57]"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#474D57] whitespace-nowrap group-hover:text-[#848E9C] transition-colors">{t.landing.powered}</p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#474D57]"></div>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-24 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-1000">
                  <PartnerLogo name="Solana" img="/solana.png" />
                  <PartnerLogo name="Alchemy" img="/alchemy.jpeg" />
                  <PartnerLogo name="Phantom" img="/phantom.png" />
                  <PartnerLogo name="Helius" img="/helius.png" />
                  <PartnerLogo name="GMGN.AI" img="/gmgn.png" />
              </div>
            </div>
        </div>
      </section>

      {/* --- MECHANISM SECTION --- */}
      <section id="how-it-works" className="py-28 lg:py-48 bg-[#0B0E11] border-b border-[#2B3139] relative overflow-hidden">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none animate-pulse-glow"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24 lg:mb-32 px-4">
            <h2 className="text-[10px] font-black text-[#FCD535] uppercase tracking-[0.5em] mb-4">{t.landing.mechanism.title_small}</h2>
            <p className="text-4xl lg:text-6xl font-black text-white italic uppercase tracking-tighter leading-none drop-shadow-lg">{t.landing.mechanism.title_big}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <StepCard num="01" icon={<Target className="text-[#3b82f6]" />} title={t.landing.mechanism.step1} desc={t.landing.mechanism.desc1} />
            <StepCard num="02" icon={<BarChart3 className="text-[#0ECB81]" />} title={t.landing.mechanism.step2} desc={t.landing.mechanism.desc2} />
            <StepCard num="03" icon={<Rocket className="text-[#FCD535]" />} title={t.landing.mechanism.step3} desc={t.landing.mechanism.desc3} />
          </div>
        </div>
      </section>

      {/* --- ARENA GRID --- */}
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
              {/* Arena list with spotlight effect */}
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
                        {/* BADGES */}
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

                        {/* CONTENT */}
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

              {/* EXPLORE BUTTON */}
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

      {/* --- FOOTER --- */}
      <footer className="bg-[#181A20] py-20 lg:py-32 border-t border-[#2B3139] relative overflow-hidden text-center md:text-left">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FCD535]/30 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-16 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#FCD535] rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-[#FCD535]/20 cursor-pointer hover:rotate-12 transition-transform group" onClick={() => safeNavigate('/')}>
                <TrendingUp className="text-black w-8 h-8 group-hover:scale-110 transition-transform" />
            </div>
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
               <SocialLink href="https://twitter.com/TradeHub_SOL" label="Twitter" />
               <SocialLink href="https://discord.gg/zKjFNZdM" label="Discord" />
               <SocialLink href="https://t.me/tradehub_proofofachievement" label="Telegram" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- SUB KOMPONEN (REFACTORED) ---

function NavButton({ onClick, icon, label }: any) {
    return (
        <button onClick={onClick} className="hover:text-[#FCD535] transition-all flex items-center gap-2 group relative">
            {icon} {label}
            <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-[#FCD535] group-hover:w-full transition-all duration-300"></span>
        </button>
    )
}

function NavLink({ href, icon, label }: any) {
    return (
        <a href={href} className="hover:text-[#FCD535] transition-all flex items-center gap-2 group relative">
            {icon} {label}
            <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-[#FCD535] group-hover:w-full transition-all duration-300"></span>
        </a>
    )
}

function SocialLink({ href, label }: any) {
    return (
        <a href={href} className="hover:text-white transition-colors flex items-center gap-1 group">
            {label} <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all" />
        </a>
    )
}

function StatItem({ value, label, icon, sub }: any) {
  return (
    <div className="flex flex-col items-center group relative p-4">
      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#1E2329] rounded-[1.75rem] flex items-center justify-center mb-6 lg:mb-8 shadow-2xl border border-[#2B3139] group-hover:border-[#FCD535]/40 transition-all shadow-inner group-hover:scale-110 group-hover:-rotate-6 duration-500 z-10 relative">
        {icon}
        <div className="absolute inset-0 bg-[#FCD535]/10 rounded-[1.75rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
      <p className="text-2xl lg:text-4xl font-black text-white italic tracking-tighter mb-2 uppercase leading-none group-hover:text-[#FCD535] transition-colors">{value}</p>
      <p className="text-[9px] lg:text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em]">{label}</p>
      {sub && <p className="text-[8px] font-bold text-[#474D57] uppercase tracking-wider mt-1">{sub}</p>}
    </div>
  );
}

function StepCard({ num, icon, title, desc }: any) {
  return (
    <div className="bg-[#1E2329] p-8 lg:p-12 rounded-[2.5rem] border border-[#2B3139] relative group hover:border-[#FCD535]/30 transition-all shadow-2xl text-center md:text-left overflow-hidden hover:-translate-y-2 duration-300">
       <div className="absolute -top-6 -right-6 text-8xl lg:text-9xl font-black text-white/5 italic leading-none group-hover:text-[#FCD535]/5 transition-colors select-none">{num}</div>
       <div className="w-16 h-16 bg-[#0B0E11] mx-auto md:mx-0 rounded-[1.5rem] flex items-center justify-center mb-8 lg:mb-10 border border-[#2B3139] shadow-inner group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 relative z-10">
            {icon}
       </div>
       <h3 className="text-xl lg:text-2xl font-black text-white uppercase italic mb-4 leading-tight tracking-tight group-hover:text-[#FCD535] transition-colors">{title}</h3>
       <p className="text-xs lg:text-sm text-[#848E9C] leading-relaxed font-medium italic">{desc}</p>
    </div>
  );
}

function PartnerLogo({ name, img, fallbackIcon }: { name: string, img: string, fallbackIcon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 group/logo cursor-default">
       <div className="w-10 h-10 bg-[#1E2329] rounded-xl flex items-center justify-center border border-[#2B3139] group-hover/logo:border-[#FCD535]/30 group-hover/logo:shadow-[0_0_15px_rgba(252,213,53,0.1)] transition-all shadow-inner">
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