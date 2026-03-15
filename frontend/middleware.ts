import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware Next.js — Resolução de tenant por subdomínio.
 *
 * Produção:  teamcruz.rykonfit.com.br  → tenant = 'teamcruz'
 *            rykon.rykonfit.com.br     → tenant = 'rykon'
 *            www.rykonfit.com.br       → tenant = 'teamcruz' (fallback)
 *            rykonfit.com.br           → tenant = 'teamcruz' (fallback)
 *
 * Dev local: localhost:3001?tenant=teamcruz → tenant = 'teamcruz'
 *            Sem parâmetro → tenant = 'teamcruz' (fallback)
 */

const BASE_DOMAIN = 'rykonfit.com.br';

export function middleware(request: NextRequest) {
  const hostname = (request.headers.get('host') || '').split(':')[0]; // remove porta
  const url = request.nextUrl;

  let tenantSlug = 'teamcruz'; // fallback padrão
  let resolvedBy = 'fallback';

  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    // ── teamcruz.rykonfit.com.br → tenant = 'teamcruz'
    const subdomain = hostname.slice(0, hostname.length - BASE_DOMAIN.length - 1);
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      tenantSlug = subdomain.toLowerCase();
      resolvedBy = 'subdomain';
    } else {
      // www.rykonfit.com.br → fallback teamcruz
      tenantSlug = 'teamcruz';
      resolvedBy = 'www-subdomain';
    }
  } else if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) {
    // ── rykonfit.com.br ou www.rykonfit.com.br → fallback teamcruz (landing)
    tenantSlug = 'teamcruz';
    resolvedBy = 'base-domain';
  } else if (url.searchParams.has('tenant')) {
    // ── Dev local: ?tenant=teamcruz
    tenantSlug = url.searchParams.get('tenant')!.toLowerCase();
    resolvedBy = 'query-param';
  }

  // ── Sanitizar ───────────────────────────────────────────────────────────────
  tenantSlug = tenantSlug.replace(/[^a-z0-9_-]/g, '') || 'teamcruz';

  // ── Se resolveu via fallback, preservar cookie existente ────────────────────
  if (resolvedBy === 'fallback') {
    const existingCookie = request.cookies.get('tenant-slug')?.value;
    if (existingCookie && /^[a-z0-9_-]+$/.test(existingCookie)) {
      tenantSlug = existingCookie;
      resolvedBy = 'existing-cookie';
    }
  }

  console.log(`[middleware] host=${hostname} path=${url.pathname} tenant=${tenantSlug} via=${resolvedBy}`);

  // ── Passar o tenant via header (para Server Components) e cookie (para Client) ─
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Cookie acessível no client-side (httpOnly: false)
  response.cookies.set('tenant-slug', tenantSlug, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  });

  console.log(`[middleware] Cookie tenant-slug=${tenantSlug} setado`);
  return response;
}

export const config = {
  // Aplica em todas as rotas exceto assets estáticos
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|images|.*\\.(?:png|jpg|jpeg|svg|ico|webp)).*)'],
};
