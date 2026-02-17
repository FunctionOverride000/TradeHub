"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase"; 
import { Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft, ShieldCheck, Activity, Globe, Loader2, User, Chrome, Github, ShieldAlert, Smartphone, Gift } from "lucide-react";
import Link from "next/link";
import CustomPopup from "@/components/auth/CustomPopup";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageSwitcher } from "@/lib/LanguageSwitcher";

export default function AuthPage() {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false); 
  const [showPassword, setShowPassword] = useState(false);
  
  // State untuk Loading Awal (Cek Sesi)
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // State Referral
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // State MFA
  const [showMFA, setShowMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null); // Untuk info di layar MFA

  const [popup, setPopup] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard'; 

  const supabase = createClient();

  const showPopup = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setPopup({ isOpen: true, type, title, message });
  };

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
      localStorage.setItem('tradehub_referral_pending', refParam.toUpperCase());
    } else {
      const storedRef = localStorage.getItem('tradehub_referral_pending');
      if (storedRef) setReferralCode(storedRef);
    }
  }, [searchParams]);

  const applyReferralIfPending = async (userId: string) => {
    const pendingCode = localStorage.getItem('tradehub_referral_pending');
    if (!pendingCode) return;

    try {
      console.log("Applying referral code:", pendingCode);
      const { data, error } = await supabase.functions.invoke('apply-referral', {
        body: { userId, referralCode: pendingCode }
      });

      if (!error && data?.success) {
        console.log("Referral applied successfully!");
        localStorage.removeItem('tradehub_referral_pending');
      }
    } catch (err) {
      console.warn("Gagal menerapkan referral:", err);
    }
  };

  const finalizeLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await applyReferralIfPending(user.id);
        router.refresh();
        router.push(nextUrl);
    } else {
        setIsCheckingSession(false);
    }
  };

  // LOGIKA MFA FLOW
  const handleMFAFlow = async () => {
    try {
      // Ambil user untuk menampilkan email di layar MFA
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setCurrentUserEmail(user.email);

      const { data: factors, error } = await (supabase.auth as any).mfa.listFactors();
      if (error) throw error;

      // Cari faktor TOTP yang sudah 'verified' (aktif)
      const totpFactor = factors?.totp?.find((f: any) => f.status === 'verified');
      
      // JIKA ADA faktor verified, baru wajibkan MFA
      if (totpFactor) {
        setMfaFactorId(totpFactor.id);
        setShowMFA(true);
        setLoading(false); 
        setIsCheckingSession(false); 
      } else {
        // JIKA TIDAK ADA faktor verified, bypass (aman)
        await finalizeLogin();
      }
    } catch (err) {
      console.error("MFA Check Error, bypassing...", err);
      await finalizeLogin(); 
    }
  };

  // CEK SESI SAAT LOAD
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // Cek apakah user punya faktor MFA yang TERVERIFIKASI
            const { data: factors } = await (supabase.auth as any).mfa.listFactors();
            const hasVerifiedFactor = factors?.totp?.some((f: any) => f.status === 'verified');

            if (hasVerifiedFactor) {
                 const { data: authLevel } = await (supabase.auth as any).mfa.getAuthenticatorAssuranceLevel();
                 // Jika level saat ini belum AAL2 (belum input kode sesi ini), minta MFA
                 if (authLevel.nextLevel === 'aal2' && authLevel.currentLevel !== 'aal2') {
                   handleMFAFlow();
                   return;
                 }
            }
            
            // Jika tidak punya MFA atau sudah login AAL2, langsung masuk
            router.replace(nextUrl);
        } else {
            setIsCheckingSession(false);
        }
      } catch (e) {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [router, nextUrl, supabase]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim(); 
    if (!cleanEmail) {
        showPopup('error', t.auth.errors.email_required, t.auth.errors.email_required_desc);
        setLoading(false);
        return;
    }

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        
        if (error) throw error;
        showPopup('success', t.auth.errors.email_sent, `Recovery instructions sent to ${cleanEmail}. Check inbox/spam.`);
        setIsForgotPassword(false);

      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;
        await handleMFAFlow();

      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: fullName, role: 'user' },
            emailRedirectTo: `${window.location.origin}/auth` 
          },
        });

        if (error) throw error;

        if (data.session) {
            showPopup('success', "Registration Successful", "Account created! Logging in...");
            await finalizeLogin();
        } else {
            showPopup('success', t.auth.errors.registration_success, t.auth.errors.registration_success_desc);
            setIsLogin(true);
        }
      }
    } catch (error: any) {
      showPopup('error', "Authentication Failed", error.message || "Something went wrong");
    } finally {
      if (!showMFA) setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      showPopup('error', t.auth.errors.oauth_failed, `Login with ${provider} failed.`);
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.length < 6) return;
    setLoading(true);

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
      await finalizeLogin();
    } catch (err: any) {
      showPopup('error', t.auth.errors.invalid_code, t.auth.errors.invalid_code_desc);
      setLoading(false);
    }
  };

  const closePopup = () => setPopup({ ...popup, isOpen: false });

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center text-[#EAECEF]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#848E9C]">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-stretch bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535] selection:text-black">
      
      <CustomPopup 
        isOpen={popup.isOpen} 
        type={popup.type} 
        title={popup.title} 
        message={popup.message} 
        onClose={closePopup} 
      />

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

      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-16 bg-[#0B0E11] relative overflow-y-auto no-scrollbar">
        <div className="lg:hidden absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FCD535] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

        <div className="max-w-md w-full mx-auto relative z-10">
          <div className="absolute top-0 right-0">
            <LanguageSwitcher />
          </div>
          
          {showMFA ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 text-center lg:text-left">
               {/* Tombol Back to Login - Menghapus sesi jika user terjebak */}
               <button 
                  onClick={async () => { 
                      setShowMFA(false); 
                      await supabase.auth.signOut(); 
                      setIsCheckingSession(false);
                      // Clear local storage untuk membersihkan sisa sesi
                      if (typeof window !== 'undefined') localStorage.clear();
                      window.location.reload(); 
                  }} 
                  className="mb-8 flex items-center gap-2 text-[#474D57] hover:text-[#FCD535] transition-all font-black text-[10px] uppercase tracking-[0.3em] group"
               >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Sign Out / Cancel
               </button>

               <div className="mb-12">
                  <div className="w-16 h-16 bg-[#FCD535]/10 border border-[#FCD535]/20 rounded-2xl flex items-center justify-center text-[#FCD535] mb-6 mx-auto lg:mx-0 shadow-lg">
                      <ShieldAlert size={32} />
                  </div>
                  <h2 className="text-4xl font-black mb-3 text-[#EAECEF] tracking-tighter uppercase italic leading-none">{t.auth.mfa_required}</h2>
                  <p className="text-[#848E9C] font-medium leading-relaxed italic mb-2">
                      Enter the 6-digit code from your <strong>Authenticator App</strong>.
                  </p>
                  {currentUserEmail && (
                    <p className="text-xs text-[#FCD535] font-mono bg-[#1E2329] p-2 rounded-lg inline-block border border-[#2B3139]">
                       Account: {currentUserEmail}
                    </p>
                  )}
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
                    type="submit" disabled={loading || mfaCode.length < 6}
                    className="w-full bg-[#FCD535] text-black py-6 rounded-[1.8rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-[#F0B90B] active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-[#FCD535]/10"
                  >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <>{t.auth.verify_identity} <ShieldCheck size={20} /></>}
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

               {referralCode && (
                 <div className="mb-8 bg-[#0ECB81]/10 border border-[#0ECB81]/20 p-4 rounded-2xl flex items-center gap-4 animate-in zoom-in-95">
                    <div className="w-10 h-10 bg-[#0ECB81]/20 rounded-xl flex items-center justify-center text-[#0ECB81]">
                       <Gift size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-[#0ECB81] uppercase tracking-widest">Referral Code Applied</p>
                       <p className="text-xs font-bold text-white">Code: {referralCode} <span className="opacity-70">(+50 XP Bonus)</span></p>
                    </div>
                 </div>
               )}

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

               {!isForgotPassword && (
                 <div className="flex bg-[#0B0E11] p-1 rounded-xl mb-8 border border-[#2B3139]">
                    <button
                      onClick={() => setIsLogin(true)}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        isLogin ? "bg-[#2B3139] text-[#FCD535] shadow-lg" : "text-[#848E9C] hover:text-white"
                      }`}
                    >
                      {t.auth.login}
                    </button>
                    <button
                      onClick={() => setIsLogin(false)}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        !isLogin ? "bg-[#2B3139] text-[#FCD535] shadow-lg" : "text-[#848E9C] hover:text-white"
                      }`}
                    >
                      {t.auth.register}
                    </button>
                 </div>
               )}

               <form onSubmit={handleAuth} className="space-y-6">
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
                   type="submit" disabled={loading}
                   className="w-full bg-[#FCD535] text-black py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#F0B90B] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-[#FCD535]/10"
                 >
                   {loading ? (
                     <>
                       <Loader2 className="w-5 h-5 animate-spin" />
                       {t.common.loading}
                     </>
                   ) : (
                     <>
                       {isForgotPassword ? t.auth.send_reset : isLogin ? t.auth.authorize_login : t.auth.create_account}
                       <ArrowRight size={18} className="rotate-180" />
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
                       onClick={() => handleOAuth('google')} disabled={loading}
                       className="flex items-center justify-center gap-3 py-4 border border-[#2B3139] bg-[#1E2329]/40 rounded-2xl hover:bg-[#2B3139] transition-all text-[10px] font-black uppercase tracking-widest text-[#EAECEF] shadow-sm active:scale-95"
                     >
                       <Chrome className="w-4 h-4 text-[#F6465D]" /> Google
                     </button>
                     <button 
                       onClick={() => handleOAuth('github')} disabled={loading}
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
        
        <p className="text-center text-[10px] text-[#474D57] font-mono mt-8 uppercase tracking-widest">TradeHub - Proof Of Achievement</p>
      </div>
    </div>
  );
}