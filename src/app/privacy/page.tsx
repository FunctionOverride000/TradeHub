import React from 'react';
import { ArrowLeft, Shield, FileText, Lock, Eye, Share2, Database, UserCheck, Cookie, Mail } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] py-20 px-6 font-sans overflow-x-hidden selection:bg-[#FCD535]/30">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-16 text-center animate-in fade-in slide-in-from-top-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E2329]/50 text-[#FCD535] rounded-full font-black text-[10px] uppercase tracking-[0.25em] mb-6 border border-[#2B3139] hover:bg-[#FCD535]/5 transition-colors cursor-default select-none backdrop-blur-sm shadow-[0_0_15px_rgba(252,213,53,0.1)]">
            <Shield size={14} className="mr-1" /> Privacy & Data
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight drop-shadow-2xl">
            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD535] via-[#FFF5B8] to-[#F0B90B] animate-pulse">Policy</span>
          </h1>
          <p className="text-[#848E9C] text-sm md:text-base font-medium max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="space-y-12">

          {/* Overview Card */}
          <div className="bg-gradient-to-br from-[#1E2329] to-[#15181D] p-8 rounded-3xl border border-[#2B3139] shadow-2xl relative overflow-hidden group hover:border-[#FCD535]/30 transition-all duration-500 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-700">
              <Shield size={120} />
            </div>
            <h2 className="text-2xl font-bold text-[#FCD535] mb-4 relative z-10 flex items-center gap-3">
              <Shield className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} /> Overview
            </h2>
            <p className="text-[#848E9C] leading-relaxed relative z-10 text-lg group-hover:text-[#EAECEF] transition-colors duration-300">
              TradeHub ("we", "platform") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights. By using TradeHub, you agree to this policy. We prioritize transparency and security in every interaction.
            </p>
          </div>

          {/* Section 1: Data We Collect */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#FCD535] text-sm font-black shadow-lg shadow-[#FCD535]/10">01</span>
              Data We Collect
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <DataCard 
                icon={<UserCheck size={24} />}
                title="Account Data"
                items={[
                  "Email address (authentication)",
                  "Wallet address (public)",
                  "Telegram handle (optional)"
                ]}
                delay="delay-300"
              />
              <DataCard 
                icon={<FileText size={24} />}
                title="Activity Data"
                items={[
                  "Arenas created/joined",
                  "Transaction signatures",
                  "ROI performance data",
                  "XP & Level progression"
                ]}
                delay="delay-400"
              />
              <DataCard 
                icon={<Database size={24} />}
                title="Technical Data"
                items={[
                  "IP address (security)",
                  "Browser type & version",
                  "Device information",
                  "Usage & error logs"
                ]}
                delay="delay-500"
              />
            </div>
          </section>

          {/* Section 2: How We Use Data */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#FCD535] text-sm font-black shadow-lg shadow-[#FCD535]/10">02</span>
              How We Use Your Data
            </h2>
            <div className="bg-[#1E2329] p-8 rounded-3xl border border-[#2B3139] hover:border-[#FCD535]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#FCD535]/5">
              <ul className="grid md:grid-cols-2 gap-4 text-[#848E9C]">
                <ListItem text="Provide and operate the platform infrastructure" />
                <ListItem text="Process arena creation and reward distribution" />
                <ListItem text="Calculate and display real-time ROI leaderboards" />
                <ListItem text="Prevent fraud, abuse, and unauthorized access" />
                <ListItem text="Send important platform notifications and updates" />
                <ListItem text="Improve platform features, UI, and performance" />
              </ul>
            </div>
          </section>

          {/* Section 3: Blockchain Data - Highlighted */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
            <div className="bg-gradient-to-r from-[#FCD535]/10 to-transparent p-8 rounded-3xl border border-[#FCD535]/20 flex flex-col md:flex-row gap-6 items-start hover:scale-[1.01] transition-transform duration-300">
              <div className="p-3 bg-[#FCD535]/20 rounded-xl text-[#FCD535] animate-pulse">
                <Eye size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#FCD535] mb-2">3. Public Blockchain Data</h2>
                <p className="text-[#EAECEF] leading-relaxed">
                  <strong className="text-white">Important:</strong> Your wallet address and all on-chain transactions are <strong className="text-[#FCD535]">publicly visible</strong> on the Solana blockchain. We cannot make this data private. By connecting your wallet, you acknowledge that your trading activity is publicly accessible and immutable.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Data Sharing */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#FCD535] text-sm font-black shadow-lg shadow-[#FCD535]/10">04</span>
              Data Sharing
            </h2>
            <p className="text-[#848E9C] mb-6 pl-11">We do NOT sell your personal data. We share data only with trusted partners essential for operation:</p>
            <div className="grid md:grid-cols-2 gap-4 pl-11">
              <PartnerItem name="Supabase" desc="Database hosting (EU/US servers)" />
              <PartnerItem name="Alchemy/Helius" desc="Solana RPC providers" />
              <PartnerItem name="Vercel" desc="Hosting infrastructure" />
              <PartnerItem name="Law Enforcement" desc="Only if legally required" />
            </div>
          </section>

          {/* Section 5 & 6: Rights & Security */}
          <div className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500">
            <section className="bg-[#1E2329] p-8 rounded-3xl border border-[#2B3139] hover:border-[#FCD535]/20 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="text-[#FCD535]" size={24} />
                <h2 className="text-xl font-bold text-white">Security & Retention</h2>
              </div>
              <ul className="space-y-3 text-[#848E9C] text-sm">
                <li className="flex items-start gap-2"><span className="text-[#FCD535] mt-1">•</span> Account data retained while active.</li>
                <li className="flex items-start gap-2"><span className="text-[#FCD535] mt-1">•</span> Transaction logs retained indefinitely for audit.</li>
                <li className="flex items-start gap-2"><span className="text-[#FCD535] mt-1">•</span> Industry-standard encryption (HTTPS).</li>
                <li className="flex items-start gap-2"><span className="text-[#FCD535] mt-1">•</span> Regular security audits and reviews.</li>
              </ul>
            </section>

            <section className="bg-[#1E2329] p-8 rounded-3xl border border-[#2B3139] hover:border-[#FCD535]/20 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-6">
                <UserCheck className="text-[#FCD535]" size={24} />
                <h2 className="text-xl font-bold text-white">Your Rights</h2>
              </div>
              <ul className="space-y-3 text-[#848E9C] text-sm">
                <li className="flex items-start gap-2"><span className="text-[#FCD535] mt-1">•</span> <strong>Access & Correction:</strong> Request copy or fix data.</li>
                <li className="flex items-start gap-2"><span className="text-[#FCD535] mt-1">•</span> <strong>Deletion:</strong> Request account removal.</li>
                <li className="flex items-start gap-2"><span className="text-[#FCD535] mt-1">•</span> <strong>Portability:</strong> Export your data.</li>
              </ul>
              <div className="mt-6 pt-6 border-t border-[#2B3139]">
                <p className="text-xs text-[#848E9C]">Contact us via <a href="https://t.me/tradehub_proofofachievement" className="text-[#FCD535] hover:underline">Telegram</a> to exercise rights.</p>
              </div>
            </section>
          </div>

          {/* Section 7 & 8: Cookies & Contact */}
          <section className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500">
             <div className="p-6 rounded-2xl bg-[#1E2329]/50 border border-[#2B3139] hover:bg-[#1E2329] transition-all duration-300">
                <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <Cookie size={20} className="text-[#FCD535]" /> Cookies
                </h2>
                <p className="text-[#848E9C] text-sm leading-relaxed">
                  We use essential cookies only for authentication (session management). We do not use tracking or advertising cookies.
                </p>
             </div>
             <div className="p-6 rounded-2xl bg-[#1E2329]/50 border border-[#2B3139] hover:bg-[#1E2329] transition-all duration-300">
                <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <Mail size={20} className="text-[#FCD535]" /> Contact Us
                </h2>
                <p className="text-[#848E9C] text-sm leading-relaxed">
                  Privacy questions? Reach out via <a href="https://t.me/tradehub_proofofachievement" className="text-[#FCD535] underline hover:text-[#F0B90B]">Telegram</a> or <a href="https://discord.gg/zKjFNZdM" className="text-[#FCD535] underline hover:text-[#F0B90B]">Discord</a>.
                </p>
             </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="mt-20 flex flex-col sm:flex-row justify-center gap-4 border-t border-[#2B3139] pt-12 animate-in fade-in duration-1000 delay-500">
          <Link href="/" className="px-8 py-4 bg-[#FCD535] text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-[#F0B90B] transition-all shadow-xl shadow-[#FCD535]/20 hover:shadow-[#FCD535]/40 active:scale-95 flex items-center justify-center gap-2 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
          </Link>
          <Link href="/terms" className="px-8 py-4 bg-[#1E2329] border border-[#2B3139] text-[#848E9C] font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-[#2B3139] hover:text-white hover:border-[#FCD535]/30 transition-all flex items-center justify-center gap-2 group">
            Terms of Service <FileText size={16} className="group-hover:text-[#FCD535] transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  );
}

// Helper Components
function DataCard({ icon, title, items, delay = "" }: { icon: any, title: string, items: string[], delay?: string }) {
  return (
    <div className={`bg-[#1E2329] p-6 rounded-2xl border border-[#2B3139] hover:border-[#FCD535]/30 hover:bg-[#23272e] transition-all duration-300 h-full hover:-translate-y-2 hover:shadow-lg hover:shadow-[#FCD535]/5 group ${delay}`}>
      <div className="text-[#FCD535] mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="font-bold text-white mb-4 group-hover:text-[#FCD535] transition-colors">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-[#848E9C] flex items-start gap-2 group-hover:text-[#EAECEF] transition-colors">
            <span className="block w-1 h-1 rounded-full bg-[#474D57] mt-1.5 flex-shrink-0 group-hover:bg-[#FCD535] transition-colors"></span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 group">
      <div className="w-1.5 h-1.5 rounded-full bg-[#FCD535] mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(252,213,53,0.5)] group-hover:scale-150 transition-transform"></div>
      <span className="group-hover:text-white transition-colors">{text}</span>
    </li>
  );
}

function PartnerItem({ name, desc }: { name: string, desc: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#181A20] rounded-xl border border-[#2B3139] hover:border-[#FCD535]/30 transition-all duration-300 cursor-default hover:translate-x-2">
      <Share2 size={16} className="text-[#474D57] group-hover:text-[#FCD535]" />
      <div>
        <div className="text-white font-bold text-sm">{name}</div>
        <div className="text-[#848E9C] text-xs">{desc}</div>
      </div>
    </div>
  );
}