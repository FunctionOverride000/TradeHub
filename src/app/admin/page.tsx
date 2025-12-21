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
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Import Supabase Client

// Interface sesuai tabel 'participants'
interface Participant {
  id: string;
  joined_at: string;
  wallet_address: string;
  room_id: string;
  initial_balance: number;
  current_balance: number;
  status?: string; // Menambahkan status (optional jika belum ada di DB, bisa ditambahkan manual)
}

// Interface sesuai tabel 'rooms'
interface Room {
  id: string;
  title: string;
  creator_wallet: string;
  start_time: string;
  end_time: string;
  is_premium: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"participants" | "rooms">("participants");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [user, setUser] = useState<any>(null);

  // State Form Room Baru
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // 1. Cek Auth
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        safeNavigate('/auth');
      } else {
        setUser(session.user);
      }
    };
    checkUser();
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // A. Ambil Participants
        const { data: partData } = await supabase
          .from('participants')
          .select('*')
          .order('joined_at', { ascending: false });
        setParticipants(partData || []);

        // B. Ambil Rooms
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .order('created_at', { ascending: false });
        setRooms(roomData || []);

      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Handler Update Status Peserta (Jika kolom status ada)
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      // Pastikan tabel participants punya kolom 'status'
      const { error } = await supabase
        .from('participants')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setParticipants(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err: any) {
      alert("Gagal update: " + err.message);
    }
  };

  // Handler Hapus Peserta (Kick)
  const handleDeleteParticipant = async (id: string) => {
    if (!confirm("Hapus peserta ini?")) return;
    try {
      await supabase.from('participants').delete().eq('id', id);
      setParticipants(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Handler Hapus Room
  const handleDeleteRoom = async (id: string) => {
    if (!confirm("Hapus Room ini? Semua data peserta di dalamnya akan hilang.")) return;
    try {
      await supabase.from('rooms').delete().eq('id', id);
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Handler Buat Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('rooms').insert([{
        title: newRoom.title,
        creator_wallet: newRoom.creator_wallet,
        start_time: new Date(newRoom.start_time).toISOString(),
        end_time: new Date(newRoom.end_time).toISOString(),
        is_premium: newRoom.is_premium
      }]).select();

      if (error) throw error;

      if (data) setRooms([data[0], ...rooms]);
      setIsModalOpen(false);
      setNewRoom({ title: "", creator_wallet: "", start_time: "", end_time: "", is_premium: false });
      alert("Room berhasil dibuat!");
    } catch (err: any) {
      alert("Gagal: " + err.message);
    }
  };

  // Filter
  const filteredParticipants = participants.filter(p => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      p.wallet_address.toLowerCase().includes(search) || 
      p.room_id.toLowerCase().includes(search);
      
    // Filter status sederhana (jika kolom status null, anggap pending)
    const currentStatus = p.status || 'pending';
    const matchesFilter = filterStatus === 'all' || currentStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0E11]">
        <Loader2 className="w-12 h-12 text-[#FCD535] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex overflow-hidden selection:bg-[#FCD535]/30">
      {/* Sidebar */}
      <aside className="w-72 bg-[#181A20] border-r border-[#2B3139] flex flex-col hidden lg:flex shrink-0">
        <div className="p-8 border-b border-[#2B3139] flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FCD535] rounded-xl flex items-center justify-center text-black shadow-lg">
            <ShieldCheck size={24} />
          </div>
          <span className="font-bold text-xl">AdminHub</span>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          <button onClick={() => setActiveTab("participants")} className={`w-full px-5 py-4 rounded-xl flex items-center gap-3 font-bold transition-all ${activeTab === "participants" ? 'bg-[#2B3139] text-[#FCD535] border border-[#FCD535]/20' : 'text-[#848E9C] hover:text-white'}`}>
            <Users size={20} /> Data Peserta
          </button>
          <button onClick={() => setActiveTab("rooms")} className={`w-full px-5 py-4 rounded-xl flex items-center gap-3 font-bold transition-all ${activeTab === "rooms" ? 'bg-[#2B3139] text-[#FCD535] border border-[#FCD535]/20' : 'text-[#848E9C] hover:text-white'}`}>
            <Trophy size={20} /> Kelola Rooms
          </button>
        </nav>
        <div className="p-6 border-t border-[#2B3139]">
          <button onClick={() => safeNavigate('/')} className="flex items-center gap-2 text-[#848E9C] hover:text-white text-sm font-bold"><ArrowLeft size={16}/> Ke Halaman Utama</button>
        </div>
      </aside>

      {/* Konten */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none -z-10"></div>

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-[#EAECEF] tracking-tight">
              {activeTab === "participants" ? "Data Peserta Global" : "Manajemen Room Trading"}
            </h1>
            <p className="text-[#848E9C] font-medium mt-1">Panel kontrol sistem trading LombaHub.</p>
          </div>
          {activeTab === "rooms" && (
            <button onClick={() => setIsModalOpen(true)} className="bg-[#FCD535] text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#F0B90B] transition shadow-lg">
              <Plus size={18} /> ROOM BARU
            </button>
          )}
        </header>

        {activeTab === "participants" ? (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C]" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari wallet address..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-[#1E2329] border border-[#2B3139] text-white pl-12 pr-4 py-3 rounded-xl w-full focus:border-[#FCD535] outline-none transition"
                />
              </div>
              <div className="flex bg-[#1E2329] p-1 rounded-xl border border-[#2B3139]">
                {['all', 'pending'].map(status => (
                  <button 
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${filterStatus === status ? 'bg-[#2B3139] text-[#FCD535]' : 'text-[#848E9C] hover:text-[#EAECEF]'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#2B3139] text-[#848E9C] uppercase font-bold text-xs border-b border-[#363c45]">
                    <tr>
                      <th className="p-4">Wallet Address</th>
                      <th className="p-4">Room ID</th>
                      <th className="p-4 text-right">Saldo Awal</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B3139]">
                    {filteredParticipants.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-[#848E9C]">Tidak ada data.</td></tr>
                    ) : (
                      filteredParticipants.map(p => (
                        <tr key={p.id} className="hover:bg-[#2B3139]/50 transition">
                          <td className="p-4 font-mono text-[#EAECEF]">{p.wallet_address}</td>
                          <td className="p-4 text-[#848E9C] font-mono text-xs">{p.room_id}</td>
                          <td className="p-4 text-right">{p.initial_balance.toFixed(2)} SOL</td>
                          <td className="p-4 text-center">
                             <StatusBadge status={p.status || 'pending'} />
                          </td>
                          <td className="p-4 text-center flex justify-center gap-2">
                            {(p.status === 'pending' || !p.status) && (
                              <>
                                <button onClick={() => handleUpdateStatus(p.id, 'verified')} className="p-2 bg-[#0ECB81]/10 text-[#0ECB81] rounded hover:bg-[#0ECB81] hover:text-black transition" title="Approve"><CheckCircle size={16}/></button>
                                <button onClick={() => handleUpdateStatus(p.id, 'rejected')} className="p-2 bg-[#F6465D]/10 text-[#F6465D] rounded hover:bg-[#F6465D] hover:text-white transition" title="Reject"><XCircle size={16}/></button>
                              </>
                            )}
                            <button onClick={() => handleDeleteParticipant(p.id)} className="text-[#848E9C] hover:text-[#F6465D] p-2" title="Hapus"><Trash2 size={16}/></button>
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
          /* Rooms Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-[#1E2329] rounded-[2rem] border border-dashed border-[#2B3139] text-[#848E9C]">
                <p>Belum ada room dibuat.</p>
              </div>
            ) : (
              rooms.map(room => (
                <div key={room.id} className="bg-[#1E2329] p-6 rounded-2xl border border-[#2B3139] hover:border-[#FCD535] transition group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[#0B0E11] rounded-xl border border-[#2B3139]">
                      <Trophy className="text-[#FCD535]" size={20} />
                    </div>
                    <button onClick={() => handleDeleteRoom(room.id)} className="text-[#848E9C] hover:text-[#F6465D] p-2"><Trash2 size={18}/></button>
                  </div>
                  <h3 className="text-lg font-bold text-[#EAECEF] mb-2 leading-tight">{room.title}</h3>
                  <p className="text-xs text-[#848E9C] font-mono mb-4">Creator: {room.creator_wallet.slice(0,8)}...</p>
                  <div className="space-y-2 pt-4 border-t border-[#2B3139] text-xs font-bold text-[#848E9C]">
                    <div className="flex items-center gap-2"><Calendar size={14} className="text-[#FCD535]"/> Start: {new Date(room.start_time).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2"><CheckCircle size={14} className="text-[#FCD535]"/> End: {new Date(room.end_time).toLocaleDateString()}</div>
                  </div>
                  {room.is_premium && (
                    <div className="absolute top-4 right-4 bg-[#FCD535] text-black text-[10px] font-bold px-2 py-1 rounded">PREMIUM</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal Buat Room */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1E2329] w-full max-w-md rounded-2xl border border-[#2B3139] p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#EAECEF]"><Plus size={20} className="text-[#FCD535]"/> Room Baru</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1">
                 <label className="text-[10px] text-[#848E9C] uppercase font-bold">Judul Room</label>
                 <input required value={newRoom.title} onChange={e => setNewRoom({...newRoom, title: e.target.value})} className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none text-sm"/>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] text-[#848E9C] uppercase font-bold">Wallet Creator</label>
                 <input required value={newRoom.creator_wallet} onChange={e => setNewRoom({...newRoom, creator_wallet: e.target.value})} className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none text-sm font-mono"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] text-[#848E9C] uppercase font-bold mb-1 block">Start Date</label>
                    <input required type="date" value={newRoom.start_time} onChange={e => setNewRoom({...newRoom, start_time: e.target.value})} className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none text-sm"/>
                </div>
                <div>
                    <label className="text-[10px] text-[#848E9C] uppercase font-bold mb-1 block">End Date</label>
                    <input required type="date" value={newRoom.end_time} onChange={e => setNewRoom({...newRoom, end_time: e.target.value})} className="w-full bg-[#0B0E11] p-3 rounded-xl border border-[#2B3139] text-[#EAECEF] focus:border-[#FCD535] outline-none text-sm"/>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="premium" checked={newRoom.is_premium} onChange={e => setNewRoom({...newRoom, is_premium: e.target.checked})} className="accent-[#FCD535] w-4 h-4"/>
                <label htmlFor="premium" className="text-sm font-bold text-[#EAECEF]">Premium Room</label>
              </div>
              <div className="flex gap-3 mt-6 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-[#2B3139] rounded-xl font-bold text-[#EAECEF] hover:bg-[#363c45]">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-[#FCD535] text-black rounded-xl font-bold hover:bg-[#F0B90B]">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    verified: { color: "bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/20", label: "Verified", icon: <CheckCircle size={12}/> },
    rejected: { color: "bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/20", label: "Rejected", icon: <XCircle size={12}/> },
    pending: { color: "bg-[#FCD535]/10 text-[#FCD535] border-[#FCD535]/20", label: "Pending", icon: <Clock size={12}/> }
  };
  
  const config = configs[status] || configs.pending;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
      {config.icon}
      {config.label}
    </div>
  );
}

function AdminStatCard({ label, value, color, icon }: { label: string, value: number, color: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#1E2329] p-6 rounded-2xl border border-[#2B3139] flex items-center gap-5 hover:border-[#474D57] transition-colors">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[#0B0E11] border border-[#2B3139] ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#848E9C] uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#EAECEF] tracking-tight">{value}</p>
      </div>
    </div>
  );
}