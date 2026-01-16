"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  ArrowLeft, 
  Loader2, 
  CreditCard, 
  CheckCircle2,
  AlertCircle,
  Coins,
  Globe,
  Lock,
  Users,
  Shield,
  Ticket // Menambahkan icon Ticket
} from 'lucide-react';

/**
 * MENGGUNAKAN ESM CDN:
 * Menjamin library dimuat dengan stabil di lingkungan preview tanpa node_modules lokal.
 */
import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';
import { useLanguage } from '../../lib/LanguageContext';
import { LanguageSwitcher } from '../../lib/LanguageSwitcher';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmvezylbaxlodkepstbj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmV6eWxiYXhsb2RrZXBzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTYxNzEsImV4cCI6MjA4MTU5MjE3MX0.a2_XxJKLRXrt_tn_UiMYTmpP1iGjul6OhaHI3IGzJCw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- KONFIGURASI BIAYA (REAL) ---
const CREATION_FEE_SOL = 0.1;
const PRIVATE_FEE_SOL = 0.1;
const WHITELIST_FEE_SOL = 0.2; 

// Wallet Treasury (Tempat uang masuk)
const PLATFORM_TREASURY = "DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg"; 
const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com'; 

export default function CreateArenaPage() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'paying' | 'confirming' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // State untuk Fitur Premium
  const [accessType, setAccessType] = useState<'public' | 'private' | 'whitelist'>('public');
  const [roomPassword, setRoomPassword] = useState('');
  const [whitelistInput, setWhitelistInput] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    reward: '',
    min_balance: '0',
    entry_fee: '0' // [BARU] Field Entry Fee (Harga Tiket)
  });

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) safeNavigate('/auth');
      else setUser(session.user);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Kalkulasi Total Biaya secara Real-time (Biaya Pembuatan, BUKAN Biaya Tiket)
  const totalCost = React.useMemo(() => {
    if (accessType === 'private') return CREATION_FEE_SOL + PRIVATE_FEE_SOL;
    if (accessType === 'whitelist') return CREATION_FEE_SOL + WHITELIST_FEE_SOL;
    return CREATION_FEE_SOL;
  }, [accessType]);

  // Fungsi Cek Status Transaksi On-Chain
  const pollSignatureStatus = async (connection: web3.Connection, signature: string): Promise<boolean> => {
    let count = 0;
    while (count < 30) {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value[0];
      if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return true;
      if (status?.err) throw new Error("Transaksi gagal di blockchain.");
      await new Promise(resolve => setTimeout(resolve, 2000));
      count++;
    }
    throw new Error("Waktu konfirmasi habis.");
  };

  // Fungsi Eksekusi Pembayaran Real (Untuk Biaya Pembuatan ke Dev)
  const executeRealPayment = async (amount: number): Promise<{ signature: string, wallet: string } | null> => {
    const provider = (window as any).solana;
    if (!provider?.isPhantom) {
      setStatus('error');
      setErrorMsg(t?.admin?.phantom_not_found || "Phantom Wallet not found");
      return null;
    }

    try {
      setStatus('paying');
      setErrorMsg(null);
      const resp = await provider.connect();
      const senderPublicKey = resp.publicKey;
      const connection = new web3.Connection(SOLANA_RPC, 'confirmed');

      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: new web3.PublicKey(PLATFORM_TREASURY),
          lamports: Math.round(amount * web3.LAMPORTS_PER_SOL),
        })
      );

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;

      const { signature } = await provider.signAndSendTransaction(transaction);
      setStatus('confirming');
      await pollSignatureStatus(connection, signature);
      return { signature, wallet: senderPublicKey.toString() };
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || "Transaksi gagal.");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.description.length < 20) {
      setStatus('error');
      setErrorMsg("Description must be at least 20 characters.");
      return;
    }

    // Validasi Input Premium
    if (accessType === 'private' && roomPassword.length < 4) {
      setStatus('error');
      setErrorMsg("Room password must be at least 4 characters.");
      return;
    }

    if (accessType === 'whitelist' && whitelistInput.length < 32) {
      setStatus('error');
      setErrorMsg("Please enter at least one wallet address for whitelist.");
      return;
    }
    
    try {
      // 1. Lakukan Pembayaran Modal Awal (Creation Fee)
      const paymentResult = await executeRealPayment(totalCost);
      if (!paymentResult) return;

      setStatus('saving');

      // 2. Format Data Whitelist
      const whitelistArray = accessType === 'whitelist' 
        ? whitelistInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0)
        : null;

      // 3. Simpan ke Database Supabase
      const { error } = await supabase.from('rooms').insert([
        { 
          title: formData.title,
          description: formData.description,
          creator_id: user.id,
          creator_wallet: paymentResult.wallet,
          start_time: new Date(formData.start_date).toISOString(),
          end_time: new Date(formData.end_date).toISOString(),
          reward: formData.reward,
          min_balance: parseFloat(formData.min_balance),
          
          // [BARU] Menyimpan Harga Tiket
          entry_fee: parseFloat(formData.entry_fee) || 0,

          // Data Premium & Akses
          is_premium: accessType !== 'public',
          access_type: accessType,
          room_password: accessType === 'private' ? roomPassword : null,
          whitelist: whitelistArray,
          
          // Data Pembayaran
          is_paid: true, 
          payment_signature: paymentResult.signature,
          price_paid: totalCost,
          edit_count: 0
        }
      ]);

      if (error) throw error;
      setStatus('success');

    } catch (err: any) {
      setStatus('error');
      setErrorMsg('Failed to save: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex flex-col items-center relative overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:30px_30px] md:bg-[size:40px_40px] opacity:10 pointer-events-none"></div>
      
      <div className="w-full max-w-2xl px-4 md:px-6 py-8 md:py-16 relative z-10">
        <div className="flex items-center justify-between mb-6 md:mb-10">
          <button 
            onClick={() => safeNavigate('/')} 
            disabled={status !== 'idle' && status !== 'error' && status !== 'success'} 
            className="flex items-center gap-2 text-[#848E9C] hover:text-[#FCD535] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            <ArrowLeft size={16}/> Back to Lobby
          </button>
          <LanguageSwitcher />
        </div>

        <div className="bg-[#1E2329] rounded-3xl md:rounded-[3rem] border border-[#2B3139] shadow-2xl overflow-hidden relative">
          
          {/* OVERLAY STATUS */}
          {(status !== 'idle' && status !== 'error') && (
            <div className="absolute inset-0 z-50 bg-[#0B0E11]/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 md:p-10">
               {status === 'success' ? (
                 <div className="animate-in zoom-in duration-500 flex flex-col items-center">
                   <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0ECB81] rounded-full flex items-center justify-center mb-6 shadow-xl shadow-[#0ECB81]/20">
                     <CheckCircle2 size={32} className="text-black" />
                   </div>
                   <h2 className="text-2xl md:text-3xl font-black uppercase italic text-white mb-2">Arena Published!</h2>
                   <p className="text-[#848E9C] text-sm mb-8">Payment successfully verified on-chain.</p>
                   <button onClick={() => safeNavigate('/admin/dashboard')} className="w-full max-w-xs py-4 bg-[#FCD535] text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F0B90B] transition-all active:scale-95 shadow-lg">MANAGE MY ARENA</button>
                 </div>
               ) : (
                 <div className="flex flex-col items-center">
                   <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-[#FCD535] animate-spin mb-6" />
                   <h2 className="text-xl md:text-2xl font-black uppercase italic text-white mb-2">
                     {status === 'paying' ? "Waiting for Wallet..." : status === 'confirming' ? "Validating Network..." : "Publishing Arena..."}
                   </h2>
                   <p className="text-[#848E9C] text-xs md:text-sm">Please do not close this window.</p>
                 </div>
               )}
            </div>
          )}

          {/* HEADER FORM */}
          <div className="p-6 md:p-10 border-b border-[#2B3139] bg-[#1E2329]/50">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FCD535] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-[#FCD535]/10 shrink-0"><Trophy size={24} className="md:w-8 md:h-8" /></div>
              <div>
                <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Launch Arena</h1>
                <p className="text-[#848E9C] text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-2 italic">
                  Base Fee: <span className="text-[#FCD535]">{CREATION_FEE_SOL} SOL</span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8">
            {status === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} /> {errorMsg}
              </div>
            )}

            <div className="space-y-2 md:space-y-3">
              <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Tournament Title</label>
              <input name="title" required disabled={status !== 'idle'} value={formData.title} onChange={handleChange} placeholder="Solana Degen Arena" className="w-full bg-[#0B0E11] p-4 md:p-5 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-[#EAECEF] text-sm md:text-base transition-all" />
            </div>

            <div className="space-y-2 md:space-y-3">
              <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Description & Rules</label>
              <textarea name="description" required disabled={status !== 'idle'} value={formData.description} onChange={handleChange} placeholder="Explain the rules..." className="w-full bg-[#0B0E11] p-4 md:p-5 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-medium text-xs md:text-sm leading-relaxed text-[#EAECEF] min-h-[100px]" />
            </div>

            {/* --- [BARU] INPUT ENTRY FEE --- */}
            <div className="p-5 bg-[#0B0E11] border border-[#2B3139] rounded-2xl space-y-4">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#FCD535]/10 rounded-lg text-[#FCD535]"><Ticket size={18} /></div>
                  <div>
                     <label className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest block">Entry Fee (Ticket Price)</label>
                     <p className="text-[9px] text-[#848E9C]">Cost for users to join. You get 90% share!</p>
                  </div>
               </div>
               <div className="relative">
                  <input type="number" step="0.01" name="entry_fee" required disabled={status !== 'idle'} value={formData.entry_fee} onChange={handleChange} placeholder="0.0" className="w-full bg-[#1E2329] pl-4 pr-16 py-4 rounded-xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-mono font-bold text-white text-lg" />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#848E9C] font-black text-xs">SOL</span>
               </div>
            </div>

            {/* --- FITUR PREMIUM ACCESS CONTROL --- */}
            <div className="space-y-4 pt-4 border-t border-[#2B3139]">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Shield size={14} /> Arena Access Type
                </label>
                {accessType !== 'public' && (
                  <span className="text-[9px] font-bold text-[#FCD535] bg-[#FCD535]/10 px-2 py-1 rounded-lg border border-[#FCD535]/20">
                    + {accessType === 'private' ? PRIVATE_FEE_SOL : WHITELIST_FEE_SOL} SOL Fee
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAccessType('public')}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${accessType === 'public' ? 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535]' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:bg-[#2B3139]'}`}
                >
                  <Globe size={20} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccessType('private')}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${accessType === 'private' ? 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535]' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:bg-[#2B3139]'}`}
                >
                  <Lock size={20} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Private</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccessType('whitelist')}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${accessType === 'whitelist' ? 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535]' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:bg-[#2B3139]'}`}
                >
                  <Users size={20} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Whitelist</span>
                </button>
              </div>

              {accessType === 'private' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1 mb-2 block">Set Room Password</label>
                   <input type="text" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="Enter room password..." className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#FCD535]/50 focus:border-[#FCD535] outline-none font-bold text-[#EAECEF] text-sm" />
                </div>
              )}

              {accessType === 'whitelist' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1 mb-2 block">Wallet List (Split by comma/newline)</label>
                   <textarea value={whitelistInput} onChange={(e) => setWhitelistInput(e.target.value)} placeholder="Example: 8xzt...j9kL, 5ytr...m1nP" className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#FCD535]/50 focus:border-[#FCD535] outline-none font-mono text-xs text-[#EAECEF] min-h-[100px]" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 pt-4 border-t border-[#2B3139]">
              <div className="space-y-2 md:space-y-3">
                <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Start Date</label>
                <input type="date" name="start_date" required disabled={status !== 'idle'} value={formData.start_date} onChange={handleChange} className="w-full bg-[#0B0E11] p-4 md:p-5 rounded-2xl border border-[#2B3139] outline-none text-[#EAECEF] font-bold text-sm" />
              </div>
              <div className="space-y-2 md:space-y-3">
                <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">End Date</label>
                <input type="date" name="end_date" required disabled={status !== 'idle'} value={formData.end_date} onChange={handleChange} className="w-full bg-[#0B0E11] p-4 md:p-5 rounded-2xl border border-[#2B3139] outline-none text-[#EAECEF] font-bold text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-2 md:space-y-3">
                <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Main Reward</label>
                <input name="reward" required disabled={status !== 'idle'} value={formData.reward} onChange={handleChange} placeholder="Example: 10 SOL" className="w-full bg-[#0B0E11] p-4 md:p-5 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm" />
              </div>
              <div className="space-y-2 md:space-y-3">
                <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Min Balance Req (SOL)</label>
                <div className="relative">
                  <Coins className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-[#474D57]" size={18} />
                  <input type="number" step="0.1" name="min_balance" required disabled={status !== 'idle'} value={formData.min_balance} onChange={handleChange} placeholder="Example: 1.0" className="w-full bg-[#0B0E11] pl-12 md:pl-14 pr-4 md:pr-5 py-4 md:py-5 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-[#181A20] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-[#2B3139] flex items-center justify-between shadow-inner">
              <div className="max-w-[70%]">
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Total Creation Cost</p>
                <p className="text-[8px] md:text-[9px] text-[#848E9C] font-bold uppercase tracking-tighter leading-tight">
                  {accessType === 'public' 
                    ? "Base Fee (Public Room)" 
                    : `Basic (${CREATION_FEE_SOL}) + Premium (${accessType === 'private' ? PRIVATE_FEE_SOL : WHITELIST_FEE_SOL})`}
                </p>
              </div>
              <p className="text-lg md:text-xl font-black text-white italic shrink-0">{totalCost.toFixed(1)} SOL</p>
            </div>

            <button 
              type="submit" 
              disabled={status !== 'idle' && status !== 'error'} 
              className="w-full bg-[#FCD535] text-black font-black py-5 md:py-6 rounded-2xl hover:bg-[#F0B90B] transition-all flex items-center justify-center gap-4 uppercase text-[10px] md:text-xs tracking-[0.3em] shadow-xl shadow-[#FCD535]/10 active:scale-95 disabled:opacity-50"
            >
              <CreditCard size={20}/> Pay & Activate
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}