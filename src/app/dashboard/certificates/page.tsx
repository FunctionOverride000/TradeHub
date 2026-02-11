"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  User, 
  Loader2, 
  Medal, 
  BarChart2, 
  Wallet, 
  Printer,
  X,
  Share2, 
  Award, 
  ShieldCheck,
  Activity,
  Shield,
  Menu,
  TrendingUp,
  FileText
} from 'lucide-react';

/**
 * MENGGUNAKAN ESM CDN:
 * Menjamin library dimuat dengan benar di lingkungan preview tanpa folder node_modules lokal.
 */
// FIX: Import createClient from the local helper for consistent auth
import { createClient } from '@/lib/supabase';
import * as web3 from '@solana/web3.js';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/lib/LanguageSwitcher';
import { useRouter } from 'next/navigation'; // FIX: Use standard Next.js router

// --- IMPORT KOMPONEN BARU ---
import UserSidebar from '@/components/dashboard/UserSidebar';

// Initialize Supabase using the helper (no args needed as they are in the helper)
const supabase = createClient();

const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

interface ParticipantData {
  id: string;
  room_id: string;
  status: string; 
  wallet_address: string;
  joined_at: string;
  initial_balance: number;
  current_balance: number;
  profit?: number; 
  rooms?: {
    title: string;
    is_premium: boolean;
    end_time: string;
  };
}

export default function CertificatesPage() {
  const { t } = useLanguage();
  const router = useRouter(); // FIX: Initialize router
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const safeNavigate = (path: string) => {
    router.push(path); // FIX: Use router.push for smooth navigation
  };

  // 1. Sinkronisasi Sesi Auth
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth');
        return;
      }
      setUser(session.user);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/auth');
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const verifyCertificatesOnChain = async (baseData: ParticipantData[]) => {
    if (baseData.length === 0 || !SOLANA_RPC) return;
    setIsSyncing(true);
    try {
      const connection = new web3.Connection(SOLANA_RPC, 'confirmed');
      const publicKeys = baseData.map(p => new web3.PublicKey(p.wallet_address));
      const accountsInfo = await connection.getMultipleAccountsInfo(publicKeys);
      const verifiedData = baseData.map((p, idx) => {
        const info = accountsInfo[idx];
        const liveBalance = info ? info.lamports / web3.LAMPORTS_PER_SOL : p.current_balance;
        return {
          ...p,
          current_balance: liveBalance,
          profit: p.initial_balance > 0 ? ((liveBalance - p.initial_balance) / p.initial_balance) * 100 : 0
        };
      });
      setRegistrations(verifiedData);
    } catch (err) {
      console.error("Gagal sinkronisasi blockchain:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('participants')
          .select(`*, rooms!inner (title, is_premium, end_time)`)
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });
        if (error) throw error;
        const baseEnriched = (data || []).map((item: any) => ({
          ...item,
          profit: item.initial_balance > 0 ? ((item.current_balance - item.initial_balance) / item.initial_balance) * 100 : 0
        }));
        setRegistrations(baseEnriched);
        await verifyCertificatesOnChain(baseEnriched);
      } catch (err: any) {
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // --- MODIFIKASI: CUSTOM FILENAME SAAT PRINT ---
  const triggerPrint = (): void => {
    const currentCert = registrations.find(r => r.id === viewingId);
    
    if (currentCert && user) {
        // Simpan judul asli
        const originalTitle = document.title;
        
        // Ambil nama user
        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Trader";
        
        // Set judul baru sesuai format yang diminta: (TradeHub - Proof of Achievement - Nama/Wallet)
        // Browser akan menggunakan judul ini sebagai nama file default saat 'Save as PDF'
        document.title = `TradeHub - Proof of Achievement - ${userName}/${currentCert.wallet_address}`;
        
        window.print();

        // Kembalikan judul asli setelah jeda singkat
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    } else {
        window.print();
    }
  };
  // ----------------------------------------------

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  const achievements = registrations.filter(r => r.status === 'verified');
  const viewingCert = registrations.find(r => r.id === viewingId) || null;
  
  const winRate = achievements.length > 0 
    ? ((achievements.filter(r => (r.profit || 0) > 0).length / achievements.length) * 100).toFixed(1) 
    : "0";

  // LOGIKA RANK TIER
  const getRankTier = () => {
    const wins = achievements.length;
    if (wins >= 50) return { label: "Grandmaster", color: "text-[#FF4500]" };
    if (wins >= 20) return { label: "Diamond", color: "text-[#3b82f6]" };
    if (wins >= 10) return { label: "Gold", color: "text-[#FCD535]" };
    if (wins >= 5) return { label: "Silver", color: "text-[#C0C0C0]" };
    return { label: "Bronze", color: "text-[#CD7F32]" };
  };
  const rank = getRankTier();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[#848E9C] font-black uppercase tracking-[0.4em] text-[10px]">Syncing Achievement Data...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30 relative overflow-hidden">
      
      {/* --- MEMANGGIL KOMPONEN SIDEBAR --- */}
      <UserSidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        safeNavigate={safeNavigate}
        handleLogout={handleLogout}
      />

      {/* --- KONTEN UTAMA --- */}
      <main className="flex-1 flex flex-col lg:ml-72 min-w-0 bg-[#0B0E11] relative print:bg-white print:p-0 print:ml-0 overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none print:hidden"></div>

        <header className="relative z-50 px-6 lg:px-10 py-6 lg:py-8 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0 print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#FCD535] active:scale-95 transition-all">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-black tracking-tighter italic uppercase text-white leading-none">{t.dashboard.sidebar.certificates}</h1>
              <p className="hidden sm:flex items-center gap-2 text-[#848E9C] text-[10px] uppercase tracking-[0.2em] mt-2">Verified On-Chain Achievements</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {/* INTEGRASI IDENTITAS & TOMBOL PROFIL DALAM SATU KOMPONEN */}
            <button 
              onClick={() => safeNavigate(`/profile/${user?.id}`)}
              className="flex items-center gap-4 px-4 py-2 bg-[#1E2329] border border-[#2B3139] rounded-2xl hover:bg-[#2B3139] transition-all group active:scale-95 text-left shadow-lg"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#EAECEF] group-hover:text-[#FCD535] transition-colors">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-[#474D57] font-mono tracking-tighter uppercase">
                  UID: {user?.id?.substring(0,8)}
                </p>
              </div>
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full bg-gradient-to-tr from-[#181A20] to-[#2B3139] border border-[#474D57] flex items-center justify-center text-[#EAECEF] font-black shadow-lg group-hover:border-[#FCD535]/50 transition-all overflow-hidden relative">
                {user?.email ? user.email[0].toUpperCase() : 'T'}
              </div>
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto relative z-10 pb-24 print:hidden">
          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8 mb-12">
            <StatCard label="Total Arenas" value={achievements.length} icon={<Trophy size={20} className="text-[#FCD535]" />} trend="Wins" trendUp={true} />
            <StatCard label="Win Rate" value={`${winRate}%`} icon={<BarChart2 size={20} className="text-[#0ECB81]" />} trend="Live" trendUp={true} />
            <StatCard label="Status" value="Verified" icon={<ShieldCheck size={20} className="text-[#0ECB81]" />} trend="On-Chain" trendUp={true} />
            <StatCard label="Tier Rank" value={rank.label} icon={<Medal className={rank.color} />} trend="Current" trendUp={true} />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {achievements.length === 0 ? (
              <div className="bg-[#1E2329] border border-dashed border-[#2B3139] rounded-[2.5rem] p-16 text-center text-[#848E9C]">
                <Award size={48} className="mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-[10px]">No certificates found.</p>
              </div>
            ) : (
              achievements.map((item) => {
                const isLive = new Date() <= new Date(item.rooms?.end_time || "");
                return (
                  <div key={item.id} className="bg-[#1E2329] border border-[#2B3139] hover:border-[#FCD535]/40 rounded-[2.5rem] p-6 lg:p-8 transition-all group flex flex-col md:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535] rounded-full blur-[80px] opacity-5 pointer-events-none"></div>
                    <div className="shrink-0 relative">
                      <div className={`w-16 lg:w-20 h-16 lg:h-20 rounded-[1.5rem] flex items-center justify-center border border-[#474D57] group-hover:border-[#FCD535] transition-all bg-[#0B0E11] shadow-inner`}>
                        <Award className="text-[#FCD535]" size={32} />
                      </div>
                      {isLive && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#0ECB81] rounded-full flex items-center justify-center shadow-lg border-2 border-[#1E2329]">
                           <Activity size={10} className="text-black animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full text-center md:text-left">
                      <h3 className="text-lg lg:text-2xl font-black text-white uppercase italic tracking-tighter group-hover:text-[#FCD535] transition-colors leading-none">{item.rooms?.title}</h3>
                      <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${isLive ? 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20' : 'bg-[#848E9C]/10 text-[#848E9C] border-[#848E9C]/20'}`}>
                            {isLive ? 'Live Track' : 'Final Result'}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-[#0B0E11] text-[#848E9C] text-[8px] font-black uppercase border border-[#2B3139]">ROI: {(item.profit || 0).toFixed(2)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <button onClick={() => setViewingId(item.id)} className="flex-1 md:flex-none px-6 py-4 bg-[#2B3139] hover:bg-[#363c45] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-[#363c45] flex items-center justify-center gap-2 active:scale-95 shadow-inner">
                        <FileText size={16} /> VIEW
                      </button>
                      <button onClick={() => {
                        const arenaUrl = `${window.location.origin}/arena/${item.room_id}`;
                        navigator.clipboard.writeText(arenaUrl);
                        alert("Link Verifikasi Disalin!");
                      }} className="flex-1 md:flex-none px-6 py-4 bg-[#FCD535] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FCD535]/10 active:scale-95">
                        <Share2 size={16} /> SHARE
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MODAL PREVIEW */}
        {viewingId && viewingCert && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 md:p-10 bg-black/95 backdrop-blur-3xl overflow-y-auto">
              <div className="w-full max-w-[900px] flex justify-between items-center mb-8 shrink-0">
                <div className="flex items-center gap-3 text-white">
                   <div className="w-10 h-10 bg-[#1E2329] rounded-xl flex items-center justify-center border border-white/10 text-[#FCD535]"><Shield size={24} /></div>
                   <h2 className="font-black uppercase tracking-widest text-[10px] hidden sm:block">Certificate of Excellence</h2>
                </div>
                <div className="flex gap-3">
                  <button onClick={triggerPrint} className="px-5 sm:px-8 py-3 bg-[#FCD535] text-black rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 active:scale-95 shadow-2xl">SAVE PDF <Printer size={16} /></button>
                  <button onClick={() => setViewingId(null)} className="p-3 bg-[#1E2329] text-white rounded-xl hover:bg-red-500 transition-all"><X size={20} /></button>
                </div>
              </div>

              {/* PREVIEW CONTAINER */}
              <div className="w-full max-w-[900px] shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-sm overflow-hidden scale-[0.85] sm:scale-100 origin-center border-[12px] border-[#111111]">
                 <CertificateMarkup cert={viewingCert} user={user} rank={rank} isPrint={false} />
              </div>
          </div>
        )}
      </main>

      {/* --- HIDDEN PRINT SURFACE --- */}
      <div className="hidden print:block print:fixed print:inset-0 print:z-[99999] print:bg-white">
         {viewingCert && <CertificateMarkup cert={viewingCert} user={user} rank={rank} isPrint={true} />}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 0; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #print-content { 
            display: flex !important; 
            position: absolute !important; 
            top: 0; left: 0; 
            width: 297mm !important; 
            height: 210mm !important; 
            background-color: #FCFAF2 !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          #print-content * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

    </div>
  );
}

// --- SUB KOMPONEN UI ---

function StatCard({ label, value, icon, trend, trendUp }: any) {
  return (
    <div className="bg-[#1E2329] p-4 lg:p-6 rounded-[1.5rem] border border-[#2B3139] shadow-xl hover:border-[#FCD535]/20 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="text-[#848E9C] text-[9px] lg:text-[10px] font-black uppercase tracking-widest">{label}</div>
        <div className="p-2.5 bg-[#0B0E11] rounded-2xl border border-[#2B3139] group-hover:border-[#FCD535]/30 transition-colors">{icon}</div>
      </div>
      <div className="flex items-end gap-3">
        <div className="text-lg lg:text-2xl font-black text-[#EAECEF] tracking-tight">{value}</div>
        <div className={`text-[8px] lg:text-[10px] font-black mb-1 px-2 py-0.5 rounded-full ${trendUp === true ? 'text-[#0ECB81] bg-[#0ECB81]/10' : trendUp === false ? 'text-[#F6465D] bg-[#F6465D]/10' : 'text-[#848E9C] bg-[#2B3139]'}`}>{trend}</div>
      </div>
    </div>
  );
}

/**
 * KOMPONEN MARKUP SERTIFIKAT (IVORY & GOLD)
 */
function CertificateMarkup({ cert, user, rank, isPrint }: { cert: ParticipantData, user: any, rank: any, isPrint: boolean }) {
  const profileUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/profile/${user?.id}` 
    : `https://tradehub.network/profile/${user?.id}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(profileUrl)}&bgcolor=FCFAF2&color=111111`;
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Anonymous Trader";

  // WARNA TEKS BARU: Dark Bronze untuk kontras tinggi
  const accentColor = "text-[#78350F]"; // Coklat Tua / Bronze Gelap
  const mainTextColor = "text-[#111111]"; // Hampir Hitam

  return (
    <div 
      id={isPrint ? "print-content" : "preview-content"}
      className={`${isPrint ? 'w-[297mm] h-[210mm]' : 'w-full aspect-[1.414/1]'} relative overflow-hidden flex flex-col`}
      style={{ 
        backgroundColor: '#FCFAF2', 
        color: '#111111', 
        boxSizing: 'border-box'
      }}
    >
      {/* --- BACKGROUND IMAGE WATERMARK --- */}
      {/* Opacity diturunkan drastis agar tidak mengganggu teks */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
            backgroundImage: 'url("/Proof-of-Achievement.jpg")', 
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(2px)', 
            opacity: 0.15, // Dibuat sangat transparan sebagai watermark
            transform: 'scale(1.05)' 
        }}
      />

      {/* Decorative Frame */}
      <div className="absolute inset-4 border-[2px] border-[#B8860B] opacity:60 pointer-events-none z-10"></div>
      <div className="absolute top-4 left-4 w-24 h-24 border-t-8 border-l-8 z-10" style={{ borderColor: '#B8860B' }}></div>
      <div className="absolute top-4 right-4 w-24 h-24 border-t-8 border-r-8 z-10" style={{ borderColor: '#B8860B' }}></div>
      <div className="absolute bottom-4 left-4 w-24 h-24 border-b-8 border-l-8 z-10" style={{ borderColor: '#B8860B' }}></div>
      <div className="absolute bottom-4 right-4 w-24 h-24 border-b-8 border-r-8 z-10" style={{ borderColor: '#B8860B' }}></div>

      {/* Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
         <TrendingUp size={450} style={{ color: '#111111' }} />
      </div>

      <div className="flex-1 p-8 md:p-12 flex flex-col items-center text-center justify-between relative z-10">
        
        {/* Header */}
        <div className="w-full space-y-4">
           <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-[#111111] rounded-2xl flex items-center justify-center shadow-xl border border-[#B8860B]/50">
                 <TrendingUp size={36} style={{ color: '#FCD535' }} />
              </div>
              <span className="font-black text-2xl tracking-[0.5em] uppercase italic" style={{ color: '#111111' }}>TradeHub Network</span>
              <div className="w-32 h-[2px] bg-[#B8860B] mx-auto opacity-50"></div>
           </div>
           <div className="space-y-1">
              <h4 className={`text-[9px] font-black uppercase tracking-[0.8em] ${accentColor}`}>On-Chain Performance Authentication</h4>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase italic leading-none" style={{ color: '#111111' }}>MASTER RECORD</h1>
           </div>
        </div>

        {/* Content Section */}
        <div className="space-y-6 w-full max-w-2xl">
           <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${accentColor}`}>This document certifies the identity and performance of:</p>
           
           <div className="space-y-2">
              <h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter" style={{ color: '#111111' }}>{fullName}</h2>
              <div className="py-3 border-y border-[#78350F]/20">
                <p className={`text-xs lg:text-sm font-mono font-black break-all leading-none px-6 tracking-tight ${accentColor}`}>
                  {cert.wallet_address}
                </p>
              </div>
           </div>

           <p className={`text-[12px] font-medium leading-relaxed px-10 italic ${accentColor}`}>
             "Recognized for strategic execution and exceptional performance, achieving a verified on-chain ROI during the official TradeHub Arena cycle."
           </p>

           {/* Stats Grid - Dengan background semi-transparan putih agar tulisan selalu jelas */}
           <div className="grid grid-cols-2 gap-4 border-2 p-4 lg:p-6 bg-white/80 backdrop-blur-sm" style={{ borderColor: '#111111', borderRadius: '1rem' }}>
              <div className="text-center border-r border-gray-300 flex flex-col justify-center">
                 <p className={`text-[9px] font-black uppercase ${accentColor} mb-1`}>On-Chain ROI</p>
                 <p className="text-3xl lg:text-4xl font-black italic tracking-tighter" style={{ color: '#0ECB81' }}>{(cert.profit || 0).toFixed(2)}%</p>
              </div>
              <div className="text-center flex flex-col justify-center px-2">
                 <p className={`text-[9px] font-black uppercase ${accentColor} mb-1`}>Rank Tier Status</p>
                 <p className={`text-xl lg:text-2xl font-black italic uppercase leading-none ${rank.color}`}>{rank.label}</p>
                 <p className={`text-[7px] font-bold ${accentColor} mt-1 tracking-widest uppercase`}>Verified Trader</p>
              </div>
           </div>
        </div>

        {/* Footer Section */}
        <div className="w-full flex justify-between items-end pt-6 border-t border-gray-300 mt-4">
           <div className="text-left space-y-3">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-sm" style={{ backgroundColor: 'white', borderColor: '#B8860B', color: '#B8860B' }}><Award size={28} /></div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none text-[#111111]">Proof of Reputation</p>
                    <p className={`text-[8px] uppercase font-bold ${accentColor}`}>SNAPSHOT: {new Date().toLocaleDateString()}</p>
                 </div>
              </div>
              <div className="space-y-0.5">
                <p className={`text-[6px] font-mono uppercase tracking-widest ${accentColor}`}>CID: {cert.id.toUpperCase()}</p>
                <p className="text-[6px] font-mono uppercase tracking-widest text-[#B8860B] font-black">SOLANA_MAINNET_VERIFIED_LEDGER_V2</p>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="text-right space-y-1">
                 <span className="text-[10px] font-black uppercase italic" style={{ color: '#111111' }}>Scan for Profile</span>
                 <span className={`block text-[7px] uppercase tracking-[0.1em] font-black ${accentColor}`}>Verified Reputation Node</span>
              </div>
              <div className="w-16 lg:w-20 h-16 lg:h-20 bg-white p-1 rounded-lg shadow-md border border-gray-100 flex items-center justify-center overflow-hidden">
                <img src={qrUrl} alt="Profile QR Code" className="w-full h-full" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}