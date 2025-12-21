import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
 
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center text-center p-4">
      <div className="w-20 h-20 bg-[#2B3139] rounded-full flex items-center justify-center mb-6 border border-[#FCD535]/50 shadow-[0_0_30px_-10px_rgba(252,213,53,0.3)]">
        <AlertTriangle className="w-10 h-10 text-[#FCD535]" />
      </div>
      <h2 className="text-3xl font-black text-white mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-[#848E9C] mb-8">Sepertinya Anda tersesat di blockchain.</p>
      <Link href="/" className="px-8 py-3 bg-[#FCD535] text-black font-bold rounded-xl hover:bg-[#F0B90B] transition">
        Kembali ke Markas
      </Link>
    </div>
  )
}