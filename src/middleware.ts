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
  // Menggunakan createServerClient memastikan kita bisa membaca DAN menulis cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Method untuk mengambil cookie dari request browser
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // Method untuk menulis cookie baru (login/refresh session)
        set(name: string, value: string, options: CookieOptions) {
          // Set cookie di request object (agar tersedia untuk pemrosesan saat ini)
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // Buat ulang response object untuk memastikan cookie terkirim balik ke browser
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Set cookie di response object final
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        // Method untuk menghapus cookie (logout)
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 3. PENTING: Refresh session server-side.
  // Ini mengecek ke Auth Supabase apakah token di cookie masih valid.
  // Jika token expired tapi masih ada refresh token valid, cookie akan diperbarui otomatis di sini.
  const { data: { user } } = await supabase.auth.getUser()

  // 4. Logika Redirect (Proteksi Rute)
  const path = request.nextUrl.pathname

  // A. Proteksi Halaman Private
  // Jika user BELUM login (user null), tapi mencoba akses halaman dashboard/profile/admin/dll
  if (!user && (
    path.startsWith('/dashboard') || 
    path.startsWith('/profile') ||
    path.startsWith('/create-arena') ||
    path.startsWith('/buat-lomba') ||
    path.startsWith('/admin')
  )) {
    // Redirect paksa ke halaman login (/auth)
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    // Simpan URL tujuan di parameter 'next' agar setelah login bisa dikembalikan ke halaman yang dituju
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

  // C. Proteksi Khusus Admin (Opsional - Aktifkan jika sudah siap dengan role management)
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
    
    // Contoh pengecekan role jika Anda menyimpan role di user_metadata
    /* const role = user.user_metadata?.role
    if (role !== 'admin' && role !== 'superadmin') {
       return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    */
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