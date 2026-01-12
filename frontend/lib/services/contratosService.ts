import apiClient from './apiClient';

export interface ContratoUnidade {
  id: string;
  unidade_id: string;
  titulo: string;
  conteudo: string;
  versao: number;
  ativo: boolean;
  obrigatorio: boolean;
  tipo_contrato: 'TERMO_ADESAO' | 'TERMO_RESPONSABILIDADE' | 'LGPD' | 'OUTRO';
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface StatusAssinaturaAluno {
  aluno_id: string;
  contrato_pendente: boolean;
  contrato_id?: string;
  contrato?: ContratoUnidade;
  ultima_versao?: number;
  versao_assinada?: number;
  precisa_reassinar?: boolean;
}

export interface StatusAssinaturaResponsavel {
  responsavel_id: string;
  contrato_pendente: boolean;
  contrato_id?: string;
  contrato?: ContratoUnidade;
  ultima_versao?: number;
  versao_assinada?: number;
  precisa_reassinar?: boolean;
}

export interface AssinarContratoDto {
  ip_address?: string;
  user_agent?: string;
}

export interface HistoricoAssinatura {
  id: string;
  contrato_id: string;
  usuario_id: string;
  tipo_usuario: 'ALUNO' | 'RESPONSAVEL';
  versao_contrato: number;
  assinado_em: string;
  ip_address?: string;
  user_agent?: string;
  aceito: boolean;
}

class ContratosService {
  // ========== CRUD DE CONTRATOS ==========
  
  async criarContrato(data: {
    unidade_id: string;
    titulo: string;
    conteudo: string;
    tipo_contrato?: string;
    obrigatorio?: boolean;
  }): Promise<ContratoUnidade> {
    const response = await apiClient.post('/contratos', data);
    return response.data;
  }

  async editarContrato(id: string, data: {
    titulo?: string;
    conteudo?: string;
    tipo_contrato?: string;
    obrigatorio?: boolean;
    ativo?: boolean;
  }): Promise<ContratoUnidade> {
    const response = await apiClient.put(`/contratos/${id}`, data);
    return response.data;
  }

  async buscarContratoPorId(id: string): Promise<ContratoUnidade> {
    const response = await apiClient.get(`/contratos/${id}`);
    return response.data;
  }

  async buscarContratoAtivoUnidade(unidadeId: string): Promise<ContratoUnidade | null> {
    try {
      const response = await apiClient.get(`/contratos/unidade/${unidadeId}/ativo`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async listarContratosPorUnidade(unidadeId: string): Promise<ContratoUnidade[]> {
    const response = await apiClient.get(`/contratos/unidade/${unidadeId}`);
    return response.data;
  }

  async deletarContrato(id: string): Promise<void> {
    await apiClient.delete(`/contratos/${id}`);
  }

  // ========== ASSINATURAS ==========

  async verificarStatusAluno(alunoId: string): Promise<StatusAssinaturaAluno> {
    const response = await apiClient.get(`/contratos/aluno/${alunoId}/status`);
    return response.data;
  }

  async verificarStatusResponsavel(responsavelId: string): Promise<StatusAssinaturaResponsavel> {
    const response = await apiClient.get(`/contratos/responsavel/${responsavelId}/status`);
    return response.data;
  }

  async assinarContratoAluno(alunoId: string, data?: AssinarContratoDto): Promise<void> {
    // Captura IP e User Agent automaticamente
    const payload = {
      ip_address: data?.ip_address,
      user_agent: data?.user_agent || navigator.userAgent,
    };
    await apiClient.post(`/contratos/aluno/${alunoId}/assinar`, payload);
  }

  async assinarContratoResponsavel(responsavelId: string, data?: AssinarContratoDto): Promise<void> {
    // Captura IP e User Agent automaticamente
    const payload = {
      ip_address: data?.ip_address,
      user_agent: data?.user_agent || navigator.userAgent,
    };
    await apiClient.post(`/contratos/responsavel/${responsavelId}/assinar`, payload);
  }

  // ========== HISTÓRICO ==========

  async buscarHistoricoContrato(contratoId: string): Promise<HistoricoAssinatura[]> {
    const response = await apiClient.get(`/contratos/${contratoId}/historico`);
    return response.data;
  }

  async buscarHistoricoUnidade(unidadeId: string): Promise<HistoricoAssinatura[]> {
    const response = await apiClient.get(`/contratos/unidade/${unidadeId}/historico`);
    return response.data;
  }
}

export const contratosService = new ContratosService();
