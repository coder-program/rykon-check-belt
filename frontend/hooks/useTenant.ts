'use client';

import { useEffect, useState } from 'react';

export interface TenantConfig {
  slug: string;
  nome: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  lojaUrl: string | null;
}

const DEFAULT_TENANT: TenantConfig = {
  slug: 'teamcruz',
  nome: 'TeamCruz Jiu-Jitsu',
  logoUrl: null,
  corPrimaria: '#111827',
  corSecundaria: '#dc2626',
  lojaUrl: null,
};

/** Lê o slug do cookie (setado pelo middleware Next.js) */
export function getTenantSlug(): string {
  if (typeof window === 'undefined') return 'teamcruz';
  const match = document.cookie
    .split(';')
    .find((c) => c.trim().startsWith('tenant-slug='));
  return match?.split('=')[1]?.toLowerCase().trim() || 'teamcruz';
}

/**
 * Hook para acessar a configuração do tenant atual.
 *
 * Estado inicial sempre é DEFAULT_TENANT — idêntico no servidor e no cliente,
 * o que evita hydration mismatch. O `loading: true` inicial garante que os
 * componentes exibam skeleton até o fetch completar, nunca o nome errado.
 *
 * Uso:
 *   const { tenant, loading } = useTenant();
 *   {loading ? <Skeleton /> : <h1>{tenant.nome}</h1>}
 */
export function useTenant() {
  const [tenant, setTenant] = useState<TenantConfig>(DEFAULT_TENANT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = getTenantSlug();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const endpoint = `${apiUrl}/tenants/${slug}/config`;

    fetch(endpoint, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`Tenant not found (HTTP ${r.status})`);
        return r.json();
      })
      .then((config: TenantConfig) => setTenant(config))
      .catch(() => setTenant({ ...DEFAULT_TENANT, slug, nome: slug, lojaUrl: null }))
      .finally(() => setLoading(false));
  }, []);

  return { tenant, loading };
}
