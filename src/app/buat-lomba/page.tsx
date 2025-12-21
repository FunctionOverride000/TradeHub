"use client";

import React, { useState } from 'react';
import { 
  Trophy, 
  Wallet, 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  Tag, 
  AlignLeft, 
  Award,
  CheckCircle
} from 'lucide-react';
// Import sekarang akan berhasil karena file src/lib/supabase.ts sudah dibuat ulang di atas
import { supabase } from '../../lib/supabase';

export default function BuatLomba() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    wallet: '',
    category: 'Crypto',
    reward: '',
    date: '',
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Kita simpan ke tabel 'competitions' agar muncul di Landing Page
      // Field 'creator_wallet' kita simpan juga jika tabelnya mendukung, 
      // atau bisa dianggap sebagai metadata.
      const { error } = await supabase.from('competitions').insert([
        { 
          title: formData.title,
          category: formData.category,
          reward: formData.reward,
          date: formData.date, // Format YYYY-MM-DD
          description: formData.description,
          created_at: new Date().toISOString(),
          // Opsional: Jika Anda punya kolom creator_wallet di DB
          // creator_wallet: formData.wallet 
        }
      ]);

      if (error) throw error;

      alert('Lomba Berhasil Dibuat dan Tayang di Halaman Utama!');
      safeNavigate('/'); // Kembali ke Home agar melihat hasilnya
      
    } catch (err: any) {
      console.error(err);
      alert('Gagal membuat lomba: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex flex-col items-center justify-center p-6">
      
      <div className="w-full max-w-2xl">
        <button 
          onClick={() => safeNavigate('/')}
          className="flex items-center gap-2 text-[#848E9C] hover:text-[#EAECEF] mb-8 transition font-bold text-sm"
        >
          <ArrowLeft size={18} /> Kembali ke Beranda
        </button>

        <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] shadow-2xl overflow-hidden">
          
          {/* Header Form */}
          <div className="p-8 border-b border-[#2B3139] bg-[#1E2329] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FCD535] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-[#FCD535] rounded-2xl flex items-center justify-center text-black shadow-lg">
                <Trophy size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#EAECEF] tracking-tight">Buat Lomba Baru</h1>
                <p className="text-[#848E9C] text-sm">Publikasikan turnamen trading ke komunitas.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Input Judul */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest flex items-center gap-2">
                <Trophy size={12} /> Nama Lomba
              </label>
              <input 
                type="text" 
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Contoh: Global Solana Championship 2025" 
                className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-bold text-lg placeholder:font-normal placeholder:text-[#474D57]" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Kategori */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest flex items-center gap-2">
                  <Tag size={12} /> Kategori
                </label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none appearance-none"
                >
                  <option value="Crypto">Crypto</option>
                  <option value="Forex">Forex</option>
                  <option value="Stocks">Stocks</option>
                  <option value="Futures">Futures</option>
                </select>
              </div>

              {/* Input Tanggal */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> Tanggal Mulai
                </label>
                <input 
                  type="date" 
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none" 
                />
              </div>
            </div>

            {/* Input Reward */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest flex items-center gap-2">
                <Award size={12} /> Total Hadiah
              </label>
              <input 
                type="text" 
                name="reward"
                required
                value={formData.reward}
                onChange={handleChange}
                placeholder="Contoh: $10,000 USDC + NFT" 
                className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition" 
              />
            </div>

            {/* Input Wallet Admin */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest flex items-center gap-2">
                <Wallet size={12} /> Wallet Penyelenggara
              </label>
              <input 
                type="text" 
                name="wallet"
                required
                value={formData.wallet}
                onChange={handleChange}
                placeholder="Masukkan alamat wallet Solana Anda" 
                className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-mono text-sm" 
              />
            </div>

            {/* Input Deskripsi */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#848E9C] uppercase tracking-widest flex items-center gap-2">
                <AlignLeft size={12} /> Deskripsi Lengkap
              </label>
              <textarea 
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                placeholder="Jelaskan aturan main dan detail kompetisi..." 
                className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none h-32 resize-none transition leading-relaxed" 
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#FCD535] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#F0B90B] transition shadow-lg shadow-[#FCD535]/20 flex items-center justify-center gap-2 mt-4 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Memproses...
                </>
              ) : (
                <>
                  Publikasikan Lomba <CheckCircle size={20} />
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}