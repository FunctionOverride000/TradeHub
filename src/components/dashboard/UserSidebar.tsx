"use client";

import React, { useEffect, useState } from 'react';
import { 
  Home, 
  Trophy, 
  Wallet, 
  Settings, 
  LogOut, 
  X,
  Zap,
  BarChart2,
  Award,
  Copy,
  Users,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check // Tambahkan Check icon
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation'; // GUNAKAN INI UNTUK NAVIGASI NEXT.JS
import { createClient } from '@/lib/supabase'; // GUNAKAN HELPER KITA
import { useLanguage } from '@/lib/LanguageContext';
import { getLevelInfo, getBadgeColor } from '@/lib/levelUtils'; 

interface UserSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  safeNavigate: (path: string) => void; // Kita tetap terima props ini tapi utamakan router internal
  handleLogout?: () => void;
}

export default function UserSidebar({ isSidebarOpen, setIsSidebarOpen, safeNavigate, handleLogout }: UserSidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname(); // Hook resmi Next.js untuk mendapatkan path saat ini
  const router = useRouter();     // Hook resmi Next.js untuk navigasi
  
  // Gunakan helper createClient
  const supabase = createClient();

  // State untuk Data User & XP
  const [userData, setUserData] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // State untuk Toggle XP (View/Hide)
  const [showXpDetails, setShowXpDetails] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserData(user);

      // Ambil data stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Hitung Level & Ambil Referral Code
      if (stats) {
        const info = getLevelInfo(stats.user_xp || 0);
        setLevelData(info);
        
        if (stats.referral_code) {
            setReferralCode(stats.referral_code);
        } else {
             // Generate kode baru jika belum ada
             const newCode = 'TRD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
             setReferralCode(newCode);
             // Update di background tanpa await
             supabase.from('user_stats').update({ referral_code: newCode }).eq('user_id', user.id).then();
        }
      } else {
        // Default level 1
        setLevelData(getLevelInfo(0));
        setReferralCode("Generating...");
      }
    }
  };

  const handleCopyReferral = () => {
    if (referralCode && referralCode !== "Generating...") {
      navigator.clipboard.writeText(referralCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  // Fungsi navigasi yang diperbaiki
  const handleNavigation = (path: string) => {
    // Gunakan router.push untuk navigasi SPA yang cepat
    router.push(path);
    setIsSidebarOpen(false); // Tutup sidebar di mobile setelah klik
  };

  const navItems = [
    { icon: <ArrowLeft size={20} />, label: "Back to Home", path: '/' },
    { icon: <Home size={20} />, label: t.dashboard.sidebar.overview, path: '/dashboard' },
    { icon: <Wallet size={20} />, label: t.dashboard.sidebar.wallet, path: '/dashboard/wallet' },
    { icon: <BarChart2 size={20} />, label: "PnL Analytics", path: '/dashboard/pnl' },
    { icon: <Award size={20} />, label: "Certificates", path: '/dashboard/certificates' },
    { icon: <Settings size={20} />, label: t.dashboard.sidebar.settings, path: '/dashboard/settings' },
  ];

  return (
    <>
      {/* Overlay untuk Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0B0E11] border-r border-[#2B3139] z-50 transform transition-transform duration-300 ease-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Header Sidebar */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(252,213,53,0.3)]">
              <Zap className="text-black fill-current" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter text-white leading-none">TRADE<span className="text-[#FCD535]">HUB</span></h1>
              <p className="text-[9px] text-[#848E9C] font-bold tracking-widest uppercase">Pro Dashboard</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#848E9C] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* --- USER PROFILE & LEVEL CARD --- */}
        <div className="px-6 mb-4">
          <div className="bg-[#1E2329] rounded-2xl p-4 border border-[#2B3139] shadow-lg relative overflow-hidden group">
             {/* Glow Effect */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

             <div className="flex items-center justify-between relative z-10 mb-1">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2B3139] to-[#0B0E11] border border-[#474D57] flex items-center justify-center text-[#EAECEF] font-bold shrink-0">
                       {userData?.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-white truncate">{userData?.user_metadata?.full_name || "Trader"}</p>
                       <p className={`text-[10px] font-black uppercase tracking-wider ${levelData ? getBadgeColor(levelData.level) : 'text-[#848E9C]'}`}>
                          {levelData ? `${levelData.badge} • LVL ${levelData.level}` : "Loading..."}
                       </p>
                    </div>
                </div>
                
                {/* TOMBOL TOGGLE VIEW/HIDE XP */}
                <button 
                    onClick={() => setShowXpDetails(!showXpDetails)}
                    className="p-1.5 rounded-lg bg-[#0B0E11]/50 hover:bg-[#0B0E11] text-[#848E9C] hover:text-white transition-all border border-transparent hover:border-[#2B3139]"
                    title={showXpDetails ? "Hide XP Details" : "Show XP Details"}
                >
                    {showXpDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
             </div>

             {/* XP PROGRESS BAR (CONDITIONAL) */}
             {levelData && showXpDetails && (
               <div className="relative z-10 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="h-px w-full bg-[#2B3139] my-3 opacity-50"></div> {/* Separator */}
                  
                  <div className="flex justify-between text-[9px] font-bold text-[#848E9C] mb-1.5 uppercase tracking-wide">
                      <span>EXP</span>
                      <span>{Math.floor(levelData.currentXp)} / {levelData.nextLevelXp}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#0B0E11] rounded-full overflow-hidden border border-[#2B3139]">
                      <div 
                         className="h-full bg-gradient-to-r from-[#FCD535] to-[#F0B90B] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(252,213,53,0.5)]" 
                         style={{ width: `${levelData.progress}%` }}
                      ></div>
                  </div>
                  <p className="text-[9px] text-[#474D57] mt-2 text-right italic">
                    {Math.ceil(levelData.xpNeeded)} XP to next rank
                  </p>
               </div>
             )}
          </div>
        </div>

        {/* --- REFERRAL CARD --- */}
        <div className="px-6 mb-4">
           <div className="bg-gradient-to-r from-[#2B3139]/50 to-[#1E2329] border border-[#2B3139] rounded-xl p-3 flex items-center justify-between relative overflow-hidden group hover:border-[#FCD535]/30 transition-all">
              <div>
                  <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-wider mb-1 flex items-center gap-1">
                     <Users size={10} className="text-[#FCD535]" /> Your Referral Code
                  </p>
                  <p className="text-xs font-mono font-bold text-white tracking-widest">{referralCode}</p>
              </div>
              <button 
                onClick={handleCopyReferral}
                className="p-2 bg-[#0B0E11] rounded-lg text-[#FCD535] hover:text-white hover:bg-[#FCD535]/20 transition-all active:scale-95 border border-[#2B3139]"
                title="Copy Code"
              >
                  {copyFeedback ? <Check size={14} className="text-[#0ECB81]"/> : <Copy size={14} />}
              </button>
           </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-6 space-y-2 no-scrollbar">
          <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] mb-4 mt-2">Main Menu</p>
          {navItems.map((item) => {
            // Cek aktif path dengan lebih fleksibel (misal /dashboard/wallet aktif di wallet)
            const isActive = pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-[#FCD535] text-black shadow-[0_0_20px_rgba(252,213,53,0.2)]' 
                    : 'text-[#848E9C] hover:bg-[#1E2329] hover:text-[#EAECEF]'
                }`}
              >
                <div className={`relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'text-black' : 'text-[#848E9C] group-hover:text-[#FCD535]'}`}>
                  {item.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest relative z-10">{item.label}</span>
                
                {/* Active Indicator Line */}
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-black/20 rounded-r-full"></div>}
              </button>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-6 border-t border-[#2B3139]">
          {handleLogout && (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#F6465D] hover:bg-[#F6465D] hover:text-white transition-all duration-300 group active:scale-95"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>
            </button>
          )}
          <p className="text-[9px] text-center text-[#474D57] mt-4 font-mono">v1.2.0 • Stable</p>
        </div>
      </aside>
    </>
  );
}