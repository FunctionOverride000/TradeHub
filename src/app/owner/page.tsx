"use client";

import { ReportsTab } from '@/app/owner/reports-tab';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import {
  Shield, TrendingUp, Users, Zap, AlertTriangle,
  Trophy, Activity, Eye, EyeOff, RefreshCw, LogOut,
  CheckCircle, XCircle, Clock, Wallet, BarChart3,
  Bell, Lock, ArrowUpRight, ArrowDownRight, Flame,
  Target, Loader2, Database, Download, Send, Ban,
  Rocket, Play, Check, X, ChevronDown, ChevronUp,
  MessageSquare, AlertCircle, UserX, Megaphone
} from 'lucide-react';

// ─── CONFIG ───────────────────────────────────────────
const OWNER_EMAIL       = 'tradehubproofofachievement@gmail.com'; // ← GANTI EMAIL ANDA
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '8530250509:AAHNpLzHnVcHf1WstM_sdBOawaHQXeGwCuc';
const PLATFORM_TREASURY  = process.env.NEXT_PUBLIC_TREASURY_WALLET || '';
const BETA_MAX_TVL       = 30;

// ─── TYPES ────────────────────────────────────────────
type Room = {
  id: string; title: string; creator_wallet: string;
  start_time: string; end_time: string;
  reward_token_amount: number; entry_fee: number;
  distribution_status: string; distribution_tx_hash: string | null;
  access_type: string; is_boosted: boolean;
  price_paid: number; created_at: string;
  winners_info: any; creator_id: string;
};
type Participant = {
  id: string; room_id: string; wallet_address: string;
  initial_balance: number; current_balance: number;
  total_deposit: number; net_profit: number;
  joined_at: string; status: string; user_id: string;
  telegram: string | null;
};
type DepositLog = {
  id: string; participant_id: string; wallet_address: string;
  amount_sol: number; signature: string; detected_at: string;
};
type FraudAlert = {
  id: string; wallet: string; room_id: string; room_title: string;
  deposit_amount: number; deposit_time: string; signature: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string;
  resolved?: boolean; resolution?: 'resolved' | 'ignored';
};
type UserStat = {
  user_id: string; user_xp: number; is_banned: boolean;
  ban_reason: string | null; banned_at: string | null;
  referral_code: string | null;
};

// ─── TOAST ────────────────────────────────────────────
type Toast = { id: number; msg: string; type: 'success' | 'error' | 'info' };

export default function OwnerDashboard() {
  const supabase = useMemo(() => createClient(), []);

  // Auth
  const [authed, setAuthed]             = useState(false);
  const [authLoading, setAuthLoading]   = useState(true);
  const [loginEmail, setLoginEmail]     = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [loginError, setLoginError]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Data
  const [rooms, setRooms]               = useState<Room[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [depositLogs, setDepositLogs]   = useState<DepositLog[]>([]);
  const [userStats, setUserStats]       = useState<UserStat[]>([]);
  const [fraudAlerts, setFraudAlerts]   = useState<FraudAlert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<Set<string>>(new Set());
  const [loading, setLoading]           = useState(false);
  const [lastRefresh, setLastRefresh]   = useState<Date | null>(null);
  const [activeTab, setActiveTab]       = useState<'overview'|'arenas'|'fraud'|'distributions'|'users'|'broadcast'|'reports'>('overview');
  
  // FIX: Added openCount state variable here
  const [openCount, setOpenCount]       = useState(0);

  // Action states
  const [distributing, setDistributing] = useState<string | null>(null);
  const [banning, setBanning]           = useState<string | null>(null);
  const [banReason, setBanReason]       = useState('');
  const [banTarget, setBanTarget]       = useState<UserStat | null>(null);
  const [boosting, setBoosting]         = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [toasts, setToasts]             = useState<Toast[]>([]);
  const [exportingCSV, setExportingCSV] = useState(false);

  // ── TOAST HELPER ──────────────────────────────────
  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  // ── AUTH CHECK ────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === OWNER_EMAIL) { setAuthed(true); }
      else { if (user) await supabase.auth.signOut(); setAuthed(false); }
      setAuthLoading(false);
    };
    check();
  }, [supabase]);

  // ── LOGIN ─────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true); setLoginError('');
    if (loginEmail.trim().toLowerCase() !== OWNER_EMAIL) {
      setLoginError('Access denied. Owner credentials required.');
      setLoginLoading(false); return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(), password: loginPassword,
    });
    if (error || data.user?.email !== OWNER_EMAIL) {
      setLoginError('Invalid credentials or unauthorized access.');
      await supabase.auth.signOut(); setLoginLoading(false); return;
    }
    setAuthed(true); setLoginLoading(false);
  };

  // ── FRAUD DETECTION ───────────────────────────────
  const detectFraud = useCallback((
    deposits: DepositLog[], roomsData: Room[], participantsData: Participant[]
  ): FraudAlert[] => {
    const alerts: FraudAlert[] = [];
    const now = new Date();
    const activeRoomIds = new Set(
      roomsData.filter(r =>
        new Date(r.start_time) <= now && new Date(r.end_time) >= now
      ).map(r => r.id)
    );
    const participantMap = new Map(participantsData.map(p => [p.id, p]));
    const depositsByParticipant = new Map<string, DepositLog[]>();
    deposits.forEach(d => {
      if (!d.participant_id) return;
      const arr = depositsByParticipant.get(d.participant_id) || [];
      depositsByParticipant.set(d.participant_id, [...arr, d]);
    });
    depositsByParticipant.forEach((deps, pid) => {
      const participant = participantMap.get(pid);
      if (!participant) return;
      const room = roomsData.find(r => r.id === participant.room_id);
      if (!room) return;
      const isActive = activeRoomIds.has(room.id);
      deps.forEach(dep => {
        if (isActive && dep.amount_sol > 2) {
          alerts.push({
            id: dep.id, wallet: dep.wallet_address,
            room_id: room.id, room_title: room.title,
            deposit_amount: dep.amount_sol, deposit_time: dep.detected_at,
            signature: dep.signature,
            severity: dep.amount_sol > 10 ? 'HIGH' : 'MEDIUM',
            reason: `Large deposit (${dep.amount_sol.toFixed(2)} SOL) during live arena`
          });
        }
      });
      const recentDeps = deps.filter(d =>
        new Date(d.detected_at).getTime() > now.getTime() - 3600000
      );
      if (isActive && recentDeps.length >= 3) {
        const total = recentDeps.reduce((s, d) => s + d.amount_sol, 0);
        alerts.push({
          id: `multi-${pid}`, wallet: participant.wallet_address,
          room_id: room.id, room_title: room.title,
          deposit_amount: total, deposit_time: recentDeps[0].detected_at,
          signature: recentDeps[0].signature, severity: 'HIGH',
          reason: `${recentDeps.length} rapid deposits (${total.toFixed(2)} SOL) within 1 hour`
        });
      }
      if (participant.total_deposit > participant.initial_balance * 5 && participant.initial_balance > 0) {
        alerts.push({
          id: `ratio-${pid}`, wallet: participant.wallet_address,
          room_id: room.id, room_title: room.title,
          deposit_amount: participant.total_deposit,
          deposit_time: new Date().toISOString(),
          signature: deps[0]?.signature || '', severity: 'MEDIUM',
          reason: `Total deposits exceed 5x initial balance`
        });
      }
    });
    const seen = new Set<string>();
    return alerts.filter(a => {
      const key = `${a.wallet}-${a.room_id}-${a.reason.substring(0,20)}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => ({ HIGH:0, MEDIUM:1, LOW:2 }[a.severity] - { HIGH:0, MEDIUM:1, LOW:2 }[b.severity]));
  }, []);

  // ── FETCH DATA ────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch main dashboard data
      const [
        { data: r }, { data: p }, { data: d }, { data: u }
      ] = await Promise.all([
        supabase.from('rooms').select('*').order('created_at', { ascending: false }),
        supabase.from('participants').select('*').order('joined_at', { ascending: false }),
        supabase.from('deposit_logs').select('*').order('detected_at', { ascending: false }).limit(300),
        supabase.from('user_stats').select('user_id,user_xp,is_banned,ban_reason,banned_at,referral_code'),
      ]);

      // FIX: Fetch reports count separately (wrapped in try-catch to be safe if table doesn't exist yet)
      let reportsCount = 0;
      try {
        const { count } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'); // Assuming 'pending' status for open reports
        reportsCount = count || 0;
      } catch (e) {
        console.warn('Reports table check failed', e);
      }

      setRooms(r || []); setParticipants(p || []);
      setDepositLogs(d || []); setUserStats(u || []);
      setFraudAlerts(detectFraud(d || [], r || [], p || []));
      
      // FIX: Update the openCount state
      setOpenCount(reportsCount);
      
      setLastRefresh(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [supabase, detectFraud]);

  useEffect(() => {
    if (authed) {
      fetchData();
      const iv = setInterval(fetchData, 30000);
      return () => clearInterval(iv);
    }
  }, [authed, fetchData]);

  // ════════════════════════════════════════════════
  // ACTION HANDLERS
  // ════════════════════════════════════════════════

  // ── 1. MANUAL DISTRIBUTION ────────────────────
  const handleDistribute = async (room: Room) => {
    if (!confirm(`Manually trigger distribution for "${room.title}"?\nReward: ${room.reward_token_amount} SOL`)) return;
    setDistributing(room.id);
    try {
      const { error } = await supabase.functions.invoke('distribute-rewards', {
        body: { roomId: room.id, manual: true, triggeredBy: 'owner_dashboard' }
      });
      if (error) throw error;
      toast(`✅ Distribution triggered for "${room.title}"`);
      await fetchData();
    } catch (err: any) {
      toast(`❌ Distribution failed: ${err.message}`, 'error');
    } finally { setDistributing(null); }
  };

  // ── 2. RESOLVE/IGNORE FRAUD ALERT ─────────────
  const handleResolveAlert = (alertId: string, resolution: 'resolved' | 'ignored') => {
    setResolvedAlerts(prev => new Set([...prev, alertId]));
    setFraudAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, resolved: true, resolution } : a
    ));
    toast(resolution === 'resolved'
      ? '✅ Alert marked as Resolved'
      : '👁️ Alert marked as Ignored'
    );
  };

  // ── 3. BOOST ARENA ────────────────────────────
  const handleBoost = async (room: Room) => {
    const action = room.is_boosted ? 'Remove boost from' : 'Boost';
    if (!confirm(`${action} "${room.title}"?`)) return;
    setBoosting(room.id);
    try {
      const { error } = await supabase.from('rooms')
        .update({ is_boosted: !room.is_boosted })
        .eq('id', room.id);
      if (error) throw error;
      toast(room.is_boosted ? '⚡ Boost removed' : '⚡ Arena boosted to top!');
      await fetchData();
    } catch (err: any) {
      toast(`❌ Boost failed: ${err.message}`, 'error');
    } finally { setBoosting(null); }
  };

  // ── 4. BAN USER ───────────────────────────────
  const handleBan = async () => {
    if (!banTarget || !banReason.trim()) return;
    setBanning(banTarget.user_id);
    try {
      const { error } = await supabase.from('user_stats')
        .update({
          is_banned: !banTarget.is_banned,
          ban_reason: banTarget.is_banned ? null : banReason.trim(),
          banned_at: banTarget.is_banned ? null : new Date().toISOString(),
        })
        .eq('user_id', banTarget.user_id);
      if (error) throw error;

      // Send in-app notification to user
      if (!banTarget.is_banned) {
        await supabase.from('notifications').insert({
          user_id: banTarget.user_id,
          type: 'error',
          title: 'Account Suspended',
          message: `Your account has been suspended. Reason: ${banReason}. Contact support to appeal.`,
        });
      }

      toast(banTarget.is_banned ? '✅ User unbanned' : `🚫 User banned: ${banReason}`);
      setBanTarget(null); setBanReason('');
      await fetchData();
    } catch (err: any) {
      toast(`❌ Ban failed: ${err.message}`, 'error');
    } finally { setBanning(null); }
  };

  // ── 5. BROADCAST NOTIFICATION ─────────────────
  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) {
      toast('Title and message required', 'error'); return;
    }
    if (!confirm(`Send notification to ALL ${userStats.length} users?`)) return;
    setBroadcasting(true);
    try {
      // In-app notifications (batch insert)
      const notifications = userStats.map(u => ({
        user_id: u.user_id,
        type: 'info' as const,
        title: broadcastTitle.trim(),
        message: broadcastMsg.trim(),
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) throw error;
      }

      // Telegram broadcast to users who have telegram filled
      const telegramUsers = participants.filter(p => p.telegram && p.telegram.trim());
      if (telegramUsers.length > 0 && TELEGRAM_BOT_TOKEN) {
        const uniqueChatIds = [...new Set(telegramUsers.map(p => p.telegram!.trim()))];
        let sent = 0;
        for (const chatId of uniqueChatIds) {
          try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🏆 *TradeHub Announcement*\n\n*${broadcastTitle}*\n\n${broadcastMsg}`,
                parse_mode: 'Markdown',
              }),
            });
            sent++;
          } catch { /* skip failed */ }
        }
        toast(`✅ Sent to ${notifications.length} users in-app${sent > 0 ? ` + ${sent} Telegram` : ''}`);
      } else {
        toast(`✅ Notification sent to ${notifications.length} users`);
      }

      setBroadcastTitle(''); setBroadcastMsg('');
    } catch (err: any) {
      toast(`❌ Broadcast failed: ${err.message}`, 'error');
    } finally { setBroadcasting(false); }
  };

  // ── 6. EXPORT CSV ─────────────────────────────
  const handleExportCSV = async (type: 'arenas' | 'participants' | 'deposits' | 'revenue') => {
    setExportingCSV(true);
    try {
      let csv = '';
      let filename = '';

      if (type === 'arenas') {
        filename = `tradehub_arenas_${new Date().toISOString().slice(0,10)}.csv`;
        csv = 'Title,Creator,Reward SOL,Entry Fee,Status,Participants,Start,End,Revenue\n';
        rooms.forEach(r => {
          const count = participants.filter(p => p.room_id === r.id).length;
          csv += `"${r.title}","${r.creator_wallet}",${r.reward_token_amount},${r.entry_fee},"${r.distribution_status}",${count},"${r.start_time}","${r.end_time}",${r.price_paid}\n`;
        });
      } else if (type === 'participants') {
        filename = `tradehub_participants_${new Date().toISOString().slice(0,10)}.csv`;
        csv = 'Wallet,Room ID,Initial Balance,Current Balance,Total Deposit,Net Profit,Joined\n';
        participants.forEach(p => {
          csv += `"${p.wallet_address}","${p.room_id}",${p.initial_balance},${p.current_balance},${p.total_deposit},${p.net_profit},"${p.joined_at}"\n`;
        });
      } else if (type === 'deposits') {
        filename = `tradehub_deposits_${new Date().toISOString().slice(0,10)}.csv`;
        csv = 'Wallet,Amount SOL,Signature,Detected At\n';
        depositLogs.forEach(d => {
          csv += `"${d.wallet_address}",${d.amount_sol},"${d.signature}","${d.detected_at}"\n`;
        });
      } else if (type === 'revenue') {
        filename = `tradehub_revenue_${new Date().toISOString().slice(0,10)}.csv`;
        csv = 'Arena Title,Creation Fee,Type,Date\n';
        rooms.forEach(r => {
          csv += `"${r.title}",${r.price_paid},"${r.access_type}","${r.created_at}"\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast(`✅ Exported ${filename}`);
    } catch (err: any) {
      toast(`❌ Export failed: ${err.message}`, 'error');
    } finally { setExportingCSV(false); }
  };

  // ── COMPUTED VALUES ───────────────────────────
  const now              = new Date();
  const activeRooms      = rooms.filter(r => new Date(r.start_time) <= now && new Date(r.end_time) >= now && r.distribution_status === 'pending');
  const completedRooms   = rooms.filter(r => r.distribution_status === 'completed');
  const needsDistribution = rooms.filter(r => new Date(r.end_time) < now && r.distribution_status === 'pending');
  const totalTVL         = rooms.filter(r => r.distribution_status === 'pending').reduce((s, r) => s + Number(r.reward_token_amount), 0);
  const totalRevenue     = rooms.reduce((s, r) => s + Number(r.price_paid), 0);
  const tvlPercent       = (totalTVL / BETA_MAX_TVL) * 100;
  const activeAlerts     = fraudAlerts.filter(a => !resolvedAlerts.has(a.id));
  const bannedUsers      = userStats.filter(u => u.is_banned);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const severityColor = (s: string) => s === 'HIGH' ? 'text-red-500 bg-red-500/10 border-red-500/30' : s === 'MEDIUM' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-blue-400 bg-blue-400/10 border-blue-400/30';
  const statusColor = (s: string) => s === 'completed' ? 'text-[#0ECB81] bg-[#0ECB81]/10' : 'text-yellow-500 bg-yellow-500/10';

  // ── AUTH LOADING ──────────────────────────────
  if (authLoading) return (
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#FCD535]" size={40} />
    </div>
  );

  // ── LOGIN PAGE ────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#FCD535]/10 border-2 border-[#FCD535]/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="text-[#FCD535]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">Owner Access</h1>
          <p className="text-[#848E9C] text-xs mt-2 uppercase tracking-widest">TradeHub Command Center</p>
        </div>
        <form onSubmit={handleLogin} className="bg-[#1E2329] rounded-3xl border border-[#2B3139] p-8 space-y-5">
          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={18} className="text-red-500 shrink-0" />
              <p className="text-red-500 text-xs font-bold">{loginError}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest">Owner Email</label>
            <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm text-[#EAECEF]" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0B0E11] p-4 pr-12 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm text-[#EAECEF]" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474D57] hover:text-white">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loginLoading}
            className="w-full bg-[#FCD535] text-black font-black py-4 rounded-2xl hover:bg-[#F0B90B] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50">
            {loginLoading ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={18} /> Access Control Panel</>}
          </button>
        </form>
        <p className="text-center text-[10px] text-[#474D57] mt-6 uppercase tracking-widest">Unauthorized access is prohibited</p>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════
  // MAIN DASHBOARD
  // ════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.4)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* TOASTS */}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl text-xs font-bold shadow-2xl animate-in slide-in-from-right-4 flex items-center gap-2 ${
            t.type === 'success' ? 'bg-[#0ECB81] text-black' :
            t.type === 'error'   ? 'bg-red-500 text-white' :
            'bg-[#FCD535] text-black'}`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* BAN MODAL */}
      {banTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="bg-[#1E2329] rounded-3xl border border-red-500/30 p-8 w-full max-w-md">
            <h3 className="text-lg font-black text-white mb-2">
              {banTarget.is_banned ? 'Unban User?' : 'Ban User'}
            </h3>
            <p className="text-xs text-[#848E9C] mb-6 font-mono">{banTarget.user_id}</p>
            {!banTarget.is_banned && (
              <div className="mb-5">
                <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest block mb-2">Ban Reason *</label>
                <input value={banReason} onChange={e => setBanReason(e.target.value)}
                  placeholder="e.g. Deposit manipulation, cheating..."
                  className="w-full bg-[#0B0E11] p-4 rounded-xl border border-[#2B3139] focus:border-red-500 outline-none text-sm text-[#EAECEF] font-medium" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setBanTarget(null); setBanReason(''); }}
                className="flex-1 py-3 rounded-xl border border-[#2B3139] text-[#848E9C] font-bold text-xs hover:bg-[#2B3139]">
                Cancel
              </button>
              <button onClick={handleBan} disabled={!!banning || (!banTarget.is_banned && !banReason.trim())}
                className={`flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50 ${
                  banTarget.is_banned ? 'bg-[#0ECB81] text-black' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                {banning ? <Loader2 size={14} className="animate-spin" /> : banTarget.is_banned ? '✅ Unban User' : '🚫 Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-[#0B0E11]/90 backdrop-blur-xl border-b border-[#2B3139]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FCD535] rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-black" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white">Owner Panel</p>
              <p className="text-[9px] text-[#848E9C] uppercase tracking-widest">Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeAlerts.length > 0 && (
              <button onClick={() => setActiveTab('fraud')}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-xl animate-pulse">
                <Bell size={14} className="text-red-500" />
                <span className="text-xs font-black text-red-500">{activeAlerts.length} ALERTS</span>
              </button>
            )}
            {needsDistribution.length > 0 && (
              <button onClick={() => setActiveTab('distributions')}
                className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 rounded-xl">
                <Clock size={14} className="text-yellow-500" />
                <span className="text-xs font-black text-yellow-500">{needsDistribution.length} PENDING</span>
              </button>
            )}
            <button onClick={fetchData} disabled={loading}
              className="p-2 rounded-xl bg-[#1E2329] border border-[#2B3139] hover:border-[#FCD535] transition-all">
              <RefreshCw size={16} className={`text-[#848E9C] ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); setAuthed(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E2329] border border-[#2B3139] hover:border-red-500/50 text-[#848E9C] hover:text-red-400 transition-all text-xs font-bold uppercase">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {lastRefresh && (
          <p className="text-[10px] text-[#474D57] mb-6 uppercase tracking-widest flex items-center gap-2">
            <Activity size={10} /> Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refresh 30s
          </p>
        )}

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`bg-[#1E2329] rounded-2xl border p-5 ${tvlPercent > 80 ? 'border-red-500/50' : tvlPercent > 60 ? 'border-yellow-500/50' : 'border-[#2B3139]'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-widest">TVL</p>
              <Database size={14} className={tvlPercent > 80 ? 'text-red-500' : tvlPercent > 60 ? 'text-yellow-500' : 'text-[#FCD535]'} />
            </div>
            <p className={`text-2xl font-black italic ${tvlPercent > 80 ? 'text-red-500' : tvlPercent > 60 ? 'text-yellow-500' : 'text-[#FCD535]'}`}>{totalTVL.toFixed(2)} SOL</p>
            <div className="mt-2 bg-[#0B0E11] rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${tvlPercent > 80 ? 'bg-red-500' : tvlPercent > 60 ? 'bg-yellow-500' : 'bg-[#FCD535]'}`} style={{ width: `${Math.min(tvlPercent,100)}%` }} />
            </div>
            <p className="text-[9px] text-[#848E9C] mt-1">{tvlPercent.toFixed(0)}% of {BETA_MAX_TVL} SOL</p>
          </div>
          <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-widest">Revenue</p>
              <TrendingUp size={14} className="text-[#0ECB81]" />
            </div>
            <p className="text-2xl font-black italic text-[#0ECB81]">{totalRevenue.toFixed(3)} SOL</p>
            <p className="text-[9px] text-[#848E9C] mt-2">{rooms.length} total arenas</p>
          </div>
          <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-widest">Active</p>
              <Flame size={14} className="text-orange-400" />
            </div>
            <p className="text-2xl font-black italic text-white">{activeRooms.length}<span className="text-sm text-[#848E9C]">/10</span></p>
            <p className="text-[9px] text-[#848E9C] mt-2">{needsDistribution.length > 0 ? `⚠️ ${needsDistribution.length} need distribution` : `${completedRooms.length} completed`}</p>
          </div>
          <div className={`bg-[#1E2329] rounded-2xl border p-5 ${activeAlerts.length > 0 ? 'border-red-500/50' : 'border-[#2B3139]'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black text-[#848E9C] uppercase tracking-widest">Fraud</p>
              <AlertTriangle size={14} className={activeAlerts.length > 0 ? 'text-red-500' : 'text-[#848E9C]'} />
            </div>
            <p className={`text-2xl font-black italic ${activeAlerts.length > 0 ? 'text-red-500' : 'text-[#0ECB81]'}`}>
              {activeAlerts.length === 0 ? 'Clean' : `${activeAlerts.length}`}
            </p>
            <p className="text-[9px] text-[#848E9C] mt-2">{bannedUsers.length} banned users</p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {([
            { id: 'overview',       label: 'Overview',      icon: BarChart3 },
            { id: 'arenas',         label: 'Arenas',        icon: Trophy },
            { id: 'fraud',          label: `Fraud ${activeAlerts.length > 0 ? `(${activeAlerts.length})` : ''}`, icon: AlertTriangle },
            { id: 'distributions',  label: `Distribute ${needsDistribution.length > 0 ? `(${needsDistribution.length})` : ''}`, icon: Play },
            { id: 'users',          label: 'Users',         icon: Users },
            { id: 'broadcast',      label: 'Broadcast',     icon: Megaphone },
            { id: 'reports',        label: `Reports ${openCount > 0 ? `(${openCount})` : ''}`, icon: MessageSquare },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-[#FCD535] text-black' : 'bg-[#1E2329] border border-[#2B3139] text-[#848E9C] hover:text-white'
              } ${(tab.id === 'fraud' && activeAlerts.length > 0) || (tab.id === 'distributions' && needsDistribution.length > 0) ? 'border-yellow-500/50' : ''}`}>
              <tab.icon size={12} /> {tab.label.trim()}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export CSV Buttons */}
            <div className="lg:col-span-2 bg-[#1E2329] rounded-2xl border border-[#2B3139] p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                <Download size={13} /> Export Data
              </h3>
              <div className="flex flex-wrap gap-3">
                {(['arenas','participants','deposits','revenue'] as const).map(type => (
                  <button key={type} onClick={() => handleExportCSV(type)} disabled={exportingCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0B0E11] border border-[#2B3139] rounded-xl text-xs font-bold text-[#848E9C] hover:text-white hover:border-[#FCD535] transition-all disabled:opacity-50 capitalize">
                    {exportingCSV ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    {type}.csv
                  </button>
                ))}
              </div>
            </div>

            {/* Needs Distribution */}
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#FCD535] mb-4 flex items-center gap-2">
                <Clock size={14} /> Needs Distribution ({needsDistribution.length})
              </h3>
              {needsDistribution.length === 0 ? (
                <p className="text-[#474D57] text-sm text-center py-8 flex items-center justify-center gap-2">
                  <CheckCircle size={16} className="text-[#0ECB81]" /> All clear!
                </p>
              ) : (
                <div className="space-y-3">
                  {needsDistribution.map(room => (
                    <div key={room.id} className="bg-yellow-500/5 border border-yellow-500/20 p-3 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-white truncate max-w-[160px]">{room.title}</p>
                          <p className="text-[9px] text-[#848E9C]">Ended: {fmtDate(room.end_time)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-yellow-500">{room.reward_token_amount} SOL</span>
                          <button onClick={() => handleDistribute(room)} disabled={distributing === room.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#FCD535] text-black rounded-lg font-black text-[9px] uppercase hover:bg-[#F0B90B] disabled:opacity-50">
                            {distributing === room.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                            Distribute
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Fraud Alerts */}
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle size={14} /> Active Alerts ({activeAlerts.length})
              </h3>
              {activeAlerts.length === 0 ? (
                <p className="text-[#474D57] text-sm text-center py-8 flex items-center justify-center gap-2">
                  <CheckCircle size={16} className="text-[#0ECB81]" /> No fraud detected
                </p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {activeAlerts.slice(0,5).map(alert => (
                    <div key={alert.id} className={`p-3 rounded-xl border ${severityColor(alert.severity)}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate">{alert.reason}</p>
                          <p className="text-[9px] opacity-70 mt-0.5">{alert.wallet.slice(0,10)}... · {alert.deposit_amount.toFixed(2)} SOL</p>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border shrink-0 ${severityColor(alert.severity)}`}>{alert.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Health */}
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#FCD535] mb-4 flex items-center gap-2">
                <Zap size={14} /> Platform Health
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'TVL Safety', pct: tvlPercent, ok: tvlPercent < 80, warn: tvlPercent > 60 },
                  { label: 'Arena Capacity', pct: (activeRooms.length/10)*100, ok: activeRooms.length < 8, warn: activeRooms.length >= 7 },
                  { label: 'Fraud Risk', pct: Math.min(activeAlerts.length * 10, 100), ok: activeAlerts.length === 0, warn: activeAlerts.length > 0 },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-[#848E9C] uppercase tracking-widest">{m.label}</span>
                      <span className={`text-[10px] font-black ${!m.ok ? 'text-red-400' : m.warn ? 'text-yellow-400' : 'text-[#0ECB81]'}`}>
                        {!m.ok ? '⚠️ WARNING' : m.warn ? '⚡ WATCH' : '✓ OK'}
                      </span>
                    </div>
                    <div className="bg-[#0B0E11] rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${!m.ok ? 'bg-red-500' : m.warn ? 'bg-yellow-500' : 'bg-[#0ECB81]'}`} style={{ width: `${Math.min(m.pct,100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Deposits */}
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#FCD535] mb-4 flex items-center gap-2">
                <Activity size={14} /> Recent Deposits
              </h3>
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {depositLogs.slice(0,10).map(dep => (
                  <div key={dep.id} className="flex items-center justify-between bg-[#0B0E11] p-3 rounded-xl">
                    <div>
                      <p className="text-[10px] font-mono text-[#848E9C]">{dep.wallet_address.slice(0,8)}...{dep.wallet_address.slice(-4)}</p>
                      <p className="text-[9px] text-[#474D57]">{fmtDate(dep.detected_at)}</p>
                    </div>
                    <p className={`text-xs font-black ${dep.amount_sol > 2 ? 'text-red-400' : 'text-[#0ECB81]'}`}>
                      +{dep.amount_sol.toFixed(3)} SOL {dep.amount_sol > 2 && '⚠️'}
                    </p>
                  </div>
                ))}
                {depositLogs.length === 0 && <p className="text-[#474D57] text-sm text-center py-6">No deposits yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── ARENAS TAB ───────────────────────────── */}
        {activeTab === 'arenas' && (
          <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] overflow-hidden">
            <div className="p-5 border-b border-[#2B3139] flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">All Arenas ({rooms.length})</h3>
              <button onClick={() => handleExportCSV('arenas')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0E11] border border-[#2B3139] rounded-lg text-[10px] font-bold text-[#848E9C] hover:text-white">
                <Download size={11} /> Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2B3139]">
                    {['Title','Reward','Status','Participants','End','Boost','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-[#474D57] uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room, i) => {
                    const count = participants.filter(p => p.room_id === room.id).length;
                    const ended = new Date(room.end_time) < now;
                    return (
                      <tr key={room.id} className={`border-b border-[#2B3139]/50 hover:bg-[#2B3139]/20 ${i%2===0?'bg-[#181A20]':''}`}>
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-white max-w-[150px] truncate">{room.title}</p>
                          <p className="text-[9px] text-[#848E9C]">{room.access_type}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-[#FCD535]">{room.reward_token_amount} SOL</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${statusColor(room.distribution_status)}`}>
                            {room.distribution_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-center text-white font-bold">{count}</td>
                        <td className="px-4 py-3 text-[9px] text-[#848E9C]">{fmtDate(room.end_time)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleBoost(room)} disabled={boosting === room.id}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black transition-all ${room.is_boosted ? 'bg-[#FCD535]/20 text-[#FCD535] hover:bg-red-500/20 hover:text-red-400' : 'bg-[#2B3139] text-[#848E9C] hover:bg-[#FCD535]/20 hover:text-[#FCD535]'}`}>
                            {boosting === room.id ? <Loader2 size={9} className="animate-spin" /> : <Rocket size={9} />}
                            {room.is_boosted ? 'Boosted' : 'Boost'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {ended && room.distribution_status === 'pending' && (
                            <button onClick={() => handleDistribute(room)} disabled={distributing === room.id}
                              className="flex items-center gap-1 px-2 py-1.5 bg-[#FCD535] text-black rounded-lg font-black text-[9px] hover:bg-[#F0B90B] disabled:opacity-50">
                              {distributing === room.id ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
                              Distribute
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rooms.length === 0 && <p className="text-center text-[#474D57] py-12 text-sm">No arenas yet</p>}
            </div>
          </div>
        )}

        {/* ── FRAUD TAB ────────────────────────────── */}
        {activeTab === 'fraud' && (
          <div className="space-y-4">
            <div className="bg-[#1E2329] rounded-2xl border border-red-500/20 p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-400 mb-1 flex items-center gap-2">
                <AlertTriangle size={14} /> Fraud Detection — Auto Rules
              </h3>
              <p className="text-[10px] text-[#848E9C]">
                Detects: deposits &gt;2 SOL during live arena · 3+ rapid deposits in 1 hour · total deposits &gt;5x initial balance
              </p>
            </div>
            {activeAlerts.length === 0 ? (
              <div className="bg-[#1E2329] rounded-2xl border border-[#0ECB81]/20 p-12 text-center">
                <CheckCircle size={40} className="text-[#0ECB81] mx-auto mb-4" />
                <p className="text-[#0ECB81] font-black text-lg uppercase">No Active Fraud Alerts</p>
                <p className="text-[#848E9C] text-xs mt-2">
                  {fraudAlerts.length - activeAlerts.length > 0
                    ? `${fraudAlerts.length - activeAlerts.length} alerts previously resolved`
                    : 'All deposit patterns look normal'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {fraudAlerts.map(alert => (
                  <div key={alert.id} className={`bg-[#1E2329] rounded-2xl border p-5 transition-all ${
                    resolvedAlerts.has(alert.id) ? 'opacity-40' : severityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase ${severityColor(alert.severity)}`}>{alert.severity}</span>
                          <p className="text-xs font-bold text-white">{alert.room_title}</p>
                          {alert.resolved && (
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${alert.resolution === 'resolved' ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#848E9C]/10 text-[#848E9C]'}`}>
                              {alert.resolution?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#EAECEF] mb-3">{alert.reason}</p>
                        <div className="grid grid-cols-2 gap-3 text-[10px]">
                          <div>
                            <span className="text-[#474D57] uppercase tracking-widest">Wallet</span>
                            <p className="font-mono text-[#848E9C] mt-0.5">{alert.wallet.slice(0,10)}...{alert.wallet.slice(-6)}</p>
                          </div>
                          <div>
                            <span className="text-[#474D57] uppercase tracking-widest">Amount</span>
                            <p className="font-black text-red-400 mt-0.5">{alert.deposit_amount.toFixed(3)} SOL</p>
                          </div>
                          <div>
                            <span className="text-[#474D57] uppercase tracking-widest">Time</span>
                            <p className="text-[#848E9C] mt-0.5">{fmtDate(alert.deposit_time)}</p>
                          </div>
                        </div>
                      </div>
                      {!resolvedAlerts.has(alert.id) && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <a href={`https://solscan.io/tx/${alert.signature}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0B0E11] border border-[#2B3139] text-[10px] font-bold text-[#848E9C] hover:text-white">
                            Solscan <ArrowUpRight size={11} />
                          </a>
                          <button onClick={() => handleResolveAlert(alert.id, 'resolved')}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[10px] font-bold text-[#0ECB81] hover:bg-[#0ECB81]/20">
                            <Check size={11} /> Resolve
                          </button>
                          <button onClick={() => handleResolveAlert(alert.id, 'ignored')}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#848E9C]/10 border border-[#848E9C]/20 text-[10px] font-bold text-[#848E9C] hover:bg-[#848E9C]/20">
                            <X size={11} /> Ignore
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DISTRIBUTIONS TAB ────────────────────── */}
        {activeTab === 'distributions' && (
          <div className="space-y-6">
            {needsDistribution.length > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-6">
                <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={14} /> Requires Manual Distribution ({needsDistribution.length})
                </h3>
                <div className="space-y-3">
                  {needsDistribution.map(room => {
                    const roomParts = participants.filter(p => p.room_id === room.id);
                    return (
                      <div key={room.id} className="bg-[#0B0E11] p-5 rounded-2xl border border-yellow-500/20">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-black text-white mb-1">{room.title}</p>
                            <p className="text-[10px] text-[#848E9C]">Ended: {fmtDate(room.end_time)} · {roomParts.length} participants · {room.reward_token_amount} SOL reward</p>
                            <p className="text-[9px] text-yellow-500 mt-2 font-bold">
                              ⚠️ Bot may have failed — manual trigger required
                            </p>
                          </div>
                          <button onClick={() => handleDistribute(room)} disabled={distributing === room.id}
                            className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[#FCD535] text-black rounded-xl font-black text-xs uppercase hover:bg-[#F0B90B] disabled:opacity-50 transition-all">
                            {distributing === room.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            {distributing === room.id ? 'Triggering...' : 'Trigger Distribution'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {needsDistribution.length === 0 && (
              <div className="bg-[#0ECB81]/5 border border-[#0ECB81]/20 rounded-2xl p-8 text-center">
                <CheckCircle size={32} className="text-[#0ECB81] mx-auto mb-3" />
                <p className="text-[#0ECB81] font-black uppercase tracking-widest text-sm">All Distributions Complete</p>
                <p className="text-[#848E9C] text-xs mt-1">Bot is running normally ✓</p>
              </div>
            )}

            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] overflow-hidden">
              <div className="p-5 border-b border-[#2B3139]">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Completed ({completedRooms.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2B3139]">
                      {['Arena','Reward','TX Hash','Ended'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-[#474D57] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {completedRooms.map((room, i) => (
                      <tr key={room.id} className={`border-b border-[#2B3139]/50 hover:bg-[#2B3139]/20 ${i%2===0?'bg-[#181A20]':''}`}>
                        <td className="px-4 py-3 text-xs font-bold text-white max-w-[160px]"><span className="truncate block">{room.title}</span></td>
                        <td className="px-4 py-3 text-xs font-black text-[#0ECB81]">{room.reward_token_amount} SOL</td>
                        <td className="px-4 py-3">
                          {room.distribution_tx_hash ? (
                            <a href={`https://solscan.io/tx/${room.distribution_tx_hash}`} target="_blank" rel="noreferrer"
                              className="text-[10px] font-mono text-[#FCD535] hover:text-[#F0B90B] flex items-center gap-1">
                              {room.distribution_tx_hash.slice(0,10)}... <ArrowUpRight size={10} />
                            </a>
                          ) : <span className="text-[10px] text-[#474D57]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[9px] text-[#848E9C]">{fmtDate(room.end_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {completedRooms.length === 0 && <p className="text-center text-[#474D57] py-12 text-sm">No completed distributions</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {bannedUsers.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                <p className="text-xs font-black text-red-400 uppercase tracking-widest">
                  {bannedUsers.length} Banned User{bannedUsers.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] overflow-hidden">
              <div className="p-5 border-b border-[#2B3139] flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">All Participants ({participants.length})</h3>
                <button onClick={() => handleExportCSV('participants')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0E11] border border-[#2B3139] rounded-lg text-[10px] font-bold text-[#848E9C] hover:text-white">
                  <Download size={11} /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2B3139]">
                      {['Wallet','Arena','Init Bal','Deposit','Net Profit','Status','Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-[#474D57] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.slice(0, 100).map((p, i) => {
                      const room = rooms.find(r => r.id === p.room_id);
                      const userStat = userStats.find(u => u.user_id === p.user_id);
                      const profit = Number(p.net_profit) || 0;
                      return (
                        <tr key={p.id} className={`border-b border-[#2B3139]/50 hover:bg-[#2B3139]/20 ${i%2===0?'bg-[#181A20]':''} ${userStat?.is_banned ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3 text-[10px] font-mono text-[#848E9C]">{p.wallet_address.slice(0,6)}...{p.wallet_address.slice(-4)}</td>
                          <td className="px-4 py-3 text-[10px] text-[#848E9C] max-w-[120px]"><span className="truncate block">{room?.title || '—'}</span></td>
                          <td className="px-4 py-3 text-xs text-white">{Number(p.initial_balance).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold ${p.total_deposit > 0 ? 'text-yellow-400' : 'text-[#848E9C]'}`}>
                              {p.total_deposit > 0 ? `+${Number(p.total_deposit).toFixed(3)}` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-black ${profit > 0 ? 'text-[#0ECB81]' : profit < 0 ? 'text-[#F6465D]' : 'text-[#848E9C]'}`}>
                              {profit !== 0 ? `${profit > 0 ? '+' : ''}${profit.toFixed(2)}%` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {userStat?.is_banned
                              ? <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">BANNED</span>
                              : <span className="text-[9px] font-black text-[#0ECB81] bg-[#0ECB81]/10 px-2 py-1 rounded-lg">Active</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {userStat && (
                              <button onClick={() => setBanTarget(userStat)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black transition-all ${
                                  userStat.is_banned
                                    ? 'bg-[#0ECB81]/10 text-[#0ECB81] hover:bg-[#0ECB81]/20'
                                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
                                <UserX size={9} /> {userStat.is_banned ? 'Unban' : 'Ban'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {participants.length === 0 && <p className="text-center text-[#474D57] py-12 text-sm">No participants yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── BROADCAST TAB ────────────────────────── */}
        {activeTab === 'broadcast' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
                <Megaphone size={16} /> Broadcast to All Users
              </h3>
              <p className="text-[10px] text-[#848E9C] mb-6">
                Sends in-app notification to all <strong className="text-white">{userStats.length} users</strong>.
                {participants.filter(p => p.telegram).length > 0 && ` Also sends to ${participants.filter(p => p.telegram).length} Telegram users.`}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest block mb-2">Notification Title *</label>
                  <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Platform Maintenance, New Feature..."
                    className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-bold text-sm text-[#EAECEF]" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest block mb-2">Message *</label>
                  <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                    placeholder="Write your message to all users..."
                    rows={5}
                    className="w-full bg-[#0B0E11] p-4 rounded-2xl border border-[#2B3139] focus:border-[#FCD535] outline-none font-medium text-sm text-[#EAECEF] resize-none" />
                  <p className="text-[9px] text-[#474D57] mt-1">{broadcastMsg.length} characters</p>
                </div>

                {/* Preview */}
                {(broadcastTitle || broadcastMsg) && (
                  <div className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-4">
                    <p className="text-[9px] text-[#474D57] uppercase tracking-widest mb-3">Preview</p>
                    <div className="bg-[#1E2329] p-4 rounded-xl border border-[#2B3139]">
                      <p className="text-xs font-black text-white mb-1">{broadcastTitle || 'Title...'}</p>
                      <p className="text-[10px] text-[#848E9C] leading-relaxed">{broadcastMsg || 'Message...'}</p>
                    </div>
                  </div>
                )}

                <button onClick={handleBroadcast} disabled={broadcasting || !broadcastTitle.trim() || !broadcastMsg.trim()}
                  className="w-full bg-[#FCD535] text-black font-black py-4 rounded-2xl hover:bg-[#F0B90B] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50">
                  {broadcasting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  {broadcasting ? 'Sending...' : `Send to ${userStats.length} Users`}
                </button>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#848E9C] mb-4">Quick Templates</h3>
              <div className="space-y-2">
                {[
                  { title: '🔧 Maintenance', msg: 'Platform will undergo scheduled maintenance. Distributions will resume shortly.' },
                  { title: '🏆 New Feature', msg: 'We have launched a new feature! Check it out on the platform.' },
                  { title: '⚠️ Important Notice', msg: 'Please review updated Terms of Service. Continued use implies acceptance.' },
                  { title: '🎉 Beta Update', msg: 'Thank you for being a beta tester! Your feedback helps us improve TradeHub.' },
                ].map(tpl => (
                  <button key={tpl.title} onClick={() => { setBroadcastTitle(tpl.title); setBroadcastMsg(tpl.msg); }}
                    className="w-full text-left bg-[#0B0E11] hover:bg-[#2B3139] p-3 rounded-xl border border-[#2B3139] transition-all">
                    <p className="text-xs font-bold text-white">{tpl.title}</p>
                    <p className="text-[9px] text-[#848E9C] mt-0.5 truncate">{tpl.msg}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && <ReportsTab />}

      </div>
    </div>
  );
}