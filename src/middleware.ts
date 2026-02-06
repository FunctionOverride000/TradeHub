import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ==========================================================================
  // 1. BYPASS MUTLAK (Early Exit Strategy)
  // ==========================================================================
  // Cek ini DULUAN sebelum inisialisasi Supabase atau logic lain.
  // Ini menjamin tidak ada error server/auth yang menghalangi akses ke halaman ini.
  // Jika user mau ke /create-arena, biarkan lewat. Autentikasi akan dicek di client-side (page.tsx).
  if (path.startsWith('/create-arena')) {
    return NextResponse.next()
  }

  // 2. Buat respons awal yang akan dimodifikasi
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 3. Inisialisasi Supabase Server Client untuk mengelola cookies
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

  // 4. PENTING: Refresh session server-side.
  // Ini mengecek ke Auth Supabase apakah token di cookie masih valid.
  const { data: { user } } = await supabase.auth.getUser()

  // 5. Proteksi Halaman Private
  // Jika user BELUM login (user null), tapi mencoba akses halaman dashboard/profile/admin/dll
  if (!user && (
    path.startsWith('/dashboard') || 
    path.startsWith('/profile') ||
    path.startsWith('/buat-lomba') ||
    path.startsWith('/admin')
    // Catatan: /create-arena TIDAK dimasukkan di sini karena sudah di-bypass total di langkah no 1
  )) {
    // Redirect paksa ke halaman login (/auth)
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', path) 
    return NextResponse.redirect(url)
  }

  // 6. Redirect User yang Sudah Login
  // Jika user SUDAH login, tapi mencoba buka halaman login (/auth)
  if (user && path.startsWith('/auth') && !path.startsWith('/auth/reset-password')) {
    // Redirect paksa ke dashboard (karena tidak perlu login lagi)
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 7. Proteksi Khusus Admin (Opsional)
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Matcher ini menentukan rute mana saja yang akan dicek oleh Middleware.
     * Kita mengecualikan file statis (_next/static, _next/image, favicon, public files)
     * agar performa aplikasi tetap cepat dan tidak membebani server.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}