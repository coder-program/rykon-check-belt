'use client';

import { useEffect, useState } from 'react';

export interface TenantConfig {
  slug: string;
  nome: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
}

const DEFAULT_TENANT: TenantConfig = {
  slug: 'teamcruz',
  nome: 'TeamCruz Jiu-Jitsu',
  logoUrl: null,
  corPrimaria: '#111827',
  corSecundaria: '#dc2626',
};

/** Lê o slug do cookie (setado pelo middleware Next.js) */
export function getTenantSlug(): string {
  if (typeof window === 'undefined') return 'teamcruz';
  const match = document.cookie
    .split(';')
    .find((c) => c.trim().startsWith('tenant-slug='));
  return match?.split('=')[1]?.toLowerCase().trim() || 'teamcruz';
}

/** Cria o estado inicial de forma síncrona, com o slug já correto do cookie */
function getInitialTenant(): TenantConfig {
  if (typeof window === 'undefined') return DEFAULT_TENANT;
  const slug = getTenantSlug();
  if (slug === 'teamcruz') return DEFAULT_TENANT;
  // Slug diferente de teamcruz: retorna placeholder com o slug correto
  // O nome/cores reais chegam no fetch logo adiante
  return { ...DEFAULT_TENANT, slug };
}

/**
 * Hook para acessar a configuração do tenant atual.
 *
 * Uso:
 *   const { tenant, loading } = useTenant();
 *   <img src={tenant.logoUrl} />
 *   <h1 style={{ color: tenant.corPrimaria }}>{tenant.nome}</h1>
 */
export function useTenant() {
  const [tenant, setTenant] = useState<TenantConfig>(getInitialTenant);
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
      .catch(() => setTenant({ ...DEFAULT_TENANT, slug }))
      .finally(() => setLoading(false));
  }, []);

  return { tenant, loading };
}
