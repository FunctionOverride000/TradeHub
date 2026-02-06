"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings as SettingsIcon, 
  Loader2, 
  ShieldCheck, 
  Bell, 
  Lock, 
  Mail, 
  Save, 
  Copy, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  KeyRound, 
  X,
  Menu,
  Shield,
  Trash2,
  Smartphone,
  Download,
  CheckCircle 
} from 'lucide-react';

// FIX: Import createClient from local helper
import { createClient } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/lib/LanguageSwitcher';
import { useRouter } from 'next/navigation'; // FIX: Use standard Next.js router

// --- IMPORT COMPONENT BARU ---
import UserSidebar from '@/components/dashboard/UserSidebar';

// Initialize Supabase using the helper (cookie-based)
const supabase = createClient();

export default function SettingsPage() {
  const { t } = useLanguage();
  const router = useRouter(); // FIX: Initialize router
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // State profil pengguna
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isNotifActive, setIsNotifActive] = useState(true);
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  // --- STATE REAL 2FA (MFA TOTP) ---
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [mfaEnrollData, setMfaEnrollData] = useState<{qr_code: string, id: string, secret: string} | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  // State Ganti Kata Sandi
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // State Hapus Akun
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState(""); 
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletePass, setShowDeletePass] = useState(false);

  // State Pesan UI
  const [uiMessage, setUiMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const safeNavigate = (path: string) => {
    router.push(path); // FIX: Use router.push for smooth navigation
  };

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setUiMessage({ text, type });
    setTimeout(() => setUiMessage(null), 5000);
  };

  // 1. Sinkronisasi Sesi & Cek Status MFA
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          // safeNavigate('/auth'); // Removed automatic redirect on load
           router.replace('/auth');
           return;
        }

        setUser(session.user);
        setEmail(session.user.email || "");
        setFullName(session.user.user_metadata?.full_name || "");
        
        setIsNotifActive(session.user.user_metadata?.notif_active !== false);

        await checkMFAStatus();
      } catch (err) {
        console.error("Gagal memuat sesi:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
          router.replace('/auth');
      } else if (event === 'TOKEN_REFRESHED') {
          setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const checkMFAStatus = async () => {
    try {
      const { data: factors, error } = await (supabase.auth as any).mfa.listFactors();
      if (error) throw error;
      
      const activeFactor = factors?.totp?.find((f: any) => f.status === 'verified');
      if (activeFactor) {
        setIs2FAEnabled(true);
        setMfaFactorId(activeFactor.id);
      } else {
        setIs2FAEnabled(false);
        setMfaFactorId(null);
      }
    } catch (err: any) {
      console.error("Gagal cek status MFA", err.message);
    }
  };

  // --- LOGIKA REAL MFA / 2FA ---
  const handleStartEnroll2FA = async () => {
    if (is2FALoading) return;
    setIs2FALoading(true);
    try {
      // Bersihkan faktor unverified sebelumnya
      const { data: factors } = await (supabase.auth as any).mfa.listFactors();
      const unverifiedFactors = factors?.totp?.filter((f: any) => f.status === 'unverified') || [];
      
      for (const factor of unverifiedFactors) {
        await (supabase.auth as any).mfa.unenroll({ factorId: factor.id });
      }

      const uniqueFriendlyName = `Auth-${email}-${Date.now().toString().slice(-5)}`;

      const { data, error } = await (supabase.auth as any).mfa.enroll({
        factorType: 'totp',
        issuer: 'TradeHub',
        friendlyName: uniqueFriendlyName
      });

      if (error) throw error;
      
      setMfaEnrollData({ 
        qr_code: data.totp.qr_code, 
        id: data.id,
        secret: data.totp.secret
      });
    } catch (err: any) {
      showMsg(err.message || "Failed to start enrollment", 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleCancelEnrollment = async () => {
    if (!mfaEnrollData) return;
    setIs2FALoading(true);
    try {
      await (supabase.auth as any).mfa.unenroll({ factorId: mfaEnrollData.id });
      setMfaEnrollData(null);
      setVerificationCode("");
      showMsg("Enrollment cancelled.");
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
      const { data: challengeData, error: challengeError } = await (supabase.auth as any).mfa.challenge({
        factorId: mfaEnrollData.id
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await (supabase.auth as any).mfa.verify({
        factorId: mfaEnrollData.id,
        challengeId: challengeData.id,
        code: verificationCode
      });

      if (verifyError) throw verifyError;

      setIs2FAEnabled(true);
      setMfaFactorId(mfaEnrollData.id);
      setMfaEnrollData(null);
      setVerificationCode("");
      showMsg("2FA successfully enabled!");
    } catch (err: any) {
      showMsg("Kode verifikasi salah atau kadaluarsa.", 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleUnenroll2FA = async () => {
    if (!mfaFactorId || !window.confirm("Are you sure you want to disable 2FA?")) return;
    setIs2FALoading(true);
    try {
      await (supabase.auth as any).mfa.unenroll({ factorId: mfaFactorId });
      setIs2FAEnabled(false);
      setMfaFactorId(null);
      showMsg("2FA has been disabled.");
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setIs2FALoading(false);
    }
  };

  // --- FUNGSI BARU: DOWNLOAD QR ---
  const handleDownloadQR = () => {
    if (!mfaEnrollData?.qr_code) return;
    try {
      const link = document.createElement('a');
      link.href = mfaEnrollData.qr_code;
      link.download = `tradehub-2fa-qr-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showMsg("QR Code downloaded!");
    } catch (e) {
      showMsg("Failed to download QR.", 'error');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (error) throw error;
      showMsg("Profile successfully updated!");
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg("Passwords do not match!", 'error');
      return;
    }
    setPassLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showMsg("Password successfully updated!");
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
      showMsg(`Notifications ${newState ? 'enabled' : 'disabled'}`);
    } catch (err) {
      showMsg("Failed to update preferences.", 'error');
    } finally {
      setIsNotifLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteInput || !user) return;
    setIsDeleting(true);

    try {
      if (is2FAEnabled && mfaFactorId) {
        const { data: challenge, error: challengeError } = await (supabase.auth as any).mfa.challenge({ factorId: mfaFactorId });
        if (challengeError) throw challengeError;

        const { error: verifyError } = await (supabase.auth as any).mfa.verify({
          factorId: mfaFactorId,
          challengeId: challenge.id,
          code: deleteInput
        });

        if (verifyError) throw new Error("Kode 2FA salah atau kadaluarsa.");

      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email,
          password: deleteInput
        });

        if (authError) throw new Error("Kata sandi salah.");
      }

      const { error: deleteDataError } = await supabase.from('participants').delete().eq('user_id', user.id);
      
      if (deleteDataError) {
        console.error("Gagal hapus data partisipan:", deleteDataError);
      }

      const { error: deleteFuncError } = await supabase.functions.invoke('delete-user');
      
      if (deleteFuncError) {
          console.error("Gagal menghapus user via function:", deleteFuncError);
          throw new Error("Gagal menghapus akun dari sistem autentikasi. Pastikan fungsi 'delete-user' sudah dideploy.");
      }

      await supabase.auth.signOut();
      
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }

      setIsDeleteModalOpen(false);
      window.location.href = '/auth'; 
      
    } catch (err: any) {
      showMsg(err.message || "Gagal menghapus akun.", 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
        localStorage.clear();
    }
    router.replace('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[#848E9C] font-black uppercase tracking-[0.4em] text-[10px]">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30 relative overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <UserSidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        safeNavigate={safeNavigate}
        handleLogout={handleLogout}
      />

      {/* --- KONTEN UTAMA --- */}
      <main className="flex-1 flex flex-col lg:ml-72 min-w-0 bg-[#0B0E11] relative overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

        {/* Notifikasi Floating */}
        {uiMessage && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            uiMessage.type === 'success' ? 'bg-[#0ECB81]/10 border-[#0ECB81]/50 text-[#0ECB81]' : 'bg-[#F6465D]/10 border-[#F6465D]/50 text-[#F6465D]'
          }`}>
            {uiMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span className="text-sm font-bold">{uiMessage.text}</span>
          </div>
        )}

        <header className="relative z-50 px-6 lg:px-10 py-6 lg:py-8 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#FCD535] active:scale-95 transition-all">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-black tracking-tighter italic uppercase text-white leading-none">{t.dashboard.sidebar.settings}</h1>
              <p className="hidden sm:flex items-center gap-2 text-[#848E9C] text-[10px] uppercase tracking-[0.2em] mt-2">Account Control & Security</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button 
              onClick={() => safeNavigate(`/profile/${user?.id}`)}
              className="flex items-center gap-4 px-4 py-2 bg-[#1E2329] border border-[#2B3139] rounded-2xl hover:bg-[#2B3139] transition-all group active:scale-95 text-left shadow-lg"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#EAECEF] group-hover:text-[#FCD535] transition-colors">
                  {fullName || email.split('@')[0]}
                </p>
                <p className="text-[10px] text-[#474D57] font-mono tracking-tighter uppercase">
                  UID: {user?.id?.substring(0,8)}
                </p>
              </div>
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full bg-gradient-to-tr from-[#181A20] to-[#2B3139] border border-[#474D57] flex items-center justify-center text-[#EAECEF] font-black shadow-lg group-hover:border-[#FCD535]/50 transition-all overflow-hidden relative">
                {email ? email[0].toUpperCase() : 'T'}
              </div>
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-4xl mx-auto relative z-10 pb-24">
          
          {/* Section: Profil */}
          <div className="mb-12">
            <h2 className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-2 mb-6 flex items-center gap-2">
              <User size={14} className="text-[#FCD535]" /> Profile Information
            </h2>
            
            <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] p-8 shadow-2xl">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">User ID (Public)</label>
                    <div className="flex items-center gap-2 bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139]">
                      <span className="font-mono text-xs text-[#EAECEF] flex-1 truncate">{user?.id}</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(user.id); showMsg("UID Copied!"); }} className="p-2 hover:bg-[#2B3139] rounded-xl transition text-[#848E9C] hover:text-[#FCD535]">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">Registered Email</label>
                    <div className="flex items-center gap-3 bg-[#0B0E11]/50 p-4 rounded-2xl border border-[#2B3139] opacity-70 cursor-not-allowed">
                      <Mail size={16} className="text-[#474D57]" />
                      <span className="text-sm text-[#848E9C]">{email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">Display Name / Alias</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-medium"
                    placeholder="Enter your name..."
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button type="submit" disabled={isSaving} className="bg-[#FCD535] text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F0B90B] transition active:scale-95 disabled:opacity-50 shadow-lg shadow-[#FCD535]/10">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} SAVE PROFILE
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Section: Keamanan Akun & 2FA */}
          <div className="mb-12">
            <h2 className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-2 mb-6 flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#0ECB81]" /> Account Security
            </h2>
            
            <div className="bg-[#1E2329] rounded-[2rem] border border-[#2B3139] divide-y divide-[#2B3139] shadow-2xl overflow-hidden">
              <SecurityItem 
                icon={<Bell size={20} className="text-[#3b82f6]" />}
                title="Email Notifications"
                desc="Send weekly performance reports to registered email."
                isToggle isActive={isNotifActive} onToggle={handleToggleNotif} isLoading={isNotifLoading}
              />
              <SecurityItem 
                icon={<Shield size={20} className="text-[#0ECB81]" />}
                title="Two Factor (2FA)"
                desc={is2FAEnabled ? "Login protection active using TOTP." : "Secure your account with high-level TOTP encryption (MFA)."}
                isToggle isActive={is2FAEnabled} onToggle={is2FAEnabled ? handleUnenroll2FA : handleStartEnroll2FA} isLoading={is2FALoading}
              />
            </div>

            {/* AREA MFA AKTIVASI */}
            {mfaEnrollData && (
              <div className="mt-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-[#181A20] rounded-[2.5rem] border border-[#FCD535]/30 overflow-hidden relative shadow-2xl">
                    {/* Background Decorative */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCD535]/5 rounded-full blur-[80px] pointer-events-none"></div>

                    <div className="p-8 lg:p-12 flex flex-col xl:flex-row gap-12 items-center xl:items-start relative z-10">
                      {/* KOLOM KIRI: QR CODE & SECRET */}
                      <div className="flex flex-col items-center gap-6 shrink-0 xl:border-r border-[#2B3139] xl:pr-12 w-full xl:w-auto">
                          {/* Container QR Code - Menggunakan img tag standar */}
                          <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center relative group">
                            <img 
                              src={mfaEnrollData.qr_code} 
                              alt="Scan QR" 
                              className="w-48 h-48 lg:w-56 lg:h-56 object-contain"
                            />
                            
                            {/* Tombol Download Overlay */}
                            <button 
                              onClick={handleDownloadQR}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-3xl backdrop-blur-sm"
                            >
                              <Download size={32} className="mb-2 text-[#FCD535]" />
                              <span className="text-xs font-bold uppercase tracking-widest">Download</span>
                            </button>
                          </div>
                          
                          {/* Tombol Download Mobile (Visible always) */}
                          <button 
                            onClick={handleDownloadQR}
                            className="lg:hidden flex items-center gap-2 text-[#FCD535] text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                          >
                             <Download size={16} /> Download QR Image
                          </button>
                          
                          <div className="w-full max-w-xs text-center space-y-3 mt-2">
                            <p className="text-[10px] font-black text-[#848E9C] uppercase tracking-[0.2em]">Manual Entry Key</p>
                            <div 
                              className="flex items-center gap-3 bg-[#0B0E11] border border-[#2B3139] p-4 rounded-2xl group hover:border-[#FCD535]/50 transition-colors cursor-pointer active:scale-95 overflow-hidden" 
                              onClick={() => { navigator.clipboard.writeText(mfaEnrollData.secret); showMsg("Secret key copied!"); }}
                            >
                               <KeyRound size={16} className="text-[#FCD535] shrink-0" />
                               <code className="text-sm font-mono text-[#EAECEF] flex-1 truncate tracking-widest">{mfaEnrollData.secret}</code>
                               <Copy size={16} className="text-[#474D57] group-hover:text-white shrink-0" />
                            </div>
                            <p className="text-[10px] text-[#474D57] break-words">Cannot scan? Enter this code manually in your authenticator app.</p>
                          </div>
                      </div>

                      {/* KOLOM KANAN: INSTRUKSI & INPUT */}
                      <div className="flex-1 flex flex-col justify-center space-y-8 w-full min-w-0">
                          <div className="space-y-4">
                             <h3 className="text-3xl font-black text-[#EAECEF] uppercase italic tracking-tighter">Setup Authenticator</h3>
                             <p className="text-[#848E9C] text-sm leading-relaxed max-w-md break-words">
                               Open <span className="text-white font-bold">Google Authenticator</span> or <span className="text-white font-bold">Authy</span> on your phone and scan the QR code. Enter the 6-digit code generated by the app to confirm setup.
                             </p>
                          </div>

                          <div className="space-y-6">
                             <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 bg-[#0B0E11] p-2 rounded-2xl border border-[#2B3139] focus-within:border-[#FCD535] transition-colors flex items-center shadow-inner">
                                   <div className="w-14 h-14 rounded-xl bg-[#1E2329] flex items-center justify-center text-[#FCD535] shrink-0">
                                      <Smartphone size={24} />
                                   </div>
                                   <input 
                                     type="text" 
                                     maxLength={6} 
                                     value={verificationCode}
                                     onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                     placeholder="000 000"
                                     className="flex-1 bg-transparent px-4 text-3xl font-mono tracking-[0.3em] text-white outline-none placeholder:text-[#2B3139] text-center sm:text-left h-full w-full min-w-0"
                                   />
                                </div>
                             </div>

                             <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                   onClick={handleVerifyEnrollment} 
                                   disabled={is2FALoading || verificationCode.length < 6}
                                   className="flex-1 bg-[#FCD535] text-black px-8 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#F0B90B] disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-[#FCD535]/10 flex items-center justify-center gap-2"
                                >
                                   {is2FALoading ? <Loader2 className="animate-spin" size={20} /> : <>ACTIVATE 2FA <CheckCircle size={18}/></>}
                                </button>
                                
                                <button onClick={handleCancelEnrollment} className="px-6 py-5 rounded-2xl border border-[#2B3139] hover:bg-[#2B3139] text-[#848E9C] hover:text-[#EAECEF] transition-all font-bold uppercase tracking-widest text-xs">
                                    Cancel
                                </button>
                             </div>
                          </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Kata Sandi */}
          <div className="mb-12">
            <h2 className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-2 mb-6 flex items-center gap-2">
              <KeyRound size={14} className="text-[#FCD535]" /> Account Password
            </h2>
            
            <div className="bg-[#1E2329] rounded-[2rem] border border-[#2B3139] p-8 shadow-2xl">
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">New Password</label>
                    <div className="relative">
                      <input 
                        type={showPass ? "text" : "password"} value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-5 pr-12 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-medium"
                        placeholder="At least 6 characters..."
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474D57] hover:text-[#848E9C]">
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#848E9C] uppercase px-1">Confirm Password</label>
                    <input 
                      type={showPass ? "text" : "password"} value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none transition font-medium"
                      placeholder="Repeat password..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={passLoading || !newPassword} className="bg-[#2B3139] text-[#EAECEF] hover:text-[#FCD535] px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 border border-[#363c45] transition active:scale-95 disabled:opacity-50">
                    {passLoading ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />} UPDATE PASSWORD
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Section: Hapus Akun (Danger Zone) */}
          <div className="mb-12">
            <h2 className="text-[10px] font-black text-[#F6465D] uppercase tracking-[0.4em] px-2 mb-6 flex items-center gap-2">
              <Trash2 size={14} /> Danger Zone
            </h2>
            
            <div className="bg-[#1E2329] rounded-[2rem] border border-[#F6465D]/30 p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-[#F6465D] opacity-50"></div>
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                    <h3 className="text-white font-bold text-lg mb-2">Delete Account</h3>
                    <p className="text-[#848E9C] text-xs leading-relaxed max-w-md">
                       Permanently remove your account and all associated data from TradeHub. 
                       <span className="block mt-2 text-[#F6465D] font-bold">
                         {is2FAEnabled ? "Requires 2FA verification." : "Requires password confirmation."}
                       </span>
                       <span className="block mt-1 text-[#0ECB81] italic">
                         * Arenas created by you will remain active on the platform.
                       </span>
                    </p>
                 </div>
                 <button 
                   onClick={() => { setIsDeleteModalOpen(true); setDeleteInput(""); }}
                   className="bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/50 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F6465D] hover:text-white transition active:scale-95"
                 >
                   DELETE ACCOUNT
                 </button>
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- MODAL HAPUS AKUN --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-[#1E2329] rounded-[2.5rem] border border-[#F6465D]/50 w-full max-w-lg shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#F6465D]/5 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="p-10 relative z-10">
                 {/* Header Modal */}
                 <div className="flex justify-between items-start mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20">
                       <AlertTriangle size={28} />
                    </div>
                    <button onClick={() => setIsDeleteModalOpen(false)} className="p-2 text-[#474D57] hover:text-white transition-colors bg-[#0B0E11] rounded-xl border border-[#2B3139]">
                       <X size={18} />
                    </button>
                 </div>

                 <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">Confirm Deletion</h3>
                 <p className="text-sm text-[#848E9C] leading-relaxed mb-6 font-medium border-l-2 border-[#F6465D] pl-4">
                    This action will strictly delete your public profile and trading history. 
                    <span className="text-[#0ECB81] block mt-1">Your created Arenas will NOT be deleted.</span>
                    <br/>
                    {is2FAEnabled 
                      ? "Please enter the code from your authenticator app." 
                      : "Please enter your password to confirm ownership."
                    }
                 </p>
                 
                 <div className="relative mb-8">
                    <input 
                       type={!is2FAEnabled && !showDeletePass ? "password" : "text"}
                       value={deleteInput}
                       onChange={(e) => setDeleteInput(e.target.value)}
                       placeholder={is2FAEnabled ? "Enter 6-digit 2FA Code" : "Enter Password"}
                       className={`w-full bg-[#0B0E11] p-4 rounded-xl border border-[#2B3139] text-center font-bold text-sm tracking-wide text-white focus:border-[#F6465D] outline-none ${is2FAEnabled ? 'font-mono tracking-[0.5em] text-xl' : ''}`}
                       maxLength={is2FAEnabled ? 6 : undefined}
                    />
                    {!is2FAEnabled && (
                      <button 
                        type="button" 
                        onClick={() => setShowDeletePass(!showDeletePass)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474D57] hover:text-[#848E9C]"
                      >
                        {showDeletePass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                 </div>
                 
                 <button 
                    onClick={handleConfirmDelete}
                    disabled={isDeleting || !deleteInput}
                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all bg-[#F6465D] text-white hover:bg-[#D9344A] shadow-lg shadow-[#F6465D]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isDeleting ? <Loader2 size={16} className="animate-spin"/> : "CONFIRM DELETION"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- SUB KOMPONEN UI ---

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