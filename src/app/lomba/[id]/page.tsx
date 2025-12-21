"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Wallet, 
  TrendingUp, 
  ArrowLeft, 
  Loader2, 
  RefreshCw, 
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Award,
  Clock
} from 'lucide-react';
// Import path yang benar: naik 3 level dari src/app/lomba/[id] ke src/
import { supabase } from '../../../lib/supabase'; 
import { getSolBalance } from '../../../lib/scanner'; 

// Interface sesuai tabel 'rooms'
interface Room {
  id: string;
  title: string;
  creator_wallet: string;
  start_time: string;
  end_time: string;
  is_premium: boolean;
}

// Interface sesuai tabel 'participants' (profit dihitung di client)
interface Participant {
  id: string;
  wallet_address: string;
  initial_balance: number;
  current_balance: number;
  joined_at: string;
  profit?: number;
}

export default function DetailLomba() {
  const [id, setId] = useState<string>("");
  const [room, setRoom] = useState<Room | null>(null);
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [user, setUser] = useState<any>(null);

  // Helper navigasi aman
  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 0. Ambil ID dari URL (Client-side safe way)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathSegments = window.location.pathname.split('/');
      const currentId = pathSegments[pathSegments.length - 1];
      if (currentId && currentId !== 'lomba') {
        setId(currentId);
      }
    }
  }, []);

  // 1. Cek User Auth
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, []);

  // 2. Fetch Detail Lomba & Leaderboard
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        // A. Ambil Detail Lomba (Tabel 'rooms')
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', id)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        // B. Ambil Leaderboard
        await loadLeaderboard();

      } catch (err) {
        console.error("Gagal memuat data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [id]);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', id);

      if (error) throw error;

      // Hitung profit secara manual di client
      const enrichedData = (data || []).map((p: any) => ({
        ...p,
        profit: p.initial_balance > 0 
          ? ((p.current_balance - p.initial_balance) / p.initial_balance) * 100 
          : 0
      }));

      // Urutkan berdasarkan profit tertinggi
      enrichedData.sort((a: any, b: any) => b.profit - a.profit);
      setParticipants(enrichedData);
    } catch (err) {
      console.error("Leaderboard error:", err);
    }
  };

  const handleJoin = async () => {
    if (!user) return alert("Silakan login terlebih dahulu untuk mendaftar!");
    if (!wallet) return alert("Masukkan alamat wallet Solana Anda!");
    
    setLoading(true);

    try {
      // 1. Cek Saldo Real-time via Alchemy Scanner
      const balance = await getSolBalance(wallet);

      // 2. Simpan ke Supabase (Tabel 'participants')
      // Note: Karena tabel Anda memiliki constraint UNIQUE(room_id, wallet_address),
      // insert akan gagal otomatis jika wallet sudah ada di room ini.
      const { error } = await supabase.from('participants').insert({
        room_id: id,
        wallet_address: wallet,
        initial_balance: balance,
        current_balance: balance
        // joined_at default now()
      });

      if (error) {
        if (error.code === '23505') throw new Error("Wallet ini sudah terdaftar di room ini.");
        throw error;
      }

      alert(`Berhasil bergabung! Saldo terkunci: ${balance.toFixed(4)} SOL`);
      setWallet("");
      loadLeaderboard(); // Refresh list

    } catch (err: any) {
      console.error(err);
      alert("Gagal mendaftar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11] text-[#848E9C]">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#FCD535]" />
        <p className="text-xs font-bold uppercase tracking-widest">Memuat Room Data...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11] text-[#EAECEF] p-6">
        <AlertCircle className="w-16 h-16 text-[#F6465D] mb-4" />
        <h1 className="text-2xl font-bold mb-2">Room Tidak Ditemukan</h1>
        <button onClick={() => safeNavigate('/')} className="mt-4 px-6 py-2 bg-[#2B3139] rounded-xl hover:bg-[#363c45] text-sm font-bold transition">
          Kembali ke Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans p-6 md:p-12">
      <button 
        onClick={() => safeNavigate('/')}
        className="flex items-center gap-2 text-[#848E9C] hover:text-[#EAECEF] mb-8 transition font-bold text-sm"
      >
        <ArrowLeft size={18} /> Kembali
      </button>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Info & Join Form */}
        <div className="lg:col-span-1 space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${room.is_premium ? 'bg-[#FCD535]/10 text-[#FCD535] border-[#FCD535]/20' : 'bg-[#2B3139] text-[#848E9C] border-[#2B3139]'}`}>
                {room.is_premium ? 'Premium Room' : 'Public Room'}
              </span>
              <span className="flex items-center gap-1 text-[#848E9C] text-xs font-bold">
                <Users size={12} /> {participants.length} Traders
              </span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight mb-4 text-white">{room.title}</h1>
            
            <div className="space-y-3">
               <div className="flex items-center justify-between p-3 bg-[#1E2329] rounded-xl border border-[#2B3139]">
                 <span className="text-[#848E9C] text-xs font-bold uppercase flex items-center gap-2">
                   <Clock size={14} /> Start
                 </span>
                 <span className="font-mono text-sm font-bold">{new Date(room.start_time).toLocaleDateString()}</span>
               </div>
               <div className="flex items-center justify-between p-3 bg-[#1E2329] rounded-xl border border-[#2B3139]">
                 <span className="text-[#848E9C] text-xs font-bold uppercase flex items-center gap-2">
                   <CheckCircle size={14} /> End
                 </span>
                 <span className="font-mono text-sm font-bold">{new Date(room.end_time).toLocaleDateString()}</span>
               </div>
            </div>
            
            <p className="text-[#848E9C] text-xs font-mono mt-4 break-all opacity-60">Creator: {room.creator_wallet}</p>
          </div>

          {/* Join Form */}
          <div className="bg-[#1E2329] p-6 rounded-3xl border border-[#2B3139] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535] rounded-full blur-[80px] opacity-5 pointer-events-none"></div>
            
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-[#EAECEF]">
              <Wallet className="text-[#FCD535]" size={20} /> Join Room
            </h2>
            <p className="text-[#848E9C] text-xs mb-6">
              Masukkan wallet address Solana untuk snapshot saldo awal.
            </p>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Solana Wallet Address"
                className="w-full px-4 py-3 bg-[#0B0E11] border border-[#2B3139] rounded-xl text-[#EAECEF] text-sm focus:ring-1 focus:ring-[#FCD535] outline-none transition font-mono placeholder:text-[#474D57]"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              />
              <button 
                onClick={handleJoin}
                disabled={loading}
                className="w-full bg-[#FCD535] text-black font-bold py-3 rounded-xl hover:bg-[#F0B90B] disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-[#FCD535]/10"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Daftar Sekarang'}
              </button>
            </div>
            {!user && (
              <p className="text-center text-[10px] text-[#F6465D] mt-4 font-bold">
                * Login diperlukan untuk mencatat partisipasi
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[#EAECEF]">
              <TrendingUp className="text-[#0ECB81]" /> Live Leaderboard
            </h2>
            <button 
              onClick={() => loadLeaderboard()}
              className="flex items-center gap-2 text-xs font-bold text-[#FCD535] hover:underline bg-[#1E2329] px-3 py-1.5 rounded-lg border border-[#2B3139]"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          <div className="bg-[#1E2329] rounded-3xl overflow-hidden border border-[#2B3139] shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#2B3139] text-[#848E9C] text-[10px] uppercase tracking-wider font-bold border-b border-[#363c45]">
                  <tr>
                    <th className="p-5">Rank</th>
                    <th className="p-5">Wallet</th>
                    <th className="p-5 text-right">Initial (SOL)</th>
                    <th className="p-5 text-right">Current (SOL)</th>
                    <th className="p-5 text-right text-[#EAECEF]">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3139]">
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-[#848E9C]">
                        <div className="flex flex-col items-center gap-3">
                          <Users size={32} className="opacity-20" />
                          <span className="text-sm font-medium">Belum ada peserta. Jadilah yang pertama!</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    participants.map((p, index) => (
                      <tr key={p.id} className="hover:bg-[#2B3139]/50 transition text-sm group">
                        <td className="p-5 font-bold text-[#FCD535] flex items-center gap-2">
                          {index === 0 && <span className="text-lg">🥇</span>}
                          {index === 1 && <span className="text-lg">🥈</span>}
                          {index === 2 && <span className="text-lg">🥉</span>}
                          <span className={index < 3 ? "text-[#EAECEF]" : "text-[#848E9C]"}>#{index + 1}</span>
                        </td>
                        <td className="p-5 font-mono text-[#EAECEF] group-hover:text-[#FCD535] transition-colors">
                          {p.wallet_address.slice(0, 4)}...{p.wallet_address.slice(-4)}
                        </td>
                        <td className="p-5 text-right text-[#848E9C]">{p.initial_balance?.toFixed(2)}</td>
                        <td className="p-5 text-right text-[#EAECEF]">{p.current_balance?.toFixed(2)}</td>
                        <td className={`p-5 text-right font-bold ${p.profit! >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {p.profit! > 0 ? '+' : ''}{p.profit!.toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}