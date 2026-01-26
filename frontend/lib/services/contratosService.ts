import { http } from '../api';

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
    const response = await http('/contratos', { method: 'POST', body: data, auth: true });
    return response;
  }

  async editarContrato(id: string, data: {
    titulo?: string;
    conteudo?: string;
    tipo_contrato?: string;
    obrigatorio?: boolean;
    ativo?: boolean;
  }): Promise<ContratoUnidade> {
    const response = await http(`/contratos/${id}`, { method: 'PUT', body: data, auth: true });
    return response;
  }

  async buscarContratoPorId(id: string): Promise<ContratoUnidade> {
    const response = await http(`/contratos/${id}`, { auth: true });
    return response;
  }

  async buscarContratoAtivoUnidade(unidadeId: string): Promise<ContratoUnidade | null> {
    try {
      const response = await http(`/contratos/unidade/${unidadeId}/ativo`, { auth: true });
      return response;
    } catch (error: { response?: { status?: number } }) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async listarContratosPorUnidade(unidadeId: string): Promise<ContratoUnidade[]> {
    const response = await http(`/contratos/unidade/${unidadeId}`, { auth: true });
    return response;
  }

  async deletarContrato(id: string): Promise<void> {
    await http(`/contratos/${id}`, { method: 'DELETE', auth: true });
  }

  // ========== ASSINATURAS ==========

  async verificarStatusAluno(alunoId: string): Promise<StatusAssinaturaAluno> {
    const response = await http(`/contratos/aluno/${alunoId}/status`, { auth: true });
    return response;
  }

  async verificarStatusResponsavel(responsavelId: string): Promise<StatusAssinaturaResponsavel> {
    const response = await http(`/contratos/responsavel/${responsavelId}/status`, { auth: true });
    return response;
  }

  async assinarContratoAluno(alunoId: string, data?: AssinarContratoDto): Promise<void> {
    // Captura IP e User Agent automaticamente
    const payload = {
      ip_address: data?.ip_address,
      user_agent: data?.user_agent || navigator.userAgent,
    };
    await http(`/contratos/aluno/${alunoId}/assinar`, { method: 'POST', body: payload, auth: true });
  }

  async assinarContratoResponsavel(responsavelId: string, data?: AssinarContratoDto): Promise<void> {
    // Captura IP e User Agent automaticamente
    const payload = {
      ip_address: data?.ip_address,
      user_agent: data?.user_agent || navigator.userAgent,
    };
    await http(`/contratos/responsavel/${responsavelId}/assinar`, { method: 'POST', body: payload, auth: true });
  }

  // ========== HISTÓRICO ==========

  async buscarHistoricoContrato(contratoId: string): Promise<HistoricoAssinatura[]> {
    const response = await http(`/contratos/${contratoId}/historico`, { auth: true });
    return response;
  }

  async buscarHistoricoUnidade(unidadeId: string): Promise<HistoricoAssinatura[]> {
    const response = await http(`/contratos/unidade/${unidadeId}/historico`, { auth: true });
    return response;
  }
}

export const contratosService = new ContratosService();
