import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/api';

interface UnidadesStats {
  total: number;
  ativas: number;
  inativas: number;
  homologacao: number;
}

export function useUnidadesStats() {
  return useQuery<UnidadesStats>({
    queryKey: ['unidades-stats'],
    queryFn: async () => {
      const response = await http('/unidades/stats', { 
        method: 'GET',
        auth: true
      });
      return response;
    },
    staleTime: 30 * 1000, // Cache por 30 segundos
    gcTime: 60 * 1000, // Mantém em cache por 1 minuto
  });
}
