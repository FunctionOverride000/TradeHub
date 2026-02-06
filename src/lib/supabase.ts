import { createBrowserClient } from '@supabase/ssr'

/*
 * Fungsi ini membuat client Supabase khusus untuk berjalan di Browser.
 * Menggunakan @supabase/ssr agar session (cookies) otomatis tersinkronisasi
 * antara Client (Browser) dan Server (Middleware/Next.js), mencegah logout sendiri.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}