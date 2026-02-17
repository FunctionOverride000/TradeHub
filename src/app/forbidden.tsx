import Link from 'next/link'
import { ShieldAlert, Lock, Home } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden font-sans selection:bg-[#F6465D]/30">
      
      {/* Background Ambience - Red Tint for Danger */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F6465D] rounded-full blur-[150px] opacity-[0.03] animate-pulse"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-700">
        
        {/* Animated Icon Container */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-[#F6465D]/20 rounded-full blur-xl group-hover:bg-[#F6465D]/30 transition-all duration-500 animate-pulse"></div>
            <div className="relative w-32 h-32 bg-[#1E2329] border border-[#2B3139] rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:border-[#F6465D]/50 transition-colors">
                <Lock className="w-14 h-14 text-[#F6465D] animate-pulse" />
            </div>
            {/* Decorative Warning */}
            <div className="absolute -right-4 -bottom-2 bg-[#F6465D] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md rotate-12 shadow-lg border border-[#0B0E11]">
              Restricted
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase italic">
            Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F6465D] to-red-600">Denied</span>
          </h2>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#2B3139] to-transparent mx-auto"></div>
          <p className="text-[#848E9C] text-sm lg:text-base leading-relaxed">
            Protokol keamanan mendeteksi upaya akses tanpa izin. Anda tidak memiliki kredensial yang valid untuk memasuki area ini.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/"
            className="group relative px-8 py-4 bg-[#1E2329] border border-[#2B3139] text-[#848E9C] font-black uppercase tracking-widest text-xs rounded-xl overflow-hidden hover:bg-[#232830] hover:text-white hover:border-[#F6465D]/30 transition-all active:scale-95 shadow-xl"
          >
            <span className="relative flex items-center justify-center gap-2">
               <Home size={16} className="group-hover:-translate-y-0.5 transition-transform" /> 
               Kembali Aman
            </span>
          </Link>
        </div>

      </div>
      
      {/* Footer Decoration */}
      <div className="absolute bottom-10 text-[10px] font-black uppercase tracking-[0.3em] text-[#2B3139] animate-pulse">
         Security Protocol // 403
      </div>

    </div>
  )
}