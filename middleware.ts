import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Route pubbliche (non protette)
  const publicRoutes = [
    '/',
    '/signin',
    '/signup',
    '/pricing',
    '/terms',
    '/privacy',
    '/contact',
  ];

  // Controlla se la route è pubblica
  const isPublicRoute = publicRoutes.some(route => pathname === route);
  
  // Controlla se la route è sotto /app (protetta)
  const isProtectedRoute = pathname.startsWith('/app');

  // Crea un client Supabase per il middleware
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verifica se l'utente è autenticato usando Supabase
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Se l'utente è autenticato e prova ad accedere a signin/signup, redirect a /app
  if (isAuthenticated && (pathname === '/signin' || pathname === '/signup')) {
    const appUrl = new URL('/app', request.url);
    response = NextResponse.redirect(appUrl);
    return response;
  }

  // Se l'utente non è autenticato e prova ad accedere a una route protetta
  if (!isAuthenticated && isProtectedRoute) {
    const redirectUrl = new URL('/signin', request.url);
    // Aggiungi il parametro redirect per tornare alla pagina desiderata dopo il login
    redirectUrl.searchParams.set('redirect', pathname);
    response = NextResponse.redirect(redirectUrl);
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

