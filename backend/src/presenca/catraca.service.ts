import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
import { Unidade, CatracaConfig } from '../people/entities/unidade.entity';
import { Person } from '../people/entities/person.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { Presenca, PresencaMetodo, PresencaStatus } from './entities/presenca.entity';

export interface CatracaCheckInDto {
  matricula?: string; // Matrícula ou CPF do aluno
  cpf?: string;
  foto?: string; // Base64 da foto capturada
  unidade_id: string;
  dispositivo_id?: string;
  timestamp?: string;
  api_key?: string; // Chave de autenticação da catraca
}

export interface CatracaResponse {
  success: boolean;
  message: string;
  liberar_catraca: boolean;
  nome_aluno?: string;
  foto_aluno?: string;
  mensagem_display?: string;
  tempo_liberacao_segundos?: number;
}

@Injectable()
export class CatracaService {
  private readonly logger = new Logger(CatracaService.name);

  constructor(
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Presenca)
    private presencaRepository: Repository<Presenca>,
  ) {}

  /**
   * Endpoint chamado pela catraca quando reconhece um aluno
   * POST /api/catraca/webhook
   */
  async webhookCheckin(data: CatracaCheckInDto): Promise<CatracaResponse> {
    this.logger.log(`🚪 Webhook catraca recebido - Unidade: ${data.unidade_id}, Matrícula: ${data.matricula || data.cpf}`);

    try {
      // 1. Validar unidade e configuração
      const unidade = await this.validarUnidadeECatraca(data.unidade_id, data.api_key);

      // 2. Buscar aluno pela matrícula ou CPF
      const aluno = await this.buscarAluno(data.matricula, data.cpf, data.unidade_id);

      if (!aluno) {
        this.logger.warn(`⚠️ Aluno não encontrado - Matrícula: ${data.matricula}, CPF: ${data.cpf}`);
        return {
          success: false,
          message: 'Aluno não encontrado',
          liberar_catraca: false,
          mensagem_display: 'ALUNO NÃO CADASTRADO',
        };
      }

      // 3. Verificar se aluno está ativo
      if (aluno.status !== 'ATIVO') {
        this.logger.warn(`⚠️ Aluno inativo - ID: ${aluno.id}`);
        return {
          success: false,
          message: 'Aluno inativo',
          liberar_catraca: false,
          mensagem_display: 'ALUNO INATIVO',
          nome_aluno: aluno.nome_completo,
        };
      }

      // 4. Verificar horário de funcionamento
      if (unidade.catraca_config && !this.verificarHorarioFuncionamento(unidade.catraca_config)) {
        this.logger.warn(`⚠️ Fora do horário de funcionamento`);
        return {
          success: false,
          message: 'Fora do horário de funcionamento',
          liberar_catraca: false,
          mensagem_display: 'FORA DO HORÁRIO',
          nome_aluno: aluno.nome_completo,
        };
      }

      // 5. Verificar se já fez check-in hoje
      const jaFezCheckin = await this.verificarCheckinHoje(aluno.id, data.unidade_id);

      if (jaFezCheckin) {
        this.logger.log(`✅ Aluno já fez check-in hoje - Liberando catraca novamente`);
        return {
          success: true,
          message: 'Check-in já realizado hoje',
          liberar_catraca: true,
          mensagem_display: 'BEM-VINDO NOVAMENTE',
          nome_aluno: aluno.nome_completo,
          foto_aluno: undefined,
          tempo_liberacao_segundos: unidade.catraca_config?.tempo_liberacao_segundos || 6,
        };
      }

      // 6. Registrar presença
      const presenca = await this.registrarPresenca(aluno, data, unidade);

      this.logger.log(`✅ Check-in registrado - Aluno: ${aluno.nome_completo}, Presença ID: ${presenca.id}`);

      // 7. Retornar resposta para liberar catraca
      return {
        success: true,
        message: 'Check-in realizado com sucesso',
        liberar_catraca: true,
        mensagem_display: `BEM-VINDO ${aluno.nome_completo?.split(' ')[0]?.toUpperCase()}`,
        nome_aluno: aluno.nome_completo,
        foto_aluno: undefined,
        tempo_liberacao_segundos: unidade.catraca_config?.tempo_liberacao_segundos || 6,
      };

    } catch (error) {
      this.logger.error(`❌ Erro no webhook catraca:`, error);
      return {
        success: false,
        message: error.message || 'Erro ao processar check-in',
        liberar_catraca: false,
        mensagem_display: 'ERRO NO SISTEMA',
      };
    }
  }

  /**
   * Valida unidade e configuração da catraca
   */
  private async validarUnidadeECatraca(unidade_id: string, api_key?: string): Promise<Unidade> {
    const unidade = await this.unidadeRepository.findOne({
      where: { id: unidade_id },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    if (!unidade.catraca_habilitada) {
      throw new BadRequestException('Catraca não habilitada para esta unidade');
    }

    if (!unidade.catraca_config) {
      throw new BadRequestException('Configuração da catraca não encontrada');
    }

    // Validar API Key se configurada
    if (unidade.catraca_config.api_key && api_key !== unidade.catraca_config.api_key) {
      throw new UnauthorizedException('API Key inválida');
    }

    return unidade;
  }

  /**
   * Busca aluno pela matrícula ou CPF
   */
  private async buscarAluno(matricula?: string, cpf?: string, unidade_id?: string): Promise<Aluno | null> {
    if (!matricula && !cpf) {
      throw new BadRequestException('Matrícula ou CPF obrigatório');
    }

    let aluno: Aluno | null = null;

    // Buscar por matrícula (numero_matricula)
    if (matricula) {
      aluno = await this.alunoRepository.findOne({
        where: { 
          numero_matricula: matricula,
          unidade_id,
        },
      });
    }

    // Se não encontrou por matrícula, buscar por CPF
    if (!aluno && cpf) {
      aluno = await this.alunoRepository.findOne({
        where: { 
          cpf,
          unidade_id,
        },
      });
    }

    return aluno;
  }

  /**
   * Verifica se está dentro do horário de funcionamento
   */
  private verificarHorarioFuncionamento(config: CatracaConfig): boolean {
    if (!config.horario_funcionamento) {
      return true; // Sem restrição de horário
    }

    const agora = dayjs().tz('America/Sao_Paulo');
    const horaAtual = agora.hour() * 60 + agora.minute(); // Minutos desde meia-noite

    const [horaInicio, minInicio] = config.horario_funcionamento.inicio.split(':').map(Number);
    const [horaFim, minFim] = config.horario_funcionamento.fim.split(':').map(Number);

    const minutosInicio = horaInicio * 60 + minInicio;
    const minutosFim = horaFim * 60 + minFim;

    return horaAtual >= minutosInicio && horaAtual <= minutosFim;
  }

  /**
   * Verifica se já fez check-in hoje
   */
  private async verificarCheckinHoje(aluno_id: string, unidade_id: string): Promise<boolean> {
    const hoje = dayjs().tz('America/Sao_Paulo').startOf('day').toDate();

    const presenca = await this.presencaRepository
      .createQueryBuilder('presenca')
      .where('presenca.aluno_id = :aluno_id', { aluno_id })
      .andWhere('presenca.data_presenca >= :hoje', { hoje })
      .andWhere('presenca.status != :cancelado', { cancelado: PresencaStatus.CANCELADA })
      .getOne();

    return !!presenca;
  }

  /**
   * Registra a presença do aluno
   */
  private async registrarPresenca(
    aluno: Aluno,
    data: CatracaCheckInDto,
    unidade: Unidade,
  ): Promise<Presenca> {
    const presenca = this.presencaRepository.create({
      aluno_id: aluno.id,
      aula_id: null as any, // Não está vinculado a uma aula específica
      status: PresencaStatus.PRESENTE,
      modo_registro: PresencaMetodo.FACIAL,
      metodo: 'CATRACA_BIOMETRICA',
      hora_checkin: dayjs().tz('America/Sao_Paulo').toDate(),
      data_presenca: dayjs().tz('America/Sao_Paulo').toDate(),
      observacoes: `Check-in via catraca ${unidade.catraca_config?.tipo || 'biométrica'} - Dispositivo: ${data.dispositivo_id || 'N/A'}`,
      peso_presenca: 1.0,
      status_aprovacao: unidade.requer_aprovacao_checkin ? 'PENDENTE' : 'APROVADO',
    });

    return await this.presencaRepository.save(presenca);
  }

  /**
   * Obter configuração da catraca de uma unidade
   * GET /api/catraca/config/:unidade_id
   */
  async getConfiguracao(unidade_id: string): Promise<{
    habilitada: boolean;
    config: CatracaConfig | null;
  }> {
    const unidade = await this.unidadeRepository.findOne({
      where: { id: unidade_id },
      select: ['id', 'nome', 'catraca_habilitada', 'catraca_config'],
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    // Não retornar api_key por segurança
    const configSanitizada = unidade.catraca_config ? {
      ...unidade.catraca_config,
      api_key: unidade.catraca_config.api_key ? '***' : undefined,
    } : null;

    return {
      habilitada: unidade.catraca_habilitada,
      config: configSanitizada,
    };
  }

  /**
   * Atualizar configuração da catraca
   * PUT /api/catraca/config/:unidade_id
   */
  async atualizarConfiguracao(
    unidade_id: string,
    habilitada: boolean,
    config: CatracaConfig,
  ): Promise<{ success: boolean; message: string }> {
    const unidade = await this.unidadeRepository.findOne({
      where: { id: unidade_id },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    unidade.catraca_habilitada = habilitada;
    unidade.catraca_config = config;

    await this.unidadeRepository.save(unidade);

    this.logger.log(`✅ Configuração da catraca atualizada - Unidade: ${unidade.nome}`);

    return {
      success: true,
      message: 'Configuração atualizada com sucesso',
    };
  }

  /**
   * Testar conexão com a catraca
   * POST /api/catraca/test/:unidade_id
   */
  async testarConexao(unidade_id: string): Promise<{
    success: boolean;
    message: string;
    detalhes?: any;
  }> {
    const unidade = await this.unidadeRepository.findOne({
      where: { id: unidade_id },
    });

    if (!unidade || !unidade.catraca_config) {
      throw new NotFoundException('Configuração da catraca não encontrada');
    }

    const config = unidade.catraca_config;

    this.logger.log(`🧪 Testando conexão com catraca - IP: ${config.ip}:${config.porta}`);

    try {
      // Aqui você implementaria a lógica específica para testar cada tipo de catraca
      // Por enquanto, apenas validamos se a configuração está completa

      if (!config.ip || !config.porta) {
        return {
          success: false,
          message: 'Configuração incompleta - IP e Porta obrigatórios',
        };
      }

      return {
        success: true,
        message: 'Configuração válida',
        detalhes: {
          tipo: config.tipo,
          ip: config.ip,
          porta: config.porta,
          modelo: config.modelo_placa || 'N/A',
        },
      };

    } catch (error) {
      this.logger.error(`❌ Erro ao testar catraca:`, error);
      return {
        success: false,
        message: 'Erro ao conectar com a catraca',
        detalhes: error.message,
      };
    }
  }
}
