"use client";

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Target, 
  BarChart3, 
  Lock, 
  ChevronRight, 
  ArrowLeft,
  Coins,
  ShieldAlert,
  Globe,
  Trophy,
  Scale,
  Flame,
  LayoutDashboard,
  Rocket,
  Wallet,
  UserCheck,
  Cpu,
  Activity,
  User,
  Clock,
  RefreshCw,
  BookOpen,
  MessageCircle,
  Send,
  Share2,
  Monitor,
  Gamepad2,
  Book,
  Link as LinkIcon
} from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { LanguageSwitcher } from '../../lib/LanguageSwitcher';

export default function HandbookPage() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("overview");

  const safeNavigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans selection:bg-[#FCD535]/30 relative overflow-x-hidden">
      
      {/* Static Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#FCD535]/5 to-transparent pointer-events-none opacity-40"></div>
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,33,38,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,33,38,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity:10 pointer-events-none"></div>

      <header className="relative z-10 pt-10 lg:pt-16 pb-12 border-b border-[#2B3139] bg-[#0B0E11]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-6 w-full md:w-auto">
              <button onClick={() => safeNavigate('/')} className="p-4 bg-[#1E2329] border border-[#2B3139] rounded-2xl text-[#848E9C] hover:text-[#FCD535] transition-all active:scale-90 shadow-xl group">
                 <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                 <div className="flex items-center gap-3 text-[#FCD535] font-black text-[10px] uppercase tracking-[0.4em] mb-2">
                    <ShieldCheck size={14} fill="currentColor" /> System documentation
                 </div>
                 <h1 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">TradeHub <span className="text-[#FCD535]">{t.nav.handbook}</span></h1>
              </div>
           </div>
           <div className="flex items-center gap-4">
             <LanguageSwitcher />
             <div className="hidden lg:flex items-center gap-3 bg-[#FCD535]/10 px-5 py-3 rounded-2xl border border-[#FCD535]/20 shadow-lg shadow-[#FCD535]/5">
                <span className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest italic leading-none">Standard Operating Procedure v3.0</span>
             </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-4 space-y-4 h-fit lg:sticky lg:top-40 overflow-y-auto max-h-[calc(100vh-10rem)] no-scrollbar pb-10">
           <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-4 mb-6 italic">Master Chapters</p>
           <NavCard active={activeSection === "overview"} onClick={() => setActiveSection("overview")} icon={<Rocket size={20} />} title="Platform Overview" desc="Visi, misi, dan fondasi TradeHub." />
           <NavCard active={activeSection === "clean-roi"} onClick={() => setActiveSection("clean-roi")} icon={<Scale size={20} />} title="Clean ROI Logic" desc="Teknologi filter deposit eksternal." />
           <NavCard active={activeSection === "snapshot"} onClick={() => setActiveSection("snapshot")} icon={<Zap size={20} />} title="On-Chain Snapshots" desc="Mekanisme penguncian baki ledger." />
           <NavCard active={activeSection === "trader-guide"} onClick={() => setActiveSection("trader-guide")} icon={<UserCheck size={20} />} title="Trader Blueprint" desc="Panduan menjadi trader top global." />
           <NavCard active={activeSection === "creator-guide"} onClick={() => setActiveSection("creator-guide")} icon={<Cpu size={20} />} title="Creator Protocol" desc="Panduan meluncurkan arena mandiri." />
           <NavCard active={activeSection === "economics"} onClick={() => setActiveSection("economics")} icon={<Coins size={20} />} title="Platform Economics" desc="Struktur biaya dan distribusi SOL." />
           <NavCard active={activeSection === "ranks"} onClick={() => setActiveSection("ranks")} icon={<Trophy size={20} />} title="Reputation Tiers" desc="Sistem kasta dan kredibilitas." />
           <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-4 mt-8 mb-6 italic">Hub & Network</p>
           {/* Update Title Sidebar */}
           <NavCard active={activeSection === "ecosystem"} onClick={() => setActiveSection("ecosystem")} icon={<Globe size={20} />} title="Strategic Partners" desc="Proyek partner resmi TradeHub." />
           <NavCard active={activeSection === "community"} onClick={() => setActiveSection("community")} icon={<MessageCircle size={20} />} title="Join Community" desc="Koneksi ke grup global & sosial media." />
        </aside>

        {/* Content Area */}
        <article className="lg:col-span-8 space-y-16 animate-in fade-in slide-in-from-right-4 duration-700 pb-32">
           
           {activeSection === "overview" && (
             <div className="space-y-10">
                <ContentHeader title="TradeHub Ecosystem" subtitle="The Future of Verified Trading" icon={<Rocket className="text-[#FCD535]" />} />
                <div className="prose prose-invert max-w-none space-y-6">
                   <p className="text-lg text-[#848E9C] leading-relaxed italic font-medium">
                      TradeHub adalah protokol **Proof-of-Skill** pertama di jaringan Solana yang dirancang untuk memisahkan "keberuntungan sementara" dari "keahlian strategi murni". Kami menyediakan infrastruktur kompetisi yang 100% transparan, di mana setiap klaim keuntungan diverifikasi langsung melalui blockchain.
                   </p>
                   <p className="text-sm text-[#848E9C] leading-relaxed">
                      Visi kami adalah menciptakan standar baru dalam dunia trading kripto di mana reputasi seseorang dibangun di atas data yang tidak dapat dipalsukan, bukan sekadar tangkapan layar (screenshot) yang mudah dimanipulasi. TradeHub memberdayakan komunitas untuk menyelenggarakan turnamen mereka sendiri dan memberikan panggung bagi trader berbakat untuk bersinar.
                   </p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
                      <div className="bg-[#1E2329] p-8 rounded-[2.5rem] border border-[#2B3139] shadow-xl">
                         <h4 className="text-white font-black uppercase italic mb-4 flex items-center gap-3"><Globe size={20} className="text-[#3b82f6]"/> Transparansi Total</h4>
                         <p className="text-xs text-[#848E9C] leading-relaxed">Semua data performa ditarik langsung dari ledger Solana. Tidak ada input manual, tidak ada manipulasi spreadsheet, dan tidak ada ruang untuk kebohongan.</p>
                      </div>
                      <div className="bg-[#1E2329] p-8 rounded-[2.5rem] border border-[#2B3139] shadow-xl">
                         <h4 className="text-white font-black uppercase italic mb-4 flex items-center gap-3"><ShieldCheck size={20} className="text-[#0ECB81]"/> Integritas On-Chain</h4>
                         <p className="text-xs text-[#848E9C] leading-relaxed">TradeHub memastikan bahwa rekam jejak Anda adalah aset digital yang sah, dapat dibagikan, dan diakui secara global oleh komunitas dEGEN.</p>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeSection === "clean-roi" && (
             <div className="space-y-10">
                <ContentHeader title="Clean ROI Logic" subtitle="Anti-Manipulation Engine" icon={<ShieldAlert className="text-yellow-500" />} />
                <div className="space-y-8">
                   <p className="text-[#848E9C] leading-relaxed italic">
                      Masalah utama dalam kompetisi trading konvensional adalah "Deposit-to-Win". Trader yang menambah saldo saat kompetisi akan terlihat memiliki profit lebih besar. **Clean ROI** hadir untuk menghancurkan praktik ini.
                   </p>
                   <div className="bg-[#1E2329] p-10 rounded-[3rem] border border-[#2B3139] space-y-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl"></div>
                      <h4 className="font-black text-[#FCD535] uppercase text-xs tracking-[0.3em] italic flex items-center gap-3">
                         <BarChart3 size={18}/> THE MASTER FORMULA
                      </h4>
                      <div className="bg-[#0B0E11] p-8 rounded-3xl font-mono text-xs md:text-sm lg:text-base text-center border border-[#2B3139] shadow-inner text-white leading-loose tracking-tighter overflow-x-auto">
                         ROI = <span className="text-[#FCD535]">((Current - ExtDeposit - Snapshot) / Snapshot) * 100</span>
                      </div>
                      <div className="space-y-6">
                         <div className="flex gap-6">
                            <div className="w-10 h-10 bg-[#0B0E11] rounded-xl flex items-center justify-center shrink-0 text-[#FCD535] border border-[#2B3139] shadow-lg">1</div>
                            <div>
                               <h5 className="font-black text-white uppercase text-xs mb-2">Detection of External Deposits</h5>
                               <p className="text-[11px] text-[#848E9C] leading-relaxed">Setiap transaksi masuk bertipe 'System Transfer' (bukan swap DEX) yang masuk ke wallet peserta setelah snapshot akan ditandai oleh Network Auditor kami.</p>
                            </div>
                         </div>
                         <div className="flex gap-6">
                            <div className="w-10 h-10 bg-[#0B0E11] rounded-xl flex items-center justify-center shrink-0 text-[#FCD535] border border-[#2B3139] shadow-lg">2</div>
                            <div>
                               <h5 className="font-black text-white uppercase text-xs mb-2">Automatic ROI Correction</h5>
                               <p className="text-[11px] text-[#848E9C] leading-relaxed">Nilai setoran eksternal tersebut akan dikurangkan dari saldo semasa dalam perhitungan peringkat. Anda boleh menyetor dana tambahan, tetapi itu tidak akan membantu peringkat Anda.</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeSection === "snapshot" && (
             <div className="space-y-10">
                <ContentHeader title="On-Chain Snapshots" subtitle="Ledger-Based Verification" icon={<Zap className="text-[#FCD535]" />} />
                <div className="space-y-8">
                   <p className="text-[#848E9C] leading-relaxed italic">
                     TradeHub menggunakan teknologi snapshot real-time untuk mengunci posisi awal setiap peserta. Tidak ada data yang disimpan di server lokal; semua data verifikasi diambil langsung dari Solana Mainnet.
                   </p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-[#1E2329] p-8 rounded-[2.5rem] border border-[#2B3139] shadow-xl">
                        <h4 className="text-white font-black uppercase italic mb-4 flex items-center gap-3"><Clock size={20} className="text-[#3b82f6]"/> Initial Lock</h4>
                        <p className="text-xs text-[#848E9C] leading-relaxed">Saat Anda menekan tombol 'Join', sistem akan mencatat `lamports` (satuan terkecil SOL) di dompet Anda. Angka ini menjadi penyebut absolut dalam rumus ROI.</p>
                     </div>
                     <div className="bg-[#1E2329] p-8 rounded-[2.5rem] border border-[#2B3139] shadow-xl">
                        <h4 className="text-white font-black uppercase italic mb-4 flex items-center gap-3"><RefreshCw size={20} className="text-[#0ECB81]"/> Live Sync</h4>
                        <p className="text-xs text-[#848E9C] leading-relaxed">Setiap perubahan saldo dipantau via WebSocket RPC untuk memperbarui papan peringkat secara instan (real-time) tanpa perlu refresh halaman manual.</p>
                     </div>
                   </div>
                </div>
             </div>
           )}

           {activeSection === "trader-guide" && (
             <div className="space-y-10">
                <ContentHeader title="Trader Blueprint" subtitle="Step-by-Step Competitive Play" icon={<UserCheck className="text-[#3b82f6]" />} />
                <div className="space-y-6">
                   <GuideStep num="01" title="Siapkan Wallet Khusus" desc="Sangat disarankan menggunakan 'Burner Wallet' atau wallet baru untuk setiap turnamen agar audit saldo Anda murni dari aset hold jangka panjang." />
                   <GuideStep num="02" title="Penuhi Syarat Saldo Minimum" desc="Setiap arena memiliki 'Min Balance'. Pastikan saldo SOL Anda mencukupi di dompet Phantom Anda sebelum menekan tombol ikut." />
                   <GuideStep num="03" title="Snapshot & Konfirmasi" desc="Saat mendaftar, TradeHub akan mengambil data saldo Anda langsung dari Solana Mainnet. Ini adalah 'Baseline' (titik nol) Anda." />
                   <GuideStep num="04" title="Trading di DEX Favorit" desc="Gunakan platform trading favorit Anda (Raydium, Jupiter, dll). Selama saldo wallet Anda bertambah dari hasil trading, ROI Anda akan naik secara real-time di TradeHub." />
                   <GuideStep num="05" title="Klaim Sertifikat Reputasi" desc="Setelah arena selesai, jika Anda masuk dalam peringkat yang divalidasi, Anda dapat mencetak sertifikat on-chain di dashboard Anda." />
                </div>
             </div>
           )}

           {activeSection === "creator-guide" && (
             <div className="space-y-10">
                <ContentHeader title="Creator Protocol" subtitle="Host Your Own Competitions" icon={<Cpu className="text-[#0ECB81]" />} />
                <p className="text-[#848E9C] leading-relaxed italic">
                   TradeHub bukan hanya untuk trader, tapi juga untuk komunitas, influencer, dan brand yang ingin mengadakan turnamen trading yang adil dan transparan.
                </p>
                <div className="bg-[#1E2329] p-8 rounded-[3rem] border border-[#2B3139] shadow-2xl relative overflow-hidden">
                   <div className="space-y-6">
                      <div className="flex items-center gap-4 border-b border-[#2B3139] pb-6 mb-6">
                         <div className="w-12 h-12 bg-[#FCD535] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-[#FCD535]/10"><User size={24} /></div>
                         <div>
                            <h4 className="font-black text-white uppercase italic tracking-tighter">Creation Logic</h4>
                            <p className="text-[10px] text-[#474D57] font-black uppercase tracking-widest">Deploy Arena on Solana</p>
                         </div>
                      </div>
                      <ul className="space-y-4 text-xs text-[#848E9C]">
                         <li className="flex items-start gap-4">
                            <ChevronRight size={16} className="text-[#FCD535] mt-0.5" />
                            <span><b>Biaya Peluncuran:</b> 0.1 SOL dibayarkan sekali untuk satu arena.</span>
                         </li>
                         <li className="flex items-start gap-4">
                            <ChevronRight size={16} className="text-[#FCD535] mt-0.5" />
                            <span><b>Kustomisasi Aturan:</b> Anda berhak menentukan hadiah, durasi waktu, dan syarat saldo minimum peserta.</span>
                         </li>
                         <li className="flex items-start gap-4">
                            <ChevronRight size={16} className="text-[#FCD535] mt-0.5" />
                            <span><b>Admin Dashboard:</b> Sebagai kreator, Anda memiliki akses ke 'CreatorHub' untuk mendiskualifikasi cheater atau memverifikasi pemenang.</span>
                         </li>
                      </ul>
                   </div>
                </div>
             </div>
           )}

           {activeSection === "economics" && (
             <div className="space-y-10">
                <ContentHeader title="Fees & Economics" subtitle="Sustainable Protocol Ecosystem" icon={<Coins className="text-[#FCD535]" />} />
                <div className="grid grid-cols-1 gap-6">
                   <FeeRow label="Create New Arena" fee="0.10 SOL" desc="Menyediakan infrastruktur audit dan monitoring on-chain." />
                   <FeeRow label="Edit Active Arena" fee="0.05 SOL" desc="Biaya overhead update metadata turnamen." />
                   <FeeRow label="Trader Registration" fee="FREE" desc="Trader tidak dikenakan biaya platform apa pun." />
                   <div className="p-8 bg-[#181A20] rounded-[2.5rem] border border-[#2B3139] text-center">
                      <h4 className="text-white font-black uppercase italic text-xs mb-3">Rewards Distribution</h4>
                      <p className="text-xs text-[#848E9C] leading-relaxed italic">
                         TradeHub saat ini bertindak sebagai **Validator Peringkat**. Distribusi hadiah dilakukan secara manual oleh Kreator Arena kepada pemenang yang sudah terverifikasi di Papan Peringkat.
                      </p>
                   </div>
                </div>
             </div>
           )}

           {activeSection === "ranks" && (
             <div className="space-y-10">
                <ContentHeader title="Master Rank Tiers" subtitle="Global Reputation Hierarchy" icon={<Trophy className="text-[#FCD535]" />} />
                <div className="bg-[#1E2329] rounded-[3rem] border border-[#2B3139] overflow-hidden shadow-2xl">
                   <table className="w-full text-left text-xs uppercase font-black tracking-widest">
                      <thead className="bg-[#2B3139] text-[#848E9C] border-b border-[#363c45]">
                         <tr>
                            <th className="p-8">Tier Level</th>
                            <th className="p-8 hidden md:table-cell">Validation Metric</th>
                            <th className="p-8 text-right">Reputation Badge</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2B3139]">
                         <TierRow label="Grandmaster" req="20+ Verified Wins" color="text-red-500" badge="ELITE LEGEND" />
                         <TierRow label="Elite Trader" req="10+ Verified Wins" color="text-[#FCD535]" badge="MASTER RANK" />
                         <TierRow label="Pro Trader" req="5+ Verified Wins" color="text-[#0ECB81]" badge="PROFESSIONAL" />
                         <TierRow label="Active Trader" req="Default Registration" color="text-[#3b82f6]" badge="RECRUIT" />
                      </tbody>
                   </table>
                </div>
                <div className="p-6 bg-[#0ECB81]/5 border border-[#0ECB81]/20 rounded-2xl flex items-center gap-4 shadow-xl">
                   <ShieldCheck className="text-[#0ECB81] shrink-0" size={24} />
                   <p className="text-[10px] text-[#848E9C] font-black uppercase tracking-widest leading-relaxed italic">Semua peringkat ini tampil secara publik di profil Anda dan dapat diverifikasi oleh siapa pun di seluruh dunia.</p>
                </div>
             </div>
           )}

           {/* --- STRATEGIC PARTNERS SECTION --- */}
           {activeSection === "ecosystem" && (
             <div className="space-y-10">
                <ContentHeader title="Strategic Partners" subtitle="Collaborating Projects" icon={<Globe className="text-[#3b82f6]" />} />
                <p className="text-[#848E9C] leading-relaxed italic">
                   TradeHub berkolaborasi dengan proyek-proyek terdepan berikut untuk menghadirkan pengalaman trading yang komprehensif. Sinergi ini memastikan pengguna mendapatkan akses ke alat analisis, keamanan, dan komunitas terbaik.
                </p>
                <div className="grid grid-cols-1 gap-6">
                   <ProjectCard 
                      icon={<img src="/Crypto-Directory-Indonesia.png" alt="Crypto Directory Indonesia" className="w-20 h-20 object-contain" />}
                      title="Crypto Directory Indonesia"
                      url="https://cryptodirectoryindonesia.io"
                      desc="Edukasi dan direktori komunitas cryptocurrency di Indonesia."
                   />
                   <ProjectCard 
                      icon={<img src="/Chat-Global.png" alt="Chat Global" className="w-20 h-20 object-contain" />}
                      title="Chat Global"
                      url="https://chatglobal.cryptodirectoryindonesia.io"
                      desc="Forum chat global memungkinkan anggota saling berdiskusi, berbagi update, dan menjalin koneksi"
                   />
                   <ProjectCard 
                      icon={<img src="/Jurnal-Trading.png" alt="Jurnal Trading" className="w-30 h-30 object-contain" />}
                      title="Jurnal Trading"
                      url="https://jurnaltrading.cryptodirectoryindonesia.io"
                      desc="Jurnal trader — dari catatan harian, analisis pasar terkini, hingga refleksi pribadi yang jujur."
                   />
                   <ProjectCard 
                      icon={<img src="/Cyber-Web-Scanner.png" alt="Cyber Web Scanner" className="w-30 h-30 object-contain" />}
                      title="Cyber Web Scanner"
                      url="https://cyberwebscanner.onrender.com"
                      desc="Platform pemindaian web yang andal dan mudah digunakan untuk semua level pengguna"
                   />
                   <ProjectCard 
                      icon={<img src="/Djarum-Slayer.png" alt="Djarum Slayer" className="w-30 h-30 object-contain" />}
                      title="Djarum Slayer"
                      url="https://febriosht.github.io/Djarum-Slayer/"
                      desc="Portofolio dan website personal Djarum Slayer."
                   />
                </div>
             </div>
           )}

           {/* --- COMMUNITY SECTION --- */}
           {activeSection === "community" && (
             <div className="space-y-10">
                <ContentHeader title="Join the Community" subtitle="Global Network Access" icon={<MessageCircle className="text-[#FCD535]" />} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <SocialCard 
                      icon={<Send size={32} />}
                      name="Telegram"
                      desc="Grup diskusi resmi dan pengumuman instan."
                      link="https://t.me/tradehub_proofofachievement"
                      color="bg-blue-500"
                   />
                   <SocialCard 
                      icon={<img src="/Discord.png" alt="Discord" className="w-10 h-10 object-contain" />}
                      name="Discord"
                      desc="Hub komunitas utama, voice chat, dan support tiket."
                      link="https://discord.com/channels/1418298906554667059/1418302651585658921"
                      color="bg-[#5865F2]"
                   />
                   <SocialCard 
                      icon={<img src="/X.png" alt="X (Twitter)" className="w-8 h-8 object-contain" />}
                      name="X (Twitter)"
                      desc="Update berita terbaru dan thread edukasi."
                      link="https://twitter.com/TradeHub_SOL"
                      color="bg-black"
                   />
                   <SocialCard 
                      icon={<img src="/Chat-Global.png" alt="Chat Global" className="w-15 h-15 object-contain" />}
                      name="Chat Global"
                      desc="Platform chat web3 terintegrasi tanpa sensor."
                      link="https://chatglobal.cryptodirectoryindonesia.io"
                      color="bg-[#041a2f]"
                   />
                </div>
             </div>
           )}

        </article>
      </main>

      <footer className="py-32 text-center opacity-10 border-t border-[#2B3139]/30 flex flex-col items-center gap-4">
         <LayoutDashboard size={40} className="text-white" />
         <p className="text-[10px] font-black uppercase tracking-[1.5em] italic">TradeHub • The Trust Layer of Solana Ecosystem</p>
      </footer>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavCard({ active, onClick, icon, title, desc }: any) {
  return (
    <div onClick={onClick} className={`p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden ${active ? 'bg-[#1E2329] border-[#FCD535]/40 shadow-2xl scale-[1.02]' : 'bg-transparent border-[#2B3139] hover:border-[#474D57]'}`}>
       {active && <div className="absolute top-0 right-0 w-24 h-24 bg-[#FCD535]/5 rounded-full blur-2xl"></div>}
       <div className="flex items-center gap-5 mb-4 relative z-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${active ? 'bg-[#FCD535] text-black shadow-lg shadow-[#FCD535]/20 rotate-6' : 'bg-[#0B0E11] text-[#848E9C] border border-[#2B3139]'}`}>{icon}</div>
          <h3 className={`font-black uppercase italic tracking-tighter text-base transition-colors duration-500 ${active ? 'text-white' : 'text-[#848E9C]'}`}>{title}</h3>
       </div>
       <p className="text-[10px] text-[#474D57] font-black uppercase tracking-widest leading-relaxed relative z-10">{desc}</p>
    </div>
  );
}

function ContentHeader({ title, subtitle, icon }: any) {
  return (
    <div className="flex items-center gap-8 mb-12 animate-in slide-in-from-left-4 duration-1000">
       <div className="w-20 h-20 bg-[#1E2329] rounded-[2rem] border border-[#2B3139] flex items-center justify-center shadow-2xl shadow-black/50 text-white shrink-0">{icon}</div>
       <div>
          <h2 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-none mb-3">{title}</h2>
          <p className="text-[11px] font-black text-[#FCD535] uppercase tracking-[0.5em] italic">{subtitle}</p>
       </div>
    </div>
  );
}

function GuideStep({ num, title, desc }: any) {
  return (
    <div className="flex items-start gap-8 p-8 rounded-[2.5rem] bg-[#1E2329]/40 border border-[#2B3139] hover:border-[#FCD535]/20 transition-all group shadow-xl">
       <div className="text-3xl font-black text-[#2B3139] group-hover:text-[#FCD535]/20 transition-colors italic leading-none pt-1">{num}</div>
       <div>
          <h4 className="text-white font-black uppercase italic tracking-tight mb-2 group-hover:text-[#FCD535] transition-colors">{title}</h4>
          <p className="text-xs text-[#848E9C] leading-relaxed font-medium italic">{desc}</p>
       </div>
    </div>
  );
}

function FeeRow({ label, fee, desc }: any) {
  return (
    <div className="p-8 bg-[#0B0E11] rounded-[2rem] border border-[#2B3139] flex items-center justify-between group hover:border-[#FCD535]/30 transition-all shadow-inner relative overflow-hidden">
       <div className="absolute inset-y-0 left-0 w-1 bg-[#FCD535] opacity-0 group-hover:opacity-100 transition-opacity"></div>
       <div className="space-y-1.5 relative z-10">
          <p className="text-sm font-black text-white uppercase italic tracking-tight">{label}</p>
          <p className="text-[10px] text-[#474D57] font-black uppercase tracking-[0.2em]">{desc}</p>
       </div>
       <div className="text-right relative z-10">
          <p className="text-2xl font-black text-[#FCD535] italic tracking-tighter leading-none mb-1">{fee}</p>
          <p className="text-[9px] font-black text-[#474D57] uppercase tracking-[0.3em]">Network Standard</p>
       </div>
    </div>
  );
}

function TierRow({ label, req, color, badge }: any) {
  return (
    <tr className="hover:bg-[#2B3139]/40 transition-colors group">
       <td className={`p-8 font-black italic text-sm ${color}`}>{label}</td>
       <td className="p-8 text-[#848E9C] text-xs font-bold italic tracking-wide hidden md:table-cell">{req}</td>
       <td className="p-8 text-right"><span className="px-5 py-2 bg-[#0B0E11] rounded-xl border border-[#2B3139] text-[#FCD535] text-[10px] font-black tracking-widest shadow-lg group-hover:border-[#FCD535]/30 transition-all">{badge}</span></td>
    </tr>
  );
}

function ProjectCard({ icon, title, url, desc }: any) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-6 p-8 bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] hover:border-[#FCD535]/40 hover:-translate-y-1 transition-all group shadow-xl">
       <div className="w-14 h-14 bg-[#0B0E11] rounded-2xl flex items-center justify-center border border-[#2B3139] shadow-inner group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <div>
          <h4 className="text-white font-black uppercase italic tracking-tight mb-2 flex items-center gap-3">
             {title} <LinkIcon size={12} className="text-[#474D57] group-hover:text-[#FCD535]" />
          </h4>
          <p className="text-xs text-[#848E9C] leading-relaxed font-medium italic">{desc}</p>
       </div>
    </a>
  );
}

function SocialCard({ icon, name, desc, link, color }: any) {
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="p-8 bg-[#1E2329] rounded-[2.5rem] border border-[#2B3139] hover:border-white/20 transition-all group flex flex-col items-center text-center hover:-translate-y-2 shadow-2xl relative overflow-hidden">
       <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${color}`}></div>
       <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg ${color}`}>
          {icon}
       </div>
       <h4 className="text-white font-black uppercase italic tracking-tight mb-2">{name}</h4>
       <p className="text-[10px] text-[#848E9C] leading-relaxed font-black uppercase tracking-widest">{desc}</p>
    </a>
  );
}