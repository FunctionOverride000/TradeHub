"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle, 
  XCircle, 
  Search, 
  Trash2,
  Trophy,
  ArrowLeft,
  Loader2,
  LayoutDashboard,
  RefreshCw,
  X,
  ChevronRight,
  ExternalLink,
  Zap,
  Menu,
  ShieldAlert,
  Activity,
  History,
  Wifi,
  WifiOff,
  Flame,
  Plus, 
  Rocket, 
  Crown,
  Wallet,
  Lock,
  Star,
  Globe,
  Eye,
  EyeOff,
  List,
  Edit, 
  Save,
  Ticket // Icon Ticket
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import * as web3 from '@solana/web3.js';
// PERBAIKAN IMPORT: Menggunakan relative path manual (../../)
import { useLanguage } from '../../../lib/LanguageContext';
import { LanguageSwitcher } from '../../../lib/LanguageSwitcher'; 

// --- KONFIGURASI SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmvezylbaxlodkepstbj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdmV6eWxiYXhsb2RrZXBzdGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTYxNzEsImV4cCI6MjA4MTU5MjE3MX0.a2_XxJKLRXrt_tn_UiMYTmpP1iGjul6OhaHI3IGzJCw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SOLANA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL || 'https://api.mainnet-beta.solana.com';
const PLATFORM_TREASURY = "DLmtgDL1viNJUBzZvd91cLVkdKz4YkivCSpNKNKe6oLg"; 
const EDIT_FEE_SOL = 0.05; 

interface Participant {
  id: string;
  joined_at: string;
  wallet_address: string;
  room_id: string;
  initial_balance: number;
  current_balance: number;
  total_deposit: number;
  status?: string;
  user_id: string;
  profit?: number;
  rooms?: {
    title: string;
    creator_id: string;
  }
}

interface DepositLog {
  id: string;
  wallet_address: string;
  amount_sol: number;
  signature: string;
  detected_at: string;
  participant_id: string;
}

interface Room {
  id: string;
  title: string;
  description: string;
  reward: string;
  min_balance: number;
  created_at: string;
  creator_id: string;
  is_premium?: boolean; 
  is_boosted?: boolean;
  access_type?: 'public' | 'private' | 'whitelist';
  room_password?: string;
  whitelist?: string[];
  edit_count?: number; 
  entry_fee?: number; // Field Entry Fee
}

export default function CreatorDashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"participants" | "rooms" | "audit">("participants");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [depositLogs, setDepositLogs] = useState<DepositLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // State untuk Toggle Password Visibility per Room
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // State untuk Edit Arena
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    reward: '',
    min_balance: 0,
    entry_fee: 0, 
    room_password: '', 
    whitelistInput: '' 
  });

  // State untuk Custom Modal Pembayaran Monetisasi
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    type: 'boost' | 'premium' | null;
    roomId: string | null;
    cost: number;
    title: string;
    description: string;
    benefits: string[];
  }>({
    isOpen: false,
    type: null,
    roomId: null,
    cost: 0,
    title: '',
    description: '',
    benefits: []
  });

  const [lastEvent, setLastEvent] = useState<{type: 'db' | 'chain', msg: string} | null>(null);
  const [dbStatus, setDbStatus] = useState<'connected' | 'reconnecting'>('connected');

  const subscriptionsRef = useRef<number[]>([]);
  const connectionRef = useRef<web3.Connection | null>(null);

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  const triggerEventToast = (type: 'db' | 'chain', msg: string) => {
    setLastEvent({ type, msg });
    setTimeout(() => setLastEvent(null), 3000);
  };

  useEffect(() => {
    const initAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.log("User belum login");
        } else {
            setUser(session.user);
        }
    };
    initAuth();
  }, []);

  const setupMonitoringSync = (list: Participant[]) => {
    if (list.length === 0) return;
    
    if (!connectionRef.current) {
      connectionRef.current = new web3.Connection(SOLANA_RPC, 'confirmed');
    }

    const connection = connectionRef.current;
    subscriptionsRef.current.forEach(id => {
      try { connection.removeAccountChangeListener(id); } catch(e) {}
    });
    subscriptionsRef.current = [];

    list.slice(0, 15).forEach((p, index) => {
      setTimeout(() => {
        try {
          const subId = connection.onAccountChange(new web3.PublicKey(p.wallet_address), (info) => {
            const newBalance = info.lamports / web3.LAMPORTS_PER_SOL;
            triggerEventToast('chain', t.admin?.balance_changed?.replace('{wallet}', p.wallet_address.slice(0,4)) || `Balance update: ${p.wallet_address.slice(0,4)}`);
            
            setParticipants(prev => prev.map(item => {
              if (item.wallet_address === p.wallet_address) {
                const adjustedCurrent = newBalance - (item.total_deposit || 0);
                const netProfit = item.initial_balance > 0 
                  ? ((adjustedCurrent - item.initial_balance) / item.initial_balance) * 100 
                  : 0;

                return { ...item, current_balance: newBalance, profit: netProfit };
              }
              return item;
            }));
          }, 'confirmed');
          subscriptionsRef.current.push(subId);
        } catch (e) {
          console.warn(`WebSocket error for ${p.wallet_address}`);
        }
      }, index * 150); 
    });
  };

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsSyncing(true);
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
        
      if (roomError) {
        console.error("Gagal memuat arena:", roomError);
      }
      setRooms(roomData || []);

      const { data: partData } = await supabase
        .from('participants')
        .select(`*, rooms!inner (title, creator_id)`)
        .eq('rooms.creator_id', user.id)
        .order('joined_at', { ascending: false });

      const enrichedParticipants = (partData || []).map((p: any) => {
        const adjustedCurrent = p.current_balance - (p.total_deposit || 0);
        return {
          ...p,
          profit: p.initial_balance > 0 ? ((adjustedCurrent - p.initial_balance) / p.initial_balance) * 100 : 0
        };
      });
      setParticipants(enrichedParticipants);

      const participantIds = enrichedParticipants.map((p: any) => p.id);
      
      if (participantIds.length > 0) {
          const { data: logData } = await supabase
            .from('deposit_logs')
            .select('*')
            .in('participant_id', participantIds)
            .order('detected_at', { ascending: false })
            .limit(30);
          setDepositLogs(logData || []);
      } else {
          setDepositLogs([]);
      }

      if (!silent) setupMonitoringSync(enrichedParticipants);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchData();

    const channel = supabase.channel('creator-audit-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        triggerEventToast('db', `Database: Data peserta diperbarui.`);
        fetchData(true); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_logs' }, () => {
        triggerEventToast('db', t.admin?.deposit_detected || "Deposit detected!");
        fetchData(true);
      })
      .subscribe((status) => {
        setDbStatus(status === 'SUBSCRIBED' ? 'connected' : 'reconnecting');
      });
      
    return () => { 
      supabase.removeChannel(channel);
      subscriptionsRef.current.forEach(id => {
        try { connectionRef.current?.removeAccountChangeListener(id); } catch(e) {}
      });
    };
  }, [user]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('participants')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err: any) {
      alert("Gagal memperbarui status: " + err.message);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (confirm("Keluarkan trader ini dari kompetisi secara permanen?")) {
      try {
        const { error } = await supabase.from('participants').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (err: any) {
        alert("Gagal menghapus peserta: " + err.message);
      }
    }
  };

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

  const performPayment = async (amount: number, label: string): Promise<string | null> => {
    try {
      const { solana } = window as any;
      if (!solana || !solana.isPhantom) {
        alert(t.admin?.phantom_not_found || "Phantom wallet not found");
        return null;
      }

      if (!PLATFORM_TREASURY) {
        alert("ERROR KONFIGURASI: Creator belum mengatur alamat dompet penerima (TREASURY).");
        return null;
      }

      setIsProcessingPayment(true);
      const response = await solana.connect();
      const fromPublicKey = response.publicKey;

      const connection = new web3.Connection(SOLANA_RPC, 'confirmed');
      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: new web3.PublicKey(PLATFORM_TREASURY),
          lamports: Math.round(amount * web3.LAMPORTS_PER_SOL),
        })
      );

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      const { signature } = await solana.signAndSendTransaction(transaction);
      
      triggerEventToast('chain', 'Memproses pembayaran di blockchain...');
      await pollSignatureStatus(connection, signature);
      
      return signature;

    } catch (err: any) {
      console.error("Payment Error:", err);
      if (!err.message.includes("User rejected")) {
         alert("Pembayaran Gagal: " + err.message);
      }
      return null;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // --- LOGIKA EDIT ARENA ---
  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setEditForm({
      title: room.title,
      description: room.description,
      reward: room.reward,
      min_balance: room.min_balance,
      entry_fee: room.entry_fee || 0, // Load Entry Fee yang sudah ada
      room_password: room.room_password || '',
      whitelistInput: room.whitelist ? room.whitelist.join(', ') : ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRoom) return;

    const editCount = editingRoom.edit_count || 0;
    const isFreeEdit = editCount === 0;
    
    let signature: string | null = "free_edit";

    if (!isFreeEdit) {
      if (!confirm(`You have used your free edit quota.\n\nNext edit fee: ${EDIT_FEE_SOL} SOL.\nContinue payment?`)) {
        return;
      }
      // Bayar jika bukan edit gratis
      signature = await performPayment(EDIT_FEE_SOL, "Edit Arena Fee");
      if (!signature) return; // Batal atau gagal bayar
    }

    // Format Whitelist Array
    const whitelistArray = editForm.whitelistInput.length > 0 
      ? editForm.whitelistInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0)
      : null;

    // Simpan perubahan ke DB
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          title: editForm.title,
          description: editForm.description,
          reward: editForm.reward,
          min_balance: editForm.min_balance,
          entry_fee: editForm.entry_fee, // Simpan perubahan Entry Fee
          room_password: editForm.room_password || null, 
          whitelist: whitelistArray, 
          edit_count: editCount + 1 
        })
        .eq('id', editingRoom.id);

      if (error) throw error;

      triggerEventToast('db', (t.admin?.arena_updated || "Arena updated").replace('{status}', !isFreeEdit ? '(Fee Paid)' : '(Free 1x)'));
      setEditingRoom(null); // Tutup modal
      fetchData(); // Refresh data
    } catch (err: any) {
      alert("Gagal menyimpan perubahan: " + err.message);
    }
  };

  // --- LOGIKA MONETISASI LAINNYA ---
  const openBoostModal = (roomId: string) => {
    setPaymentModal({
      isOpen: true,
      type: 'boost',
      roomId,
      cost: 0.2,
      title: t.admin?.boost_arena || "Boost Arena",
      description: t.admin?.boost_desc || "Get featured on the homepage",
      benefits: ['Posisi Sticky di Lobby Utama', 'Badge "Featured" Emas', 'Prioritas Algoritma Pencarian', 'Highlight di Sidebar']
    });
  };

  // Fungsi toggle password visibility
  const togglePassword = (roomId: string) => {
    setVisiblePasswords(prev => ({...prev, [roomId]: !prev[roomId]}));
  };

  const handleConfirmPayment = async () => {
    if (!paymentModal.roomId || !paymentModal.type) return;

    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    const signature = await performPayment(paymentModal.cost, paymentModal.title);

    if (signature) {
      const updateData = paymentModal.type === 'boost' ? { is_boosted: true } : { is_premium: true };
      
      const { error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', paymentModal.roomId);

      if (error) {
        alert("Pembayaran sukses (On-Chain) namun status database gagal diperbarui. Signature: " + signature);
      } else {
        triggerEventToast('db', `Pembayaran Berhasil! Status ${paymentModal.type === 'boost' ? 'Boost' : 'Premium'} Aktif.`);
        setRooms(prev => prev.map(r => r.id === paymentModal.roomId ? {...r, ...updateData} : r));
      }
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.rooms?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || (p.status || 'pending') === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#848E9C]">{t.common.syncing}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30 relative overflow-hidden">
      
      {/* --- MODAL EDIT ARENA --- */}
      {editingRoom && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#1E2329] rounded-[2rem] border border-[#2B3139] w-full max-w-lg shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-8 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{t.admin?.edit_arena || "Edit Arena"}</h3>
                <button onClick={() => setEditingRoom(null)} className="p-2 text-[#848E9C] hover:text-white bg-[#0B0E11] rounded-xl border border-[#2B3139]">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">{t.create_arena.form.title_label}</label>
                  <input 
                    value={editForm.title} 
                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                    className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] focus:border-[#FCD535] outline-none text-sm font-bold text-[#EAECEF]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    value={editForm.description} 
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] focus:border-[#FCD535] outline-none text-xs font-medium text-[#EAECEF] min-h-[100px]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">{t.create_arena.form.reward_label}</label>
                    <input 
                      value={editForm.reward} 
                      onChange={e => setEditForm({...editForm, reward: e.target.value})}
                      className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] focus:border-[#FCD535] outline-none text-sm font-bold text-[#EAECEF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#474D57] uppercase tracking-widest ml-1">{t.create_arena.form.min_bal_label}</label>
                    <input 
                      type="number"
                      value={editForm.min_balance} 
                      onChange={e => setEditForm({...editForm, min_balance: parseFloat(e.target.value)})}
                      className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] focus:border-[#FCD535] outline-none text-sm font-bold text-[#EAECEF]"
                    />
                  </div>
                </div>

                {/* EDIT ENTRY FEE */}
                <div>
                    <label className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest ml-1">Entry Fee (SOL)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editForm.entry_fee} 
                      onChange={e => setEditForm({...editForm, entry_fee: parseFloat(e.target.value)})}
                      className="w-full bg-[#1E2329] p-3 rounded-xl border border-[#FCD535]/30 focus:border-[#FCD535] outline-none text-sm font-bold text-[#FCD535]"
                    />
                </div>

                {/* EDIT KHUSUS PREMIUM */}
                {editingRoom.access_type === 'private' && (
                  <div className="pt-2 border-t border-[#2B3139]">
                    <label className="text-[10px] font-black text-[#F6465D] uppercase tracking-widest ml-1 mb-1 block">Update Password</label>
                    <input 
                      type="text"
                      value={editForm.room_password} 
                      onChange={e => setEditForm({...editForm, room_password: e.target.value})}
                      className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#F6465D]/50 focus:border-[#F6465D] outline-none text-sm font-bold text-[#EAECEF]"
                      placeholder="New password..."
                    />
                  </div>
                )}
                
                {editingRoom.access_type === 'whitelist' && (
                  <div className="pt-2 border-t border-[#2B3139]">
                    <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest ml-1 mb-1 block">Update Whitelist</label>
                    <textarea 
                      value={editForm.whitelistInput} 
                      onChange={e => setEditForm({...editForm, whitelistInput: e.target.value})}
                      className="w-full bg-[#0B0E11] p-3 rounded-xl border border-purple-500/50 focus:border-purple-500 outline-none text-xs font-mono text-[#EAECEF] min-h-[80px]"
                      placeholder="Add/remove wallets..."
                    />
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-[#2B3139] flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-[#848E9C]">Status Edit: </span>
                  <span className={`font-black ${(editingRoom.edit_count || 0) === 0 ? 'text-[#0ECB81]' : 'text-[#FCD535]'}`}>
                    {(editingRoom.edit_count || 0) === 0 ? 'Free (1x)' : `Paid (${EDIT_FEE_SOL} SOL)`}
                  </span>
                </div>
                <button 
                  onClick={handleSaveEdit}
                  className="px-6 py-3 bg-[#FCD535] text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#F0B90B] transition-all flex items-center gap-2"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAYMENT */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-[#1E2329] rounded-[2rem] border border-[#2B3139] w-full max-w-md shadow-2xl overflow-hidden relative group">
              <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none ${paymentModal.type === 'boost' ? 'bg-[#FCD535]' : 'bg-[#F6465D]'}`}></div>
              <div className="p-8 relative z-10">
                 <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${paymentModal.type === 'boost' ? 'bg-[#FCD535]/10 text-[#FCD535] border-[#FCD535]/20' : 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20'}`}>
                       {paymentModal.type === 'boost' ? <Rocket size={28} /> : <Crown size={28} />}
                    </div>
                    <button onClick={() => setPaymentModal(prev => ({...prev, isOpen: false}))} className="p-2 text-[#474D57] hover:text-white transition-colors bg-[#0B0E11] rounded-xl border border-[#2B3139]">
                       <X size={18} />
                    </button>
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2 leading-none">{paymentModal.title}</h3>
                 <p className="text-xs text-[#848E9C] leading-relaxed mb-6 font-medium">{paymentModal.description}</p>
                 <div className="space-y-3 mb-8">
                    {paymentModal.benefits.map((benefit, idx) => (
                       <div key={idx} className="flex items-center gap-3 text-sm text-[#EAECEF]">
                          <CheckCircle size={14} className={paymentModal.type === 'boost' ? 'text-[#FCD535]' : 'text-[#F6465D]'} />
                          <span className="font-bold">{benefit}</span>
                       </div>
                    ))}
                 </div>
                 <div className="flex items-center justify-between bg-[#0B0E11] p-4 rounded-xl border border-[#2B3139] mb-6">
                    <div className="flex items-center gap-3">
                       <Wallet size={18} className="text-[#848E9C]" />
                       <span className="text-xs font-black uppercase text-[#848E9C] tracking-widest">Total Cost</span>
                    </div>
                    <div className={`text-xl font-black italic tracking-tighter ${paymentModal.type === 'boost' ? 'text-[#FCD535]' : 'text-[#F6465D]'}`}>
                       {paymentModal.cost} SOL
                    </div>
                 </div>
                 <button 
                    onClick={handleConfirmPayment}
                    className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 ${paymentModal.type === 'boost' ? 'bg-[#FCD535] text-black hover:bg-[#F0B90B] shadow-[#FCD535]/20' : 'bg-[#F6465D] text-white hover:bg-[#D9344A] shadow-[#F6465D]/20'}`}
                 >
                    <Zap size={16} fill="currentColor" /> Confirm & Pay
                 </button>
              </div>
           </div>
        </div>
      )}

      {isProcessingPayment && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
           <div className="relative mb-8">
              <div className="absolute inset-0 bg-[#FCD535] blur-xl opacity-20 animate-pulse"></div>
              <Loader2 className="w-20 h-20 text-[#FCD535] animate-spin relative z-10" />
           </div>
           <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-3">{t.admin?.waiting_wallet || "Waiting for Wallet"}</h3>
           <p className="text-[#848E9C] font-bold max-w-sm text-sm leading-relaxed border border-[#2B3139] p-4 rounded-2xl bg-[#1E2329]">
              Please confirm the transaction in your Phantom wallet.<br/>
              <span className="text-[#FCD535]">{t.admin?.dont_close || "Don't close window"}</span>
           </p>
        </div>
      )}

      {lastEvent && (
        <div className="fixed top-24 right-8 z-[100] animate-in slide-in-from-right duration-300">
            <div className={`px-6 py-4 rounded-2xl border shadow-2xl flex items-center gap-4 ${lastEvent.type === 'db' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-[#0ECB81]/10 border-[#0ECB81]/50 text-[#0ECB81]'}`}>
               <Zap size={18} className="animate-pulse" />
               <div className="text-[10px] font-black uppercase tracking-widest">{lastEvent.msg}</div>
            </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-[80] w-72 bg-[#181A20] border-r border-[#2B3139] flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl lg:shadow-none`}>
        <div className="p-8 border-b border-[#2B3139] flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => safeNavigate('/')}>
            <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center shadow-lg shadow-[#FCD535]/10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-black w-6 h-6" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white uppercase italic">CreatorHub</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-[#848E9C] hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] px-4 mb-4 italic">{t?.dashboard?.sidebar?.control || "Control"}</p>
          <SidebarLink onClick={() => { setActiveTab("participants"); setIsSidebarOpen(false); }} Icon={Users} label={t?.dashboard?.sidebar?.monitor || "Monitor"} active={activeTab === "participants"} />
          <SidebarLink onClick={() => { setActiveTab("audit"); setIsSidebarOpen(false); }} Icon={History} label={t?.dashboard?.sidebar?.audit || "Audit"} active={activeTab === "audit"} />
          <SidebarLink onClick={() => { setActiveTab("rooms"); setIsSidebarOpen(false); }} Icon={Trophy} label={t?.dashboard?.sidebar?.my_arenas || "My Arenas"} active={activeTab === "rooms"} />
          <div className="pt-6 border-t border-[#2B3139] mt-6">
            <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] px-4 mb-4 italic">{t?.dashboard?.sidebar?.quick || "Quick"}</p>
            <SidebarLink onClick={() => safeNavigate('/buat-lomba')} Icon={Plus} label={t?.dashboard?.sidebar?.create_new || "Create"} />
            <SidebarLink onClick={() => safeNavigate('/dashboard')} Icon={LayoutDashboard} label={t?.dashboard?.header?.trading_portfolio || "Portfolio"} />
          </div>
        </nav>
        <div className="p-6 border-t border-[#2B3139]">
          <button onClick={() => safeNavigate('/')} className="flex items-center gap-3 w-full px-4 py-3 text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139] rounded-xl transition font-black text-xs uppercase tracking-widest text-left">
            <ArrowLeft size={16} />
            <span>{t?.common?.back_lobby || "Back"}</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[75] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <main className="flex-1 flex flex-col lg:ml-72 min-w-0 bg-[#0B0E11] relative overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

        <header className="relative z-50 px-6 lg:px-10 py-6 lg:py-8 flex justify-between items-center border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-[#1E2329] border border-[#2B3139] rounded-xl text-[#FCD535] active:scale-95 transition-all">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-black tracking-tighter italic uppercase text-white leading-none">
                {activeTab === "participants" ? t?.dashboard?.sidebar?.monitor : activeTab === "audit" ? t?.dashboard?.sidebar?.audit : t?.dashboard?.sidebar?.my_arenas}
              </h1>
              <p className="hidden sm:flex items-center gap-2 text-[#848E9C] text-[10px] uppercase tracking-[0.2em] mt-2 italic font-bold">
                {isSyncing ? <><Loader2 size={10} className="animate-spin text-[#FCD535]" /> {t?.common?.syncing || "Syncing..."}</> : "Anti-Cheat Analysis Active"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <LanguageSwitcher />
             <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${dbStatus === 'connected' ? 'bg-[#0ECB81]/10 border-[#0ECB81]/20 text-[#0ECB81]' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                {dbStatus === 'connected' ? <Wifi size={14}/> : <Loader2 size={14} className="animate-spin"/>}
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{dbStatus === 'connected' ? "Online" : "Connecting"}</span>
             </div>
          </div>
        </header>

        <div className="p-4 lg:p-10 max-w-7xl mx-auto relative z-10 pb-32 w-full">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
            <AdminStatCard label={t?.dashboard?.stats?.live || "Live"} value={participants.length} icon={<Users className="text-[#3b82f6]" />} />
            <AdminStatCard label={t?.dashboard?.stats?.detections || "Detections"} value={depositLogs.length} icon={<ShieldAlert className="text-yellow-500" />} />
            <AdminStatCard label={t?.dashboard?.stats?.arenas || "Arenas"} value={rooms.length} icon={<Trophy className="text-[#FCD535]" />} />
            <AdminStatCard label={t?.dashboard?.stats?.compliance || "Compliance"} value="Elite" icon={<ShieldCheck className="text-[#0ECB81]" />} />
          </div>

          {activeTab === "participants" && (
            <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#474D57] group-focus-within:text-[#FCD535] transition-colors" size={20} />
                  <input type="text" placeholder={t?.dashboard?.participants?.search_place || "Search..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-[#1E2329] border border-[#2B3139] text-[#EAECEF] rounded-2xl focus:border-[#FCD535] outline-none transition-all font-bold text-sm shadow-inner placeholder:text-[#474D57]" />
                </div>
                <div className="flex bg-[#1E2329] p-1.5 rounded-2xl border border-[#2B3139] overflow-x-auto no-scrollbar">
                  {['all', 'verified', 'pending', 'rejected'].map(status => (
                    <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 lg:px-6 py-2.5 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === status ? 'bg-[#2B3139] text-[#FCD535] shadow-lg' : 'text-[#848E9C] hover:text-white'}`}>{status}</button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1E2329] rounded-[1.5rem] lg:rounded-[2rem] border border-[#2B3139] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[900px] lg:min-w-0">
                    <thead className="bg-[#2B3139]/50 text-[#848E9C] uppercase font-black text-[9px] lg:text-[10px] tracking-widest border-b border-[#2B3139]">
                      <tr>
                        <th className="p-4 lg:p-6">{t?.dashboard?.participants?.col_identity || "Identity"}</th>
                        <th className="p-4 lg:p-6">{t?.dashboard?.participants?.col_target || "Target"}</th>
                        <th className="p-4 lg:p-6 text-right">{t?.dashboard?.participants?.col_deposit || "Deposit"}</th>
                        <th className="p-4 lg:p-6 text-right">{t?.dashboard?.participants?.col_equity || "Equity"}</th>
                        <th className="p-4 lg:p-6 text-center">{t?.dashboard?.participants?.col_roi || "ROI"}</th>
                        <th className="p-4 lg:p-6 text-right">{t?.dashboard?.participants?.col_actions || "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2B3139]">
                      {filteredParticipants.length === 0 ? (
                        <tr><td colSpan={6} className="p-20 text-center text-[#474D57] font-black uppercase tracking-widest italic opacity-20 text-[10px]">{t?.dashboard?.participants?.empty || "No Data"}</td></tr>
                      ) : (
                        filteredParticipants.map(p => {
                          const hasDeposit = (p.total_deposit || 0) > 0;
                          return (
                            <tr key={p.id} className="hover:bg-[#2B3139]/40 transition-colors group">
                              <td className="p-4 lg:p-6">
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs text-[#EAECEF] font-bold">{p.wallet_address.slice(0, 8)}...{p.wallet_address.slice(-8)}</span>
                                  <span className={`text-[8px] font-black uppercase mt-1 tracking-tighter ${p.status === 'verified' ? 'text-[#0ECB81]' : p.status === 'rejected' ? 'text-[#F6465D]' : 'text-[#474D57]'}`}>
                                    {p.status === 'verified' ? '✅ Verified' : p.status === 'rejected' ? '❌ Rejected' : '🕒 Pending'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 lg:p-6"><span className="text-[10px] font-black text-white uppercase italic truncate max-w-[120px] block opacity-60">{p.rooms?.title || 'Arena'}</span></td>
                              <td className="p-4 lg:p-6 text-right">
                                <span className={`font-mono text-xs font-bold ${hasDeposit ? 'text-yellow-500' : 'text-[#474D57]'}`}>
                                  {p.total_deposit?.toFixed(2) || "0.00"} SOL
                                </span>
                              </td>
                              <td className="p-4 lg:p-6 text-right font-mono font-black text-[#EAECEF] text-xs">{p.current_balance.toFixed(2)} SOL</td>
                              <td className="p-4 lg:p-6 text-center">
                                 <div className={`px-3 py-1.5 rounded-xl font-black text-[9px] lg:text-[10px] inline-block italic border ${p.profit! >= 0 ? 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20 shadow-[0_0_15px_rgba(14,203,129,0.1)]' : 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20'}`}>
                                    {p.profit! >= 0 ? '▲' : '▼'} {Math.abs(p.profit!).toFixed(2)}%
                                 </div>
                              </td>
                              <td className="p-4 lg:p-6 text-right">
                                <div className="flex justify-end gap-2">
                                   <button onClick={() => handleUpdateStatus(p.id, 'verified')} className="p-2.5 rounded-xl transition-all shadow-lg border active:scale-90 bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20 hover:bg-[#0ECB81] hover:text-black"><CheckCircle size={16}/></button>
                                   <button onClick={() => handleUpdateStatus(p.id, 'rejected')} className="p-2.5 rounded-xl transition-all shadow-lg border active:scale-90 bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20 hover:bg-[#F6465D] hover:text-white"><XCircle size={16}/></button>
                                   <button onClick={() => handleDeleteParticipant(p.id)} className="p-2.5 text-[#474D57] hover:text-white hover:bg-red-500/20 rounded-xl transition-all shadow-inner"><Trash2 size={16}/></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="bg-[#1E2329] border border-[#2B3139] p-8 lg:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden text-center md:text-left">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px]"></div>
                   <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                      <div className="w-20 h-20 bg-[#0B0E11] rounded-[2rem] flex items-center justify-center text-yellow-500 border border-[#2B3139] shadow-inner"><History size={40} /></div>
                      <div>
                         <h3 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter mb-2 leading-none">{t.dashboard?.audit?.title || "Audit Logs"}</h3>
                         <p className="text-xs text-[#848E9C] leading-relaxed italic max-w-xl">{t.dashboard?.audit?.desc || "System logs."}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                   {depositLogs.length === 0 ? (
                     <div className="py-40 text-center bg-[#1E2329]/40 rounded-[4rem] border border-dashed border-[#2B3139] flex flex-col items-center gap-6">
                        <ShieldCheck size={48} className="text-[#2B3139]" />
                        <p className="text-[#474D57] font-black uppercase text-[10px] tracking-[0.5em] italic">Zero security violations detected in the current ledger cycle.</p>
                     </div>
                   ) : (
                     depositLogs.map(log => (
                       <div key={log.id} className="bg-[#1E2329] p-6 lg:p-8 rounded-[2.5rem] border border-[#2B3139] flex flex-col md:flex-row items-center justify-between gap-6 hover:border-yellow-500/30 transition-all shadow-xl group">
                          <div className="flex items-center gap-6">
                             <div className="w-14 h-14 bg-[#0B0E11] rounded-2xl flex items-center justify-center text-yellow-500 border border-[#2B3139] shadow-inner group-hover:rotate-12 transition-transform duration-500"><Activity size={24} /></div>
                             <div>
                                <p className="text-sm font-mono font-black text-[#EAECEF] tracking-tight">{log.wallet_address.slice(0,16)}...{log.wallet_address.slice(-12)}</p>
                                <p className="text-[9px] font-black text-[#474D57] uppercase tracking-widest mt-1.5 italic">{t.dashboard?.audit?.detected}: {new Date(log.detected_at).toLocaleString()}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-12">
                             <div className="text-right">
                                <p className="text-[9px] font-black text-[#474D57] uppercase mb-1 tracking-widest italic leading-none">{t.dashboard?.audit?.injected}</p>
                                <p className="text-2xl font-black text-yellow-500 italic tracking-tighter leading-none">+{log.amount_sol.toFixed(2)} SOL</p>
                             </div>
                             <a href={`https://solscan.io/tx/${log.signature}`} target="_blank" className="p-5 bg-[#0B0E11] rounded-2xl text-[#848E9C] hover:text-[#FCD535] transition-all active:scale-90 border border-[#2B3139] shadow-inner">
                                <ExternalLink size={24} />
                             </a>
                          </div>
                       </div>
                     ))
                   )}
                </div>
             </div>
          )}

          {activeTab === "rooms" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {rooms.length === 0 ? (
                 <div className="col-span-full py-40 text-center bg-[#1E2329]/40 rounded-[4rem] border border-dashed border-[#2B3139] flex flex-col items-center gap-6">
                    <Trophy size={48} className="text-[#2B3139]" />
                    <div className="space-y-4 text-center">
                       <p className="text-[#848E9C] font-black uppercase text-xs tracking-widest italic">{t.dashboard?.rooms?.empty_title || "No arenas"}</p>
                       <button onClick={() => safeNavigate('/buat-lomba')} className="px-10 py-5 bg-[#FCD535] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#F0B90B] transition-all shadow-xl active:scale-95">Luncurkan Arena Pertama</button>
                    </div>
                 </div>
               ) : (
                 rooms.map(room => (
                   <div key={room.id} className="bg-[#1E2329] p-8 rounded-[2.5rem] border border-[#2B3139] hover:border-[#FCD535]/30 transition-all duration-500 relative overflow-hidden shadow-2xl group flex flex-col h-full">
                      {/* --- INDIKATOR TIPE AKSES & BOOST --- */}
                      <div className="absolute top-4 right-4 flex gap-2 z-10">
                         {room.is_boosted && <span className="bg-[#FCD535] text-black text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-[#FCD535]/20 flex items-center gap-1"><Rocket size={10}/> Featured</span>}
                         
                         {room.access_type === 'private' && (
                            <span className="bg-[#F6465D] text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-[#F6465D]/20 flex items-center gap-1">
                               <Lock size={10}/> Private
                            </span>
                         )}
                         {room.access_type === 'whitelist' && (
                            <span className="bg-purple-500 text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-purple-500/20 flex items-center gap-1">
                               <Users size={10}/> Whitelist
                            </span>
                         )}
                         {(!room.access_type || room.access_type === 'public') && !room.is_boosted && (
                            <span className="bg-[#1E2329] text-[#848E9C] border border-[#2B3139] text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1">
                               <Globe size={10}/> Public
                            </span>
                         )}
                      </div>

                      <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                         <Trophy size={120} />
                      </div>
                      
                      <div className="mb-4 pr-16 mt-8">
                        <div className="flex items-center gap-2 mb-2">
                           <button onClick={() => openEditModal(room)} className="p-1.5 bg-[#FCD535]/10 hover:bg-[#FCD535] text-[#FCD535] hover:text-black rounded-lg transition-colors border border-[#FCD535]/20">
                              <Edit size={14} />
                           </button>
                           <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-wide">ID: {room.id.slice(0,6)}...</p>
                        </div>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none line-clamp-1">{room.title}</h3>
                      </div>

                      {/* BADGE TIKET */}
                      {room.entry_fee && room.entry_fee > 0 && (
                          <div className="mb-4 inline-flex bg-[#FCD535]/10 text-[#FCD535] border border-[#FCD535]/20 px-3 py-1 rounded-lg text-[10px] font-bold items-center gap-1">
                              <Ticket size={12} /> Fee: {room.entry_fee} SOL
                          </div>
                      )}

                      <p className="text-xs text-[#848E9C] font-medium italic mb-6 line-clamp-3 leading-relaxed flex-1">{room.description}</p>
                      
                      {/* --- DETAIL RAHASIA --- */}
                      {room.access_type === 'private' && room.room_password && (
                         <div className="mb-6 bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] flex items-center justify-between group/pass">
                            <span className="text-[9px] font-black text-[#474D57] uppercase tracking-widest">Room Pass:</span>
                            <div className="flex items-center gap-2">
                               <code className="text-xs font-mono font-bold text-[#EAECEF]">{visiblePasswords[room.id] ? room.room_password : '••••••••'}</code>
                               <button onClick={() => togglePassword(room.id)} className="text-[#474D57] hover:text-[#FCD535] transition-colors">{visiblePasswords[room.id] ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                            </div>
                         </div>
                      )}

                      {room.access_type === 'whitelist' && (
                         <div className="mb-6 bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] flex items-center justify-between">
                            <span className="text-[9px] font-black text-[#474D57] uppercase tracking-widest">Whitelisted:</span>
                            <div className="flex items-center gap-2 text-xs font-bold text-[#EAECEF]">
                               <Users size={14} className="text-purple-500" /> {room.whitelist?.length || 0} Wallets
                            </div>
                         </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 mb-6">
                        {!room.is_boosted ? (
                           <button onClick={() => openBoostModal(room.id)} className="w-full flex items-center justify-center gap-2 bg-[#FCD535]/5 hover:bg-[#FCD535] border border-[#FCD535]/20 hover:border-[#FCD535] text-[#FCD535] hover:text-black py-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all group/btn">
                              <Rocket size={14} className="group-hover/btn:-translate-y-0.5 transition-transform" /> {t.dashboard?.rooms?.boost_btn || "Boost"} (0.2 SOL)
                           </button>
                        ) : (
                           <div className="w-full flex items-center justify-center gap-2 bg-[#1E2329] border border-[#2B3139] text-[#474D57] py-3 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-not-allowed opacity-50">
                              <CheckCircle size={14} /> {t.dashboard?.rooms?.boosted || "Boosted"}
                           </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-6 border-t border-[#2B3139] text-[10px] font-black uppercase tracking-widest text-[#474D57]">
                         <span className="flex items-center gap-2"><Users size={14} className="text-[#3b82f6]"/> {participants.filter(p=>p.room_id===room.id).length} Active</span>
                         <button onClick={() => safeNavigate(`/lomba/${room.id}`)} className="text-[#EAECEF] hover:text-[#FCD535] transition-colors flex items-center gap-1 group/link">
                            {t.dashboard?.rooms?.open_board || "Open"} <ChevronRight size={12} className="group-hover/link:translate-x-1 transition-transform"/>
                         </button>
                      </div>
                   </div>
                 ))
               )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// --- SUB KOMPONEN UI ---

interface SidebarLinkProps {
  Icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function SidebarLink({ Icon, label, active = false, onClick }: SidebarLinkProps) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 font-black cursor-pointer text-[11px] uppercase tracking-widest ${active ? 'bg-[#2B3139] text-[#FCD535] shadow-xl border border-[#FCD535]/10' : 'text-[#848E9C] hover:bg-[#2B3139] hover:text-[#EAECEF]'}`}>
      <Icon size={20} /> <span>{label}</span>
    </div>
  );
}

function AdminStatCard({ label, value, icon }: any) {
  return (
    <div className="bg-[#1E2329] p-6 lg:p-10 rounded-[2.5rem] border border-[#2B3139] shadow-2xl group hover:border-[#FCD535]/30 transition-all relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD535] rounded-full blur-[80px] opacity-0 group-hover:opacity-5 transition-opacity"></div>
      <div className="flex justify-between items-start mb-6">
        <div className="text-[9px] lg:text-[10px] font-black text-[#474D57] uppercase tracking-[0.2em] italic">{label}</div>
        <div className="p-3 bg-[#0B0E11] rounded-2xl border border-[#2B3139] text-[#848E9C] group-hover:text-[#FCD535] transition-all shadow-inner">{icon}</div>
      </div>
      <p className="text-3xl lg:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">{value}</p>
    </div>
  );
}