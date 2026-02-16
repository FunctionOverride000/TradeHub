import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { PoweredBy } from '@/components/landing/PoweredBy';
import { MechanismSection } from '@/components/landing/MechanismSection';
import { ArenaList } from '@/components/landing/ArenaList';
import { Footer } from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0E11] font-sans text-[#EAECEF] selection:bg-[#FCD535]/30 relative overflow-x-hidden scroll-smooth">
      
      {/* CSS Global untuk halaman ini */}
      <style dangerouslySetInnerHTML={{ __html: `
        html { scroll-behavior: smooth !important; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0B0E11; }
        ::-webkit-scrollbar-thumb { background: #2B3139; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #FCD535; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-10px) rotate(45deg); }
        }
        .animate-chain-float { animation: float 4s ease-in-out infinite; }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        .animate-pulse-glow { animation: pulse-glow 6s ease-in-out infinite; }
      `}} />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <Navbar />

      <HeroSection />

      <StatsSection />

      <PoweredBy />

      <MechanismSection />

      <ArenaList />

      <Footer />
    </div>
  );
}