"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trophy, 
  Calendar, 
  ArrowRight, 
  Users, 
  Zap, 
  Loader2, 
  CheckCircle,
  TrendingUp,
  Clock,
  Wallet
} from 'lucide-react';
import { supabase } from '../lib/supabase'; // Import client Supabase

// Interface sesuai tabel 'rooms' di database Anda
interface Room {
  id: string;
  title: string;
  creator_wallet: string;
  start_time: string;
  end_time: string;
  is_premium: boolean;
  created_at: string;
}

export default function LandingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);

  // Helper navigasi aman
  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 1. Cek User Session (Supabase Auth)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();

    // Listener perubahan auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Data Rooms (Supabase Database)
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRooms(data || []);
      } catch (err) {
        console.error("Gagal memuat room:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Filter pencarian di sisi klien
  const filteredRooms = rooms.filter(room => 
    room.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] font-sans text-[#EAECEF]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0B0E11]/80 backdrop-blur-md border-b border-[#2B3139]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg shadow-[#FCD535]/10">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tighter text-[#EAECEF]">TradeHub</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-[#848E9C]">
            <a href="#" className="hover:text-[#FCD535] transition">Beranda</a>
            <a href="#competitions" className="hover:text-[#FCD535] transition">Turnamen</a>
            <a href="#" className="hover:text-[#FCD535] transition">Panduan</a>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <button onClick={() => safeNavigate('/admin')} className="hidden md:block px-5 py-2.5 bg-[#1E2329] text-[#FCD535] rounded-xl font-bold hover:bg-[#2B3139] border border-[#FCD535]/20 text-sm">
                  Buat Lomba
                </button>
                <button onClick={() => safeNavigate('/dashboard')} className="px-6 py-2.5 bg-[#2B3139] text-[#EAECEF] rounded-xl font-bold hover:bg-[#363c45] transition border border-[#2B3139] hover:border-[#FCD535]">
                  Dashboard
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => safeNavigate('/auth')} className="hidden md:block font-bold text-[#848E9C] hover:text-[#EAECEF] transition">
                  Masuk
                </button>
                <button onClick={() => safeNavigate('/auth')} className="px-6 py-2.5 bg-[#FCD535] text-black rounded-xl font-bold hover:bg-[#F0B90B] shadow-lg shadow-[#FCD535]/10 transition active:scale-95">
                  Daftar
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
        
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-[#FCD535] rounded-full blur-[150px] opacity-5 -z-10"></div>
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[150px] opacity-10 -z-10"></div>

        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FCD535]/10 text-[#FCD535] rounded-full font-bold text-xs uppercase tracking-widest mb-8 border border-[#FCD535]/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Zap size={14} fill="currentColor" /> Platform Trading Kompetitif #1
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#EAECEF] tracking-tight mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
            Buktikan Skill Trading,<br/>
            <span className="text-[#FCD535]">Raih Profit & Reputasi.</span>
          </h1>
          <p className="text-xl text-[#848E9C] mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both delay-200">
            Kompetisi trading real-time dengan validasi on-chain. Bangun portofolio terverifikasi dan menangkan hadiah crypto.
          </p>
          
          {/* Search Box */}
          <div className="bg-[#1E2329] p-3 rounded-3xl shadow-2xl shadow-black/50 border border-[#2B3139] flex flex-col md:flex-row gap-3 max-w-xl mx-auto animate-in fade-in scale-in duration-500 delay-500">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#848E9C]" size={20} />
              <input 
                type="text" 
                placeholder="Cari room trading..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-4 py-3 bg-[#0B0E11] rounded-2xl font-medium text-[#EAECEF] placeholder:text-[#474D57] focus:outline-none focus:ring-1 focus:ring-[#FCD535] transition border border-[#2B3139]"
              />
            </div>
            <button 
              onClick={() => document.getElementById('competitions')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3 bg-[#FCD535] text-black rounded-2xl font-bold hover:bg-[#F0B90B] transition shadow-lg flex items-center justify-center gap-2"
            >
              Jelajahi <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="border-y border-[#2B3139] bg-[#181A20]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatItem value="$5M+" label="Volume Trading" icon={<TrendingUp className="text-[#0ECB81]" />} />
          <StatItem value="12k+" label="Trader Aktif" icon={<Users className="text-[#3b82f6]" />} />
          <StatItem value="50+" label="Room Aktif" icon={<Trophy className="text-[#FCD535]" />} />
          <StatItem value="100%" label="On-Chain Verify" icon={<CheckCircle className="text-[#F6465D]" />} />
        </div>
      </section>

      {/* Rooms Grid */}
      <section id="competitions" className="py-24 bg-[#0B0E11]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-[#EAECEF] tracking-tight mb-2">Room Trading Live</h2>
              <p className="text-[#848E9C]">Pilih arena trading dan mulai berkompetisi.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#FCD535] animate-spin mb-4" />
              <p className="text-[#848E9C] font-bold">Memuat market data...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-24 bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] border-dashed">
              <div className="w-16 h-16 bg-[#2B3139] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#474D57]">
                <Trophy className="text-[#848E9C]" size={32} />
              </div>
              <p className="text-[#EAECEF] font-bold mb-2 text-lg">Belum ada room aktif.</p>
              <p className="text-sm text-[#848E9C]">Cek kembali nanti atau buat room baru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <div 
                  key={room.id} 
                  onClick={() => safeNavigate(`/lomba/${room.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="bg-[#1E2329] rounded-3xl border border-[#2B3139] p-4 hover:border-[#FCD535] hover:shadow-xl hover:shadow-[#FCD535]/5 transition-all duration-300 relative h-full flex flex-col">
                    {/* Header Image Placeholder */}
                    <div className="h-40 bg-[#0B0E11] rounded-2xl overflow-hidden relative mb-5 border border-[#2B3139] group-hover:border-[#474D57] transition-colors">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wallet size={40} className="text-[#2B3139] group-hover:text-[#FCD535] transition-colors duration-500" />
                      </div>
                      <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${room.is_premium ? 'bg-[#FCD535] text-black border-[#FCD535]' : 'bg-[#2B3139]/80 text-[#848E9C] border-[#848E9C]/20'} backdrop-blur`}>
                        {room.is_premium ? 'PREMIUM' : 'PUBLIC'}
                      </div>
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#0B0E11]/80 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-[#0ECB81] border border-[#0ECB81]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse"></span> LIVE
                      </div>
                    </div>

                    <div className="px-2 pb-2 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-[#EAECEF] mb-2 leading-tight group-hover:text-[#FCD535] transition-colors line-clamp-2">
                        {room.title}
                      </h3>
                      <p className="text-[#848E9C] text-xs font-mono mb-6 line-clamp-1">
                        Creator: {room.creator_wallet.slice(0, 8)}...
                      </p>
                      
                      <div className="mt-auto pt-4 border-t border-[#2B3139] space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#848E9C] flex items-center gap-2"><Clock size={14}/> Start</span>
                          <span className="text-[#EAECEF] font-bold">{new Date(room.start_time).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#848E9C] flex items-center gap-2"><CheckCircle size={14}/> End</span>
                          <span className="text-[#EAECEF] font-bold">{new Date(room.end_time).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#181A20] text-[#EAECEF] py-12 mt-20 border-t border-[#2B3139]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2B3139] rounded-xl flex items-center justify-center border border-[#474D57]">
              <TrendingUp className="text-[#FCD535] w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block">TradeHub</span>
              <span className="text-xs text-[#848E9C]">Decentralized Trading Proof</span>
            </div>
          </div>
          <p className="text-[#848E9C] text-sm font-medium">
            © 2024 TradeHub. Powered by Solana.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ value, label, icon }: { value: string, label: string, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="w-12 h-12 bg-[#2B3139] rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-[#363c45] group-hover:border-[#FCD535]/30 transition-colors">
        {icon}
      </div>
      <p className="text-3xl font-extrabold text-[#EAECEF] tracking-tight mb-1">{value}</p>
      <p className="text-xs font-bold text-[#848E9C] uppercase tracking-widest">{label}</p>
    </div>
  );
}