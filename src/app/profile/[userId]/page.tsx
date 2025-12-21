"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Calendar, 
  TrendingUp, 
  Share2, 
  CheckCircle,
  Loader2,
  ArrowLeft,
  User
} from 'lucide-react';
// Import sekarang akan berhasil karena file src/lib/supabase.ts sudah dibuat ulang di atas
import { supabase } from '../../../lib/supabase';

interface Achievement {
  id: string;
  room_id: string; // Menggunakan room_id sesuai schema baru
  competition_id?: string; // Fallback
  profit: number;
  initial_balance: number;
  current_balance: number;
  created_at?: string;
  joined_at?: string;
  status: string;
  wallet_address?: string;
  room_title?: string;
}

export default function PublicProfile({ params }: { params: { userId: string } }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [traderName, setTraderName] = useState("Trader");

  const userId = params.userId;

  // Helper Copy Link
  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link profil berhasil disalin!");
  };

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 1. Ambil Data Prestasi (Verified Only) dari tabel 'participants'
        // Kita asumsikan kolom user_id ada. Jika menggunakan wallet address sebagai ID, query harus disesuaikan.
        // Di sini kita gunakan 'user_id' sesuai dengan auth Supabase.
        const { data, error } = await supabase
          .from('participants')
          .select('*')
          .eq('user_id', userId)
          //.eq('status', 'verified') // Uncomment jika ingin memfilter hanya yang verified
          .order('joined_at', { ascending: false });

        if (error) throw error;
        
        // Mocking room titles atau fetch manual jika perlu
        // Karena tidak ada relasi langsung join di client side sederhana, kita gunakan ID
        const enrichedData = data.map((item: any) => ({
          ...item,
          room_title: `Tournament #${item.room_id ? item.room_id.slice(0,4) : 'Unknown'}`,
          // Hitung profit jika belum ada di DB
          profit: item.profit !== undefined 
            ? item.profit 
            : (item.initial_balance > 0 
                ? ((item.current_balance - item.initial_balance) / item.initial_balance) * 100 
                : 0)
        }));

        setAchievements(enrichedData);
        
        // Set nama trader dari data pertama
        if (data && data.length > 0) {
           const wallet = data[0].wallet_address;
           setTraderName(wallet ? `Trader ${wallet.slice(0,6)}...` : "Elite Trader");
        }

      } catch (err) {
        console.error("Gagal memuat profil:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center text-[#FCD535]">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30">
      {/* Header Profile */}
      <div className="bg-[#181A20] border-b border-[#2B3139] pt-20 pb-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
          
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-[#FCD535] to-orange-500 rounded-full p-1 shadow-2xl shadow-orange-500/20">
              <div className="w-full h-full bg-[#0B0E11] rounded-full flex items-center justify-center">
                <User size={64} className="text-[#EAECEF]" />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-[#0ECB81] text-black text-xs font-bold px-3 py-1 rounded-full border-2 border-[#181A20] flex items-center gap-1">
              <CheckCircle size={12} /> PRO
            </div>
          </div>

          {/* Info */}
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-extrabold text-white mb-2">{traderName}</h1>
            <p className="text-[#848E9C] font-mono text-sm mb-6">UID: {userId.slice(0,8)}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-[#2B3139] px-4 py-2 rounded-xl border border-[#363c45] flex items-center gap-2">
                <Trophy className="text-[#FCD535]" size={18} />
                <span className="font-bold">{achievements.length} Participations</span>
              </div>
              <div className="bg-[#2B3139] px-4 py-2 rounded-xl border border-[#363c45] flex items-center gap-2">
                <TrendingUp className="text-[#0ECB81]" size={18} />
                <span className="font-bold">Active Trader</span>
              </div>
            </div>
          </div>

          {/* Share Action */}
          <button 
            onClick={copyToClipboard}
            className="bg-[#EAECEF] text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white transition shadow-lg"
          >
            <Share2 size={18} /> Bagikan Profil
          </button>
        </div>
      </div>

      {/* Content Achievements */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
          <Medal className="text-[#FCD535]" /> Rekam Jejak Trading
        </h2>

        {achievements.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[#2B3139] rounded-3xl text-[#848E9C]">
            <p>Belum ada riwayat trading yang ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {achievements.map((item) => (
              <div key={item.id} className="bg-[#1E2329] p-6 rounded-3xl border border-[#2B3139] hover:border-[#FCD535] transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FCD535]/10 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center border border-[#474D57]">
                    <Trophy className="text-[#FCD535]" size={24} />
                  </div>
                  <span className="text-[#848E9C] text-xs font-mono flex items-center gap-1 bg-[#0B0E11] px-2 py-1 rounded">
                    <Calendar size={12} /> {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#FCD535] transition-colors">
                  {item.room_title}
                </h3>
                <p className="text-xs text-[#848E9C] mb-6 font-mono">ID: {item.room_id.slice(0,8)}...</p>

                <div className="flex gap-4 pt-4 border-t border-[#2B3139]">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#848E9C]">Total Profit</p>
                    <p className={`text-lg font-bold ${item.profit >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#848E9C]">Saldo Akhir</p>
                    <p className="text-lg font-bold text-[#EAECEF]">{item.current_balance?.toFixed(2)} SOL</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-6">
        <button onClick={() => safeNavigate('/')} className="bg-[#2B3139]/80 backdrop-blur text-[#EAECEF] px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-[#363c45] border border-[#474D57]">
          <ArrowLeft size={16} /> Back to TradeHub
        </button>
      </div>
    </div>
  );
}