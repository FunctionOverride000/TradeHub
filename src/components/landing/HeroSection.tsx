"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { createClient } from '@/lib/supabase';
import { 
  ArrowRight, LayoutDashboard, Star, ShieldCheck, Zap, Link2, Plus
} from 'lucide-react';

export function HeroSection() {
  const { t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  
  // Animation states
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isArenaLoading, setIsArenaLoading] = useState(false);
  // State baru untuk menyimpan properti partikel agar konsisten (menghindari hydration error)
  const [particles, setParticles] = useState<React.CSSProperties[]>([]);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Quick check for UI state only
    const checkUser = async () => {
       const { data } = await supabase.auth.getUser();
       setUser(data.user);
    };
    checkUser();

    // Generate partikel hanya di sisi client
    const generatedParticles = [...Array(5)].map(() => ({
        width: Math.random() * 4 + 1 + 'px',
        height: Math.random() * 4 + 1 + 'px',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animation: `float-particle ${Math.random() * 10 + 10}s linear infinite`,
        animationDelay: `${Math.random() * 5}s`
    }));
    setParticles(generatedParticles);
  }, []);

  // Mouse move handler for parallax/glow effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };

  const safeNavigate = (path: string) => {
    router.push(path);
  };

  const handleCreateArenaClick = () => {
    setIsArenaLoading(true);
    // Navigate immediately, animation will play until page unloads
    safeNavigate('/create-arena');
  };

  return (
    <header 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative pt-24 lg:pt-36 pb-24 lg:pb-48 overflow-hidden text-center z-10 group"
    >
        {/* Inject Custom Styles for specific animations */}
        <style jsx global>{`
            @keyframes text-shimmer {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            .animate-text-shimmer {
                background-size: 200% auto;
                animation: text-shimmer 4s linear infinite;
            }
            @keyframes float-particle {
                0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
                50% { opacity: 0.8; }
                100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
            }
            @keyframes star-pulse {
                0% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 0 rgba(252,213,53,0)); }
                50% { transform: scale(1.2) rotate(180deg); filter: drop-shadow(0 0 10px rgba(252,213,53,0.8)); }
                100% { transform: scale(1) rotate(360deg); filter: drop-shadow(0 0 0 rgba(252,213,53,0)); }
            }
            .group:hover .animate-star-live {
                animation: star-pulse 2s ease-in-out infinite;
            }
        `}</style>
      
      {/* GRID BACKGROUND - Parallax Effect */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-100 pointer-events-none [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] transition-transform duration-100 ease-out"
        style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}
      ></div>
      
      {/* Glow center - Moves opposite to mouse for depth */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCD535] rounded-full blur-[250px] opacity-[0.03] transition-transform duration-700 ease-out"
        style={{ transform: `translate(calc(-50% + ${mousePos.x * -50}px), calc(-50% + ${mousePos.y * -50}px))` }}
      ></div>

      {/* Floating Particles (Decorative) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((style, i) => (
              <div 
                key={i}
                className="absolute bg-[#FCD535] rounded-full opacity-0"
                style={style}
              />
          ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Badge with brighter yellow (#FCD535) and Glow */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E2329]/80 text-[#FCD535] rounded-full font-black text-[9px] lg:text-[10px] uppercase tracking-[0.25em] mb-10 border border-[#2B3139] animate-in fade-in slide-in-from-bottom-4 duration-700 hover:bg-[#FCD535]/10 transition-all cursor-default select-none backdrop-blur-sm hover:scale-105 hover:shadow-[0_0_20px_rgba(252,213,53,0.4)] shadow-[0_0_10px_rgba(252,213,53,0.1)]">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FCD535] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FCD535]"></span>
          </span>
          {t.landing.tag}
        </div>
        
        <h1 className="text-4xl sm:text-6xl lg:text-9xl font-black text-white tracking-tighter mb-8 lg:mb-12 leading-[0.95] lg:leading-[0.85] italic animate-in fade-in slide-in-from-bottom-8 duration-1000 select-none drop-shadow-2xl">
          {t.landing.title_1} <br className="hidden sm:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD535] via-[#FFF5B8] to-[#F0B90B] animate-text-shimmer relative inline-block">
              {t.landing.title_2}
              
              {/* --- ANIMASI RANTAI (ON-CHAIN) --- */}
              <a 
                  href="https://solscan.io/account/DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute -top-6 -right-12 lg:-top-10 lg:-right-24 flex items-center justify-center opacity-80 scale-75 lg:scale-100 cursor-pointer hover:opacity-100 transition-all hover:scale-110"
                  title="View On-Chain"
              >
                  <div className="relative w-16 h-16 lg:w-24 lg:h-24">
                      <Link2 className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 text-[#FCD535] animate-chain-float" style={{ animationDelay: '0s' }} />
                      <Link2 className="absolute top-4 left-4 lg:top-7 lg:left-7 w-8 h-8 lg:w-12 lg:h-12 text-[#F0B90B] animate-chain-float" style={{ animationDelay: '1s' }} />
                  </div>
              </a>

          </span>
        </h1>
        
        <p className="text-sm lg:text-lg text-[#848E9C] mb-12 lg:mb-16 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 px-4 italic hover:text-[#EAECEF] transition-colors">
          {t.landing.desc}
        </p>
        
        <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto px-4 sm:px-0">
                {!user ? (
                  <button 
                    onClick={() => safeNavigate('/auth')} 
                    className="w-full sm:w-auto px-12 py-5 bg-[#FCD535] text-black rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-[#ffe066] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-[#FCD535]/20 hover:shadow-[#FCD535]/40 group relative overflow-hidden hover:-translate-y-1"
                  >
                      <div className="absolute inset-0 bg-white/40 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                      <span className="relative flex items-center gap-3">{t.landing.cta_create} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
                  </button>
                ) : (
                  <button 
                    onClick={handleCreateArenaClick}
                    disabled={isArenaLoading}
                    className={`w-full sm:w-auto px-12 py-5 bg-[#FCD535] text-black rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-[#ffe066] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-[#FCD535]/20 hover:shadow-[#FCD535]/40 group relative overflow-hidden hover:-translate-y-1 ${isArenaLoading ? 'opacity-80 cursor-wait' : ''}`}
                  >
                      <div className="absolute inset-0 bg-white/40 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                      {/* Plus icon spins when loading, or rotates 90deg on hover */}
                      <span className="relative flex items-center gap-3">
                        CREATE ARENA 
                        <Plus 
                            size={18} 
                            className={`transition-all duration-300 ${isArenaLoading ? 'animate-spin' : 'group-hover:rotate-90'}`} 
                        />
                      </span>
                  </button>
                )}
                
                <button onClick={() => safeNavigate('/hall-of-fame')} className="w-full sm:w-auto px-12 py-5 bg-[#1E2329] text-white border border-[#2B3139] rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-[#2B3139] hover:border-[#FCD535]/50 transition-all flex items-center justify-center gap-3 active:scale-95 group hover:-translate-y-1 hover:shadow-lg">
                  {t.landing.cta_rank} 
                  {/* Star icon with pulse, spin, and fill animation */}
                  <Star size={18} className="text-[#848E9C] group-hover:text-[#FCD535] group-hover:fill-[#FCD535] transition-all duration-500 animate-star-live" />
                </button>
            </div>
            
            <div className="flex items-center gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500">
                <p className="text-[9px] font-black text-[#474D57] uppercase tracking-[0.4em] flex items-center gap-2 group cursor-help">
                  <ShieldCheck size={12} className="text-[#0ECB81] group-hover:scale-125 transition-transform" /> {t.landing.audit}
                </p>
                <div className="h-1 w-1 rounded-full bg-[#474D57]"></div>
                <p className="text-[9px] font-black text-[#474D57] uppercase tracking-[0.4em] flex items-center gap-2 group cursor-help">
                  <Zap size={12} className="text-[#FCD535] group-hover:scale-125 transition-transform" /> Instant Payout
                </p>
            </div>
        </div>
      </div>
    </header>
  );
}