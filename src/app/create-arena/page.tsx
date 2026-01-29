"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  ArrowLeft, 
  CreditCard, 
  AlertCircle,
  Coins,
  Globe,
  Lock,
  Users,
  Shield,
  Ticket,
  Gift,
  Rocket,
  Zap,
  Loader2
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';
import { useLanguage } from '@/lib/LanguageContext';
import { getLevelInfo } from '@/lib/levelUtils';
// Pastikan path ini sesuai dengan struktur folder Anda
import StatusOverlay from '@/components/ui/StatusOverlay'; 

// --- SUPABASE CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- FEES CONFIGURATION (REAL) ---
const BASE_CREATION_FEE_SOL = 0.1; 
const PRIVATE_FEE_SOL = 0.1;
const WHITELIST_FEE_SOL = 0.2; 

// Wallet Treasury & RPC
const PLATFORM_TREASURY = "DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg"; 
const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com'; 

export default function CreateArenaPage() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'paying' | 'confirming' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // State Level & Privilege
  const [levelData, setLevelData] = useState<any>(null);

  // State Premium Features
  const [accessType, setAccessType] = useState<'public' | 'private' | 'whitelist'>('public');
  const [roomPassword, setRoomPassword] = useState('');
  const [whitelistInput, setWhitelistInput] = useState('');

  // Main Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    reward: '', // Input string
    min_balance: '0',
    entry_fee: '0' 
  });

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 1. Check Auth Session & Fetch Level
  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        safeNavigate('/auth');
        return;
      }
      setUser(session.user);

      // Fetch Creator Level for Discounts
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (stats) {
        setLevelData(getLevelInfo(stats.user_xp || 0));
      } else {
        setLevelData(getLevelInfo(0));
      }
    };
    init();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 2. Calculate Creation Fee Discount based on Level
  const getCreationFee = () => {
    const level = levelData?.level || 1;
    let discount = 0;

    if (level >= 50) discount = 1.0;      // Global Elite: Free
    else if (level >= 30) discount = 0.5; // Whale: 50% Off
    else if (level >= 10) discount = 0.2; // Dolphin: 20% Off

    const discountedFee = BASE_CREATION_FEE_SOL * (1 - discount);
    return { discountedFee, discount };
  };

  const { discountedFee, discount } = getCreationFee();

  // 3. Calculate Total Cost (Discounted Fee + Premium Fee + Reward Deposit)
  const totalCost = useMemo(() => {
    let cost = discountedFee;
    
    // Additional premium fees (not discounted)
    if (accessType === 'private') cost += PRIVATE_FEE_SOL;
    if (accessType === 'whitelist') cost += WHITELIST_FEE_SOL;
    
    const rewardDeposit = parseFloat(formData.reward) || 0;
    cost += rewardDeposit;
    
    return cost;
  }, [accessType, formData.reward, discountedFee]);

  // Helper: Poll transaction status
  const pollSignatureStatus = async (connection: web3.Connection, signature: string): Promise<boolean> => {
    let count = 0;
    while (count < 30) {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value[0];
      if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return true;
      if (status?.err) throw new Error("Transaction failed on blockchain.");
      await new Promise(resolve => setTimeout(resolve, 2000));
      count++;
    }
    throw new Error("Confirmation timeout.");
  };

  // Helper: Detect Phantom Wallet
  const getProvider = () => {
    if (typeof window === 'undefined') return null;
    const phantom = (window as any).phantom?.solana;
    if (phantom?.isPhantom) return phantom;
    const solana = (window as any).solana;
    if (solana?.isPhantom) return solana;
    return null;
  };

  // Solana Payment Logic
  const executeRealPayment = async (amount: number): Promise<{ signature: string, wallet: string } | null> => {
    // If total cost is 0 (high level & 0 reward & basic features), skip payment
    if (amount <= 0) {
       return { signature: 'free_tier_bypass', wallet: 'system' };
    }

    const provider = getProvider();
    
    if (!provider) {
      setStatus('error');
      setErrorMsg("Phantom Wallet not detected! Please install Phantom.");
      window.open('https://phantom.app/', '_blank');
      return null;
    }

    try {
      setStatus('paying');
      setErrorMsg(null);
      
      const resp = await provider.connect();
      const senderPublicKey = resp.publicKey;
      const connection = new web3.Connection(SOLANA_RPC, 'confirmed');

      const balance = await connection.getBalance(senderPublicKey);
      const costInLamports = Math.round(amount * web3.LAMPORTS_PER_SOL);
      
      if (balance < costInLamports) {
         throw new Error(`Insufficient balance! Need ${amount.toFixed(4)} SOL + Gas.`);
      }

      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: new web3.PublicKey(PLATFORM_TREASURY),
          lamports: costInLamports,
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
      console.error("Payment Error:", err);
      setStatus('error');
      if (err.message && (err.message.includes("disconnected port") || err.message.includes("connection not established"))) {
         setErrorMsg("Wallet Connection Lost. Please Refresh (F5).");
      } else {
         setErrorMsg(err.message || "Transaction cancelled or failed.");
      }
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;

    // --- FORM VALIDATION ---

    if (formData.description.length < 20) {
      setStatus('error');
      setErrorMsg("Description must be at least 20 characters.");
      return;
    }

    const rewardVal = parseFloat(formData.reward);
    if (isNaN(rewardVal) || rewardVal < 0) {
       setStatus('error');
       setErrorMsg("Please enter a valid reward amount (e.g. 0.5)");
       return;
    }

    // --- DATE VALIDATION (CRITICAL FIX) ---
    // Pastikan user tidak membuat lomba yang sudah berakhir di masa lalu
    if (!formData.start_date || !formData.end_date) {
        setStatus('error');
        setErrorMsg("Please select both start and end dates.");
        return;
    }

    const startTimestamp = new Date(`${formData.start_date}T00:00:00`).toISOString();
    const endTimestamp = new Date(`${formData.end_date}T23:59:59`).toISOString(); // Akhir hari
    const now = new Date();

    // 1. End date must be AFTER Start date
    if (new Date(endTimestamp) <= new Date(startTimestamp)) {
        setStatus('error');
        setErrorMsg("End date must be after start date.");
        return;
    }

    // 2. End date CANNOT be in the past
    // Kita beri buffer sedikit untuk zona waktu, tapi intinya harus masa depan
    if (new Date(endTimestamp) < now) {
        setStatus('error');
        setErrorMsg("End date cannot be in the past. The arena would close immediately.");
        return;
    }

    try {
      // 1. Execute Payment
      const paymentResult = await executeRealPayment(totalCost);
      if (!paymentResult) return;

      setStatus('saving');

      // 2. Format Whitelist Data
      const whitelistArray = accessType === 'whitelist' 
        ? whitelistInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0)
        : null;

      // 3. Insert to Database
      const { error } = await supabase.from('rooms').insert([
        { 
          title: formData.title,
          description: formData.description,
          creator_id: user.id,
          creator_wallet: paymentResult.wallet === 'system' ? user.email : paymentResult.wallet, 
          start_time: startTimestamp,
          end_time: endTimestamp,
          
          reward: `${rewardVal} SOL`, 
          
          // Data for Distribution Bot
          reward_token_amount: rewardVal, 
          reward_token_symbol: 'SOL',
          distribution_status: 'pending',

          min_balance: parseFloat(formData.min_balance),
          entry_fee: parseFloat(formData.entry_fee) || 0,

          is_premium: accessType !== 'public',
          access_type: accessType,
          room_password: accessType === 'private' ? roomPassword : null,
          whitelist: whitelistArray,
          
          is_paid: true, 
          payment_signature: paymentResult.signature,
          price_paid: totalCost, 
          edit_count: 0
          
          // FIX: Menghapus field 'status' karena tidak ada di schema database
          // Status 'distribution_status' sudah cukup untuk logic backend
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
        </div>

        <div className="bg-[#1E2329] rounded-3xl md:rounded-[3rem] border border-[#2B3139] shadow-2xl overflow-hidden relative">
          
          <StatusOverlay status={status} onNavigate={safeNavigate} />

          {/* HEADER FORM */}
          <div className="p-6 md:p-10 border-b border-[#2B3139] bg-[#1E2329]/50">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FCD535] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-[#FCD535]/10 shrink-0"><Trophy size={24} className="md:w-8 md:h-8" /></div>
              <div>
                <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Launch Arena</h1>
                <p className="text-[#848E9C] text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-2 italic">
                  Create, Fund & Compete
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10 space-y-6 md:space-y-8">
            
            {/* --- PRIVILEGE CARD (Diskon Level) --- */}
            <div className="bg-gradient-to-r from-[#2B3139] to-[#1E2329] p-6 rounded-[2rem] border border-[#FCD535]/20 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCD535]/5 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="w-14 h-14 bg-[#FCD535] rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(252,213,53,0.2)] shrink-0">
                        <Rocket size={28} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                            <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Creator Privilege</h2>
                            <span className="bg-[#FCD535]/20 text-[#FCD535] border border-[#FCD535]/30 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                {levelData?.badge || "Trader"} Tier
                            </span>
                        </div>
                        <p className="text-xs text-[#848E9C]">
                            Current level <strong>(LVL {levelData?.level})</strong> grants benefits on platform fees.
                        </p>
                    </div>
                    <div className="bg-[#0B0E11]/80 backdrop-blur-sm p-4 rounded-2xl border border-[#2B3139] min-w-[140px] text-center">
                        <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-widest mb-1">PLATFORM FEE</p>
                        <div className="flex items-center justify-center gap-2">
                            {discount > 0 && (
                                <span className="text-xs text-[#F6465D] line-through font-bold decoration-2 opacity-60">
                                    {BASE_CREATION_FEE_SOL}
                                </span>
                            )}
                            <span className={`text-xl font-black italic tracking-tighter ${discountedFee === 0 ? 'text-[#0ECB81]' : 'text-white'}`}>
                                {discountedFee === 0 ? "FREE" : `${discountedFee} SOL`}
                            </span>
                        </div>
                        {discount > 0 && (
                            <p className="text-[9px] font-bold text-[#0ECB81] mt-1 flex items-center justify-center gap-1">
                                <Zap size={10} fill="currentColor"/> {discount * 100}% Discount
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                {/* --- INPUT REWARD (ANGKA) --- */}
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest ml-1 flex items-center gap-1"><Gift size={12}/> Reward Pool (Deposit Required)</label>
                  <div className="relative">
                      <input type="number" step="0.01" name="reward" required disabled={status !== 'idle'} value={formData.reward} onChange={handleChange} placeholder="e.g. 10" className="w-full bg-[#0B0E11] pl-4 pr-12 py-4 md:py-5 rounded-2xl border border-[#FCD535]/50 focus:border-[#FCD535] outline-none font-bold text-sm text-[#FCD535]" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] font-black text-xs">SOL</span>
                  </div>
                  <p className="text-[9px] text-[#848E9C] leading-tight">
                      *Reward will be automatically distributed to winners. Requires deposit now.
                  </p>
                </div>

                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Min Balance Req (SOL)</label>
                  <div className="relative">
                    <Coins className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-[#474D57]" size={18} />
                    <input type="number" step="0.1" name="min_balance" required disabled={status !== 'idle'} value={formData.min_balance} onChange={handleChange} placeholder="Example: 1.0" className="w-full bg-[#0B0E11] pl-12 md:pl-14 pr-4 md:pr-5 py-4 md:py-5 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm" />
                  </div>
                </div>
              </div>

              {/* --- INPUT ENTRY FEE --- */}
              <div className="p-5 bg-[#0B0E11] border border-[#2B3139] rounded-2xl space-y-4">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#FCD535]/10 rounded-lg text-[#FCD535]"><Ticket size={18} /></div>
                    <div>
                        <label className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest block">Entry Fee (Ticket Price)</label>
                        <p className="text-[9px] text-[#848E9C]">Optional. Set to 0 for Free Entry. You earn 90% of ticket sales!</p>
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

              {/* --- TOTAL PAYMENT SUMMARY --- */}
              <div className="bg-[#181A20] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-[#2B3139] shadow-inner">
                <div className="flex justify-between items-end mb-2">
                    <div className="max-w-[70%]">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Total Payment</p>
                        <p className="text-[9px] text-[#848E9C] font-bold uppercase tracking-tighter leading-tight">
                           Includes: Platform Fee + Reward Pool Deposit
                        </p>
                    </div>
                    <p className="text-xl md:text-2xl font-black text-[#FCD535] italic shrink-0">{totalCost.toFixed(2)} SOL</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-[#2B3139]/50 space-y-1 text-[9px] font-mono text-[#848E9C]">
                    <div className="flex justify-between">
                        <span>Creation Fee:</span>
                        <span className={discountedFee < BASE_CREATION_FEE_SOL ? 'text-[#0ECB81] font-bold' : ''}>
                           {discountedFee === 0 ? "FREE" : `${discountedFee} SOL`}
                        </span>
                    </div>
                    {accessType !== 'public' && (
                        <div className="flex justify-between">
                           <span>Premium Fee ({accessType}):</span>
                           <span>{accessType === 'private' ? PRIVATE_FEE_SOL : WHITELIST_FEE_SOL} SOL</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[#FCD535]">
                        <span>Reward Deposit:</span>
                        <span>{parseFloat(formData.reward) || 0} SOL</span>
                    </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={status !== 'idle' && status !== 'error'} 
                className="w-full bg-[#FCD535] text-black font-black py-5 md:py-6 rounded-2xl hover:bg-[#F0B90B] transition-all flex items-center justify-center gap-4 uppercase text-[10px] md:text-xs tracking-[0.3em] shadow-xl shadow-[#FCD535]/10 active:scale-95 disabled:opacity-50"
              >
                {status === 'paying' || status === 'confirming' || status === 'saving' ? (
                    <Loader2 className="animate-spin" size={20} />
                ) : (
                    <><CreditCard size={20}/> Pay & Activate</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}