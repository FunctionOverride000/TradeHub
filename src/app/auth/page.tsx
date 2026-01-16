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
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Smartphone // Added icon for clarity
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '../../lib/LanguageContext';
import { LanguageSwitcher } from '../../lib/LanguageSwitcher';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Hanya inisialisasi client jika URL & Key valid
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// --- KOMPONEN POPUP (MODAL) ---
type PopupProps = {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
};

const CustomPopup = ({ isOpen, type, title, message, onClose }: PopupProps) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const colors = {
    success: { icon: 'text-[#0ECB81]', bg: 'bg-[#0ECB81]/10', border: 'border-[#0ECB81]/20' },
    error: { icon: 'text-[#F6465D]', bg: 'bg-[#F6465D]/10', border: 'border-[#F6465D]/20' },
    info: { icon: 'text-[#FCD535]', bg: 'bg-[#FCD535]/10', border: 'border-[#FCD535]/20' }
  };

  const style = colors[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      <div className="bg-[#1E2329] border border-[#2B3139] w-full max-w-sm rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-10 relative transform transition-all scale-100 overflow-hidden text-center">
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-10 ${style.bg}`}></div>
        
        <button onClick={onClose} className="absolute top-6 right-6 text-[#848E9C] hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center relative z-10">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${style.bg} ${style.border} border shadow-lg`}>
            {type === 'success' && <CheckCircle2 className={`w-10 h-10 ${style.icon}`} />}
            {type === 'error' && <AlertTriangle className={`w-10 h-10 ${style.icon}`} />}
            {type === 'info' && <TrendingUp className={`w-10 h-10 ${style.icon}`} />}
          </div>

          <h3 className="text-2xl font-black text-[#EAECEF] mb-3 tracking-tighter uppercase italic leading-none">{title}</h3>
          <p className="text-[#848E9C] text-sm leading-relaxed mb-10 font-medium italic">
            {message}
          </p>

          <button 
            onClick={onClose}
            className="w-full bg-[#2B3139] hover:bg-[#363c45] text-[#EAECEF] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-[#363c45]"
          >
            {t.auth.popup_understand}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- HALAMAN UTAMA ---
export default function AuthPage() {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // --- STATE MFA (2FA) ---
  const [showMFA, setShowMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

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

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  const handleMFAFlow = async () => {
    if (!supabase) return;
    try {
      const { data: factors, error } = await (supabase.auth as any).mfa.listFactors();
      if (error) throw error;

      // Cari faktor TOTP yang sudah diverifikasi
      // Gunakan Optional Chaining (?.) untuk keamanan jika totp undefined
      const totpFactor = factors?.totp?.find((f: any) => f.status === 'verified');
      
      if (totpFactor) {
        setMfaFactorId(totpFactor.id);
        setShowMFA(true);
        // Pastikan loading dimatikan agar UI form MFA muncul
        setIsLoading(false); 
      } else {
        // Jika tidak ada faktor verified tapi nextLevel AAL2, mungkin error state, amankan ke dashboard
        safeNavigate('/dashboard');
      }
    } catch (err) {
      console.error("Gagal inisialisasi MFA flow", err);
      // Jika gagal list factors, lempar ke dashboard (fail safe)
      safeNavigate('/dashboard');
    }
  };

  useEffect(() => {
    if (!supabase) return;

    // Cek session saat load pertama
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: authLevel } = await (supabase.auth as any).mfa.getAuthenticatorAssuranceLevel();
        if (authLevel.nextLevel === 'aal2' && authLevel.currentLevel !== 'aal2') {
          handleMFAFlow();
        } else {
          safeNavigate('/dashboard');
        }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
         safeNavigate('/auth/reset-password');
         return;
      }

      if (event === 'SIGNED_IN' && session) {
        if (!isLoading) {
            const { data: authLevel } = await (supabase.auth as any).mfa.getAuthenticatorAssuranceLevel();
            if (authLevel.nextLevel === 'aal2' && authLevel.currentLevel !== 'aal2') {
              handleMFAFlow();
            } else {
               if (!email && !password) safeNavigate('/dashboard');
            }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
        showPopup('error', "System Error", "Authentication service unavailable.");
        return;
    }

    const cleanEmail = email.trim(); 
    
    if (!cleanEmail) {
      showPopup('error', t.auth.errors.email_required, t.auth.errors.email_required_desc);
      return;
    }

    setIsLoading(true);

    try {
      if (isForgotPassword) {
        // --- ALUR LUPA SANDI ---
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        
        if (error) throw error;
        
        showPopup('success', t.auth.errors.email_sent, `Recovery instructions have been sent to ${cleanEmail}. Please check your inbox or spam folder.`);
        setIsForgotPassword(false);

      } else if (isLogin) {
        // --- ALUR LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;

        // --- CEK MFA ---
        const { data: authLevel } = await (supabase.auth as any).mfa.getAuthenticatorAssuranceLevel();
        
        if (authLevel.nextLevel === 'aal2' && authLevel.currentLevel !== 'aal2') {
           await handleMFAFlow();
           return; 
        } else {
           safeNavigate('/dashboard');
           return;
        }

      } else {
        // --- ALUR REGISTER ---
        // PERBAIKAN: Menambahkan options emailRedirectTo
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { 
            data: { full_name: fullName },
            // Penting: Mengarahkan user kembali ke halaman auth setelah klik link di email
            emailRedirectTo: `${window.location.origin}/auth` 
          },
        });
        
        if (error) throw error;

        // PERBAIKAN: Cek apakah session langsung ada (berarti Auto Confirm aktif / tidak perlu verifikasi email)
        if (data.session) {
            showPopup('success', "Registration Successful", "Account created successfully! Logging you in...");
            // Redirect akan ditangani otomatis oleh onAuthStateChange listener
        } else {
            // Jika session null, berarti email verifikasi SUDAH dikirim (atau kena limit)
            showPopup('success', t.auth.errors.registration_success, "Registration successful! Please check your email (Inbox or Spam) to verify your account.");
            setIsLogin(true);
        }
      }
    } catch (err: any) {
      showPopup('error', t.auth.errors.access_denied, err.message || "Authentication protocol error occurred.");
    } finally {
      if (!showMFA) {
         setIsLoading(false);
      }
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err: any) {
      showPopup('error', t.auth.errors.oauth_failed, `System cannot validate login through ${provider}.`);
      setIsLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !mfaFactorId || mfaCode.length < 6) return;
    setIsLoading(true);

    try {
      const { data: challengeData, error: challengeError } = await (supabase.auth as any).mfa.challenge({
        factorId: mfaFactorId
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await (supabase.auth as any).mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode
      });

      if (verifyError) throw verifyError;
      safeNavigate('/dashboard');
    } catch (err: any) {
      showPopup('error', t.auth.errors.invalid_code, t.auth.errors.invalid_code_desc);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535] selection:text-black">
      
      <CustomPopup 
        isOpen={popup.show} 
        type={popup.type} 
        title={popup.title} 
        message={popup.message} 
        onClose={() => setPopup(prev => ({ ...prev, show: false }))} 
      />

      {/* Bagian Kiri: Visual Premium (Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-[#181A20] border-r border-[#2B3139] p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-[#FCD535] rounded-full blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-10"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-12 h-12 bg-[#FCD535] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#FCD535]/20 group-hover:scale-110 transition-transform duration-500 overflow-hidden">
               <img src="/proofofachievement.jpg" alt="Proof Of Achievement" className="w-full h-full object-cover" />
            </div>
            <span className="text-3xl font-black tracking-tighter uppercase italic leading-none">TradeHub</span>
          </div>
          
          <h1 className="text-6xl font-black leading-[0.9] mb-8 tracking-tighter uppercase italic">
            {t.auth.gate_title} <br /> <span className="text-[#FCD535]">{t.auth.gate_subtitle}</span>
          </h1>
          <p className="text-[#848E9C] text-xl max-w-md leading-relaxed font-medium italic">
            {t.auth.gate_desc}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 bg-[#1E2329]/40 p-6 rounded-[2rem] border border-[#2B3139] max-w-sm backdrop-blur-xl shadow-2xl">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-2xl border-4 border-[#181A20] bg-[#2B3139] flex items-center justify-center text-xs font-black text-[#848E9C] shadow-lg overflow-hidden">
                  <User size={20} />
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm text-white font-black tracking-tight">{t.auth.verified_traders}</p>
              <p className="text-[10px] text-[#848E9C] font-bold uppercase tracking-widest leading-none">{t.auth.active_ecosystem}</p>
            </div>
        </div>
      </div>

      {/* Bagian Kanan: Form Auth */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-16 bg-[#0B0E11] relative overflow-y-auto no-scrollbar">
        <div className="lg:hidden absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FCD535] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

        <div className="max-w-md w-full mx-auto relative z-10">
          <div className="absolute top-0 right-0">
            <LanguageSwitcher />
          </div>
          
          {showMFA ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 text-center lg:text-left">
               <button onClick={() => { setShowMFA(false); if(supabase) supabase.auth.signOut(); }} className="mb-12 flex items-center gap-2 text-[#474D57] hover:text-[#FCD535] transition-all font-black text-[10px] uppercase tracking-[0.3em] group">
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {t.auth.cancel_auth}
               </button>

               <div className="mb-12">
                  <div className="w-16 h-16 bg-[#FCD535]/10 border border-[#FCD535]/20 rounded-2xl flex items-center justify-center text-[#FCD535] mb-6 mx-auto lg:mx-0 shadow-lg">
                      <ShieldAlert size={32} />
                  </div>
                  <h2 className="text-4xl font-black mb-3 text-[#EAECEF] tracking-tighter uppercase italic leading-none">{t.auth.mfa_required}</h2>
                  <p className="text-[#848E9C] font-medium leading-relaxed italic">
                      {/* Klarifikasi: Gunakan Aplikasi Authenticator */}
                      Enter the 6-digit code from your <strong>Authenticator App</strong> (Google Authenticator/Authy).
                  </p>
               </div>

               <form onSubmit={handleVerifyMFA} className="space-y-8">
                  <div className="bg-[#1E2329] p-2 rounded-[2rem] border border-[#2B3139] shadow-inner flex flex-col items-center group focus-within:border-[#FCD535] transition-colors relative">
                      <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors" size={24} />
                      <input 
                        type="text" maxLength={6} value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000 000"
                        className="w-full bg-transparent px-6 py-8 text-center font-mono text-5xl tracking-[0.2em] text-[#FCD535] outline-none"
                        autoFocus
                      />
                  </div>

                  <button 
                    type="submit" disabled={isLoading || mfaCode.length < 6}
                    className="w-full bg-[#FCD535] text-black py-6 rounded-[1.8rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-[#F0B90B] active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-[#FCD535]/10"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={24} /> : <>{t.auth.verify_identity} <ShieldCheck size={20} /></>}
                  </button>
               </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="lg:hidden flex items-center gap-2 mb-12 justify-center" onClick={() => safeNavigate('/')}>
                 <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg shadow-[#FCD535]/10 overflow-hidden">
                   <img src="/proofofachievement.jpg" alt="TradeHub" className="w-full h-full object-cover" />
                 </div>
                 <span className="text-2xl font-black uppercase italic tracking-tighter">TradeHub</span>
               </div>

               <div className="mb-12 text-center lg:text-left">
                 <h2 className="text-4xl font-black mb-3 text-[#EAECEF] tracking-tighter uppercase italic leading-none">
                   {isForgotPassword ? t.auth.reset_access : isLogin ? t.auth.welcome_back : t.auth.join_elite}
                 </h2>
                 <p className="text-[#848E9C] font-medium leading-relaxed italic">
                   {isForgotPassword 
                     ? t.auth.reset_desc
                     : isLogin 
                       ? t.auth.login_desc
                       : t.auth.register_desc}
                 </p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-6">
                 {!isLogin && !isForgotPassword && (
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] ml-1">{t.auth.full_identity}</label>
                     <div className="relative group">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors w-5 h-5" />
                       <input 
                         type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                         placeholder={t.auth.name_placeholder}
                         className="w-full pl-12 pr-6 py-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl focus:border-[#FCD535] outline-none transition-all text-[#EAECEF] font-bold text-sm shadow-inner placeholder:text-[#2B3139]"
                         required={!isLogin}
                       />
                     </div>
                   </div>
                 )}

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] ml-1">{t.auth.email_access}</label>
                   <div className="relative group">
                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors w-5 h-5" />
                     <input 
                       type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                       placeholder="name@example.com"
                       className="w-full pl-12 pr-6 py-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl focus:border-[#FCD535] outline-none transition-all text-[#EAECEF] font-bold text-sm shadow-inner placeholder:text-[#2B3139]"
                       required
                     />
                   </div>
                 </div>

                 {!isForgotPassword && (
                   <div className="space-y-2">
                     <div className="flex justify-between items-center px-1">
                       <label className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em]">{t.auth.secure_password}</label>
                       {isLogin && (
                         <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] font-black text-[#FCD535] hover:text-[#F0B90B] transition-colors uppercase tracking-widest">{t.auth.forgot_password}</button>
                       )}
                     </div>
                     <div className="relative group">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors w-5 h-5" />
                       <input 
                         type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                         placeholder="••••••••"
                         className="w-full pl-12 pr-14 py-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl focus:border-[#FCD535] outline-none transition-all text-[#EAECEF] font-bold text-sm shadow-inner placeholder:text-[#2B3139]"
                         required={!isForgotPassword}
                       />
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474D57] hover:text-white transition-colors p-1">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                     </div>
                   </div>
                 )}

                 <button 
                   type="submit" disabled={isLoading}
                   className="w-full bg-[#FCD535] text-black py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#F0B90B] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-[#FCD535]/10"
                 >
                   {isLoading ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                     <>
                       {isForgotPassword ? t.auth.send_reset : isLogin ? t.auth.authorize_login : t.auth.create_account}
                       <ArrowRight size={18} />
                     </>
                   )}
                 </button>

                 {isForgotPassword && (
                   <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-center text-[10px] font-black text-[#474D57] uppercase tracking-widest hover:text-[#FCD535] transition-colors">{t.auth.back_to_login}</button>
                 )}
               </form>

               {!isForgotPassword && (
                 <>
                   <div className="my-10 flex items-center gap-4">
                     <div className="flex-1 h-px bg-[#2B3139]"></div>
                     <span className="text-[10px] font-black text-[#474D57] tracking-[0.3em] uppercase whitespace-nowrap px-4">{t.auth.oauth_gateway}</span>
                     <div className="flex-1 h-px bg-[#2B3139]"></div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <button 
                       onClick={() => handleSocialLogin('google')} disabled={isLoading}
                       className="flex items-center justify-center gap-3 py-4 border border-[#2B3139] bg-[#1E2329]/40 rounded-2xl hover:bg-[#2B3139] transition-all text-[10px] font-black uppercase tracking-widest text-[#EAECEF] shadow-sm active:scale-95"
                     >
                       <Chrome className="w-4 h-4 text-[#F6465D]" /> Google
                     </button>
                     <button 
                       onClick={() => handleSocialLogin('github')} disabled={isLoading}
                       className="flex items-center justify-center gap-3 py-4 border border-[#2B3139] bg-[#1E2329]/40 rounded-2xl hover:bg-[#2B3139] transition-all text-[10px] font-black uppercase tracking-widest text-[#EAECEF] shadow-sm active:scale-95"
                     >
                       <Github className="w-4 h-4" /> Github
                     </button>
                   </div>
                 </>
               )}

               <p className="mt-12 text-center text-sm font-medium text-[#848E9C]">
                 {isLogin ? t.auth.not_registered : t.auth.already_have} {' '}
                 <button 
                   onClick={() => { setIsLogin(!isLogin); setIsForgotPassword(false); setShowMFA(false); }} 
                   className="text-[#FCD535] font-black hover:text-[#F0B90B] transition-colors uppercase text-xs tracking-widest ml-2"
                 >
                   {isLogin ? t.auth.register : t.auth.login}
                 </button>
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}