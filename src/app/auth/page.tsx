"use client";

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Github, 
  Chrome,
  Eye,
  EyeOff,
  TrendingUp,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

// Pastikan path ini sesuai dengan struktur folder Anda
import { supabase } from '../../lib/supabase'; 

// --- KOMPONEN POPUP (MODAL) ---
type PopupProps = {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
};

const CustomPopup = ({ isOpen, type, title, message, onClose }: PopupProps) => {
  if (!isOpen) return null;

  const colors = {
    success: { icon: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    error: { icon: 'text-[#F6465D]', bg: 'bg-[#F6465D]/10', border: 'border-[#F6465D]/20' },
    info: { icon: 'text-[#FCD535]', bg: 'bg-[#FCD535]/10', border: 'border-[#FCD535]/20' }
  };

  const style = colors[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-[#1E2329] border border-[#2B3139] w-full max-w-sm rounded-2xl shadow-2xl p-6 relative transform transition-all scale-100">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#848E9C] hover:text-white transition">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${style.bg} ${style.border} border`}>
            {type === 'success' && <CheckCircle2 className={`w-8 h-8 ${style.icon}`} />}
            {type === 'error' && <AlertTriangle className={`w-8 h-8 ${style.icon}`} />}
            {type === 'info' && <TrendingUp className={`w-8 h-8 ${style.icon}`} />}
          </div>

          <h3 className="text-xl font-bold text-[#EAECEF] mb-2">{title}</h3>
          <p className="text-[#848E9C] text-sm leading-relaxed mb-6">
            {message}
          </p>

          <button 
            onClick={onClose}
            className="w-full bg-[#2B3139] hover:bg-[#363c45] text-[#EAECEF] py-2.5 rounded-xl font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// --- HALAMAN UTAMA ---
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // State Popup
  const [popup, setPopup] = useState<{show: boolean, type: 'success' | 'error' | 'info', title: string, message: string}>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showPopup = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setPopup({ show: true, type, title, message });
  };

  useEffect(() => {
    // Cek session saat load
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) window.location.href = '/dashboard';
    };
    checkSession();

    // Listener auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.location.href = '/dashboard';
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // --- REGISTER ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        
        if (error) throw error;
        
        showPopup('success', 'Registrasi Berhasil!', 'Silakan cek email Anda untuk verifikasi akun sebelum login.');
        setIsLogin(true);
      }
    } catch (err: any) {
      showPopup('error', 'Gagal Masuk', err.message || "Terjadi kesalahan autentikasi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err: any) {
      showPopup('error', 'Gagal Login Sosial', `Tidak dapat login dengan ${provider}.`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535] selection:text-black">
      
      {/* Popup Component */}
      <CustomPopup 
        isOpen={popup.show} 
        type={popup.type} 
        title={popup.title} 
        message={popup.message} 
        onClose={() => setPopup(prev => ({ ...prev, show: false }))} 
      />

      {/* Bagian Kiri: Visual (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 bg-[#181A20] border-r border-[#2B3139] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#FCD535] rounded-full blur-[120px] opacity-5"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-600 rounded-full blur-[100px] opacity-10"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg shadow-[#FCD535]/10">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">TradeHub</span>
          </div>
          
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            Mulai Perjalanan <br /> <span className="text-[#FCD535]">Trading Pro</span> Anda.
          </h1>
          <p className="text-[#848E9C] text-lg max-w-md leading-relaxed">
            Platform trading terpercaya dengan analitik real-time dan eksekusi tercepat di kelasnya.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-[#1E2329]/80 p-4 rounded-2xl border border-[#2B3139] max-w-sm backdrop-blur-md">
           <div className="flex -space-x-3">
             {[1, 2, 3].map((i) => (
               <div key={i} className="w-10 h-10 rounded-full border-2 border-[#1E2329] bg-[#2B3139] flex items-center justify-center text-xs font-bold text-gray-400">
                 U{i}
               </div>
             ))}
           </div>
           <p className="text-sm text-[#EAECEF] font-medium">+2,000 trader aktif</p>
        </div>
      </div>

      {/* Bagian Kanan: Form Auth */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-24 py-12 bg-[#0B0E11]">
        <div className="max-w-md w-full mx-auto">
          
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-[#FCD535] rounded-lg flex items-center justify-center">
              <TrendingUp className="text-black w-5 h-5" />
            </div>
            <span className="text-xl font-bold">TradeHub</span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-2 text-[#EAECEF]">
              {isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
            </h2>
            <p className="text-[#848E9C]">
              {isLogin ? 'Masuk untuk mengakses dashboard trading Anda.' : 'Daftar gratis dan mulai trading hari ini.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#848E9C] uppercase tracking-wider">Nama Lengkap</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#FCD535] transition w-5 h-5" />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full pl-11 pr-4 py-3 bg-[#1E2329] border border-[#2B3139] rounded-xl focus:ring-1 focus:ring-[#FCD535] focus:border-[#FCD535] outline-none transition text-[#EAECEF] placeholder:text-[#474D57]"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#848E9C] uppercase tracking-wider">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#FCD535] transition w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-[#1E2329] border border-[#2B3139] rounded-xl focus:ring-1 focus:ring-[#FCD535] focus:border-[#FCD535] outline-none transition text-[#EAECEF] placeholder:text-[#474D57]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#848E9C] uppercase tracking-wider">Kata Sandi</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => showPopup('info', 'Lupa Sandi?', 'Silakan hubungi admin atau cek email reset password.')} 
                    className="text-xs font-bold text-[#FCD535] hover:text-[#F0B90B] transition"
                  >
                    Lupa Sandi?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C] group-focus-within:text-[#FCD535] transition w-5 h-5" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-[#1E2329] border border-[#2B3139] rounded-xl focus:ring-1 focus:ring-[#FCD535] focus:border-[#FCD535] outline-none transition text-[#EAECEF] placeholder:text-[#474D57]"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848E9C] hover:text-[#EAECEF] p-1 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#FCD535] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#F0B90B] active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-[#FCD535]/10"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-[#2B3139]"></div>
            <span className="text-[10px] font-bold text-[#474D57] tracking-widest">LANJUTKAN DENGAN</span>
            <div className="flex-1 h-px bg-[#2B3139]"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleSocialLogin('google')} 
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-3 border border-[#2B3139] bg-[#1E2329]/50 rounded-xl hover:bg-[#2B3139] transition text-sm font-semibold text-[#EAECEF] disabled:opacity-50"
            >
              <Chrome className="w-4 h-4 text-[#F6465D]" /> Google
            </button>
            <button 
              onClick={() => handleSocialLogin('github')} 
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-3 border border-[#2B3139] bg-[#1E2329]/50 rounded-xl hover:bg-[#2B3139] transition text-sm font-semibold text-[#EAECEF] disabled:opacity-50"
            >
              <Github className="w-4 h-4 text-[#EAECEF]" /> Github
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-[#848E9C]">
            {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'} {' '}
            <button 
              onClick={() => { setIsLogin(!isLogin); setPopup(prev => ({...prev, show: false})); }} 
              className="text-[#FCD535] font-bold hover:underline transition"
            >
              {isLogin ? 'Daftar' : 'Masuk'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}