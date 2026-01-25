"use client";

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ArrowRight, 
  TrendingUp,
  Eye,
  EyeOff, 
  Loader2, 
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  ChevronLeft,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '../../../lib/LanguageContext';
import { LanguageSwitcher } from '../../../lib/LanguageSwitcher';
import CustomPopup from '../../../components/auth/CustomPopup'; // Import CustomPopup

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // --- MFA HANDLER STATES ---
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [isAAL2, setIsAAL2] = useState(false);

  // State Popup (Menggantikan errorMsg string biasa)
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

  useEffect(() => {
    const checkSecurityLevel = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showPopup('error', "Session Expired", "Link is invalid or has expired. Please request a new link from the login page.");
        return;
      }

      // Cek apakah user butuh MFA untuk mencapai level AAL2
      const { data: authLevel } = await (supabase.auth as any).mfa.getAuthenticatorAssuranceLevel();
      
      if (authLevel.nextLevel === 'aal2' && authLevel.currentLevel !== 'aal2') {
        // User punya MFA aktif, kita harus meminta kodenya
        const { data: factors } = await (supabase.auth as any).mfa.listFactors();
        const verifiedFactor = factors.totp.find((f: any) => f.status === 'verified');
        
        if (verifiedFactor) {
          setMfaFactorId(verifiedFactor.id);
          setShowMfaChallenge(true);
        }
      } else {
        // Level sudah cukup atau tidak punya MFA
        setIsAAL2(true);
      }
    };
    checkSecurityLevel();
  }, []);

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.length < 6) return;
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

      // Berhasil mencapai AAL2
      setIsAAL2(true);
      setShowMfaChallenge(false);
      setMfaCode("");
    } catch (err: any) {
      showPopup('error', t.auth.errors.invalid_code, t.auth.errors.invalid_code_desc);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showPopup('error', "Mismatch", "Password confirmation does not match.");
      return;
    }
    
    if (newPassword.length < 6) {
      showPopup('error', "Too Short", "Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      setIsSuccess(true);
      // Logout agar user login bersih dengan AAL2 baru nanti
      await supabase.auth.signOut();
      
    } catch (err: any) {
      showPopup('error', "Update Failed", err.message || "Failed to update password.");
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Tampilan Sukses
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-[#0ECB81] rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-[#0ECB81]/20">
          <CheckCircle2 size={40} className="text-black" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Password Updated</h1>
        <p className="text-[#848E9C] mb-12 max-w-sm font-medium italic">Your credentials have been successfully updated on-chain. Please log in again using your new password.</p>
        <button 
          onClick={() => safeNavigate('/auth')} 
          className="px-12 py-5 bg-[#FCD535] text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-[#F0B90B] transition-all active:scale-95"
        >
          {t.auth.login.toUpperCase()}
        </button>
      </div>
    );
  }

  // 2. Tampilan Tantangan MFA
  if (showMfaChallenge) {
    return (
      <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>
        
        <CustomPopup 
          isOpen={popup.show} 
          type={popup.type} 
          title={popup.title} 
          message={popup.message} 
          onClose={() => setPopup(prev => ({ ...prev, show: false }))} 
        />

        <div className="w-full max-w-md relative z-10">
          <div className="mb-12 text-center">
              <div className="w-16 h-16 bg-[#FCD535]/10 border border-[#FCD535]/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-[#FCD535]"><ShieldAlert size={32} /></div>
              <h2 className="text-4xl font-black mb-3 text-white tracking-tighter uppercase italic">{t.auth.mfa_required}</h2>
              <p className="text-[#848E9C] font-medium leading-relaxed italic uppercase tracking-widest text-[10px]">Additional identity verification required to reset password.</p>
          </div>

          <form onSubmit={handleVerifyMfa} className="space-y-8">
              <div className="bg-[#1E2329] p-2 rounded-[2rem] border border-[#2B3139] shadow-inner flex flex-col items-center">
                <input 
                  type="text" maxLength={6} autoFocus value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000 000"
                  className="w-full bg-transparent px-6 py-8 text-center font-mono text-5xl tracking-[0.2em] text-[#FCD535] outline-none"
                />
              </div>
              <button 
                type="submit" disabled={isLoading || mfaCode.length < 6}
                className="w-full bg-[#FCD535] text-black py-6 rounded-[1.8rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-[#F0B90B] transition-all"
              >
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : t.auth.verify_identity.toUpperCase()}
              </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Tampilan Reset Sandi Utama (Hanya muncul jika AAL2 sudah terpenuhi)
  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCD535] rounded-full blur-[180px] opacity-[0.03]"></div>

      <CustomPopup 
          isOpen={popup.show} 
          type={popup.type} 
          title={popup.title} 
          message={popup.message} 
          onClose={() => setPopup(prev => ({ ...prev, show: false }))} 
      />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center justify-center gap-3 cursor-pointer" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg"><TrendingUp className="text-black w-6 h-6" /></div>
            <span className="text-2xl font-black uppercase italic tracking-tighter leading-none">TradeHub</span>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="mb-12 text-center">
            <div className="w-16 h-16 bg-[#1E2329] border border-[#2B3139] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-[#FCD535]"><KeyRound size={32} /></div>
            <h2 className="text-4xl font-black mb-3 text-white tracking-tighter uppercase italic leading-none">Reset Password</h2>
            <p className="text-[#848E9C] font-medium leading-relaxed italic uppercase tracking-widest text-[10px]">Session verified. Please enter your new password.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] ml-1">{t.auth.secure_password}</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-12 pr-14 py-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl focus:border-[#FCD535] outline-none transition-all text-white font-bold text-sm shadow-inner"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474D57] hover:text-white transition-colors p-1">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] ml-1">Confirm Password</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full pl-12 pr-6 py-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl focus:border-[#FCD535] outline-none transition-all text-white font-bold text-sm shadow-inner"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !newPassword}
            className="w-full bg-[#FCD535] text-black py-6 rounded-[1.8rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-[#F0B90B] active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-[#FCD535]/10"
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <>UPDATE PASSWORD <ArrowRight size={20} /></>}
          </button>
        </form>

        <button 
          onClick={() => safeNavigate('/auth')} 
          className="mt-12 w-full flex items-center justify-center gap-2 text-[#474D57] hover:text-[#FCD535] transition-all font-black text-[10px] uppercase tracking-[0.3em]"
        >
           <ChevronLeft size={16} /> {t.common.back.toUpperCase()}
        </button>
      </div>
    </div>
  );
}