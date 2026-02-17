"use client";

import React, { useState } from 'react';
import ErrorComponent from '../error';
import LoadingComponent from '../loading';
import NotFoundComponent from '../not-found';
import ForbiddenComponent from '../forbidden';
import MaintenancePage from '../maintenance/page';
import { Eye, ArrowLeft, RefreshCw, AlertTriangle, Loader2, FileWarning, ShieldAlert, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function TestUXPage() {
  // Tambahkan state baru: 'forbidden' dan 'maintenance'
  const [view, setView] = useState<'menu' | 'error' | 'loading' | 'not-found' | 'forbidden' | 'maintenance'>('menu');

  // --- RENDER ERROR VIEW ---
  if (view === 'error') {
    return (
      <div className="relative">
        <FloatingBackButton onClick={() => setView('menu')} />
        <ErrorComponent 
          error={new Error("Simulasi Error: Gagal terhubung ke node RPC Solana.") as any} 
          reset={() => alert("Tombol 'Try Again' diklik! Logika reset akan berjalan di sini.")} 
        />
      </div>
    );
  }

  // --- RENDER LOADING VIEW ---
  if (view === 'loading') {
    return (
      <div className="relative">
        <FloatingBackButton onClick={() => setView('menu')} />
        <LoadingComponent />
      </div>
    );
  }

  // --- RENDER NOT FOUND VIEW ---
  if (view === 'not-found') {
    return (
      <div className="relative">
        <FloatingBackButton onClick={() => setView('menu')} />
        <NotFoundComponent />
      </div>
    );
  }

  // --- RENDER FORBIDDEN VIEW ---
  if (view === 'forbidden') {
    return (
      <div className="relative">
        <FloatingBackButton onClick={() => setView('menu')} />
        <ForbiddenComponent />
      </div>
    );
  }

  // --- RENDER MAINTENANCE VIEW ---
  if (view === 'maintenance') {
    return (
      <div className="relative">
        <FloatingBackButton onClick={() => setView('menu')} />
        <MaintenancePage />
      </div>
    );
  }

  // --- RENDER MENU VIEW ---
  return (
    <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FCD535] rounded-full blur-[200px] opacity-[0.05] pointer-events-none"></div>

      <div className="relative z-10 text-center max-w-4xl w-full">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E2329]/50 text-[#FCD535] rounded-full font-black text-[10px] uppercase tracking-[0.25em] mb-8 border border-[#2B3139]">
           <Eye size={14} /> Developer Tools
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter">
          UX State <span className="text-[#FCD535]">Previewer</span>
        </h1>
        
        <p className="text-[#848E9C] mb-12 text-lg">
          Gunakan panel ini untuk memverifikasi tampilan visual dari state aplikasi yang sulit direplikasi secara manual.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <PreviewCard 
            title="Error Page" 
            desc="Tampilan saat terjadi crash atau kegagalan fetch data."
            icon={<AlertTriangle size={24} className="text-red-500" />}
            onClick={() => setView('error')}
            color="red"
          />
          <PreviewCard 
            title="Loading Screen" 
            desc="Animasi loading awal saat membuka aplikasi."
            icon={<Loader2 size={24} className="text-[#FCD535] animate-spin" />}
            onClick={() => setView('loading')}
            color="yellow"
          />
          <PreviewCard 
            title="404 Not Found" 
            desc="Halaman saat URL tidak ditemukan."
            icon={<FileWarning size={24} className="text-blue-500" />}
            onClick={() => setView('not-found')}
            color="blue"
          />
          <PreviewCard 
            title="403 Forbidden" 
            desc="Tampilan akses ditolak / restricted area."
            icon={<ShieldAlert size={24} className="text-[#F6465D]" />}
            onClick={() => setView('forbidden')}
            color="red"
          />
          <PreviewCard 
            title="Maintenance" 
            desc="Mode perbaikan sistem / system upgrade."
            icon={<Wrench size={24} className="text-orange-500" />}
            onClick={() => setView('maintenance')}
            color="yellow"
          />
        </div>

        <div className="mt-16 pt-8 border-t border-[#2B3139] flex justify-center">
            <Link href="/" className="text-[#848E9C] hover:text-white flex items-center gap-2 text-sm font-bold transition-colors">
                <ArrowLeft size={16} /> Kembali ke Dashboard Utama
            </Link>
        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function FloatingBackButton({ onClick }: { onClick: () => void }) {
    return (
        <button 
          onClick={onClick} 
          className="fixed top-6 left-6 z-[10000] px-4 py-2 bg-[#1E2329]/90 backdrop-blur text-white border border-[#2B3139] rounded-lg shadow-2xl hover:bg-[#2B3139] transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Preview
        </button>
    )
}

function PreviewCard({ title, desc, icon, onClick, color }: any) {
    const colors: any = {
        red: "hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]",
        yellow: "hover:border-[#FCD535]/50 hover:shadow-[0_0_20px_rgba(252,213,53,0.1)]",
        blue: "hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
    };

    return (
        <button 
            onClick={onClick}
            className={`bg-[#1E2329] p-6 rounded-2xl border border-[#2B3139] text-left transition-all duration-300 group hover:-translate-y-2 ${colors[color]}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-[#0B0E11] border border-[#2B3139] group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                <RefreshCw size={14} className="text-[#474D57] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
            <p className="text-[#848E9C] text-xs leading-relaxed">{desc}</p>
        </button>
    )
}