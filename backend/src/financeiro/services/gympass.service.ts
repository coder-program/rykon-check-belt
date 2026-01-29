import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { Presenca } from '../../presenca/entities/presenca.entity';
import { Convenio } from '../entities/convenio.entity';
import { ConfiguracaoConvenioUnidade } from '../entities/configuracao-convenio-unidade.entity';
import { AlunoConvenio, AlunoConvenioStatus } from '../entities/aluno-convenio.entity';
import { EventoConvenio } from '../entities/evento-convenio.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// ====== INTERFACES BASEADAS NA DOCUMENTAÇÃO OFICIAL GYMPASS/WELLHUB ======
// https://partners-docs.gympass.com

/**
 * API de Registro de Usuários (POST /registration)
 * Gympass/Wellhub chama NOSSO endpoint quando usuário ativa a academia
 * Documentação: https://partners-docs.gympass.com/user-registration-api
 */
export interface GympassRegistroDto {
  gympass_user_id: string;       // OBRIGATÓRIO: ex: gpw-29caecdf-2d5e-40b8-82b4-d0a044fa4679
  email?: string;                 // NÃO RECOMENDADO (PII): email do usuário
  first_name?: string;            // NÃO RECOMENDADO (PII): primeiro nome
  last_name?: string;             // NÃO RECOMENDADO (PII): sobrenome
  origin?: 'web' | 'android' | 'ios'; // OPCIONAL: sistema operacional
  user_status?: string;           // OPCIONAL (obrigatório para múltiplas ofertas): 1=básico, 2=premium
  country_code?: string;          // OPCIONAL: código do país (ex: "br", "gb")
}

/**
 * Resposta da API de Registro
 * Devemos retornar um redirect_link para o usuário completar o cadastro
 */
export interface GympassRegistroResponse {
  redirect_link: string;          // URL para formulário de cadastro/login
}

/**
 * API de Status do Usuário (POST /user-status)
 * Gympass chama quando usuário cancela/pausa
 */
export interface GympassStatusWebhook {
  user_id: string;                // gympass_user_id (gpw-xxx) - corrigido de gympass_user_id
  status: 'active' | 'canceled' | 'paused' | 'downgraded';
  timestamp: string;              // ISO 8601
  reason?: string;                // Motivo do cancelamento
}

/**
 * API de Eventos (POST https://api.gympass.com/v1/events)
 * NÓS chamamos Gympass para reportar check-ins
 */
export interface GympassEventoCheckIn {
  user_id: string;                // gympass_user_id (gpw-xxx)
  activity_type: string;          // "gym_visit"
  timestamp: string;              // ISO 8601
  location_id: string;            // ID da unidade no Gympass
}

export interface ConfigConvenio {
  convenio_codigo: string;
  ativo: boolean;
  unidade_id_no_convenio: string;
  percentual_repasse: number;
  api_key?: string;
}

@Injectable()
export class GympassService {
  private readonly logger = new Logger(GympassService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    @InjectRepository(Convenio)
    private convenioRepository: Repository<Convenio>,
    @InjectRepository(ConfiguracaoConvenioUnidade)
    private configConvenioRepository: Repository<ConfiguracaoConvenioUnidade>,
    @InjectRepository(AlunoConvenio)
    private alunoConvenioRepository: Repository<AlunoConvenio>,
    @InjectRepository(EventoConvenio)
    private eventoConvenioRepository: Repository<EventoConvenio>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Presenca)
    private presencaRepository: Repository<Presenca>,
    private httpService: HttpService,
  ) {
    this.apiUrl = process.env.GYMPASS_API_URL || 'https://api.gympass.com';
    this.apiKey = process.env.GYMPASS_API_KEY || '';
  }

  // ========== 1. API DE REGISTRO (Gympass chama quando usuário ativa) ==========
  
  /**
   * API de Registro de Usuários - Gympass/Wellhub Partner API
   * Chamado PELA Gympass quando usuário ativa a academia no app
   * 
   * IMPORTANTE: Tempo de resposta NÃO DEVE exceder 2 segundos
   * 
   * Retorna redirect_link para o usuário completar cadastro
   * Documentação: https://partners-docs.gympass.com/user-registration-api
   */
  async registrarUsuarioGympass(
    dados: GympassRegistroDto, 
    unidadeId: string
  ): Promise<GympassRegistroResponse> {
    try {
      this.logger.log(`📝 Registro Gympass: ${dados.gympass_user_id} para unidade ${unidadeId}`);

      // 1. Buscar convênio Gympass
      const convenio = await this.convenioRepository.findOne({
        where: { codigo: 'GYMPASS' },
      });

      if (!convenio) {
        throw new NotFoundException('Convênio Gympass não encontrado');
      }

      // 2. Verificar se unidade tem Gympass ativo
      const config = await this.configConvenioRepository.findOne({
        where: {
          unidade_id: unidadeId,
          convenio_id: convenio.id,
          ativo: true,
        },
      });

      if (!config) {
        throw new BadRequestException('Gympass não está ativo para esta unidade');
      }

      // 3. Verificar se usuário já está cadastrado (por gympass_user_id)
      const vinculoExistente = await this.alunoConvenioRepository.findOne({
        where: {
          convenio_user_id: dados.gympass_user_id,
          convenio_id: convenio.id,
        },
        relations: ['aluno'],
      });

      if (vinculoExistente) {
        // Usuário já existe - retornar link de LOGIN
        this.logger.log(`✅ Usuário Gympass já existe: ${dados.gympass_user_id}`);
        
        // Se estava cancelado, reativar
        if (vinculoExistente.status !== AlunoConvenioStatus.ATIVO) {
          vinculoExistente.status = AlunoConvenioStatus.ATIVO;
          vinculoExistente.data_ativacao = new Date();
          vinculoExistente.data_cancelamento = null as any;
          await this.alunoConvenioRepository.save(vinculoExistente);
        }
        
        // Retornar link de login
        const frontendUrl = process.env.FRONTEND_URL || 'https://app.rykon.com.br';
        return {
          redirect_link: `${frontendUrl}/login?gympass_user=${dados.gympass_user_id}`,
        };
      }

      // 4. Usuário novo - preparar dados para cadastro
      // Não criamos vínculo aqui porque aluno_id é obrigatório
      // O vínculo será criado pelo endpoint de cadastro público
      this.logger.log(`📝 Novo usuário Gympass será cadastrado: ${dados.gympass_user_id}`);

      // 5. Retornar redirect_link para formulário de cadastro
      // O link deve permitir preenchimento automático com os dados recebidos
      const frontendUrl = process.env.FRONTEND_URL || 'https://app.rykon.com.br';
      const signupParams = new URLSearchParams({
        gympass_user: dados.gympass_user_id,
        ...(dados.email && { email: dados.email }),
        ...(dados.first_name && { first_name: dados.first_name }),
        ...(dados.last_name && { last_name: dados.last_name }),
        unidade: unidadeId,
      });

      return {
        redirect_link: `${frontendUrl}/cadastro/gympass?${signupParams.toString()}`,
      };
    } catch (error) {
      this.logger.error(`Erro ao registrar usuário Gympass:`, error);
      throw error;
    }
  }

  /**
   * Registra usuário Totalpass (mesmo fluxo que Gympass)
   */
  async registrarUsuarioTotalpass(
    dados: GympassRegistroDto,
    unidadeId: string,
  ): Promise<GympassRegistroResponse> {
    // Usar mesmo fluxo, mas com convênio TOTALPASS
    const convenio = await this.convenioRepository.findOne({
      where: { codigo: 'TOTALPASS' },
    });

    if (!convenio) {
      throw new NotFoundException('Convênio Totalpass não encontrado');
    }

    // Reutilizar lógica do Gympass
    return this.registrarUsuarioGympass(dados, unidadeId);
  }

  // ========== 2. ENVIAR EVENTOS PARA GYMPASS (Nós reportamos check-ins) ==========
  
  /**
   * Envia evento de check-in PARA a API da Gympass
   * Chamado PELO NOSSO sistema quando aluno Gympass faz check-in
   */
  async enviarEventoCheckIn(presencaId: string): Promise<any> {
    try {
      // 1. Buscar presença com aluno
      const presenca = await this.presencaRepository.findOne({
        where: { id: presencaId },
        relations: ['aluno', 'aula', 'aula.unidade'],
      });

      if (!presenca) {
        throw new NotFoundException('Presença não encontrada');
      }

      // 2. Verificar se aluno tem vínculo Gympass ativo
      const convenio = await this.convenioRepository.findOne({
        where: { codigo: 'GYMPASS' },
      });

      if (!convenio) {
        throw new NotFoundException('Convênio Gympass não encontrado');
      }

      const alunoConvenio = await this.alunoConvenioRepository.findOne({
        where: {
          aluno_id: presenca.aluno.id,
          convenio_id: convenio.id,
          status: AlunoConvenioStatus.ATIVO,
        },
      });

      if (!alunoConvenio) {
        this.logger.warn(`Aluno ${presenca.aluno.id} não tem vínculo Gympass ativo`);
        return { success: false, reason: 'Not a Gympass user' };
      }

      // 3. Buscar configuração da unidade
      const config = await this.configConvenioRepository.findOne({
        where: {
          unidade_id: presenca.aula.unidade.id,
          convenio_id: convenio.id,
          ativo: true,
        },
      });

      if (!config || !config.unidade_id_no_convenio) {
        throw new BadRequestException('Gympass não configurado para esta unidade');
      }

      // 4. Criar registro do evento (antes de enviar)
      const eventoConvenio = this.eventoConvenioRepository.create({
        aluno_convenio_id: alunoConvenio.id,
        presenca_id: presenca.id,
        convenio_id: convenio.id,
        tipo_evento: 'check_in',
        enviado: false,
        tentativas: 0,
      });
      await this.eventoConvenioRepository.save(eventoConvenio);

      // 5. Preparar payload para Gympass
      const evento: GympassEventoCheckIn = {
        user_id: alunoConvenio.convenio_user_id,
        activity_type: 'gym_visit',
        timestamp: presenca.created_at.toISOString(),
        location_id: config.unidade_id_no_convenio,
      };

      // 6. Enviar para API Gympass
      const apiKey = config.api_key || this.apiKey;
      if (!apiKey) {
        this.logger.warn('⚠️ API key não configurada - evento não enviado');
        eventoConvenio.erro = 'API key not configured';
        await this.eventoConvenioRepository.save(eventoConvenio);
        return { success: false, reason: 'API key not configured' };
      }

      try {
        const response = await firstValueFrom(
          this.httpService.post(`${convenio.api_url}/v1/events`, evento, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }),
        );

        // 7. Atualizar evento como enviado
        eventoConvenio.enviado = true;
        eventoConvenio.data_envio = new Date();
        eventoConvenio.response_status = response.status;
        eventoConvenio.response_body = response.data;
        eventoConvenio.tentativas += 1;
        await this.eventoConvenioRepository.save(eventoConvenio);

        this.logger.log(`✅ Evento check-in enviado para Gympass: ${alunoConvenio.convenio_user_id}`);

        return {
          success: true,
          event_id: response.data.id,
          user_id: alunoConvenio.convenio_user_id,
        };
      } catch (apiError) {
        // Registrar erro
        eventoConvenio.enviado = false;
        eventoConvenio.tentativas += 1;
        eventoConvenio.erro = apiError.message;
        eventoConvenio.response_status = apiError.response?.status;
        eventoConvenio.response_body = apiError.response?.data;
        await this.eventoConvenioRepository.save(eventoConvenio);

        this.logger.error('Erro ao enviar evento para Gympass:', apiError.message);
        throw apiError;
      }
    } catch (error) {
      this.logger.error('Erro ao processar envio de evento:', error);
      throw error;
    }
  }

  // ========== 3. WEBHOOK DE CANCELAMENTO (Gympass notifica mudança de status) ==========
  
  /**
   * Processa webhook de mudança de status
   * Chamado PELA Gympass quando usuário cancela/pausa
   */
  async processarMudancaStatus(dados: GympassStatusWebhook): Promise<any> {
    try {
      this.logger.log(`📨 Webhook status recebido: ${dados.user_id} - ${dados.status}`);

      // 1. Buscar convênio
      const convenio = await this.convenioRepository.findOne({
        where: { codigo: 'GYMPASS' },
      });

      if (!convenio) {
        throw new NotFoundException('Convênio Gympass não encontrado');
      }

      // 2. Buscar vínculo pelo convenio_user_id
      const alunoConvenio = await this.alunoConvenioRepository.findOne({
        where: {
          convenio_user_id: dados.user_id,
          convenio_id: convenio.id,
        },
        relations: ['aluno'],
      });

      if (!alunoConvenio) {
        this.logger.warn(`Usuário Gympass não encontrado: ${dados.user_id}`);
        return { success: false, reason: 'User not found' };
      }

      // 3. Atualizar status baseado no webhook
      if (dados.status === 'active') {
        alunoConvenio.status = AlunoConvenioStatus.ATIVO;
        alunoConvenio.data_ativacao = new Date(dados.timestamp);
        alunoConvenio.data_cancelamento = null as any;
      } else {
        // canceled, paused, downgraded
        alunoConvenio.status = AlunoConvenioStatus.CANCELADO;
        alunoConvenio.data_cancelamento = new Date(dados.timestamp);
      }

      // Adicionar ao metadata
      alunoConvenio.metadata = {
        ...alunoConvenio.metadata,
        ultimo_webhook: {
          status: dados.status,
          timestamp: dados.timestamp,
          reason: dados.reason,
        },
      };

      await this.alunoConvenioRepository.save(alunoConvenio);

      this.logger.log(`✅ Status atualizado: ${alunoConvenio.aluno.nome_completo} - ${dados.status}`);

      return {
        success: true,
        user_id: dados.user_id,
        aluno_id: alunoConvenio.aluno.id,
        status: dados.status,
      };
    } catch (error) {
      this.logger.error('Erro ao processar mudança de status:', error);
      throw error;
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  /**
   * Busca estatísticas de uso do Gympass
   */
  async estatisticas(unidadeId: string, mes?: string): Promise<any> {
    // 1. Buscar convênio
    const convenio = await this.convenioRepository.findOne({
      where: { codigo: 'GYMPASS' },
    });

    if (!convenio) {
      throw new NotFoundException('Convênio Gympass não encontrado');
    }

    // 2. Buscar configuração da unidade
    const config = await this.configConvenioRepository.findOne({
      where: {
        unidade_id: unidadeId,
        convenio_id: convenio.id,
        ativo: true,
      },
    });

    if (!config) {
      return {
        ativo: false,
        message: 'Integração não configurada para esta unidade',
      };
    }

    // 3. Buscar check-ins de alunos Gympass
    const query = this.presencaRepository
      .createQueryBuilder('presenca')
      .leftJoin('presenca.aluno', 'aluno')
      .leftJoin('aluno_convenios', 'ac', 'ac.aluno_id = aluno.id')
      .where('ac.convenio_id = :convenioId', { convenioId: convenio.id })
      .andWhere('ac.status = :status', { status: 'ativo' })
      .andWhere('presenca.unidade_id = :unidadeId', { unidadeId });

    if (mes) {
      const [ano, mesNum] = mes.split('-');
      const dataInicio = new Date(parseInt(ano), parseInt(mesNum) - 1, 1);
      const dataFim = new Date(parseInt(ano), parseInt(mesNum), 0);

      query.andWhere('presenca.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });
    }

    const totalCheckIns = await query.getCount();

    // 4. Buscar usuários ativos
    const usuariosAtivos = await this.alunoConvenioRepository.count({
      where: {
        unidade_id: unidadeId,
        convenio_id: convenio.id,
        status: AlunoConvenioStatus.ATIVO,
      },
    });

    // 5. Calcular receita estimada
    const valorPorCheckin = 20.0; // Valor médio estimado
    const percentualRepasse = 70; // Padrão Gympass
    const receitaEstimada = totalCheckIns * valorPorCheckin * (percentualRepasse / 100);

    return {
      totalCheckIns,
      receitaEstimada,
      valorMedioCheckin: valorPorCheckin,
      percentualRepasse,
      usuariosAtivos,
      unidade_parceira_id: config.unidade_parceira_id,
    };
  }

  /**
   * Verifica se a integração está ativa e funcionando
   */
  async verificarIntegracao(unidadeId: string): Promise<any> {
    try {
      // 1. Buscar convênio
      const convenio = await this.convenioRepository.findOne({
        where: { codigo: 'GYMPASS' },
      });

      if (!convenio) {
        return {
          ativo: false,
          message: 'Convênio Gympass não encontrado no sistema',
        };
      }

      // 2. Buscar configuração da unidade
      const config = await this.configConvenioRepository.findOne({
        where: {
          unidade_id: unidadeId,
          convenio_id: convenio.id,
        },
      });

      if (!config) {
        return {
          ativo: false,
          message: 'Integração não configurada para esta unidade',
        };
      }

      // 3. Contar usuários ativos
      const usuariosAtivos = await this.alunoConvenioRepository.count({
        where: {
          unidade_id: unidadeId,
          convenio_id: convenio.id,
          status: AlunoConvenioStatus.ATIVO,
        },
      });

      return {
        ativo: config.ativo,
        unidade_parceira_id: config.unidade_parceira_id,
        usuarios_ativos: usuariosAtivos,
        api_key_configurada: !!this.apiKey,
        ambiente: this.apiUrl.includes('sandbox') ? 'sandbox' : 'production',
      };
    } catch (error) {
      return {
        ativo: false,
        message: error.message,
      };
    }
  }

  /**
   * Lista alunos de um convênio específico
   */
  async listarAlunosConvenio(unidadeId: string, codigoConvenio: 'GYMPASS' | 'TOTALPASS'): Promise<any[]> {
    try {
      const convenio = await this.convenioRepository.findOne({
        where: { codigo: codigoConvenio },
      });

      if (!convenio) {
        throw new NotFoundException(`Convênio ${codigoConvenio} não encontrado`);
      }

      const alunosConvenio = await this.alunoConvenioRepository.find({
        where: {
          unidade_id: unidadeId,
          convenio_id: convenio.id,
        },
        relations: ['aluno', 'convenio'],
        order: {
          created_at: 'DESC',
        },
      });

      return alunosConvenio;
    } catch (error) {
      this.logger.error('Erro ao listar alunos do convênio:', error);
      throw error;
    }
  }

  // ========== UTILITÁRIOS PRIVADOS ==========

  /**
   * Busca ou cria hash de assinatura para Gympass
   */
  private gerarAssinaturaGympass(userId: string): string {
    const crypto = require('crypto');
    const data = `${userId}-${Date.now()}-${this.apiKey}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
