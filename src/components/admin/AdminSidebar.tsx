"use client";

import React from 'react';
import { 
  ShieldCheck, 
  Users, 
  Trophy, 
  ArrowLeft, 
  LayoutDashboard, 
  X, 
  History, 
  Plus 
} from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';

interface AdminSidebarProps {
  activeTab: "participants" | "rooms" | "audit";
  setActiveTab: (tab: "participants" | "rooms" | "audit") => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  safeNavigate: (path: string) => void;
}

export default function AdminSidebar({ 
  activeTab, 
  setActiveTab, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  safeNavigate 
}: AdminSidebarProps) {
  const { t } = useLanguage();

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-[80] w-72 bg-[#181A20] border-r border-[#2B3139] flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl lg:shadow-none`}>
        <div className="p-8 border-b border-[#2B3139] flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg shadow-[#FCD535]/10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-black w-6 h-6" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white uppercase italic">CreatorHub</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-[#848E9C] hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] px-4 mb-4 italic">Control</p>
          
          <SidebarLink 
            onClick={() => { setActiveTab("participants"); setIsSidebarOpen(false); }} 
            Icon={Users} 
            label="Monitor" 
            active={activeTab === "participants"} 
          />
          <SidebarLink 
            onClick={() => { setActiveTab("audit"); setIsSidebarOpen(false); }} 
            Icon={History} 
            label="Audit" 
            active={activeTab === "audit"} 
          />
          <SidebarLink 
            onClick={() => { setActiveTab("rooms"); setIsSidebarOpen(false); }} 
            Icon={Trophy} 
            label="My Arenas" 
            active={activeTab === "rooms"} 
          />
          
          <div className="pt-6 border-t border-[#2B3139] mt-6">
            <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] px-4 mb-4 italic">Quick</p>
            <SidebarLink onClick={() => safeNavigate('/create-arena')} Icon={Plus} label="Create" />
            <SidebarLink onClick={() => safeNavigate('/dashboard')} Icon={LayoutDashboard} label="Portfolio" />
          </div>
        </nav>
        
        <div className="p-6 border-t border-[#2B3139]">
          <button onClick={() => safeNavigate('/')} className="flex items-center gap-3 w-full px-4 py-3 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139] rounded-xl transition font-black text-xs uppercase tracking-widest text-left">
            <ArrowLeft size={16} />
            <span>{t?.common?.back || "Back"}</span>
          </button>
        </div>
      </aside>

      {/* Overlay untuk Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[75] lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
    </>
  );
}

// Sub-komponen SidebarLink (dipindah ke sini agar file utama bersih)
interface SidebarLinkProps {
  Icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function SidebarLink({ Icon, label, active = false, onClick }: SidebarLinkProps) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 font-black cursor-pointer text-[11px] uppercase tracking-widest ${active ? 'bg-[#2B3139] text-[#FCD535] shadow-xl border border-[#FCD535]/10' : 'text-[#848E9C] hover:bg-[#2B3139] hover:text-[#EAECEF]'}`}>
      <Icon size={20} /> <span>{label}</span>
    </div>
  );
}