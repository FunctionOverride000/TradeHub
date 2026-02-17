"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase"; // Menggunakan helper yang konsisten
import { Bell, AlertTriangle, CheckCircle, Info, X } from "lucide-react";

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Inisialisasi client supabase
  const supabase = createClient();

  // 1. Fetch Notifikasi Awal
  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) setNotifications(data);

      // 2. Setup Realtime Listener
      const channel = supabase
        .channel('realtime-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Jika ada notifikasi baru masuk, tambahkan ke state
            setNotifications((current) => [payload.new as Notification, ...current]);
            
            // Opsional: Bunyikan suara notifikasi kecil
            // const audio = new Audio('/sounds/notification.mp3'); // Pastikan file ada jika ingin dipakai
            // audio.play().catch(() => {}); 
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchNotifs();
  }, []);

  const markAsRead = async (id: string) => {
    // Optimistic update (update UI dulu biar cepat)
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    
    // Update di database
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      {/* Tombol Lonceng */}
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-[#2B3139]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#0B0E11] rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Dropdown Notifikasi */}
      {showDropdown && (
        <>
          {/* Overlay Transparan untuk menutup dropdown saat klik di luar */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1E2329] border border-[#2B3139] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#2B3139] flex justify-between items-center bg-[#252A32]">
              <h3 className="font-bold text-sm text-white uppercase tracking-widest">Notifications</h3>
              <button onClick={() => setShowDropdown(false)}><X className="w-4 h-4 text-gray-400 hover:text-white" /></button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-3">
                    <Bell className="w-8 h-8 text-[#2B3139]" />
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">No notifications</span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 border-b border-[#2B3139] hover:bg-[#2B3139] transition-colors cursor-pointer flex gap-3 ${notif.is_read ? 'opacity-50' : 'bg-[#2B3139]/30'}`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="mt-1 shrink-0">
                      {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                      {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-[#0ECB81]" />}
                      {notif.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      {notif.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold mb-1 ${notif.type === 'warning' ? 'text-yellow-500' : 'text-gray-200'}`}>
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-[#848E9C] leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-[#474D57] mt-2 block font-mono">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}