"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  User, 
  Wallet, 
  Send, 
  ArrowLeft, 
  Loader2, 
  CreditCard, 
  UploadCloud,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
// Import naik 4 level dari src/app/lomba/[id]/daftar/ ke src/lib/
import { supabase } from '../../../../lib/supabase'; 
import { getSolBalance } from '../../../../lib/scanner';

export default function DaftarLomba() {
  const [id, setId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    wallet: '',
    telegram: ''
  });

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 0. Ambil ID dari URL (Manual parsing untuk menghindari error next/navigation di env ini)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathSegments = window.location.pathname.split('/');
      // URL pattern: /lomba/[id]/daftar -> index ke-2 adalah ID
      // Contoh: /lomba/123/daftar -> split: ["", "lomba", "123", "daftar"]
      const currentId = pathSegments[2]; 
      if (currentId) setId(currentId);
    }
  }, []);

  // 1. Cek Auth
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Harap login terlebih dahulu.");
        safeNavigate('/auth');
      } else {
        setUser(session.user);
      }
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // A. Cek Saldo Awal (Snapshot)
      const balance = await getSolBalance(formData.wallet);
      
      // B. Cek Duplikasi (Pastikan menggunakan 'room_id' sesuai schema baru)
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('room_id', id)
        .eq('wallet_address', formData.wallet)
        .single();

      if (existing) {
        alert("Wallet ini sudah terdaftar di room ini!");
        safeNavigate('/dashboard');
        return;
      }

      // C. Insert Data
      const { error } = await supabase.from('participants').insert([
        {
          room_id: id,
          // user_id: user.id, // Aktifkan jika tabel participants punya kolom user_id
          wallet_address: formData.wallet,
          initial_balance: balance,
          current_balance: balance,
          // joined_at default now()
          status: 'pending'
        }
      ]);

      if (error) throw error;

      alert(`Pendaftaran Berhasil! Saldo terkunci: ${balance} SOL`);
      safeNavigate('/dashboard');

    } catch (err: any) {
      console.error(err);
      alert("Gagal mendaftar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex flex-col items-center justify-center p-6">
      
      <div className="w-full max-w-xl">
        <button 
          onClick={() => safeNavigate(`/lomba/${id}`)}
          className="flex items-center gap-2 text-[#848E9C] hover:text-[#EAECEF] mb-8 transition font-bold text-sm"
        >
          <ArrowLeft size={18} /> Kembali ke Detail
        </button>

        <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="p-8 border-b border-[#2B3139] bg-[#1E2329] relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-[#FCD535] rounded-2xl flex items-center justify-center text-black shadow-lg">
                <Trophy size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#EAECEF] tracking-tight">Formulir Pendaftaran</h1>
                <p className="text-[#848E9C] text-sm font-mono">Room ID: {id.substring(0,8)}...</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Info User */}
            <div className="bg-[#0B0E11] p-4 rounded-xl border border-[#2B3139] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2B3139] flex items-center justify-center text-[#FCD535] font-bold border border-[#474D57]">
                {user?.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div>
                <p className="text-[10px] text-[#848E9C] uppercase font-bold">Logged in as</p>
                <p className="text-sm font-bold text-[#EAECEF]">{user?.email}</p>
              </div>
            </div>

            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest flex items-center gap-2">
                <Wallet size={12} /> Wallet Solana (Wajib)
              </label>
              <input 
                type="text" 
                required
                value={formData.wallet}
                onChange={(e) => setFormData({...formData, wallet: e.target.value})}
                placeholder="Masukkan Public Key Solana..." 
                className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-mono text-sm" 
              />
              <p className="text-[10px] text-[#848E9C]">
                * Sistem akan otomatis membaca saldo on-chain saat ini.
              </p>
            </div>

            {/* Telegram ID */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Username Telegram
              </label>
              <input 
                type="text" 
                value={formData.telegram}
                onChange={(e) => setFormData({...formData, telegram: e.target.value})}
                placeholder="@username (untuk koordinasi hadiah)" 
                className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition" 
              />
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#FCD535] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#F0B90B] transition shadow-lg shadow-[#FCD535]/20 flex items-center justify-center gap-2 mt-4 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Memverifikasi...
                </>
              ) : (
                <>
                  Kirim Pendaftaran <Send size={18} />
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}