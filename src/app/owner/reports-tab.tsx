"use client";

// ════════════════════════════════════════════════════════
// AUTO-VERIFY ENGINE + REPORTS TAB
// Tambahkan ke owner dashboard (owner-dashboard-v2.tsx)
// ════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import {
  AlertTriangle, CheckCircle, XCircle, Clock,
  Loader2, Eye, ArrowUpRight, MessageSquare,
  DollarSign, Shield, Zap, Users, Bug, Bot,
  HelpCircle, ChevronDown, ChevronUp, Send
} from 'lucide-react';

type Report = {
  id: string;
  reporter_id: string;
  reporter_wallet: string | null;
  type: string;
  title: string;
  description: string;
  evidence_tx: string | null;
  reported_wallet: string | null;
  room_id: string | null;
  auto_verdict: string;
  auto_evidence: any;
  auto_confidence: number;
  auto_checked_at: string | null;
  status: string;
  owner_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

// ── AUTO-VERIFY ENGINE ────────────────────────────────
export async function autoVerifyReport(
  report: Report,
  supabase: any
): Promise<{
  verdict: 'likely_valid' | 'likely_invalid' | 'inconclusive';
  confidence: number;
  evidence: Record<string, any>;
}> {
  const evidence: Record<string, any> = {};
  let score = 0;
  let maxScore = 0;

  try {
    // ── RULE 1: Check deposit_logs for manipulation ─────
    if (report.type === 'deposit_manipulation' && report.room_id) {
      maxScore += 40;

      // Get participants in this room
      const { data: roomParticipants } = await supabase
        .from('participants')
        .select('id, wallet_address, initial_balance, total_deposit')
        .eq('room_id', report.room_id);

      // Get deposit logs for reported wallet
      const reportedParticipant = roomParticipants?.find(
        (p: any) => p.wallet_address === report.reported_wallet
      );

      if (reportedParticipant) {
        const { data: deposits } = await supabase
          .from('deposit_logs')
          .select('*')
          .eq('participant_id', reportedParticipant.id)
          .order('detected_at', { ascending: true });

        evidence.total_deposits = deposits?.reduce((s: number, d: any) => s + d.amount_sol, 0) || 0;
        evidence.deposit_count = deposits?.length || 0;
        evidence.initial_balance = reportedParticipant.initial_balance;
        evidence.deposits_detail = deposits?.slice(0, 5) || [];

        // Large deposit = suspicious
        const hasLargeDeposit = deposits?.some((d: any) => d.amount_sol > 2);
        if (hasLargeDeposit) { score += 20; evidence.has_large_deposit = true; }

        // Deposits exceed 5x initial balance
        if (evidence.total_deposits > reportedParticipant.initial_balance * 5) {
          score += 20; evidence.exceeds_5x_initial = true;
        }

        // Multiple rapid deposits
        const rapidDeposits = deposits?.filter((d: any, i: number) => {
          if (i === 0) return false;
          const prev = new Date(deposits[i-1].detected_at).getTime();
          const curr = new Date(d.detected_at).getTime();
          return (curr - prev) < 300000; // 5 minutes
        });
        if (rapidDeposits?.length > 2) {
          score += 10; evidence.rapid_deposits = rapidDeposits.length;
        }
      } else {
        evidence.wallet_not_found_in_room = true;
        score = 0;
      }
    }

    // ── RULE 2: Check distribution status ───────────────
    if (report.type === 'wrong_distribution' && report.room_id) {
      maxScore += 40;

      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', report.room_id)
        .single();

      if (room) {
        evidence.room_title = room.title;
        evidence.distribution_status = room.distribution_status;
        evidence.end_time = room.end_time;
        evidence.distribution_tx = room.distribution_tx_hash;
        evidence.reward_amount = room.reward_token_amount;
        evidence.winners_info = room.winners_info;

        const ended = new Date(room.end_time) < new Date();

        // Arena ended but still pending = valid complaint
        if (ended && room.distribution_status === 'pending') {
          score += 30;
          evidence.issue = 'Arena ended but distribution still pending';
        }

        // No distribution TX hash but marked completed
        if (room.distribution_status === 'completed' && !room.distribution_tx_hash) {
          score += 20;
          evidence.issue = 'Marked completed but no TX hash found';
        }

        // Check if reporter is in winners
        if (room.winners_info && report.reporter_wallet) {
          const inWinners = JSON.stringify(room.winners_info)
            .includes(report.reporter_wallet);
          evidence.reporter_in_winners = inWinners;
          if (!inWinners && ended) {
            score += 10;
            evidence.note = 'Reporter wallet not found in winners list';
          }
        }
      }
    }

    // ── RULE 3: Bot system check ─────────────────────────
    if (report.type === 'bot_system_issue' && report.room_id) {
      maxScore += 30;

      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', report.room_id)
        .single();

      if (room) {
        const ended = new Date(room.end_time) < new Date();
        const hoursSinceEnd = ended
          ? (new Date().getTime() - new Date(room.end_time).getTime()) / 3600000
          : 0;

        evidence.arena_ended = ended;
        evidence.hours_since_end = hoursSinceEnd.toFixed(1);
        evidence.distribution_status = room.distribution_status;

        if (ended && room.distribution_status === 'pending' && hoursSinceEnd > 1) {
          score += 30;
          evidence.issue = `Bot failed: Arena ended ${hoursSinceEnd.toFixed(0)}h ago, still pending`;
        }
      }
    }

    // ── RULE 4: User misconduct check ───────────────────
    if (report.type === 'bad_behavior' && report.reported_wallet) {
      maxScore += 20;

      const { data: reportedUser } = await supabase
        .from('participants')
        .select('user_id, wallet_address')
        .eq('wallet_address', report.reported_wallet)
        .limit(1)
        .single();

      if (reportedUser?.user_id) {
        const { data: userStat } = await supabase
          .from('user_stats')
          .select('is_banned, user_xp')
          .eq('user_id', reportedUser.user_id)
          .single();

        // Check previous reports against this user
        const { data: prevReports } = await supabase
          .from('reports')
          .select('id')
          .eq('reported_wallet', report.reported_wallet)
          .neq('id', report.id);

        evidence.previous_reports = prevReports?.length || 0;
        evidence.already_banned = userStat?.is_banned || false;
        evidence.user_xp = userStat?.user_xp || 0;

        if ((prevReports?.length || 0) >= 2) {
          score += 15; evidence.pattern = 'Multiple reports against this user';
        }
        if (userStat?.is_banned) {
          score += 5; evidence.already_banned_note = 'User already banned';
        }
      } else {
        evidence.wallet_not_in_system = true;
      }
    }

    // ── RULE 5: Evidence TX verification ────────────────
    if (report.evidence_tx) {
      // Check if TX exists in our deposit_logs
      const { data: txInLogs } = await supabase
        .from('deposit_logs')
        .select('id, amount_sol, detected_at')
        .eq('signature', report.evidence_tx)
        .single();

      if (txInLogs) {
        evidence.tx_found_in_logs = true;
        evidence.tx_amount = txInLogs.amount_sol;
        evidence.tx_time = txInLogs.detected_at;
        score += 10;
      } else {
        evidence.tx_not_in_logs = true;
        evidence.note_tx = 'TX not found in deposit logs — may be unrelated or external';
      }
    }

    // ── CALCULATE VERDICT ─────────────────────────────
    if (maxScore === 0) {
      // Non-verifiable types (bug, other, unfair_creator)
      return {
        verdict: 'inconclusive',
        confidence: 0,
        evidence: {
          ...evidence,
          note: 'This report type requires manual review — cannot auto-verify',
          manual_review_required: true,
        }
      };
    }

    const confidence = Math.round((score / maxScore) * 100);

    return {
      verdict: confidence >= 60 ? 'likely_valid' : confidence >= 30 ? 'inconclusive' : 'likely_invalid',
      confidence,
      evidence,
    };

  } catch (err: any) {
    return {
      verdict: 'inconclusive',
      confidence: 0,
      evidence: { error: err.message, note: 'Auto-verify encountered an error' },
    };
  }
}

// ════════════════════════════════════════════════════════
// REPORTS TAB COMPONENT
// ════════════════════════════════════════════════════════
export function ReportsTab() {
  const supabase = useMemo(() => createClient(), []);

  const [reports, setReports]             = useState<Report[]>([]);
  const [loading, setLoading]             = useState(true);
  const [verifying, setVerifying]         = useState<string | null>(null);
  const [resolving, setResolving]         = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [ownerNotes, setOwnerNotes]       = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus]   = useState<string>('all');
  const [toastMsg, setToastMsg]           = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── RUN AUTO-VERIFY ─────────────────────────────────
  const handleAutoVerify = async (report: Report) => {
    setVerifying(report.id);
    try {
      const result = await autoVerifyReport(report, supabase);

      await supabase.from('reports').update({
        auto_verdict: result.verdict,
        auto_evidence: result.evidence,
        auto_confidence: result.confidence,
        auto_checked_at: new Date().toISOString(),
        status: result.verdict === 'likely_valid' ? 'needs_review' : 'auto_verified',
      }).eq('id', report.id);

      // Notify reporter of verdict
      const verdictMsg = result.verdict === 'likely_valid'
        ? `Your report has been auto-verified as likely valid (${result.confidence}% confidence). Owner is reviewing.`
        : result.verdict === 'likely_invalid'
        ? `Your report could not be verified by our system (${result.confidence}% confidence). Owner may still review manually.`
        : `Your report requires manual review — our system could not auto-verify this type.`;

      await supabase.from('notifications').insert({
        user_id: report.reporter_id,
        type: result.verdict === 'likely_valid' ? 'success' : 'info',
        title: 'Report Update',
        message: verdictMsg,
      });

      showToast(`✅ Auto-verify complete: ${result.verdict} (${result.confidence}%)`);
      await fetchReports();
    } catch (err: any) {
      showToast(`❌ Verify failed: ${err.message}`);
    } finally {
      setVerifying(null); }
  };

  // ── RESOLVE REPORT ──────────────────────────────────
  const handleResolve = async (report: Report, action: 'resolved' | 'dismissed') => {
    setResolving(report.id);
    const note = ownerNotes[report.id] || '';

    try {
      await supabase.from('reports').update({
        status: action,
        owner_note: note || null,
        resolved_at: new Date().toISOString(),
      }).eq('id', report.id);

      // Notify reporter
      const msg = action === 'resolved'
        ? `Your report "${report.title}" has been resolved. ${note ? `Owner note: ${note}` : 'Thank you for keeping TradeHub fair!'}`
        : `Your report "${report.title}" has been reviewed and dismissed. ${note ? `Reason: ${note}` : ''}`;

      await supabase.from('notifications').insert({
        user_id: report.reporter_id,
        type: action === 'resolved' ? 'success' : 'info',
        title: action === 'resolved' ? 'Report Resolved ✅' : 'Report Dismissed',
        message: msg,
      });

      showToast(action === 'resolved' ? '✅ Report resolved — reporter notified' : '👁️ Report dismissed');
      setOwnerNotes(prev => ({ ...prev, [report.id]: '' }));
      await fetchReports();
    } catch (err: any) {
      showToast(`❌ Failed: ${err.message}`);
    } finally { setResolving(null); }
  };

  // ── HELPERS ─────────────────────────────────────────
  const statusColor = (s: string) => ({
    open:          'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    auto_verified: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    needs_review:  'text-orange-400 bg-orange-500/10 border-orange-500/30',
    resolved:      'text-[#0ECB81] bg-[#0ECB81]/10 border-[#0ECB81]/30',
    dismissed:     'text-[#848E9C] bg-[#848E9C]/10 border-[#848E9C]/30',
  }[s] || 'text-white bg-white/10 border-white/20');

  const verdictColor = (v: string) => ({
    likely_valid:   'text-red-400 bg-red-500/10 border-red-500/30',
    likely_invalid: 'text-[#0ECB81] bg-[#0ECB81]/10 border-[#0ECB81]/30',
    inconclusive:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    pending:        'text-[#848E9C] bg-[#848E9C]/10 border-[#848E9C]/30',
  }[v] || 'text-white');

  const typeIcon = (t: string) => ({
    deposit_manipulation: DollarSign,
    unfair_creator:       Shield,
    wrong_distribution:   Zap,
    bad_behavior:         Users,
    bug_error:            Bug,
    bot_system_issue:     Bot,
    other:                HelpCircle,
  }[t] || HelpCircle);

  const typeLabel = (t: string) => ({
    deposit_manipulation: 'Deposit Manipulation',
    unfair_creator:       'Unfair Creator',
    wrong_distribution:   'Wrong Distribution',
    bad_behavior:         'User Misconduct',
    bug_error:            'Bug / Error',
    bot_system_issue:     'Bot System Issue',
    other:                'Other',
  }[t] || t);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const filtered = reports.filter(r =>
    filterStatus === 'all' ? true : r.status === filterStatus
  );

  const openCount      = reports.filter(r => r.status === 'open').length;
  const needsReview    = reports.filter(r => r.status === 'needs_review').length;

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 px-4 py-3 bg-[#1E2329] border border-[#FCD535]/30 rounded-xl text-xs font-bold text-[#FCD535] shadow-2xl animate-in slide-in-from-right-4">
          {toastMsg}
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',        count: reports.length,  color: 'text-white' },
          { label: 'Open',         count: openCount,       color: 'text-yellow-400' },
          { label: 'Needs Review', count: needsReview,     color: 'text-orange-400' },
          { label: 'Resolved',     count: reports.filter(r => r.status === 'resolved').length, color: 'text-[#0ECB81]' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-4 text-center">
            <p className={`text-2xl font-black italic ${stat.color}`}>{stat.count}</p>
            <p className="text-[9px] text-[#848E9C] uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all','open','needs_review','auto_verified','resolved','dismissed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filterStatus === s ? 'bg-[#FCD535] text-black' : 'bg-[#1E2329] border border-[#2B3139] text-[#848E9C] hover:text-white'
            }`}>
            {s.replace('_', ' ')}
            {s === 'open' && openCount > 0 && ` (${openCount})`}
            {s === 'needs_review' && needsReview > 0 && ` (${needsReview})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#FCD535]" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-12 text-center">
          <MessageSquare size={36} className="text-[#474D57] mx-auto mb-3" />
          <p className="text-[#474D57] font-black uppercase tracking-widest text-sm">No Reports</p>
          <p className="text-[#474D57] text-xs mt-1">
            {filterStatus === 'all' ? 'Platform is running smoothly — no reports yet' : `No ${filterStatus.replace('_',' ')} reports`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const TypeIcon = typeIcon(report.type);
            const isExpanded = expandedId === report.id;
            const canVerify = report.auto_verdict === 'pending' && !['resolved','dismissed'].includes(report.status);
            const needsAction = ['open','needs_review'].includes(report.status);

            return (
              <div key={report.id} className={`bg-[#1E2329] rounded-2xl border overflow-hidden transition-all ${
                report.status === 'needs_review' ? 'border-orange-500/40' :
                report.status === 'open' ? 'border-yellow-500/30' : 'border-[#2B3139]'
              }`}>
                {/* Report Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-[#0B0E11] rounded-xl flex items-center justify-center shrink-0">
                        <TypeIcon size={16} className="text-[#848E9C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-sm font-black text-white">{report.title}</p>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border uppercase ${statusColor(report.status)}`}>
                            {report.status.replace('_',' ')}
                          </span>
                          {report.auto_verdict !== 'pending' && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border uppercase ${verdictColor(report.auto_verdict)}`}>
                              {report.auto_verdict.replace('_',' ')} {report.auto_confidence > 0 ? `${report.auto_confidence}%` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#848E9C]">
                          {typeLabel(report.type)} · {fmtDate(report.created_at)}
                        </p>
                        {report.reporter_wallet && (
                          <p className="text-[9px] font-mono text-[#474D57] mt-0.5">
                            Reporter: {report.reporter_wallet.slice(0,8)}...{report.reporter_wallet.slice(-4)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canVerify && (
                        <button onClick={() => handleAutoVerify(report)} disabled={verifying === report.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#FCD535]/10 border border-[#FCD535]/30 rounded-xl text-[10px] font-black text-[#FCD535] hover:bg-[#FCD535]/20 disabled:opacity-50 transition-all">
                          {verifying === report.id ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                          Auto-Verify
                        </button>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : report.id)}
                        className="p-2 rounded-xl bg-[#0B0E11] border border-[#2B3139] text-[#848E9C] hover:text-white transition-all">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Description preview */}
                  {!isExpanded && (
                    <p className="text-xs text-[#848E9C] mt-3 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>
                  )}
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-[#2B3139] p-5 space-y-5 bg-[#181A20]">

                    {/* Description */}
                    <div>
                      <p className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mb-2">Description</p>
                      <p className="text-xs text-[#EAECEF] leading-relaxed bg-[#0B0E11] p-4 rounded-xl">
                        {report.description}
                      </p>
                    </div>

                    {/* Evidence */}
                    <div className="grid grid-cols-2 gap-4">
                      {report.reported_wallet && (
                        <div>
                          <p className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mb-1">Reported Wallet</p>
                          <p className="text-[10px] font-mono text-[#848E9C] bg-[#0B0E11] p-2 rounded-lg break-all">
                            {report.reported_wallet}
                          </p>
                        </div>
                      )}
                      {report.evidence_tx && (
                        <div>
                          <p className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mb-1">Evidence TX</p>
                          <a href={`https://solscan.io/tx/${report.evidence_tx}`} target="_blank" rel="noreferrer"
                            className="text-[10px] font-mono text-[#FCD535] hover:text-[#F0B90B] bg-[#0B0E11] p-2 rounded-lg flex items-center gap-1 break-all">
                            {report.evidence_tx.slice(0,16)}... <ArrowUpRight size={10} />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Auto-Verify Results */}
                    {report.auto_verdict !== 'pending' && Object.keys(report.auto_evidence || {}).length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mb-2">
                          Auto-Verify Evidence
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] border ${verdictColor(report.auto_verdict)}`}>
                            {report.auto_verdict.replace('_',' ')} · {report.auto_confidence}% confidence
                          </span>
                        </p>
                        <div className="bg-[#0B0E11] rounded-xl p-4 space-y-2">
                          {Object.entries(report.auto_evidence).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-start gap-4">
                              <span className="text-[9px] text-[#474D57] uppercase tracking-widest shrink-0">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className={`text-[10px] font-mono text-right break-all max-w-[200px] ${
                                val === true ? 'text-red-400 font-black' :
                                val === false ? 'text-[#0ECB81]' :
                                'text-[#848E9C]'
                              }`}>
                                {typeof val === 'object' ? JSON.stringify(val).slice(0,80) : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {report.auto_checked_at && (
                          <p className="text-[9px] text-[#474D57] mt-2">Checked: {fmtDate(report.auto_checked_at)}</p>
                        )}
                      </div>
                    )}

                    {/* Owner Note Input + Action Buttons */}
                    {needsAction && (
                      <div className="space-y-3 pt-2 border-t border-[#2B3139]">
                        <div>
                          <label className="text-[9px] font-black text-[#474D57] uppercase tracking-widest block mb-2">
                            Owner Note (sent to reporter)
                          </label>
                          <textarea
                            value={ownerNotes[report.id] || ''}
                            onChange={e => setOwnerNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                            placeholder="Optional note for the reporter..."
                            rows={2}
                            className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] focus:border-[#FCD535] outline-none text-xs text-[#EAECEF] resize-none font-medium"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => handleResolve(report, 'resolved')} disabled={resolving === report.id}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl text-xs font-black text-[#0ECB81] hover:bg-[#0ECB81]/20 disabled:opacity-50 transition-all">
                            {resolving === report.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                            Resolve & Notify
                          </button>
                          <button onClick={() => handleResolve(report, 'dismissed')} disabled={resolving === report.id}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#848E9C]/10 border border-[#848E9C]/20 rounded-xl text-xs font-black text-[#848E9C] hover:bg-[#848E9C]/20 disabled:opacity-50 transition-all">
                            {resolving === report.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Owner Note Display (if resolved) */}
                    {report.owner_note && !needsAction && (
                      <div className="bg-[#0B0E11] rounded-xl p-3 border border-[#2B3139]">
                        <p className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mb-1">Owner Note</p>
                        <p className="text-xs text-[#848E9C]">{report.owner_note}</p>
                        {report.resolved_at && (
                          <p className="text-[9px] text-[#474D57] mt-2">Resolved: {fmtDate(report.resolved_at)}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}