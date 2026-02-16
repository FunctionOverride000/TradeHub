"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';
import { 
  TrendingUp, Star, BookOpen, Target, Trophy, 
  Shield, User, Menu, X 
} from 'lucide-react';

export function Navbar() {
  const { t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const safeNavigate = (path: string) => {
    router.push(path);
  };

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

  return (
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
  );
}

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