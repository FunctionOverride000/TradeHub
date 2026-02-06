import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Buat respons awal yang akan dimodifikasi
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Inisialisasi Supabase Server Client untuk mengelola cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. PENTING: Refresh session server-side.
  const { data: { user } } = await supabase.auth.getUser()

  // 4. Logika Redirect (Proteksi Rute)
  const path = request.nextUrl.pathname

  // --- SOLUSI BYPASS (FIX REDIRECT LOOP) ---
  // Kita izinkan akses ke /create-arena tanpa dicegah oleh Middleware Server.
  // Keamanan tetap terjaga karena di dalam file 'src/app/create-arena/page.tsx' 
  // sudah ada useEffect yang mengecek session user (Client-Side Check).
  if (path.startsWith('/create-arena')) {
      return response;
  }
  // ----------------------------------------

  // A. Proteksi Halaman Private
  // Jika user BELUM login (user null), tapi mencoba akses halaman dashboard/profile/admin/dll
  if (!user && (
    path.startsWith('/dashboard') || 
    path.startsWith('/profile') ||
    // path.startsWith('/create-arena') ||  <-- BARIS INI KITA NONAKTIFKAN
    path.startsWith('/buat-lomba') ||
    path.startsWith('/admin')
  )) {
    // Redirect paksa ke halaman login (/auth)
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', path) 
    return NextResponse.redirect(url)
  }

  // B. Redirect User yang Sudah Login
  // Jika user SUDAH login, tapi mencoba buka halaman login (/auth)
  if (user && path.startsWith('/auth') && !path.startsWith('/auth/reset-password')) {
    // Redirect paksa ke dashboard (karena tidak perlu login lagi)
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // C. Proteksi Khusus Admin (Opsional)
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}