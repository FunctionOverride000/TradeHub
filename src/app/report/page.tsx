"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import {
  AlertTriangle, Send, CheckCircle, Loader2,
  FileText, Wallet, Hash, ChevronDown,
  ArrowLeft, Shield, Bug, Users, Zap,
  DollarSign, Bot, HelpCircle, X
} from 'lucide-react';

type ReportType = {
  id: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  autoVerifiable: boolean;
  hint: string;
};

const REPORT_TYPES: ReportType[] = [
  {
    id: 'deposit_manipulation',
    label: 'Deposit Manipulation',
    description: 'Someone deposited large amounts during live arena to inflate ROI',
    icon: DollarSign,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    autoVerifiable: true,
    hint: 'Provide the wallet address and arena. System will auto-check deposit logs.',
  },
  {
    id: 'unfair_creator',
    label: 'Unfair Arena Creator',
    description: 'Creator set unfair rules, changed rules mid-arena, or acted dishonestly',
    icon: Shield,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    autoVerifiable: false,
    hint: 'Describe what happened. Include arena ID if possible.',
  },
  {
    id: 'wrong_distribution',
    label: 'Wrong / Missing Distribution',
    description: 'Arena ended but reward was not distributed correctly or not received',
    icon: Zap,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    autoVerifiable: true,
    hint: 'Provide the arena and your wallet. System will check distribution records.',
  },
  {
    id: 'bad_behavior',
    label: 'User Misconduct',
    description: 'Another user is behaving badly, spamming, or harassing',
    icon: Users,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    autoVerifiable: false,
    hint: 'Provide the wallet address of the reported user.',
  },
  {
    id: 'bug_error',
    label: 'Bug / Platform Error',
    description: 'Found a bug, glitch, or platform error affecting your experience',
    icon: Bug,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    autoVerifiable: false,
    hint: 'Describe the bug in detail. What happened? What did you expect?',
  },
  {
    id: 'bot_system_issue',
    label: 'Automation Bot Issue',
    description: 'Bot/automated system failed — distribution bot, deposit watcher, etc.',
    icon: Bot,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    autoVerifiable: true,
    hint: 'System will check bot logs and distribution status automatically.',
  },
  {
    id: 'other',
    label: 'Other Issue',
    description: 'Any other issue not listed above',
    icon: HelpCircle,
    color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    autoVerifiable: false,
    hint: 'Describe your issue in detail.',
  },
];

export default function ReportPage() {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser]                   = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [selectedType, setSelectedType]   = useState<ReportType | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [rooms, setRooms]                 = useState<any[]>([]);
  const [status, setStatus]               = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg]           = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    evidence_tx: '',
    reported_wallet: '',
    room_id: '',
  });

  // ── AUTH ──────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);

      if (u) {
        const { data: r } = await supabase
          .from('rooms')
          .select('id, title, end_time, distribution_status')
          .order('created_at', { ascending: false })
          .limit(50);
        setRooms(r || []);
      }
      setIsLoadingSession(false);
    };
    init();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ── SUBMIT ────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedType) return;

    if (form.description.length < 30) {
      setErrorMsg('Description must be at least 30 characters.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      // Get reporter wallet from participants table
      const { data: participantData } = await supabase
        .from('participants')
        .select('wallet_address')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reporter_wallet: participantData?.wallet_address || null,
        type: selectedType.id,
        title: form.title || selectedType.label,
        description: form.description,
        evidence_tx: form.evidence_tx || null,
        reported_wallet: form.reported_wallet || null,
        room_id: form.room_id || null,
        status: 'open',
        auto_verdict: 'pending',
      });

      if (error) throw error;

      // Send notification to reporter
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'info',
        title: 'Report Submitted',
        message: `Your report "${form.title || selectedType.label}" has been received. Our system will auto-verify and owner will review shortly.`,
      });

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to submit report.');
    }
  };

  // ── LOADING ───────────────────────────────────
  if (isLoadingSession) return (
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#FCD535]" size={36} />
    </div>
  );

  // ── NOT LOGGED IN ─────────────────────────────
  if (!user) return (
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Shield size={48} className="text-[#FCD535] mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white uppercase mb-2">Login Required</h1>
        <p className="text-[#848E9C] text-sm mb-6">You must be logged in to submit a report.</p>
        <button onClick={() => window.location.href = '/auth'}
          className="px-8 py-3 bg-[#FCD535] text-black font-black rounded-xl hover:bg-[#F0B90B] uppercase text-xs tracking-widest">
          Login Now
        </button>
      </div>
    </div>
  );

  // ── SUCCESS ───────────────────────────────────
  if (status === 'success') return (
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-[#0ECB81]/10 border-2 border-[#0ECB81]/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-[#0ECB81]" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic mb-3">Report Submitted!</h1>
        <p className="text-[#848E9C] text-sm mb-2">
          Our system will <strong className="text-white">auto-verify</strong> your report using blockchain data.
        </p>
        <p className="text-[#848E9C] text-sm mb-8">
          Owner will review the results and take action. You'll receive a notification with the outcome.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-3 border border-[#2B3139] text-[#848E9C] font-bold rounded-xl hover:bg-[#2B3139] text-xs uppercase">
            Back to Dashboard
          </button>
          <button onClick={() => { setStatus('idle'); setForm({ title:'', description:'', evidence_tx:'', reported_wallet:'', room_id:'' }); setSelectedType(null); }}
            className="px-6 py-3 bg-[#FCD535] text-black font-black rounded-xl hover:bg-[#F0B90B] text-xs uppercase">
            Submit Another
          </button>
        </div>
      </div>
    </div>
  );

  // ── MAIN FORM ─────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.4)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">

        {/* Back */}
        <button onClick={() => window.location.href = '/dashboard'}
          className="flex items-center gap-2 text-[#848E9C] hover:text-[#FCD535] font-black text-[10px] uppercase tracking-widest mb-8 transition-all">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* Header */}
        <div className="bg-[#1E2329] rounded-3xl border border-[#2B3139] overflow-hidden mb-6">
          <div className="p-8 border-b border-[#2B3139]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Submit Report</h1>
                <p className="text-[#848E9C] text-[10px] uppercase tracking-widest mt-1">
                  Auto-verified by system · Reviewed by owner
                </p>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-5 bg-[#FCD535]/5 border-b border-[#FCD535]/10">
            <div className="flex items-start gap-3">
              <Zap size={16} className="text-[#FCD535] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#848E9C] leading-relaxed">
                Reports marked <strong className="text-[#FCD535]">Auto-Verifiable</strong> will be checked instantly against
                blockchain data and platform records. Owner only reviews flagged cases — no need to wait long.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#1E2329] rounded-3xl border border-[#2B3139] p-8 space-y-6">

          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <p className="text-red-400 text-xs font-bold">{errorMsg}</p>
            </div>
          )}

          {/* Report Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest">Report Type *</label>

            {/* Selected Type Display */}
            <button type="button" onClick={() => setShowTypeSelector(!showTypeSelector)}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                selectedType ? selectedType.color : 'bg-[#0B0E11] border-[#2B3139] text-[#848E9C]'
              }`}>
              <div className="flex items-center gap-3">
                {selectedType ? (
                  <>
                    <selectedType.icon size={18} />
                    <div>
                      <p className="text-sm font-bold">{selectedType.label}</p>
                      <p className="text-[9px] opacity-70">
                        {selectedType.autoVerifiable ? '⚡ Auto-verifiable' : '👁️ Manual review'}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-bold">Select report type...</p>
                )}
              </div>
              <ChevronDown size={16} className={`transition-transform ${showTypeSelector ? 'rotate-180' : ''}`} />
            </button>

            {/* Type Dropdown */}
            {showTypeSelector && (
              <div className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                {REPORT_TYPES.map(type => (
                  <button key={type.id} type="button"
                    onClick={() => { setSelectedType(type); setShowTypeSelector(false); }}
                    className="w-full p-4 text-left hover:bg-[#1E2329] transition-all border-b border-[#2B3139]/50 last:border-0 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${type.color}`}>
                      <type.icon size={14} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">{type.label}</p>
                        {type.autoVerifiable && (
                          <span className="text-[8px] font-black text-[#FCD535] bg-[#FCD535]/10 px-1.5 py-0.5 rounded uppercase">⚡ Auto</span>
                        )}
                      </div>
                      <p className="text-[9px] text-[#848E9C] mt-0.5">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Hint */}
            {selectedType && (
              <div className="bg-[#FCD535]/5 border border-[#FCD535]/20 rounded-xl p-3 flex items-start gap-2">
                <FileText size={13} className="text-[#FCD535] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#848E9C]">{selectedType.hint}</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest">
              Report Title <span className="text-[#474D57]">(optional)</span>
            </label>
            <input name="title" value={form.title} onChange={handleChange}
              placeholder={selectedType?.label || 'Brief summary of the issue...'}
              className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm text-[#EAECEF]" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest">
              Detailed Description *
            </label>
            <textarea name="description" value={form.description} onChange={handleChange} required rows={5}
              placeholder="Describe exactly what happened, when it happened, and why you believe it's an issue..."
              className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-medium text-sm text-[#EAECEF] resize-none" />
            <div className="flex justify-between">
              <p className="text-[9px] text-[#474D57]">Min. 30 characters</p>
              <p className={`text-[9px] ${form.description.length < 30 ? 'text-red-400' : 'text-[#0ECB81]'}`}>
                {form.description.length} chars
              </p>
            </div>
          </div>

          {/* Related Arena */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest">
              Related Arena <span className="text-[#474D57]">(optional but recommended)</span>
            </label>
            <select name="room_id" value={form.room_id} onChange={handleChange}
              className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm text-[#EAECEF]">
              <option value="">-- Select Arena (if applicable) --</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.title} — {room.distribution_status === 'completed' ? '✓ Completed' : '⏳ Ongoing'}
                </option>
              ))}
            </select>
          </div>

          {/* Reported Wallet */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest flex items-center gap-2">
              <Wallet size={11} /> Reported Wallet Address <span className="text-[#474D57]">(if applicable)</span>
            </label>
            <input name="reported_wallet" value={form.reported_wallet} onChange={handleChange}
              placeholder="Solana wallet address of the reported user..."
              className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-mono text-xs text-[#EAECEF]" />
          </div>

          {/* Evidence TX */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest flex items-center gap-2">
              <Hash size={11} /> Evidence Transaction Hash <span className="text-[#474D57]">(if applicable)</span>
            </label>
            <input name="evidence_tx" value={form.evidence_tx} onChange={handleChange}
              placeholder="Solana transaction signature as evidence..."
              className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-mono text-xs text-[#EAECEF]" />
            <p className="text-[9px] text-[#474D57]">
              Found on Solscan · Helps system auto-verify faster
            </p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={!selectedType || status === 'submitting' || form.description.length < 30}
            className="w-full bg-[#FCD535] text-black font-black py-5 rounded-2xl hover:bg-[#F0B90B] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-40 disabled:cursor-not-allowed">
            {status === 'submitting'
              ? <><Loader2 className="animate-spin" size={18} /> Submitting...</>
              : <><Send size={18} /> Submit Report</>
            }
          </button>

          <p className="text-center text-[9px] text-[#474D57]">
            False reports may result in account suspension. Be honest and accurate.
          </p>
        </form>
      </div>
    </div>
  );
}