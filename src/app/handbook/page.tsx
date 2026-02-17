"use client";

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  ArrowLeft,
  ArrowRight,
  Coins,
  ShieldAlert,
  Globe,
  Trophy,
  Scale,
  Rocket,
  Cpu,
  MessageCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Lock,
  Wallet,
  Activity,
  Ticket,
  Send,
  Gavel,
  Shield // Added Shield import
} from 'lucide-react';
import Link from 'next/link';

import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/lib/LanguageSwitcher';

// --- IMPORT COMPONENTS ---
import NavCard from '@/components/handbook/NavCard';
import ContentHeader from '@/components/handbook/ContentHeader';
import GuideStep from '@/components/handbook/GuideStep';
import ProjectCard from '@/components/handbook/ProjectCard';
import SocialCard from '@/components/handbook/SocialCard';

export default function HandbookPage() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("protocol-overview");

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
                    <BookOpen size={14} fill="currentColor" /> Protocol Documentation
                 </div>
                 <h1 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">TradeHub <span className="text-[#FCD535]">Handbook</span></h1>
             </div>
           </div>
           <div className="flex items-center gap-4">
             <LanguageSwitcher />
             <div className="hidden lg:flex items-center gap-3 bg-[#FCD535]/10 px-5 py-3 rounded-2xl border border-[#FCD535]/20 shadow-lg shadow-[#FCD535]/5">
                <span className="text-[10px] font-black text-[#FCD535] uppercase tracking-widest italic leading-none">V 1.0 (Stable)</span>
             </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-4 space-y-4 h-fit lg:sticky lg:top-40 overflow-y-auto max-h-[calc(100vh-10rem)] no-scrollbar pb-10">
           <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-4 mb-6 italic">Core Mechanics</p>
           <NavCard active={activeSection === "protocol-overview"} onClick={() => setActiveSection("protocol-overview")} icon={<Globe size={20} />} title="Protocol Overview" desc="Understanding the Proof-of-Skill consensus." />
           <NavCard active={activeSection === "clean-roi"} onClick={() => setActiveSection("clean-roi")} icon={<Scale size={20} />} title="Clean ROI™ Engine" desc="How we filter fake volume and deposits." />
           <NavCard active={activeSection === "rewards"} onClick={() => setActiveSection("rewards")} icon={<Trophy size={20} />} title="Incentive Structure" desc="Payout logic for Traders and Creators." />
           
           <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-4 mt-8 mb-6 italic">User Guide</p>
           <NavCard active={activeSection === "quick-start"} onClick={() => setActiveSection("quick-start")} icon={<Rocket size={20} />} title="Quick Start Tutorial" desc="From wallet connection to first trade." />
           <NavCard active={activeSection === "risk-disclosure"} onClick={() => setActiveSection("risk-disclosure")} icon={<ShieldAlert size={20} />} title="Risk Disclosure" desc="Mandatory reading before participation." />
           
           <p className="text-[10px] font-black text-[#474D57] uppercase tracking-[0.4em] px-4 mt-8 mb-6 italic">Network</p>
           <NavCard active={activeSection === "partners"} onClick={() => setActiveSection("partners")} icon={<Cpu size={20} />} title="Strategic Partners" desc="Official ecosystem collaborators." />
           <NavCard active={activeSection === "community"} onClick={() => setActiveSection("community")} icon={<MessageCircle size={20} />} title="Community Channels" desc="Join the global discussion." />
        </aside>

        {/* Content Area */}
        <article className="lg:col-span-8 space-y-16 animate-in fade-in slide-in-from-right-4 duration-700 pb-32">
           
           {/* --- PROTOCOL OVERVIEW --- */}
           {activeSection === "protocol-overview" && (
             <div className="space-y-10">
                <ContentHeader title="Protocol Overview" subtitle="Decentralized Verification Layer" icon={<ShieldCheck className="text-[#FCD535]" />} />
                <div className="prose prose-invert max-w-none space-y-6">
                   <p className="text-lg text-[#848E9C] leading-relaxed italic font-medium">
                     TradeHub acts as an impartial, on-chain auditor for cryptocurrency trading performance. We provide a trustless infrastructure where trading skills are verified directly against the Solana ledger, eliminating the possibility of manipulated screenshots or falsified PnL reports.
                   </p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
                     <div className="bg-[#1E2329] p-8 rounded-[2.5rem] border border-[#2B3139] shadow-xl">
                        <h4 className="text-white font-black uppercase italic mb-4 flex items-center gap-3"><Lock size={20} className="text-[#3b82f6]"/> Non-Custodial Architecture</h4>
                        <p className="text-xs text-[#848E9C] leading-relaxed">
                           TradeHub <strong>never holds user funds</strong> for trading purposes. Participants trade directly from their own self-custody wallets (Phantom/Solflare) on external DEXs (Jupiter, Raydium). The protocol only requires read-access to verify transactions.
                        </p>
                     </div>
                     <div className="bg-[#1E2329] p-8 rounded-[2.5rem] border border-[#2B3139] shadow-xl">
                        <h4 className="text-white font-black uppercase italic mb-4 flex items-center gap-3"><Activity size={20} className="text-[#0ECB81]"/> Live RPC Monitoring</h4>
                        <p className="text-xs text-[#848E9C] leading-relaxed">
                           Our engine connects to Solana RPC nodes via high-speed WebSockets. Changes in wallet balances are detected within milliseconds, ensuring the leaderboard reflects the absolute truth of the market state.
                        </p>
                     </div>
                   </div>
                </div>
             </div>
           )}

           {/* --- CLEAN ROI LOGIC --- */}
           {activeSection === "clean-roi" && (
             <div className="space-y-10">
                <ContentHeader title="Clean ROI™ Engine" subtitle="Anti-Cheat Mathematics" icon={<Scale className="text-[#0ECB81]" />} />
                <div className="space-y-8">
                   <p className="text-[#848E9C] leading-relaxed italic">
                     To ensure fair play, TradeHub employs a rigorous "Clean ROI" algorithm designed to filter out external capital injections. This prevents the common "Deposit-to-Win" strategy used in lesser competitions.
                   </p>
                   
                   <div className="bg-[#1E2329] p-10 rounded-[3rem] border border-[#2B3139] space-y-8 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-[#0ECB81]/5 blur-3xl"></div>
                     <h4 className="font-black text-white uppercase text-xs tracking-[0.3em] italic flex items-center gap-3">
                        <BarChart3 size={18} className="text-[#0ECB81]"/> THE FORMULA
                     </h4>
                     <div className="bg-[#0B0E11] p-8 rounded-3xl font-mono text-xs md:text-sm lg:text-base text-center border border-[#2B3139] shadow-inner text-white leading-loose tracking-tighter overflow-x-auto">
                       ROI = <span className="text-[#0ECB81]">((CurrentBalance - ExternalDeposits - InitialSnapshot) / InitialSnapshot) * 100</span>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-6">
                        <div className="flex gap-4 items-start">
                           <div className="w-8 h-8 rounded-full bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[#848E9C] font-bold text-xs shrink-0">1</div>
                           <div>
                              <h5 className="font-bold text-white text-sm mb-1">Initial Snapshot</h5>
                              <p className="text-xs text-[#848E9C]">At the moment of registration, the system records the exact Lamport balance of the participant's wallet. This serves as the unchangeable baseline.</p>
                           </div>
                        </div>
                        <div className="flex gap-4 items-start">
                           <div className="w-8 h-8 rounded-full bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[#848E9C] font-bold text-xs shrink-0">2</div>
                           <div>
                              <h5 className="font-bold text-white text-sm mb-1">Injection Filtering</h5>
                              <p className="text-xs text-[#848E9C]">Transaction signatures are analyzed in real-time. Any incoming SOL transfer that does not originate from a recognized DEX Swap is flagged as an "External Deposit" and deducted from the profit calculation.</p>
                           </div>
                        </div>
                     </div>
                   </div>
                </div>
             </div>
           )}

           {/* --- REWARD STRUCTURE --- */}
           {activeSection === "rewards" && (
             <div className="space-y-10">
                <ContentHeader title="Incentive Structure" subtitle="Fair Distribution Protocol" icon={<Trophy className="text-[#FCD535]" />} />
                <div className="prose prose-invert max-w-none space-y-8">
                   
                   {/* ARENA REWARDS */}
                   <div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4 flex items-center gap-2">
                         <Coins className="text-[#FCD535]" size={20} /> For Traders (Arena Participants)
                      </h3>
                      <p className="text-sm text-[#848E9C] mb-6">
                         Winners are determined strictly by the final leaderboard standings at the end of the Arena duration. The Prize Pool consists of the Creator's initial deposit plus a share of accumulated Entry Fees.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="bg-[#1E2329] p-6 rounded-3xl border border-[#FCD535]/30 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#FCD535]"></div>
                            <h4 className="text-lg font-black text-white italic mb-1">1st Place</h4>
                            <p className="text-3xl font-black text-[#FCD535] tracking-tighter">50%</p>
                            <p className="text-[9px] uppercase tracking-widest text-[#848E9C]">of Pool</p>
                         </div>
                         <div className="bg-[#1E2329] p-6 rounded-3xl border border-[#2B3139] text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
                            <h4 className="text-lg font-black text-white italic mb-1">2nd Place</h4>
                            <p className="text-3xl font-black text-white tracking-tighter">30%</p>
                            <p className="text-[9px] uppercase tracking-widest text-[#848E9C]">of Pool</p>
                         </div>
                         <div className="bg-[#1E2329] p-6 rounded-3xl border border-[#2B3139] text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#CD7F32]"></div>
                            <h4 className="text-lg font-black text-white italic mb-1">3rd Place</h4>
                            <p className="text-3xl font-black text-[#CD7F32] tracking-tighter">20%</p>
                            <p className="text-[9px] uppercase tracking-widest text-[#848E9C]">of Pool</p>
                         </div>
                      </div>
                   </div>

                   <div className="h-px bg-[#2B3139] w-full"></div>

                   {/* CREATOR REWARDS */}
                   <div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4 flex items-center gap-2">
                         <Zap className="text-[#3b82f6]" size={20} /> For Arena Creators
                      </h3>
                      <p className="text-sm text-[#848E9C] mb-6">
                         Creators act as the engines of the ecosystem. By hosting competitions, Creators can build reputation and monetize their community influence.
                      </p>

                      <ul className="space-y-4">
                         <li className="flex gap-4 p-4 bg-[#1E2329] rounded-2xl border border-[#2B3139]">
                            <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center font-bold shrink-0"><Ticket size={16}/></div>
                            <div>
                               <h5 className="text-xs font-black text-white uppercase tracking-wider mb-1">Ticket Revenue</h5>
                               <p className="text-xs text-[#848E9C]">Creators earn a majority share of the collected Entry Fees from their hosted arenas.</p>
                            </div>
                         </li>
                         <li className="flex gap-4 p-4 bg-[#1E2329] rounded-2xl border border-[#2B3139]">
                            <div className="w-8 h-8 rounded-lg bg-[#0ECB81]/10 text-[#0ECB81] flex items-center justify-center font-bold shrink-0"><ShieldCheck size={16}/></div>
                            <div>
                               <h5 className="text-xs font-black text-white uppercase tracking-wider mb-1">Reputation XP</h5>
                               <p className="text-xs text-[#848E9C]">Hosting successful arenas grants XP, unlocking platform privileges like Fee Discounts and Verified Badges.</p>
                            </div>
                         </li>
                      </ul>
                   </div>

                   <div className="h-px bg-[#2B3139] w-full"></div>

                   {/* GLOBAL ELITE REWARDS */}
                   <div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4 flex items-center gap-2">
                         <Globe className="text-[#0ECB81]" size={20} /> Global Protocol Reward
                      </h3>
                      <div className="p-6 bg-gradient-to-r from-[#0ECB81]/10 to-[#0ECB81]/5 border border-[#0ECB81]/20 rounded-3xl">
                         <p className="text-xs text-[#EAECEF] font-medium leading-relaxed">
                            To align the interests of the protocol with its best traders, a dedicated portion of the ecosystem's economic value is allocated to the <strong>Global Hall of Fame</strong>. 
                            <br/><br/>
                            Top 3 Master Traders on the global leaderboard receive quarterly SOL dividends directly from the protocol treasury. This ensures that the most skilled participants are true stakeholders in the ecosystem's success.
                         </p>
                      </div>
                   </div>

                </div>
             </div>
           )}

           {/* --- QUICK START TUTORIAL --- */}
           {activeSection === "quick-start" && (
             <div className="space-y-10">
                <ContentHeader title="Quick Start Tutorial" subtitle="From Zero to Hero in 5 Steps" icon={<Rocket className="text-[#3b82f6]" />} />
                <div className="space-y-4">
                   <GuideStep num="01" title="Connect Wallet" desc="Install Phantom Wallet. Ensure you have a small amount of SOL for transaction fees (approx. 0.05 SOL is recommended for gas)." />
                   <GuideStep num="02" title="Select Arena" desc="Navigate to the 'Arenas' page. Filter by Entry Fee and Start Time. Choose a competition that fits your risk profile." />
                   <GuideStep num="03" title="Lock-In Snapshot" desc="Click 'Join'. Approve the transaction to register your wallet. This action records your starting balance on the blockchain." />
                   <GuideStep num="04" title="Start Trading" desc="Go to your preferred DEX (Raydium, Jupiter, or Pump.fun). Trade as usual. Your goal is to increase the SOL value of your portfolio." />
                   <GuideStep num="05" title="Track & Win" desc="Monitor your real-time rank on the TradeHub Dashboard. If you finish in the Top 3, rewards will be sent to your wallet automatically." />
                </div>
                <div className="p-6 bg-[#1E2329] border border-[#2B3139] rounded-3xl text-center mt-8">
                   <p className="text-[10px] font-black text-[#474D57] uppercase tracking-widest mb-2">Pro Tip</p>
                   <p className="text-xs text-[#848E9C] italic">Using a dedicated "Burner Wallet" for each competition is highly recommended to isolate trading performance and simplify audit trails.</p>
                </div>
             </div>
           )}

           {/* --- RISK DISCLOSURE (CRITICAL) --- */}
           {activeSection === "risk-disclosure" && (
             <div className="space-y-10">
                <ContentHeader title="Risk Disclosure" subtitle="Legal & Financial Disclaimer" icon={<ShieldAlert className="text-[#F6465D]" />} />
                
                <div className="bg-[#F6465D]/5 border border-[#F6465D]/20 p-8 rounded-[2.5rem] space-y-6">
                   <div className="flex items-center gap-3 text-[#F6465D] mb-4">
                      <AlertTriangle size={32} />
                      <h3 className="text-lg font-black uppercase tracking-widest">Mandatory Warning</h3>
                   </div>
                   
                   <p className="text-sm text-[#EAECEF] leading-relaxed font-medium">
                      <strong>Not for Beginners:</strong> Competitive trading induces significant psychological pressure which may lead to irrational decision-making. The volatility of cryptocurrency markets can result in the rapid loss of your entire capital.
                   </p>

                   <div className="space-y-4 pt-4 border-t border-[#F6465D]/20">
                      <div className="flex gap-4">
                         <CheckCircle2 size={20} className="text-[#F6465D] shrink-0" />
                         <p className="text-xs text-[#848E9C] leading-relaxed">
                            <strong>Platform Neutrality:</strong> TradeHub is a technological infrastructure provider. We do not offer financial advice, signals, or custody of trading funds. We are not responsible for market losses.
                         </p>
                      </div>
                      <div className="flex gap-4">
                         <CheckCircle2 size={20} className="text-[#F6465D] shrink-0" />
                         <p className="text-xs text-[#848E9C] leading-relaxed">
                            <strong>Transparency & Immutability:</strong> All transactions and rankings are derived from the public blockchain. Once recorded, results are final. The platform owner cannot reverse transactions or alter historical data.
                         </p>
                      </div>
                      <div className="flex gap-4">
                         <CheckCircle2 size={20} className="text-[#F6465D] shrink-0" />
                         <p className="text-xs text-[#848E9C] leading-relaxed">
                            <strong>Smart Contract Risk:</strong> By participating, you acknowledge the inherent risks associated with DeFi protocols, including but not limited to network congestion and RPC latency.
                         </p>
                      </div>
                   </div>
                </div>

                {/* --- RULES & POLICIES (LINKED) --- */}
                <div className="bg-gradient-to-r from-[#1E2329] to-[#15181D] p-8 rounded-3xl border border-[#FCD535]/20 relative overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300 hover:border-[#FCD535]/40 transition-all">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-[#FCD535]/10 rounded-xl text-[#FCD535]">
                            <Gavel size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Legal & Policies</h2>
                    </div>
                    
                    <p className="text-[#848E9C] mb-8 leading-relaxed">
                        To maintain a fair and secure ecosystem, all users must adhere to our rules and privacy policies. Violations may result in disqualification.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Link href="/terms" className="group p-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] hover:border-[#FCD535]/50 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Scale size={20} className="text-[#848E9C] group-hover:text-[#FCD535]" />
                                <div>
                                    <span className="block text-white font-bold text-sm">Terms of Service</span>
                                    <span className="text-[10px] text-[#848E9C]">Usage rules & disclaimer</span>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-[#474D57] group-hover:text-[#FCD535] group-hover:translate-x-1 transition-all" />
                        </Link>

                        <Link href="/privacy" className="group p-4 bg-[#0B0E11] rounded-2xl border border-[#2B3139] hover:border-[#FCD535]/50 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Shield size={20} className="text-[#848E9C] group-hover:text-[#FCD535]" />
                                <div>
                                    <span className="block text-white font-bold text-sm">Privacy Policy</span>
                                    <span className="text-[10px] text-[#848E9C]">Data & transparency</span>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-[#474D57] group-hover:text-[#FCD535] group-hover:translate-x-1 transition-all" />
                        </Link>
                    </div>
                </div>
             </div>
           )}

           {/* --- PARTNERS --- */}
           {activeSection === "partners" && (
             <div className="space-y-10">
                <ContentHeader title="Strategic Partners" subtitle="Ecosystem Collaborators" icon={<Globe className="text-[#3b82f6]" />} />
                <div className="grid grid-cols-1 gap-6">
                   <ProjectCard 
                      icon={<img src="/Crypto-Directory-Indonesia.png" alt="Crypto Directory Indonesia" className="w-20 h-20 object-contain" />}
                      title="Crypto Directory Indonesia"
                      url="https://cryptodirectoryindonesia.io"
                      desc="The leading educational hub and community directory for cryptocurrency enthusiasts in Indonesia."
                   />
                   <ProjectCard 
                      icon={<img src="/Chat-Global.png" alt="Chat Global" className="w-20 h-20 object-contain" />}
                      title="Chat Global"
                      url="https://chatglobal.cryptodirectoryindonesia.io"
                      desc="Decentralized forum for global discussions, market updates, and networking."
                   />
                   <ProjectCard 
                      icon={<img src="/Jurnal-Trading.png" alt="Jurnal Trading" className="w-30 h-30 object-contain" />}
                      title="Jurnal Trading"
                      url="https://jurnaltrading.cryptodirectoryindonesia.io"
                      desc="Professional trading journal tools for performance tracking and analysis."
                   />
                   <ProjectCard 
                      icon={<img src="/Cyber-Web-Scanner.png" alt="Cyber Web Scanner" className="w-30 h-30 object-contain" />}
                      title="Cyber Web Scanner"
                      url="https://cyberwebscanner.onrender.com"
                      desc="Advanced web scanning utilities for security and vulnerability assessment."
                   />
                   <ProjectCard 
                      icon={<img src="/Djarum-Slayer.png" alt="Djarum Slayer" className="w-30 h-30 object-contain" />}
                      title="Djarum Slayer"
                      url="https://febriosht.github.io/Djarum-Slayer/"
                      desc="The personal portfolio and innovative works of Djarum Slayer."
                   />
                </div>
             </div>
           )}

           {/* --- COMMUNITY --- */}
           {activeSection === "community" && (
             <div className="space-y-10">
                <ContentHeader title="Join the Community" subtitle="Global Network Access" icon={<MessageCircle className="text-[#FCD535]" />} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <SocialCard 
                      icon={<Send size={32} />}
                      name="Telegram"
                      desc="Official announcements and trader discussions."
                      link="https://t.me/tradehub_proofofachievement"
                      color="bg-blue-500"
                   />
                   <SocialCard 
                      icon={<img src="/Discord.png" alt="Discord" className="w-10 h-10 object-contain" />}
                      name="Discord"
                      desc="Community hub, voice chats, and support tickets."
                      link="https://discord.gg/zKjFNZdM"
                      color="bg-[#5865F2]"
                   />
                   <SocialCard 
                      icon={<img src="/X.png" alt="X" className="w-8 h-8 object-contain" />}
                      name="X (Twitter)"
                      desc="Real-time news and educational threads."
                      link="https://twitter.com/TradeHub_SOL"
                      color="bg-black"
                   />
                   <SocialCard 
                      icon={<img src="/Chat-Global.png" alt="Chat Global" className="w-15 h-15 object-contain" />}
                      name="Chat Global"
                      desc="Integrated Web3 chat platform."
                      link="https://chatglobal.cryptodirectoryindonesia.io"
                      color="bg-[#041a2f]"
                   />
                </div>
             </div>
           )}

        </article>
      </main>

      <footer className="py-32 text-center opacity-10 border-t border-[#2B3139]/30 flex flex-col items-center gap-4">
         <p className="text-[10px] font-black uppercase tracking-[1.5em] italic">TradeHub • The Trust Layer of Solana Ecosystem</p>
      </footer>
    </div>
  );
}