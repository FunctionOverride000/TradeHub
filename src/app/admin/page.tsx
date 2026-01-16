"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Plus,
  Trash2,
  Trophy,
  ArrowLeft,
  Calendar,
  Wallet,
  Loader2,
  AlertTriangle,
  LayoutDashboard,
  BarChart2,
  Award,
  Settings as SettingsIcon,
  RefreshCw,
  X,
  ChevronRight,
  ExternalLink,
  Zap,
  CreditCard
} from 'lucide-react';

/**
 * MENGGUNAKAN ESM CDN:
 * Menjamin library dimuat dengan benar di lingkungan preview.
 */
import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmvezylbaxlodkepstbj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmV6eWxiYXhsb2RrZXBzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTYxNzEsImV4cCI6MjA4MTU5MjE3MX0.a2_XxJKLRXrt_tn_UiMYTmpP1iGjul6OhaHI3IGzJCw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Konfigurasi Pembayaran
const CREATION_FEE_SOL = 0.1;
const PLATFORM_TREASURY = "DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg"; 
const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';

// Interface Data
interface Participant {
  id: string;
  joined_at: string;
  wallet_address: string;
  room_id: string;
  initial_balance: number;
  current_balance: number;
  status?: string;
  user_id: string;
  rooms?: {
    title: string;
  }
}

interface Room {
  id: string;
  title: string;
  creator_wallet: string;
  start_time: string;
  end_time: string;
  is_premium: boolean;
  created_at: string;
  creator_id: string;
  is_paid: boolean;
}

export default function CreatorDashboard() {
  const [activeTab, setActiveTab] = useState<"participants" | "rooms">("participants");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [user, setUser] = useState<any>(null);

  // State Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState<'idle' | 'paying' | 'confirming' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [newRoom, setNewRoom] = useState({
    title: "",
    creator_wallet: "",
    start_time: "",
    end_time: "",
    is_premium: false
  });

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  // 1. Sinkronisasi Sesi
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) safeNavigate('/auth');
      else setUser(session.user);
    });
  }, []);

  /**
   * ON-CHAIN SYNC: Monitoring saldo peserta secara live
   */
  const syncParticipantsWithBlockchain = async (list: Participant[]) => {
    if (list.length === 0 || !SOLANA_RPC) return;
    setIsSyncing(true);
    try {
      const connection = new web3.Connection(SOLANA_RPC, 'confirmed');
      const publicKeys = list.map(p => new web3.PublicKey(p.wallet_address));
      const accountsInfo = await connection.getMultipleAccountsInfo(publicKeys);

      const verifiedParticipants = list.map((p, idx) => {
        const info = accountsInfo[idx];
        return {
          ...p,
          current_balance: info ? info.lamports / web3.LAMPORTS_PER_SOL : p.current_balance
        };
      });

      setParticipants(verifiedParticipants);
    } catch (err) {
      console.error("Gagal sinkronisasi blockchain:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Fetch Data (Difilter Berdasarkan Creator ID)
  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      
      if (roomErr) throw roomErr;
      setRooms(roomData || []);

      const { data: partData, error: partErr } = await supabase
        .from('participants')
        .select(`*, rooms!inner (title, creator_id)`)
        .eq('rooms.creator_id', user.id)
        .order('joined_at', { ascending: false });

      if (partErr) throw partErr;
      setParticipants(partData || []);
      
      await syncParticipantsWithBlockchain(partData || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const participantChannel = supabase.channel('creator-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(participantChannel); };
  }, [user]);

  /**
   * LOGIKA PEMBAYARAN ON-CHAIN UNTUK KREATOR
   */
  const pollSignature = async (connection: web3.Connection, signature: string) => {
    let count = 0;
    while (count < 30) {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value[0];
      if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return true;
      if (status?.err) throw new Error("Transaksi gagal di jaringan.");
      await new Promise(r => setTimeout(r, 2000));
      count++;
    }
    throw new Error("Konfirmasi jaringan timeout.");
  };

  const executeCreatorPayment = async (): Promise<string | null> => {
    const provider = (window as any).solana;
    if (!provider?.isPhantom) throw new Error("Phantom Wallet diperlukan.");

    setActionStatus('paying');
    const resp = await provider.connect();
    const connection = new web3.Connection(SOLANA_RPC, 'confirmed');

    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: resp.publicKey,
        toPubkey: new web3.PublicKey(PLATFORM_TREASURY),
        lamports: Math.round(CREATION_FEE_SOL * web3.LAMPORTS_PER_SOL),
      })
    );

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = resp.publicKey;

    const { signature } = await provider.signAndSendTransaction(transaction);
    setActionStatus('confirming');
    await pollSignature(connection, signature);
    return signature;
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      // 1. Eksekusi Pembayaran SOL Terlebih Dahulu
      const txSignature = await executeCreatorPayment();
      if (!txSignature) return;

      // 2. Simpan ke Database Jika Bayar Berhasil
      setActionStatus('saving');
      const { error } = await supabase.from('rooms').insert([{
        ...newRoom,
        start_time: new Date(newRoom.start_time).toISOString(),
        end_time: new Date(newRoom.end_time).toISOString(),
        creator_id: user.id,
        is_paid: true,
        payment_signature: txSignature
      }]);

      if (error) throw error;

      setIsModalOpen(false);
      setActionStatus('idle');
      setNewRoom({ title: "", creator_wallet: "", start_time: "", end_time: "", is_premium: false });
      fetchData();
      alert("Arena Berhasil Diluncurkan!");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal membuat arena.");
      setActionStatus('error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await supabase.from('participants').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  const handleDeleteParticipant = async (id: string) => {
    if (confirm("Kick peserta ini?")) {
      await supabase.from('participants').delete().eq('id', id);
      fetchData();
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.wallet_address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || (p.status || 'pending') === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#848E9C]">Otorisasi Kreator...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans">
      
      {/* Sidebar Kreator */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#181A20] border-r border-[#2B3139] shrink-0">
        <div className="p-8 border-b border-[#2B3139]">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg shadow-[#FCD535]/10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-black w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight">CreatorHub</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] px-4 mb-4">Pusat Kendali</p>
          <SidebarLink onClick={() => setActiveTab("participants")} Icon={Users} label="Monitor Trader" active={activeTab === "participants"} />
          <SidebarLink onClick={() => setActiveTab("rooms")} Icon={Trophy} label="Arena Saya" active={activeTab === "rooms"} />
          
          <div className="pt-6">
            <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] px-4 mb-4">Akses Cepat</p>
            <SidebarLink onClick={() => safeNavigate('/dashboard')} Icon={LayoutDashboard} label="Lihat Portfolio" />
          </div>
        </nav>

        <div className="p-6 border-t border-[#2B3139]">
          <button onClick={() => safeNavigate('/')} className="flex items-center gap-3 w-full px-4 py-3 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139] rounded-xl transition font-bold text-xs uppercase tracking-widest">
            <ArrowLeft size={16} />
            <span>Kembali ke Lobby</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#0B0E11]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

        <header className="relative z-10 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0 gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter italic uppercase">
              {activeTab === "participants" ? "Trader Management" : "My Arenas"}
            </h1>
            <p className="text-[#848E9C] text-sm flex items-center gap-2">
               {isSyncing ? <><Loader2 size={12} className="animate-spin text-[#FCD535]" /> Sinkronisasi Blockchain...</> : "Kelola kompetisi trading Anda sendiri secara mandiri."}
            </p>
          </div>
          {activeTab === "rooms" && (
            <button onClick={() => setIsModalOpen(true)} className="bg-[#FCD535] text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#FCD535]/10 flex items-center gap-2 active:scale-95">
              <Plus size={18} /> BUAT ARENA BARU
            </button>
          )}
        </header>

        <div className="p-10 max-w-7xl mx-auto relative z-10 pb-32">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <AdminStatCard label="Total Traders" value={participants.length} icon={<Users className="text-[#3b82f6]" />} />
            <AdminStatCard label="Your Arenas" value={rooms.length} icon={<Trophy className="text-[#FCD535]" />} />
            <AdminStatCard label="Live Verification" value={isSyncing ? "..." : "Active"} icon={<Zap className="text-[#0ECB81]" />} />
            <AdminStatCard label="Pending Approval" value={participants.filter(p => (p.status || 'pending') === 'pending').length} icon={<Clock className="text-[#F0B90B]" />} />
          </div>

          {activeTab === "participants" ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#474D57]" size={20} />
                  <input type="text" placeholder="Cari wallet peserta Anda..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-[#1E2329] border border-[#2B3139] text-[#EAECEF] rounded-2xl focus:border-[#FCD535] outline-none transition-all font-bold text-sm shadow-inner" />
                </div>
                <div className="flex bg-[#1E2329] p-1.5 rounded-2xl border border-[#2B3139]">
                  {['all', 'verified', 'pending', 'rejected'].map(status => (
                    <button key={status} onClick={() => setFilterStatus(status)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-[#2B3139] text-[#FCD535] shadow-lg' : 'text-[#848E9C]'}`}>{status}</button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1E2329] rounded-[2rem] border border-[#2B3139] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#2B3139] text-[#848E9C] uppercase font-black text-[10px] tracking-widest border-b border-[#363c45]">
                      <tr>
                        <th className="p-6">Trader Identity</th>
                        <th className="p-6">Arena</th>
                        <th className="p-6 text-right">Initial Balance</th>
                        <th className="p-6 text-right">Live On-Chain</th>
                        <th className="p-6 text-center">Status</th>
                        <th className="p-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2B3139]">
                      {filteredParticipants.length === 0 ? (
                        <tr><td colSpan={6} className="p-24 text-center text-[#474D57] font-black uppercase tracking-widest italic opacity-20">Belum ada peserta yang mendaftar di arena Anda.</td></tr>
                      ) : (
                        filteredParticipants.map(p => (
                          <tr key={p.id} className="hover:bg-[#2B3139]/40 transition-colors group">
                            <td className="p-6">
                              <span className="font-mono text-xs text-[#EAECEF] font-bold">{p.wallet_address.slice(0, 16)}...</span>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-black text-[#FCD535] uppercase tracking-tight">{p.rooms?.title || 'Arena'}</span>
                            </td>
                            <td className="p-6 text-right font-mono text-[#848E9C]">{p.initial_balance.toFixed(2)} SOL</td>
                            <td className="p-6 text-right font-mono font-bold text-[#FCD535]">
                               {isSyncing ? "..." : p.current_balance.toFixed(3)} SOL
                            </td>
                            <td className="p-6 text-center">
                              <StatusBadge status={p.status || 'pending'} />
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex justify-end gap-2">
                                 <button onClick={() => handleUpdateStatus(p.id, 'verified')} className="p-2.5 bg-[#0ECB81]/10 text-[#0ECB81] rounded-xl hover:bg-[#0ECB81] hover:text-black transition-all" title="Verifikasi Peserta"><CheckCircle size={16}/></button>
                                 <button onClick={() => handleUpdateStatus(p.id, 'rejected')} className="p-2.5 bg-[#F6465D]/10 text-[#F6465D] rounded-xl hover:bg-[#F6465D] hover:text-white transition-all" title="Tolak Peserta"><XCircle size={16}/></button>
                                 <button onClick={() => handleDeleteParticipant(p.id)} className="p-2.5 text-[#474D57] hover:text-[#F6465D] hover:bg-[#F6465D]/10 rounded-xl transition-all" title="Hapus"><Trash2 size={16}/></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {rooms.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-[#1E2329]/50 rounded-[3rem] border border-dashed border-[#2B3139]">
                  <Trophy className="mx-auto mb-6 text-[#2B3139] opacity-30" size={64} />
                  <p className="text-[#848E9C] font-black uppercase tracking-widest text-sm">Anda belum memiliki arena aktif.</p>
                </div>
              ) : (
                rooms.map(room => (
                  <div key={room.id} className="bg-[#1E2329] p-8 rounded-[2.5rem] border border-[#2B3139] hover:border-[#FCD535]/40 transition-all duration-500 group relative overflow-hidden shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-[#0B0E11] rounded-2xl border border-[#2B3139] flex items-center justify-center text-[#FCD535] group-hover:rotate-12 transition-transform"><Trophy size={28} /></div>
                      <div className="flex gap-2">
                        {room.is_premium && <span className="bg-[#FCD535] text-black text-[9px] font-black px-2.5 py-1 rounded-lg tracking-widest uppercase">Premium</span>}
                        <button onClick={() => { if(confirm("Hapus arena?")) supabase.from('rooms').delete().eq('id', room.id).then(()=>fetchData()) }} className="p-2 text-[#474D57] hover:text-[#F6465D] transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-[#EAECEF] mb-3 leading-tight uppercase italic">{room.title}</h3>
                    <p className="text-[9px] text-[#474D57] font-mono mb-6 uppercase">ID: {room.id.slice(0,18)}...</p>
                    
                    <div className="space-y-2 pt-6 border-t border-[#2B3139] text-[10px] font-black uppercase tracking-widest text-[#848E9C]">
                      <div className="flex justify-between"><span>Starts</span> <span className="text-white font-mono">{new Date(room.start_time).toLocaleDateString()}</span></div>
                      <div className="flex justify-between"><span>Ends</span> <span className="text-white font-mono">{new Date(room.end_time).toLocaleDateString()}</span></div>
                    </div>
                    
                    <button onClick={() => safeNavigate(`/lomba/${room.id}`)} className="mt-8 w-full py-4 bg-[#0B0E11] border border-[#2B3139] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-[#FCD535] hover:text-[#FCD535] transition-all flex items-center justify-center gap-2 group/btn shadow-inner">
                      LIHAT ARENA <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal Buat Room (Sekarang dengan Paywall SOL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#1E2329] w-full max-w-lg rounded-[2.5rem] border border-[#2B3139] p-10 relative overflow-hidden">
            
            {/* OVERLAY LOADING PEMBAYARAN */}
            {actionStatus !== 'idle' && actionStatus !== 'error' && (
              <div className="absolute inset-0 z-[110] bg-[#0B0E11]/90 flex flex-col items-center justify-center text-center p-10">
                <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-6" />
                <h3 className="text-xl font-black uppercase italic text-white mb-2">
                  {actionStatus === 'paying' ? 'Menunggu Dompet...' : 
                   actionStatus === 'confirming' ? 'Memvalidasi Jaringan...' : 'Menerbitkan Arena...'}
                </h3>
                <p className="text-[#848E9C] text-xs">Jangan tutup jendela ini hingga proses selesai.</p>
              </div>
            )}

            <div className="flex justify-between items-start mb-8 relative z-10">
               <h2 className="text-2xl font-black text-[#EAECEF] uppercase italic">Luncurkan Arena</h2>
               <button onClick={() => { if(actionStatus === 'idle' || actionStatus === 'error') setIsModalOpen(false) }} className="p-2 text-[#474D57] hover:text-white transition-colors"><X size={24}/></button>
            </div>

            {actionStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs font-bold flex items-center gap-3">
                <AlertTriangle size={18} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-6">
              <div className="space-y-1">
                 <label className="text-[10px] text-[#474D57] font-black uppercase tracking-widest">Judul Kompetisi</label>
                 <input required value={newRoom.title} onChange={e => setNewRoom({...newRoom, title: e.target.value})} placeholder="Solana Masters..." className="w-full bg-[#0B0E11] p-5 rounded-2xl border border-[#2B3139] text-[#EAECEF] outline-none font-bold shadow-inner focus:border-[#FCD535] transition-all"/>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] text-[#474D57] font-black uppercase tracking-widest">Wallet Penanggung Jawab</label>
                 <input required value={newRoom.creator_wallet} onChange={e => setNewRoom({...newRoom, creator_wallet: e.target.value})} placeholder="Alamat Wallet..." className="w-full bg-[#0B0E11] p-5 rounded-2xl border border-[#2B3139] text-[#EAECEF] outline-none font-mono text-xs shadow-inner focus:border-[#FCD535] transition-all"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required type="date" value={newRoom.start_time} onChange={e => setNewRoom({...newRoom, start_time: e.target.value})} className="w-full bg-[#0B0E11] p-4 rounded-xl border border-[#2B3139] text-white text-xs"/>
                <input required type="date" value={newRoom.end_time} onChange={e => setNewRoom({...newRoom, end_time: e.target.value})} className="w-full bg-[#0B0E11] p-4 rounded-xl border border-[#2B3139] text-white text-xs"/>
              </div>

              <div className="p-6 bg-[#0B0E11] rounded-2xl border border-[#2B3139] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-[#474D57] uppercase">Biaya Publikasi</p>
                  <p className="text-xl font-black text-[#FCD535] italic">{CREATION_FEE_SOL} SOL</p>
                </div>
                <CreditCard className="text-[#474D57]" size={24} />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-[#2B3139] rounded-2xl font-black text-[10px] text-white uppercase tracking-widest transition-all">BATAL</button>
                <button type="submit" className="flex-1 py-5 bg-[#FCD535] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#F0B90B] transition-all shadow-xl shadow-[#FCD535]/20 flex items-center justify-center gap-2">
                   BAYAR & TERBITKAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB KOMPONEN UI ---
function SidebarLink({ Icon, label, active = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold cursor-pointer text-sm ${active ? 'bg-[#2B3139] text-[#FCD535] shadow-xl' : 'text-[#474D57] hover:bg-[#2B3139]/50 hover:text-white'}`}>
      <Icon size={20} /> <span className="tracking-tight">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    verified: { color: "bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20", label: "Verified" },
    rejected: { color: "bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20", label: "Rejected" },
    pending: { color: "bg-[#FCD535]/10 text-[#FCD535] border-[#FCD535]/20", label: "Pending" }
  };
  const config = configs[status] || configs.pending;
  return <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${config.color}`}>{config.label}</div>;
}

function AdminStatCard({ label, value, icon }: any) {
  return (
    <div className="bg-[#1E2329] p-8 rounded-[2rem] border border-[#2B3139] shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em]">{label}</div>
        <div className="p-2.5 bg-[#0B0E11] rounded-xl border border-[#2B3139]">{icon}</div>
      </div>
      <p className="text-4xl font-black text-[#EAECEF] tracking-tighter italic">{value}</p>
    </div>
  );
}