import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session jika expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ATURAN PROTEKSI RUTE
  const path = request.nextUrl.pathname;

  // 1. Jika user belum login dan mencoba akses dashboard atau admin
  if (!user && (path.startsWith('/dashboard') || path.startsWith('/admin'))) {
    // Redirect ke halaman login
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  // 2. Jika user sudah login tapi mencoba akses halaman auth (login/register)
  if (user && path.startsWith('/auth')) {
    // Redirect ke dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 3. (Opsional) Proteksi Admin Khusus
  // Jika Anda punya kolom 'role' di metadata user, Anda bisa cek di sini.
  // Contoh logika (perlu disesuaikan dengan struktur user Anda):
  /*
  if (user && path.startsWith('/admin')) {
     const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
     if (profile?.role !== 'admin') {
       return NextResponse.redirect(new URL('/dashboard', request.url));
     }
  }
  */

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api/webhook (penting: jangan blokir webhook Helius/Stripe jika ada)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};