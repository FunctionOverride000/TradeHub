'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Home, WifiOff } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0B0E11] px-4 text-center font-sans overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCD535] rounded-full blur-[200px] opacity-[0.03] animate-pulse"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full space-y-8 animate-in fade-in zoom-in duration-700">
        
        {/* Animated Icon Container */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-32 h-32 bg-[#1E2329] border border-[#2B3139] rounded-[2rem] flex items-center justify-center shadow-2xl">
                <AlertTriangle className="w-16 h-16 text-red-500 animate-bounce" />
            </div>
            {/* Decorative Glitch Elements */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#FCD535] rounded-full opacity-50 animate-ping"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-red-500 rounded-full opacity-50 animate-ping delay-300"></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase italic">
            System <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Malfunction</span>
          </h2>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#2B3139] to-transparent mx-auto"></div>
          <p className="text-[#848E9C] text-sm lg:text-base leading-relaxed max-w-md mx-auto">
            We encountered an unexpected anomaly while processing your request. This could be a temporary network glitch or a server-side interruption.
          </p>
          {error.digest && (
             <p className="text-[10px] font-mono text-[#474D57] bg-[#1E2329]/50 py-1 px-3 rounded-full inline-block border border-[#2B3139]">
                Error Code: {error.digest}
             </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => reset()}
            className="group relative px-8 py-4 bg-[#FCD535] text-black font-black uppercase tracking-widest text-xs rounded-xl overflow-hidden hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-[#FCD535]/10"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative flex items-center justify-center gap-2">
               <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> 
               Try Again
            </span>
          </button>
          
          <Link
            href="/"
            className="group px-8 py-4 bg-[#1E2329] border border-[#2B3139] text-[#848E9C] font-black uppercase tracking-widest text-xs rounded-xl hover:text-white hover:border-[#FCD535]/30 hover:bg-[#232830] transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} className="group-hover:-translate-y-0.5 transition-transform" />
            Back Home
          </Link>
        </div>

      </div>
      
      {/* Footer Decoration */}
      <div className="absolute bottom-10 text-[10px] font-black uppercase tracking-[0.3em] text-[#2B3139] animate-pulse">
         Protocol Error Handler v1.0
      </div>

    </div>
  );
}