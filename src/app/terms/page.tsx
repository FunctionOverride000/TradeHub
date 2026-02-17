import React from 'react';
import { ArrowLeft, AlertTriangle, ShieldAlert, FileText, CheckCircle, Globe, Scale, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] py-20 px-6 font-sans overflow-x-hidden selection:bg-[#FCD535]/30">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-16 text-center animate-in fade-in slide-in-from-top-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E2329]/50 text-[#FCD535] rounded-full font-black text-[10px] uppercase tracking-[0.25em] mb-6 border border-[#2B3139] hover:bg-[#FCD535]/5 transition-colors cursor-default select-none backdrop-blur-sm shadow-[0_0_15px_rgba(252,213,53,0.1)]">
            <FileText size={14} className="mr-1" /> Legal Agreements
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight drop-shadow-2xl">
            Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD535] via-[#FFF5B8] to-[#F0B90B] animate-pulse">Service</span>
          </h1>
          <p className="text-[#848E9C] text-sm md:text-base font-medium max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="space-y-12">

          {/* Beta Warning Card - Special Highlight */}
          <div className="bg-gradient-to-br from-[#291E1E] to-[#1D1515] p-8 rounded-3xl border border-red-500/30 shadow-2xl relative overflow-hidden group hover:border-red-500/50 transition-all duration-500 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-700">
              <AlertTriangle size={120} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-500 mb-4 relative z-10 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 animate-pulse" /> BETA SOFTWARE WARNING
            </h2>
            <p className="text-[#EAECEF] leading-relaxed relative z-10 text-lg">
              TradeHub is in <strong>BETA testing phase</strong>. By using this platform, you acknowledge and accept all risks associated with beta software, including but not limited to bugs, errors, and potential loss of funds. Proceed with caution.
            </p>
          </div>

          {/* Section 1: Platform Description */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#FCD535] text-sm font-black shadow-lg shadow-[#FCD535]/10">01</span>
              Platform Description
            </h2>
            <div className="bg-[#1E2329] p-8 rounded-3xl border border-[#2B3139] hover:border-[#FCD535]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#FCD535]/5">
              <p className="text-[#848E9C] mb-6 text-lg">
                TradeHub is a decentralized trading competition platform where users compete based on on-chain ROI performance. Key features include:
              </p>
              <ul className="grid md:grid-cols-2 gap-4 text-[#848E9C]">
                <ListItem text="Temporarily holds reward deposits for automatic distribution" />
                <ListItem text="Tracks ROI via verifiable Solana blockchain data" />
                <ListItem text="Distributes rewards to top performers automatically" />
                <ListItem text="Charges transparent platform fees for arena creation" />
              </ul>
            </div>
          </section>

          {/* Section 2: Beta Limitations */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#FCD535] text-sm font-black shadow-lg shadow-[#FCD535]/10">02</span>
              Beta Limitations
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <LimitCard title="Max Reward" value="2 SOL" sub="Per Arena" />
              <LimitCard title="Max Arenas" value="10" sub="Concurrent" />
              <LimitCard title="Platform TVL" value="30 SOL" sub="Maximum Cap" />
              <LimitCard title="Duration" value="1-30 Days" sub="Arena Length" />
            </div>
            <p className="text-xs text-[#848E9C] mt-4 pl-2 italic">* These limits may change as the platform matures. We reserve the right to adjust limits with notice.</p>
          </section>

          {/* Section 3: Disclaimers & Responsibilities */}
          <div className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-400">
            <section className="bg-[#1E2329] p-8 rounded-3xl border border-[#2B3139] hover:border-[#FCD535]/20 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="text-[#FCD535]" size={24} />
                <h2 className="text-xl font-bold text-white">No Guarantees</h2>
              </div>
              <p className="text-sm text-[#848E9C] mb-4">Provided "AS IS" without warranties. We are NOT responsible for:</p>
              <ul className="space-y-3 text-[#848E9C] text-sm">
                <BulletItem text="Lost funds due to technical errors/bugs" />
                <BulletItem text="Blockchain network issues or delays" />
                <BulletItem text="Smart contract vulnerabilities" />
                <BulletItem text="Wallet compromises or breaches" />
              </ul>
            </section>

            <section className="bg-[#1E2329] p-8 rounded-3xl border border-[#2B3139] hover:border-[#FCD535]/20 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="text-[#FCD535]" size={24} />
                <h2 className="text-xl font-bold text-white">User Duties</h2>
              </div>
              <p className="text-sm text-[#848E9C] mb-4">You agree that YOU are responsible for:</p>
              <ul className="space-y-3 text-[#848E9C] text-sm">
                <BulletItem text="Securing your wallet & private keys" />
                <BulletItem text="Verifying all transactions before signing" />
                <BulletItem text="Understanding crypto trading risks" />
                <BulletItem text="Compliance with local laws & taxes" />
              </ul>
            </section>
          </div>

          {/* Section 4: Prohibited Jurisdictions */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500">
            <div className="bg-gradient-to-r from-[#FCD535]/10 to-transparent p-8 rounded-3xl border border-[#FCD535]/20 flex flex-col md:flex-row gap-6 items-start hover:scale-[1.01] transition-transform duration-300">
              <div className="p-3 bg-[#FCD535]/20 rounded-xl text-[#FCD535] animate-pulse">
                <Globe size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#FCD535] mb-2">Prohibited Jurisdictions</h2>
                <p className="text-[#EAECEF] leading-relaxed mb-4">
                  The Platform is <strong className="text-white">NOT available</strong> to residents or citizens of the United States, United Kingdom, countries under international sanctions, or any jurisdiction where use would be illegal.
                </p>
                <p className="text-xs text-[#848E9C] uppercase tracking-wider font-bold">
                  By using the platform, you represent that you are NOT in a prohibited jurisdiction.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Legal Details */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-600">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#FCD535] text-sm font-black shadow-lg shadow-[#FCD535]/10">03</span>
              Legal Provisions
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <DetailCard 
                icon={<AlertCircle size={24} />}
                title="Liability Cap"
                desc="MAXIMUM LIABILITY IS LIMITED TO PLATFORM FEES PAID. We exclude indirect, incidental, or consequential damages."
              />
              <DetailCard 
                icon={<Scale size={24} />}
                title="Dispute Resolution"
                desc="Disputes resolved via good faith negotiation first. If unresolved, parties agree to binding arbitration. Class actions waived."
              />
              <DetailCard 
                icon={<RefreshCw size={24} />}
                title="Modifications"
                desc="We reserve the right to modify terms at any time. Continued use constitutes acceptance. Service may be suspended with notice."
              />
            </div>
          </section>

          {/* Section 6: Contact & Agreement */}
          <section className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-700">
             <div className="p-6 rounded-2xl bg-[#1E2329]/50 border border-[#2B3139] hover:bg-[#1E2329] transition-all duration-300">
                <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#FCD535]" /> Contact Support
                </h2>
                <p className="text-[#848E9C] text-sm leading-relaxed">
                  Questions about terms? Reach out via <a href="https://t.me/tradehub_proofofachievement" className="text-[#FCD535] underline hover:text-[#F0B90B]">Telegram</a> or <a href="https://discord.gg/zKjFNZdM" className="text-[#FCD535] underline hover:text-[#F0B90B]">Discord</a>.
                </p>
             </div>
             <div className="p-6 rounded-2xl bg-[#1E2329]/50 border border-[#2B3139] hover:bg-[#1E2329] transition-all duration-300">
                <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <CheckCircle size={20} className="text-[#FCD535]" /> Agreement
                </h2>
                <p className="text-[#848E9C] text-sm leading-relaxed">
                  By clicking "Create Arena" or using TradeHub services, you acknowledge that you have read, understood, and agree to be bound by these Terms.
                </p>
             </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="mt-20 flex flex-col sm:flex-row justify-center gap-4 border-t border-[#2B3139] pt-12 animate-in fade-in duration-1000 delay-700">
          <Link href="/" className="px-8 py-4 bg-[#FCD535] text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-[#F0B90B] transition-all shadow-xl shadow-[#FCD535]/20 hover:shadow-[#FCD535]/40 active:scale-95 flex items-center justify-center gap-2 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}

// Helper Components

function ListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 group">
      <div className="w-1.5 h-1.5 rounded-full bg-[#FCD535] mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(252,213,53,0.5)] group-hover:scale-150 transition-transform"></div>
      <span className="group-hover:text-white transition-colors">{text}</span>
    </li>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 group-hover:text-[#EAECEF] transition-colors">
      <span className="block w-1 h-1 rounded-full bg-[#474D57] mt-1.5 flex-shrink-0 group-hover:bg-[#FCD535] transition-colors"></span>
      {text}
    </li>
  );
}

function LimitCard({ title, value, sub }: { title: string, value: string, sub: string }) {
  return (
    <div className="bg-[#1E2329] p-5 rounded-2xl border border-[#2B3139] hover:border-[#FCD535]/30 transition-all duration-300 text-center hover:-translate-y-2 group">
      <p className="text-xs text-[#848E9C] uppercase tracking-wider mb-2 font-bold">{title}</p>
      <p className="text-xl font-black text-white mb-1 group-hover:text-[#FCD535] transition-colors">{value}</p>
      <p className="text-[10px] text-[#474D57]">{sub}</p>
    </div>
  );
}

function DetailCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="bg-[#1E2329] p-6 rounded-2xl border border-[#2B3139] hover:border-[#FCD535]/30 hover:bg-[#23272e] transition-all duration-300 h-full hover:-translate-y-2 group">
      <div className="text-[#FCD535] mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="font-bold text-white mb-3 group-hover:text-[#FCD535] transition-colors">{title}</h3>
      <p className="text-sm text-[#848E9C] leading-relaxed group-hover:text-[#EAECEF] transition-colors">{desc}</p>
    </div>
  );
}