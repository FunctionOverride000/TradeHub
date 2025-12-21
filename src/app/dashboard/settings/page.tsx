"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Trophy, 
  User, 
  Settings as SettingsIcon, 
  LogOut, 
  CheckCircle, 
  Clock, 
  Award, 
  Loader2, 
  Medal, 
  TrendingUp, 
  BarChart2, 
  Wallet, 
  ShieldCheck, 
  Bell, 
  Lock, 
  Mail, 
  ChevronRight,
  Save, 
  Copy, 
  Check, 
  Globe, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  KeyRound,
  QrCode,
  X
} from 'lucide-react';

/**
 * Memperbaiki Build Error: Menggunakan impor standar lokal.
 * Pastikan '@supabase/supabase-js' tersedia dalam dependensi proyek Anda.
 */
import { createClient } from '@supabase/supabase-js';

// --- INISIALISASI SUPABASE ---
const supabaseUrl = 'https://vmvezylbaxlodkepstbj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmV6eWxiYXhsb2RrZXBzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTYxNzEsImV4cCI6MjA4MTU5MjE3MX0.a2_XxJKLRXrt_tn_UiMYTmpP1iGjul6OhaHI3IGzJCw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // State profil pengguna
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isNotifActive, setIsNotifActive] = useState(true);
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  // --- STATE REAL 2FA (MFA TOTP) ---
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [mfaEnrollData, setMfaEnrollData] = useState<{qr_code: string, id: string} | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  // State Ganti Kata Sandi
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // State Pesan UI
  const [uiMessage, setUiMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setUiMessage({ text, type });
    setTimeout(() => setUiMessage(null), 5000);
  };

  // 1. Sinkronisasi Sesi & Cek Status MFA
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          safeNavigate('/auth');
          return;
        }
        const currentUser = session.user;
        setUser(currentUser);
        setEmail(currentUser.email || "");
        setFullName(currentUser.user_metadata?.full_name || "");
        
        // Mengambil preferensi notifikasi dari metadata
        setIsNotifActive(currentUser.user_metadata?.notif_active !== false);

        await checkMFAStatus();
      } catch (err) {
        console.error("Gagal memuat sesi:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) safeNavigate('/auth');
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) return;
      
      const activeFactor = factors.totp.find((f: any) => f.status === 'verified');
      if (activeFactor) {
        setIs2FAEnabled(true);
        setMfaFactorId(activeFactor.id);
      } else {
        setIs2FAEnabled(false);
        setMfaFactorId(null);
      }
    } catch (err) {
      console.error("Gagal cek status MFA", err);
    }
  };

  // --- LOGIKA REAL MFA / 2FA ---

  const handleStartEnroll2FA = async () => {
    if (is2FALoading) return;
    setIs2FALoading(true);
    try {
      // Pembersihan otomatis: Hapus pendaftaran faktor yang tidak diverifikasi agar tidak bentrok
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const unverifiedFactors = factors?.totp.filter((f: any) => f.status === 'unverified') || [];
      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      // Mulai pendaftaran baru
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'TradeHub',
        friendlyName: `Auth-${Date.now()}`
      });

      if (error) throw error;
      setMfaEnrollData({ qr_code: data.totp.qr_code, id: data.id });
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleCancelEnrollment = async () => {
    if (!mfaEnrollData) return;
    setIs2FALoading(true);
    try {
      await supabase.auth.mfa.unenroll({ factorId: mfaEnrollData.id });
      setMfaEnrollData(null);
      setVerificationCode("");
      showMsg("Pendaftaran dibatalkan.");
    } catch (err) {
      setMfaEnrollData(null);
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!mfaEnrollData || !verificationCode) return;
    setIs2FALoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaEnrollData.id
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaEnrollData.id,
        challengeId: challengeData.id,
        code: verificationCode
      });

      if (verifyError) throw verifyError;

      setIs2FAEnabled(true);
      setMfaFactorId(mfaEnrollData.id);
      setMfaEnrollData(null);
      setVerificationCode("");
      showMsg("2FA Berhasil diaktifkan!");
    } catch (err: any) {
      showMsg("Kode verifikasi salah atau kadaluarsa.", 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleUnenroll2FA = async () => {
    if (!mfaFactorId || !window.confirm("Apakah Anda yakin ingin mematikan 2FA?")) return;
    setIs2FALoading(true);
    try {
      await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      setIs2FAEnabled(false);
      setMfaFactorId(null);
      showMsg("2FA telah dinonaktifkan.");
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  // --- PROFIL & PASSWORD ---

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (error) throw error;
      showMsg("Profil berhasil diperbarui!");
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg("Kata sandi tidak cocok!", 'error');
      return;
    }
    setPassLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showMsg("Kata sandi berhasil diperbarui!");
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setPassLoading(false);
    }
  };

  const handleToggleNotif = async () => {
    if (isNotifLoading) return;
    setIsNotifLoading(true);
    const newState = !isNotifActive;
    try {
      const { error } = await supabase.auth.updateUser({ 
        data: { notif_active: newState } 
      });
      if (error) throw error;
      setIsNotifActive(newState);
      showMsg(`Notifikasi ${newState ? 'diaktifkan' : 'dimatikan'}`);
    } catch (err) {
      showMsg("Gagal memperbarui preferensi.", 'error');
    } finally {
      setIsNotifLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    safeNavigate('/auth');
  };

  /**
   * Helper untuk merender kode QR secara visual dengan kontras tinggi.
   * Objek kembalian dijamin kompatibel dengan dangerouslySetInnerHTML.
   */
  const getQRCodeHtml = (dataUrl: string | null): { __html: string } => {
    if (!dataUrl) return { __html: "" };
    try {
      let svgContent = "";
      if (dataUrl.includes('base64,')) {
        svgContent = atob(dataUrl.split('base64,')[1]);
      } else if (dataUrl.includes('utf-8,')) {
        svgContent = decodeURIComponent(dataUrl.split('utf-8,')[1]);
      } else {
        svgContent = dataUrl;
      }
      
      // Memaksa warna hitam pada elemen SVG agar terlihat sangat jelas
      const styledSvg = svgContent
        .replace(/<svg/g, '<svg style="display:block; width:100%; height:100%;"')
        .replace(/fill="[^"]*"/g, 'fill="#000000"')
        .replace(/stroke="[^"]*"/g, 'stroke="#000000"');
      
      return { __html: styledSvg };
    } catch (e) {
      return { __html: '<p class="text-red-500 text-xs text-center font-bold">Gagal memuat QR</p>' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[#848E9C] font-bold tracking-[0.2em] uppercase text-xs text-center px-4">
          Menyiapkan Pengaturan...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30">
      
      {/* Notifikasi Floating */}
      {uiMessage && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          uiMessage.type === 'success' ? 'bg-[#0ECB81]/10 border-[#0ECB81]/50 text-[#0ECB81]' : 'bg-[#F6465D]/10 border-[#F6465D]/50 text-[#F6465D]'
        }`}>
          {uiMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-bold">{uiMessage.text}</span>
        </div>
      )}

      {/* Sidebar Navigasi */}
      <aside className="hidden md:flex flex-col w-72 bg-[#181A20] border-r border-[#2B3139] shrink-0">
        <div className="p-8 border-b border-[#2B3139]">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-lg flex items-center justify-center shadow-lg shadow-[#FCD535]/10">
              <TrendingUp className="text-black w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#EAECEF]">TradeHub</span>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <SidebarLink onClick={() => safeNavigate('/dashboard')} Icon={LayoutDashboard} label="Track Record" />
          <SidebarLink onClick={() => safeNavigate('/dashboard/pnl')} Icon={BarChart2} label="PnL Analysis" />
          <SidebarLink onClick={() => safeNavigate('/dashboard/certificates')} Icon={Award} label="Certificates" />
          <SidebarLink onClick={() => safeNavigate('/dashboard/wallet')} Icon={Wallet} label="Wallet" />
          <SidebarLink Icon={SettingsIcon} label="Settings" active />
        </nav>

        <div className="p-6 border-t border-[#2B3139]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139] rounded-xl transition font-medium text-sm"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <main className="flex-1 overflow-y-auto bg-[#0B0E11] relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

        <header className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#EAECEF]">Pengaturan</h1>
            <p className="text-[#848E9C] text-sm">Kelola profil dan keamanan akun perdagangan Anda</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-[#EAECEF]">{fullName || email.split('@')[0]}</p>
              <p className="text-xs text-[#848E9C] font-mono">UID: {user?.id?.substring(0,8)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#2B3139] border border-[#474D57] flex items-center justify-center text-[#EAECEF] font-bold shadow-lg shadow-black/20">
              {email ? email[0].toUpperCase() : 'T'}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto relative z-10 pb-24">
          
          {/* Section: Profil */}
          <div className="mb-12">
            <h2 className="text-sm font-bold text-[#848E9C] uppercase tracking-widest mb-6 flex items-center gap-2 px-2">
              <User size={16} className="text-[#FCD535]" /> Informasi Profil
            </h2>
            
            <div className="bg-[#1E2329] rounded-[2rem] border border-[#2B3139] p-8 shadow-2xl group transition-all hover:border-[#FCD535]/20">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">User ID (Public)</label>
                    <div className="flex items-center gap-2 bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139]">
                      <span className="font-mono text-xs text-[#EAECEF] flex-1 truncate">{user?.id}</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(user.id); showMsg("UID Disalin!"); }} className="p-2 hover:bg-[#2B3139] rounded-xl transition text-[#848E9C] hover:text-[#FCD535]">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">Email Terdaftar</label>
                    <div className="flex items-center gap-3 bg-[#0B0E11]/50 p-4 rounded-2xl border border-[#2B3139] opacity-70 cursor-not-allowed">
                      <Mail size={16} className="text-[#474D57]" />
                      <span className="text-sm text-[#848E9C]">{email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">Nama Tampilan / Alias</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-medium"
                    placeholder="Masukkan nama Anda..."
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button type="submit" disabled={isSaving} className="bg-[#FCD535] text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F0B90B] transition active:scale-95 disabled:opacity-50 shadow-lg shadow-[#FCD535]/10">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} SIMPAN PROFIL
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Section: Keamanan Akun & 2FA */}
          <div className="mb-12">
            <h2 className="text-sm font-bold text-[#848E9C] uppercase tracking-widest mb-6 flex items-center gap-2 px-2">
              <ShieldCheck size={16} className="text-[#0ECB81]" /> Keamanan Akun
            </h2>
            
            <div className="bg-[#1E2329] rounded-[2rem] border border-[#2B3139] divide-y divide-[#2B3139] shadow-2xl overflow-hidden">
              <SecurityItem 
                icon={<Bell size={20} className="text-[#3b82f6]" />}
                title="Notifikasi"
                desc="Kirim laporan performa mingguan ke email terdaftar (Tersimpan Nyata)."
                isToggle isActive={isNotifActive} onToggle={handleToggleNotif} isLoading={isNotifLoading}
              />
              <SecurityItem 
                icon={<ShieldCheck size={20} className="text-[#0ECB81]" />}
                title="Autentikasi Dua Faktor (2FA)"
                desc={is2FAEnabled ? "Perlindungan login aktif menggunakan TOTP." : "Amankan akun Anda dengan enkripsi TOTP tingkat tinggi (MFA)."}
                isToggle isActive={is2FAEnabled} onToggle={is2FAEnabled ? handleUnenroll2FA : handleStartEnroll2FA} isLoading={is2FALoading}
              />
            </div>

            {/* AREA MFA AKTIVASI - QR CODE & TATA LETAK RAPI */}
            {mfaEnrollData && (
              <div className="mt-6 bg-[#181A20] rounded-[2.5rem] border border-[#FCD535]/40 p-8 md:p-12 animate-in slide-in-from-top-4 duration-500 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FCD535] to-transparent opacity-30"></div>
                
                <div className="flex flex-col lg:flex-row gap-12 items-center">
                  
                  {/* Container QR Code - High Contrast */}
                  <div className="shrink-0 relative group">
                    <div className="absolute inset-0 bg-[#FCD535]/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center relative z-10 border-4 border-white overflow-hidden">
                      <div 
                        className="w-48 h-48 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:block" 
                        dangerouslySetInnerHTML={getQRCodeHtml(mfaEnrollData.qr_code)} 
                      />
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest border-t border-gray-100 pt-3 w-full justify-center">
                        <QrCode size={10} className="text-gray-400" /> Authenticator App
                      </div>
                    </div>
                  </div>

                  {/* Instruksi & Form Aktivasi yang Dirapikan */}
                  <div className="flex-1 space-y-6 w-full">
                    <div className="space-y-4 text-[#EAECEF]">
                      <div className="flex items-start gap-4">
                         <div className="w-10 h-10 rounded-2xl bg-[#FCD535] text-black flex items-center justify-center font-black shrink-0 shadow-lg shadow-[#FCD535]/20">1</div>
                         <p className="text-sm font-bold leading-relaxed text-[#EAECEF]">Buka aplikasi Google Authenticator atau Authy dan scan kode QR di samping.</p>
                      </div>
                      <div className="flex items-start gap-4 text-[#EAECEF]">
                         <div className="w-10 h-10 rounded-2xl bg-[#FCD535] text-black flex items-center justify-center font-black shrink-0 shadow-lg shadow-[#FCD535]/20">2</div>
                         <p className="text-sm font-bold leading-relaxed text-[#EAECEF]">Masukkan 6 digit kode yang muncul di aplikasi Anda untuk verifikasi:</p>
                      </div>
                    </div>
                    
                    {/* Kotak Input & Tombol AKTIFKAN yang Rapi dalam satu baris */}
                    <div className="bg-[#0B0E11] p-2 rounded-[2rem] border border-[#2B3139] flex flex-col md:flex-row items-center gap-2 shadow-inner group focus-within:border-[#FCD535]/50 transition-colors w-full overflow-hidden">
                      <input 
                        type="text" 
                        maxLength={6} 
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000 000"
                        className="flex-1 bg-transparent px-6 py-4 text-center font-mono text-3xl tracking-[0.2em] text-[#FCD535] outline-none transition-all placeholder:text-[#2B3139]/50 w-full"
                      />
                      <button 
                        onClick={handleVerifyEnrollment} 
                        disabled={is2FALoading || verificationCode.length < 6}
                        className="bg-[#FCD535] text-black px-10 py-5 rounded-[1.4rem] font-black hover:bg-[#F0B90B] transition active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest shadow-lg shrink-0 w-full md:w-auto"
                      >
                        {is2FALoading ? <Loader2 className="animate-spin" size={20} /> : "AKTIFKAN"}
                      </button>
                    </div>

                    <div className="flex justify-center sm:justify-start">
                      <button onClick={handleCancelEnrollment} className="inline-flex items-center gap-2 text-[10px] text-[#848E9C] hover:text-[#F6465D] uppercase tracking-widest font-black transition-colors px-4 py-2 hover:bg-[#F6465D]/10 rounded-xl">
                        <X size={14} /> Batalkan Pendaftaran
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Perbarui Kata Sandi */}
          <div className="mb-12">
            <h2 className="text-sm font-bold text-[#848E9C] uppercase tracking-widest mb-6 flex items-center gap-2 px-2">
              <KeyRound size={16} className="text-[#FCD535]" /> Kata Sandi Akun
            </h2>
            
            <div className="bg-[#1E2329] rounded-[2rem] border border-[#2B3139] p-8 shadow-2xl group overflow-hidden text-sm">
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">Sandi Baru</label>
                    <div className="relative">
                      <input 
                        type={showPass ? "text" : "password"} value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-5 pr-12 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-medium"
                        placeholder="Minimal 6 karakter..."
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474D57] hover:text-[#848E9C]">
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">Konfirmasi Sandi</label>
                    <input 
                      type={showPass ? "text" : "password"} value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-medium"
                      placeholder="Ketik ulang sandi..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={passLoading || !newPassword} className="bg-[#2B3139] text-[#EAECEF] hover:text-[#FCD535] px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 border border-[#363c45] transition active:scale-95 disabled:opacity-50 shadow-lg shadow-black/10">
                    {passLoading ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />} UPDATE SANDI
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB KOMPONEN UI ---

/**
 * SidebarLink yang diselaraskan dengan Dashboard Utama
 */
function SidebarLink({ Icon, label, active = false, onClick }: { Icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium cursor-pointer text-sm ${
      active ? 'bg-[#2B3139] text-[#FCD535]' : 'text-[#848E9C] hover:bg-[#2B3139] hover:text-[#EAECEF]'
    }`}>
      <Icon size={18} />
      <span>{label}</span>
    </div>
  );
}

function SecurityItem({ icon, title, desc, isToggle = false, isActive = false, onToggle, isLoading = false }: any) {
  return (
    <div className="p-6 flex items-center justify-between hover:bg-[#2B3139]/30 transition-all group">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-[#0B0E11] rounded-2xl flex items-center justify-center border border-[#2B3139] group-hover:border-[#FCD535]/30 transition-colors text-[#FCD535]">
          {isLoading ? <Loader2 size={24} className="animate-spin text-[#FCD535]" /> : icon}
        </div>
        <div>
          <h4 className="font-bold text-[#EAECEF] text-sm">{title}</h4>
          <p className="text-xs text-[#848E9C] mt-1 leading-relaxed max-w-xs">{desc}</p>
        </div>
      </div>
      {isToggle && (
        <button onClick={onToggle} disabled={isLoading} className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner ${isActive ? 'bg-[#0ECB81]' : 'bg-[#474D57]'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${isActive ? 'right-1' : 'left-1'}`}></div>
        </button>
      )}
    </div>
  );
}