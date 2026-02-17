"use client";

import { BETA_LIMITS } from '@/constants/limits';
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
  Loader2,
  LogIn,
  CheckSquare
} from 'lucide-react';

import { createBrowserClient } from '@supabase/ssr'; 
import * as web3 from '@solana/web3.js';
import { useLanguage } from '@/lib/LanguageContext';
import { getLevelInfo } from '@/lib/levelUtils';
import StatusOverlay from '@/components/ui/StatusOverlay'; 

// --- SUPABASE CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// --- FEES CONFIGURATION ---
const BASE_CREATION_FEE_SOL = 0.1; 
const PRIVATE_FEE_SOL = 0.1;
const WHITELIST_FEE_SOL = 0.2; 

const PLATFORM_TREASURY = process.env.NEXT_PUBLIC_TREASURY_WALLET || "DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg"; 
const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com'; 

export default function CreateArenaPage() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'paying' | 'confirming' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [debugStatus, setDebugStatus] = useState<string>('');
  
  // NEW: Consent checkbox state
  const [hasConsented, setHasConsented] = useState(false);
  
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
    reward: '', 
    min_balance: '0',
    entry_fee: '0' 
  });

  const supabase = useMemo(() => createBrowserClient(supabaseUrl, supabaseAnonKey), []);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  useEffect(() => {
    const init = async () => {
      setIsLoadingSession(true);
      
      if (!supabaseUrl || !supabaseAnonKey) {
          setDebugStatus('CRITICAL: Supabase URL/Key is missing in Environment Variables!');
          setIsLoadingSession(false);
          return;
      }

      if (SOLANA_RPC.includes('mainnet-beta.solana.com')) {
          console.warn("⚠️ WARNING: Using Public Solana RPC. High risk of Rate Limit errors during payment!");
      }

      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (error || !currentUser) {
        console.error("Auth Error:", error);
        setDebugStatus(error ? error.message : 'User session not found (Cookie missing?)');
        setUser(null);
        setIsLoadingSession(false);
        return;
      }

      setUser(currentUser);

      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (stats) {
        setLevelData(getLevelInfo(stats.user_xp || 0));
      } else {
        setLevelData(getLevelInfo(0));
      }
      setIsLoadingSession(false);
    };

    init();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getCreationFee = () => {
    const level = levelData?.level || 1;
    let discount = 0;
    if (level >= 50) discount = 1.0;     
    else if (level >= 30) discount = 0.5;
    else if (level >= 10) discount = 0.2;
    const discountedFee = BASE_CREATION_FEE_SOL * (1 - discount);
    return { discountedFee, discount };
  };

  const { discountedFee, discount } = getCreationFee();

  const totalCost = useMemo(() => {
    let cost = discountedFee;
    if (accessType === 'private') cost += PRIVATE_FEE_SOL;
    if (accessType === 'whitelist') cost += WHITELIST_FEE_SOL;
    const rewardDeposit = parseFloat(formData.reward) || 0;
    cost += rewardDeposit;
    return cost;
  }, [accessType, formData.reward, discountedFee]);

  const pollSignatureStatus = async (connection: web3.Connection, signature: string): Promise<boolean> => {
    let count = 0;
    while (count < 30) {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value[0];
      
      if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
          return true;
      }
      
      if (status?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      count++;
    }
    throw new Error("Confirmation timeout. Please check your wallet/Solscan.");
  };

  const getProvider = () => {
    if (typeof window === 'undefined') return null;
    const phantom = (window as any).phantom?.solana;
    if (phantom?.isPhantom) return phantom;
    const solana = (window as any).solana;
    if (solana?.isPhantom) return solana;
    return null;
  };

  const executeRealPayment = async (amount: number): Promise<{ signature: string, wallet: string } | null> => {
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

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;
      
      const { signature } = await provider.signAndSendTransaction(transaction);
      
      setStatus('confirming');
      
      await pollSignatureStatus(connection, signature);
      
      return { signature, wallet: senderPublicKey.toString() };
    } catch (err: any) {
      console.error("Payment Error:", err);
      setStatus('error');
      const msg = err.message || "";
      if (msg.includes("User rejected") || msg.includes("0x1137")) {
          setErrorMsg("Transaction cancelled by user.");
      } else if (msg.includes("disconnected port") || msg.includes("Unexpected error")) {
          setErrorMsg("Wallet connection unstable. Please Refresh (F5).");
      } else {
          setErrorMsg(msg || "Transaction failed.");
      }
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;

    // NEW: Check consent
    if (!hasConsented) {
      setStatus('error');
      setErrorMsg("You must read and agree to the Terms of Service before creating an arena.");
      return;
    }

    if (formData.description.length < 20) {
      setStatus('error');
      setErrorMsg("Description must be at least 20 characters to explain rules clearly.");
      return;
    }
    
    const rewardVal = parseFloat(formData.reward);
    if (isNaN(rewardVal) || rewardVal < 0) {
       setStatus('error');
       setErrorMsg("Please enter a valid reward amount (e.g. 0.5)");
       return;
    }

    if (rewardVal > 0 && rewardVal < BETA_LIMITS.MIN_REWARD_AMOUNT) {
        setStatus('error');
        setErrorMsg(`Minimum reward is ${BETA_LIMITS.MIN_REWARD_AMOUNT} SOL to ensure successful blockchain payout.`);
        return;
    }

    if (rewardVal > BETA_LIMITS.MAX_REWARD_PER_ARENA) {
        setStatus('error');
        setErrorMsg(`Beta limit: Maximum reward is ${BETA_LIMITS.MAX_REWARD_PER_ARENA} SOL per arena. This protects both you and participants during testing phase.`);
        return;
    }

    if (!formData.start_date || !formData.end_date) {
        setStatus('error');
        setErrorMsg("Please select both start and end dates.");
        return;
    }

    const startTimestamp = new Date(`${formData.start_date}T00:00:00`).toISOString();
    const endTimestamp = new Date(`${formData.end_date}T23:59:59`).toISOString();
    const now = new Date();

    if (new Date(endTimestamp) <= new Date(startTimestamp)) {
        setStatus('error');
        setErrorMsg("End date must be after start date.");
        return;
    }

    if (new Date(endTimestamp) < now) {
        setStatus('error');
        setErrorMsg("End date cannot be in the past. The arena would close immediately.");
        return;
    }

    const durationMs = new Date(endTimestamp).getTime() - new Date(startTimestamp).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const durationDays = durationHours / 24;

    if (durationHours < BETA_LIMITS.MIN_ARENA_DURATION_HOURS) {
        setStatus('error');
        setErrorMsg(`Arena must run for at least ${BETA_LIMITS.MIN_ARENA_DURATION_HOURS} hours (1 day). This ensures fair competition.`);
        return;
    }

    if (durationDays > BETA_LIMITS.MAX_ARENA_DURATION_DAYS) {
        setStatus('error');
        setErrorMsg(`Arena cannot exceed ${BETA_LIMITS.MAX_ARENA_DURATION_DAYS} days. Long-term arenas will be available after beta.`);
        return;
    }

    const entryFeeVal = parseFloat(formData.entry_fee) || 0;
    if (entryFeeVal > BETA_LIMITS.MAX_ENTRY_FEE) {
        setStatus('error');
        setErrorMsg(`Beta limit: Maximum entry fee is ${BETA_LIMITS.MAX_ENTRY_FEE} SOL to protect participants.`);
        return;
    }

    try {
      const { data: activeArenas, error: activeError } = await supabase
        .from('rooms')
        .select('id')
        .lte('start_time', new Date().toISOString())
        .gte('end_time', new Date().toISOString())
        .eq('distribution_status', 'pending');

      if (activeError) throw activeError;

      const currentActiveCount = activeArenas?.length || 0;

      if (currentActiveCount >= BETA_LIMITS.MAX_CONCURRENT_ARENAS) {
        setStatus('error');
        setErrorMsg(`Platform at capacity! Currently ${currentActiveCount}/${BETA_LIMITS.MAX_CONCURRENT_ARENAS} active arenas. Please try again in a few hours when some arenas conclude.`);
        return;
      }

      const { data: pendingRewards, error: tvlError } = await supabase
        .from('rooms')
        .select('reward_token_amount')
        .eq('distribution_status', 'pending');

      if (tvlError) throw tvlError;

      const currentTVL = pendingRewards?.reduce(
        (sum, room) => sum + (Number(room.reward_token_amount) || 0),
        0
      ) || 0;

      if (currentTVL + rewardVal > BETA_LIMITS.MAX_TOTAL_TVL) {
        setStatus('error');
        setErrorMsg(
          `Platform TVL limit reached! Current: ${currentTVL.toFixed(2)} SOL, Your reward: ${rewardVal} SOL, Max: ${BETA_LIMITS.MAX_TOTAL_TVL} SOL. Please try smaller reward or wait for other arenas to conclude.`
        );
        return;
      }

      if (currentTVL + rewardVal > BETA_LIMITS.WARNING_TVL_THRESHOLD) {
        console.warn(`⚠️ TVL Warning: ${currentTVL + rewardVal}/${BETA_LIMITS.MAX_TOTAL_TVL} SOL`);
      }

      const paymentResult = await executeRealPayment(totalCost);
      if (!paymentResult) return;

      setStatus('saving');

      const whitelistArray = accessType === 'whitelist'
        ? whitelistInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0)
        : null;

      const { error: insertError } = await supabase.from('rooms').insert([
        {
          title: formData.title,
          description: formData.description,
          creator_id: user.id,
          creator_wallet: paymentResult.wallet === 'system' ? user.email : paymentResult.wallet,
          start_time: startTimestamp,
          end_time: endTimestamp,
          reward: `${rewardVal} SOL`,
          reward_token_amount: rewardVal,
          reward_token_symbol: 'SOL',
          distribution_status: 'pending',
          min_balance: parseFloat(formData.min_balance),
          entry_fee: entryFeeVal,
          is_premium: accessType !== 'public',
          access_type: accessType,
          room_password: accessType === 'private' ? roomPassword : null,
          whitelist: whitelistArray,
          is_paid: true,
          payment_signature: paymentResult.signature,
          price_paid: totalCost,
          edit_count: 0
        }
      ]).select().single();

      if (insertError) throw insertError;

      setStatus('success');

    } catch (err: any) {
      console.error('Arena Creation Error:', err);
      setStatus('error');
      setErrorMsg('Failed to create arena: ' + (err.message || 'Unknown error'));
    }
  };

  if (!isLoadingSession && !user) {
      return (
        <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-md bg-[#1E2329] p-8 rounded-3xl border border-red-500/30 shadow-2xl">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <LogIn size={32} />
                </div>
                <h1 className="text-2xl font-black uppercase text-white mb-2">Authentication Required</h1>
                <p className="text-sm text-[#848E9C] mb-6">
                    {debugStatus || "We could not find your login session."}
                </p>
                
                <div className="bg-[#0B0E11] p-4 rounded-xl mb-6 text-left border border-[#2B3139]">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Diagnostic Info:</p>
                    <code className="text-xs font-mono text-yellow-500 break-all">
                        SSR_MODE: createBrowserClient <br/>
                        ENV_LOADED: {supabaseUrl ? 'YES' : 'NO'}
                    </code>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => safeNavigate('/')}
                        className="flex-1 py-4 rounded-xl border border-[#2B3139] text-[#848E9C] font-bold text-xs uppercase hover:bg-[#2B3139]"
                    >
                        Back Home
                    </button>
                    <button 
                        onClick={() => safeNavigate('/auth')}
                        className="flex-1 py-4 rounded-xl bg-[#FCD535] text-black font-bold text-xs uppercase hover:bg-[#F0B90B]"
                    >
                        Log In Now
                    </button>
                </div>
            </div>
        </div>
      );
  }

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-[#FCD535]" size={40} />
            <p className="text-xs font-mono text-[#848E9C]">VERIFYING SESSION...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex flex-col items-center relative overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:30px_30px] md:bg-[size:40px_40px] opacity:10 pointer-events-none"></div>
      
      <div className="w-full max-w-2xl px-4 md:px-6 py-8 md:py-16 relative z-10">
        
        {/* BETA WARNING BANNER */}
        {BETA_LIMITS.BETA_MODE && (
          <div className="mb-6 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500">
                <AlertCircle size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider mb-2">
                  ⚠️ Beta Testing Phase
                </h3>
                <ul className="text-xs text-yellow-200/90 space-y-1 font-medium">
                  <li>• Maximum reward: <strong className="text-yellow-400">{BETA_LIMITS.MAX_REWARD_PER_ARENA} SOL</strong> per arena</li>
                  <li>• Platform capacity: <strong className="text-yellow-400">{BETA_LIMITS.MAX_CONCURRENT_ARENAS}</strong> concurrent arenas max</li>
                  <li>• Your funds are held securely and distributed automatically to winners</li>
                  <li>• Use small amounts during beta - limits will increase after testing</li>
                </ul>
              </div>
            </div>
          </div>
        )}

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

          <div className="p-6 md:p-10 border-b border-[#2B3139] bg-[#1E2329]/50">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FCD535] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-[#FCD535]/10 shrink-0">
                <Trophy size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">
                  Launch Arena
                </h1>
                <p className="text-[#848E9C] text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-2 italic">
                  Create, Fund & Compete
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10 space-y-6 md:space-y-8">
            
            {/* PRIVILEGE CARD */}
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
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Gift size={12}/> Reward Pool (Deposit Required)
                  </label>
                  <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        min={BETA_LIMITS.MIN_REWARD_AMOUNT}
                        max={BETA_LIMITS.MAX_REWARD_PER_ARENA}
                        name="reward" 
                        required 
                        disabled={status !== 'idle'} 
                        value={formData.reward} 
                        onChange={handleChange} 
                        placeholder={`Min: ${BETA_LIMITS.MIN_REWARD_AMOUNT}, Max: ${BETA_LIMITS.MAX_REWARD_PER_ARENA}`}
                        className="w-full bg-[#0B0E11] pl-4 pr-12 py-4 md:py-5 rounded-2xl border border-[#FCD535]/50 focus:border-[#FCD535] outline-none font-bold text-sm text-[#FCD535]" 
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] font-black text-xs">SOL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-[#848E9C] leading-tight">
                      *Auto-distributed to winners. Requires deposit now.
                    </p>
                    <p className="text-[9px] font-bold text-yellow-500">
                      Beta Max: {BETA_LIMITS.MAX_REWARD_PER_ARENA} SOL
                    </p>
                  </div>
                  {parseFloat(formData.reward) > BETA_LIMITS.MAX_REWARD_PER_ARENA && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 animate-in fade-in">
                      <AlertCircle size={16} className="text-red-500 shrink-0" />
                      <p className="text-xs text-red-500 font-bold">
                        Exceeds beta limit! Max {BETA_LIMITS.MAX_REWARD_PER_ARENA} SOL allowed.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Min Balance Req (SOL)</label>
                  <div className="relative">
                    <Coins className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-[#474D57]" size={18} />
                    <input type="number" step="0.1" name="min_balance" required disabled={status !== 'idle'} value={formData.min_balance} onChange={handleChange} placeholder="Example: 1.0" className="w-full bg-[#0B0E11] pl-12 md:pl-14 pr-4 md:pr-5 py-4 md:py-5 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm" />
                  </div>
                </div>
              </div>

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
                  <button type="button" onClick={() => setAccessType('public')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${accessType === 'public' ? 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535]' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:bg-[#2B3139]'}`}>
                    <Globe size={20} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Public</span>
                  </button>
                  <button type="button" onClick={() => setAccessType('private')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${accessType === 'private' ? 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535]' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:bg-[#2B3139]'}`}>
                    <Lock size={20} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Private</span>
                  </button>
                  <button type="button" onClick={() => setAccessType('whitelist')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${accessType === 'whitelist' ? 'bg-[#FCD535]/10 border-[#FCD535] text-[#FCD535]' : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C] hover:bg-[#2B3139]'}`}>
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

              {/* TOTAL PAYMENT SUMMARY */}
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

              {/* ===================================================== */}
              {/* CONSENT CHECKBOX - NEW ADDITION BEFORE SUBMIT BUTTON  */}
              {/* ===================================================== */}
              <div 
                onClick={() => setHasConsented(!hasConsented)}
                className={`
                  p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200
                  ${hasConsented 
                    ? 'bg-green-500/10 border-green-500/50' 
                    : 'bg-[#1E2329] border-[#2B3139] hover:border-[#FCD535]/30'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  
                  {/* Checkbox Visual */}
                  <div className={`
                    shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center mt-0.5 transition-all
                    ${hasConsented 
                      ? 'bg-green-500 border-green-500' 
                      : 'bg-[#0B0E11] border-[#474D57]'
                    }
                  `}>
                    {hasConsented && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <p className={`text-xs font-bold mb-2 transition-colors ${hasConsented ? 'text-green-400' : 'text-[#EAECEF]'}`}>
                      {hasConsented ? '✓ Terms Accepted' : 'I Agree to Terms of Service'}
                    </p>
                    <ul className="text-[10px] text-[#848E9C] space-y-1 leading-relaxed">
                      <li>• This is <strong className="text-[#EAECEF]">beta software</strong> — use at your own risk</li>
                      <li>• Platform holds my <strong className="text-[#FCD535]">{totalCost.toFixed(2)} SOL</strong> until arena ends, then auto-distributes to winners</li>
                      <li>• I will NOT receive a refund if I make an error in arena setup</li>
                      <li>• I have read and accept the{' '}
                        <a 
                          href="/terms" 
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#FCD535] underline hover:text-[#F0B90B]"
                        >
                          Terms of Service
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              {/* ===================================================== */}
              {/* END CONSENT CHECKBOX                                   */}
              {/* ===================================================== */}

              {/* SUBMIT BUTTON */}
              <button 
                type="submit" 
                disabled={(status !== 'idle' && status !== 'error') || !hasConsented} 
                className={`
                  w-full font-black py-5 md:py-6 rounded-2xl transition-all flex items-center justify-center gap-4 
                  uppercase text-[10px] md:text-xs tracking-[0.3em] shadow-xl active:scale-95
                  ${hasConsented
                    ? 'bg-[#FCD535] text-black hover:bg-[#F0B90B] shadow-[#FCD535]/10 cursor-pointer'
                    : 'bg-[#2B3139] text-[#474D57] cursor-not-allowed opacity-60'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {status === 'paying' || status === 'confirming' || status === 'saving' ? (
                    <Loader2 className="animate-spin" size={20} />
                ) : !hasConsented ? (
                    <><CheckSquare size={20}/> Accept Terms to Continue</>
                ) : (
                    <><CreditCard size={20}/> Pay & Activate</>
                )}
              </button>

              {/* Helper text below button */}
              {!hasConsented && (
                <p className="text-center text-[10px] text-[#474D57] -mt-4">
                  ☝️ Check the box above to enable payment
                </p>
              )}

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}