import { API_BASE_URL, getTenantSlug } from './api';

export interface TimerConfigDto {
  nome: string;
  modo: 'simple' | 'rounds' | 'circuit';
  academiaId?: string;
  duracaoSegundos?: number;
  numRounds?: number;
  duracaoRoundSegundos?: number;
  duracaoDescansoSegundos?: number;
  exercicios?: { nome: string; duracaoSegundos: number; descansoSegundos: number }[];
}

export interface TimerConfig extends TimerConfigDto {
  id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimerState {
  configId: string;
  academyId: string;
  mode: 'simple' | 'rounds' | 'circuit';
  nome: string;
  status: 'idle' | 'running' | 'paused' | 'finished';
  timeRemaining: number;
  currentRound: number;
  totalRounds: number;
  isResting: boolean;
  exercicioAtual: string;
  exercicioIndex: number;
  config: TimerConfig;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': getTenantSlug(),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers as any) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const timerApi = {
  // ── CRUD configs ──
  create: (dto: TimerConfigDto) =>
    apiFetch<TimerConfig>('/timers', { method: 'POST', body: JSON.stringify(dto) }),

  list: (academiaId?: string) =>
    apiFetch<TimerConfig[]>(`/timers${academiaId ? `?academiaId=${academiaId}` : ''}`),

  get: (id: string) => apiFetch<TimerConfig>(`/timers/${id}`),

  update: (id: string, dto: Partial<TimerConfigDto>) =>
    apiFetch<TimerConfig>(`/timers/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),

  remove: (id: string) => apiFetch<void>(`/timers/${id}`, { method: 'DELETE' }),

  // ── State ──
  getPublicState: (academyId: string) =>
    apiFetch<TimerState>(`/timers/public/${academyId}/state`),

  // ── Controls ──
  start: (academyId: string, configId: string) =>
    apiFetch<TimerState>(`/timers/${academyId}/start`, {
      method: 'POST',
      body: JSON.stringify({ configId }),
    }),

  pause: (academyId: string) =>
    apiFetch<TimerState>(`/timers/${academyId}/pause`, { method: 'POST' }),

  resume: (academyId: string) =>
    apiFetch<TimerState>(`/timers/${academyId}/resume`, { method: 'POST' }),

  reset: (academyId: string) =>
    apiFetch<TimerState>(`/timers/${academyId}/reset`, { method: 'POST' }),
};
