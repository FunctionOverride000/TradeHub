"use client";

import React from 'react';
import { usePathname } from 'next/navigation'; // Hook untuk deteksi URL
import { 
  LayoutDashboard, 
  BarChart2, 
  Award, 
  Wallet, 
  Star, 
  BookOpen, 
  Settings as SettingsIcon, 
  LogOut, 
  TrendingUp, 
  X 
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface UserSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  safeNavigate: (path: string) => void;
  handleLogout: () => void;
}

export default function UserSidebar({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  safeNavigate, 
  handleLogout 
}: UserSidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname(); // Ambil path URL saat ini (misal: /dashboard/pnl)

  // Helper untuk cek active state
  const isActive = (path: string) => pathname === path;

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-[#181A20] border-r border-[#2B3139] flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl lg:shadow-none print:hidden`}>
        <div className="p-8 border-b border-[#2B3139] flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><TrendingUp className="text-black w-6 h-6" /></div>
            <span className="font-bold text-xl tracking-tight text-[#EAECEF]">TradeHub</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#848E9C] hover:text-white transition-colors"><X size={20} /></button>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <SidebarLink 
            Icon={LayoutDashboard} 
            label={t.dashboard.sidebar.track_record} 
            active={isActive('/dashboard')} 
            onClick={() => safeNavigate('/dashboard')} 
          />
          <SidebarLink 
            Icon={BarChart2} 
            label={t.dashboard.sidebar.pnl_analysis} 
            active={isActive('/dashboard/pnl')} 
            onClick={() => safeNavigate('/dashboard/pnl')} 
          />
          <SidebarLink 
            Icon={Award} 
            label={t.dashboard.sidebar.certificates} 
            active={isActive('/dashboard/certificates')} 
            onClick={() => safeNavigate('/dashboard/certificates')} 
          />
          <SidebarLink 
            Icon={Wallet} 
            label={t.dashboard.sidebar.wallet} 
            active={isActive('/dashboard/wallet')} 
            onClick={() => safeNavigate('/dashboard/wallet')} 
          />
          
          <div className="pt-6 border-t border-[#2B3139]/50 mt-4 space-y-2">
              <SidebarLink onClick={() => safeNavigate('/hall-of-fame')} Icon={Star} label={t.dashboard.sidebar.hall_of_fame} active={isActive('/hall-of-fame')} />
              <SidebarLink onClick={() => safeNavigate('/handbook')} Icon={BookOpen} label={t.dashboard.sidebar.handbook} active={isActive('/handbook')} />
              <SidebarLink onClick={() => safeNavigate('/dashboard/settings')} Icon={SettingsIcon} label={t.dashboard.sidebar.settings} active={isActive('/dashboard/settings')} />
          </div>
        </nav>
        
        <div className="p-6 border-t border-[#2B3139]">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139] rounded-xl transition font-medium text-sm">
            <LogOut size={18} /> <span>{t.dashboard.sidebar.logout}</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden print:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
    </>
  );
}

function SidebarLink({ Icon, label, active = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold cursor-pointer text-sm ${active ? 'bg-[#2B3139] text-[#FCD535] shadow-lg border-l-4 border-[#FCD535]' : 'text-[#848E9C] hover:bg-[#2B3139] hover:text-[#EAECEF]'}`}>
      <Icon size={20} /> <span>{label}</span>
    </div>
  );
}