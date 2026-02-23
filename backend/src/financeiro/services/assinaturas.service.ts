import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
import { Assinatura, StatusAssinatura } from '../entities/assinatura.entity';
import { Plano } from '../entities/plano.entity';
import { Aluno } from '../../people/entities/aluno.entity';
import { Unidade } from '../../people/entities/unidade.entity';
import { Fatura, StatusFatura } from '../entities/fatura.entity';
import {
  CreateAssinaturaDto,
  UpdateAssinaturaDto,
  CancelarAssinaturaDto,
  AlterarPlanoDto,
} from '../dto/assinatura.dto';
import { AtualizarCartaoDto } from '../dto/atualizar-cartao.dto';
import { PaytimeIntegrationService } from './paytime-integration.service';

@Injectable()
export class AssinaturasService {
  private readonly logger = new Logger(AssinaturasService.name);

  constructor(
    @InjectRepository(Assinatura)
    private assinaturaRepository: Repository<Assinatura>,
    @InjectRepository(Plano)
    private planoRepository: Repository<Plano>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    @InjectRepository(Fatura)
    private faturaRepository: Repository<Fatura>,
    @Inject(DataSource) private dataSource: DataSource,
    private paytimeIntegrationService: PaytimeIntegrationService,
  ) {}

  async create(
    createAssinaturaDto: CreateAssinaturaDto,
    user: any,
  ): Promise<Assinatura> {
    // Verificar se aluno existe
    const aluno = await this.alunoRepository.findOne({
      where: { id: createAssinaturaDto.aluno_id },
    });
    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se plano existe
    const plano = await this.planoRepository.findOne({
      where: { id: createAssinaturaDto.plano_id },
    });
    if (!plano) {
      throw new NotFoundException('Plano não encontrado');
    }

    // Verificar se já existe assinatura ativa para este aluno
    const assinaturaExistente = await this.assinaturaRepository.findOne({
      where: {
        aluno_id: createAssinaturaDto.aluno_id,
        status: StatusAssinatura.ATIVA,
      },
      relations: ['plano'],
    });

    if (assinaturaExistente) {
     
      // Buscar TODAS as assinaturas deste aluno para debug
      const todasAssinaturas = await this.assinaturaRepository.find({
        where: { aluno_id: createAssinaturaDto.aluno_id },
      });
      todasAssinaturas.forEach((a, idx) => {
        console.log(`  ${idx + 1}. ID: ${a.id}, Status: ${a.status}, Plano: ${a.plano_id}`);
      });

      const planoNome = assinaturaExistente.plano?.nome || 'não identificado';
      throw new BadRequestException(
        `Aluno já possui uma assinatura ativa (Plano: ${planoNome}). ` +
        `Por favor, cancele a assinatura atual antes de criar uma nova. ` +
        `ID da assinatura ativa: ${assinaturaExistente.id}`
      );
    }

    // Verificar limite de alunos no plano
    if (plano.max_alunos && plano.max_alunos > 0) {
      const totalAlunosAtivos = await this.assinaturaRepository.count({
        where: {
          plano_id: createAssinaturaDto.plano_id,
          status: StatusAssinatura.ATIVA,
        },
      });

      if (totalAlunosAtivos >= plano.max_alunos) {
        throw new BadRequestException(
          `Este plano atingiu o limite máximo de ${plano.max_alunos} aluno(s). Atualmente existem ${totalAlunosAtivos} aluno(s) ativo(s) neste plano.`,
        );
      }
    }

    // Calcular data_fim e proxima_cobranca
    const dataInicio = dayjs(createAssinaturaDto.data_inicio).tz('America/Sao_Paulo');
    const dataFim = dataInicio.add(plano.duracao_meses, 'month');

    // Verificar se a assinatura já está expirada
    const hoje = dayjs().tz('America/Sao_Paulo').startOf('day');
    const dataFimComparacao = dataFim.startOf('day');

    if (dataFimComparacao.isBefore(hoje)) {
      throw new BadRequestException(
        `Não é possível criar assinatura com data de término no passado. A assinatura terminaria em ${dataFim.format('DD/MM/YYYY')}, que já passou.`,
      );
    }

    let proximaCobranca = dataInicio.date(createAssinaturaDto.dia_vencimento || 10);
    const diaVencimento = createAssinaturaDto.dia_vencimento || 10;
    if (proximaCobranca.isBefore(dayjs().tz('America/Sao_Paulo'))) {
      proximaCobranca = proximaCobranca.add(1, 'month');
    }

    // Determinar status inicial
    let statusInicial = StatusAssinatura.ATIVA;
    if (!dataFimComparacao.isAfter(hoje)) {
      statusInicial = StatusAssinatura.EXPIRADA;
    }

    const assinatura = this.assinaturaRepository.create({
      ...createAssinaturaDto,
      valor: plano.valor,
      data_fim: dataFim.toDate(),
      proxima_cobranca: proximaCobranca.toDate(),
      dia_vencimento: diaVencimento,
      status: statusInicial,
    });

    const assinaturaSalva = await this.assinaturaRepository.save(assinatura);

    // 🆕 Gerar primeira fatura automaticamente
    if (statusInicial === StatusAssinatura.ATIVA) {
      try {
        this.logger.log(`🎯 Gerando primeira fatura para assinatura ${assinaturaSalva.id}`);
        this.logger.log(`   - Aluno ID: ${assinaturaSalva.aluno_id}`);
        this.logger.log(`   - Plano: ${plano.nome}`);
        this.logger.log(`   - Valor: R$ ${assinaturaSalva.valor}`);
        this.logger.log(`   - Vencimento: ${proximaCobranca.format('DD/MM/YYYY')}`);
        
        const numeroFatura = await this.gerarNumeroFatura();
        const mesAtual = hoje.month() + 1;
        const anoAtual = hoje.year();

        const fatura = this.faturaRepository.create({
          numero_fatura: numeroFatura,
          assinatura_id: assinaturaSalva.id,
          aluno_id: assinaturaSalva.aluno_id,
          descricao: `Mensalidade - ${plano.nome} - ${mesAtual.toString().padStart(2, '0')}/${anoAtual}`,
          valor_original: assinaturaSalva.valor,
          valor_desconto: 0,
          valor_acrescimo: 0,
          valor_total: assinaturaSalva.valor,
          valor_pago: 0,
          data_vencimento: proximaCobranca.toDate(),
          status: StatusFatura.PENDENTE,
          metodo_pagamento: assinaturaSalva.metodo_pagamento,
        });

        const faturaSalva = await this.faturaRepository.save(fatura);
        this.logger.log(`✅ Primeira fatura ${numeroFatura} (ID: ${faturaSalva.id}) gerada com sucesso!`);
        this.logger.log(`   - Status: ${faturaSalva.status}`);
        this.logger.log(`   - Método: ${faturaSalva.metodo_pagamento}`);
      } catch (error) {
        this.logger.error(`❌ Erro ao gerar primeira fatura: ${error.message}`);
        this.logger.error(`   Stack: ${error.stack}`);
        // Não falhar a criação da assinatura se a fatura falhar
      }
    } else {
      this.logger.warn(`⚠️ Assinatura criada com status ${statusInicial}, primeira fatura NÃO gerada`);
    }

    return assinaturaSalva;
  }

  /**
   * Gera número sequencial de fatura
   */
  private async gerarNumeroFatura(): Promise<string> {
    const ultimaFatura = await this.faturaRepository
      .createQueryBuilder('fatura')
      .orderBy('fatura.created_at', 'DESC')
      .getOne();

    const proximoNumero = ultimaFatura
      ? parseInt(ultimaFatura.numero_fatura.split('-')[1]) + 1
      : 1;
    return `FAT-${proximoNumero.toString().padStart(6, '0')}`;
  }

  async findAll(
    unidade_id?: string,
    status?: StatusAssinatura,
    user?: any,
  ): Promise<Assinatura[]> {

    const query = this.assinaturaRepository
      .createQueryBuilder('assinatura')
      .leftJoinAndSelect('assinatura.aluno', 'aluno')
      .leftJoinAndSelect('assinatura.plano', 'plano')
      .leftJoinAndSelect('assinatura.unidade', 'unidade')
      .orderBy('assinatura.proxima_cobranca', 'ASC');

    // Se unidade_id foi passada, filtrar diretamente por ela
    if (unidade_id) {
      query.andWhere('assinatura.unidade_id = :unidade_id', { unidade_id });
    } else if (user) {
      // Verificar se é franqueado
      const isFranqueado =
        user.tipo_usuario === 'FRANQUEADO' ||
        user.perfis?.some(
          (p: any) =>
            (typeof p === 'string' ? p : p.nome)?.toUpperCase() ===
            'FRANQUEADO',
        );

      if (isFranqueado) {
        // Buscar franqueado_id correto
        const franqueadoResult = await this.dataSource.query(
          `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
          [user.id],
        );
        const franqueadoId = franqueadoResult[0]?.id || null;
        if (franqueadoId) {
          // Buscar unidades do franqueado
          const unidades = await this.unidadeRepository.find({
            where: { franqueado_id: franqueadoId },
            select: ['id'],
          });
          const unidadeIds = unidades.map((u) => u.id);
          if (unidadeIds.length > 0) {
            query.andWhere('assinatura.unidade_id IN (:...unidadeIds)', {
              unidadeIds,
            });
          } else {
            console.warn('⚠️ [ASSINATURAS-SERVICE] Franqueado sem unidades');
            // Retornar vazio se não tem unidades
            query.andWhere('1=0');
          }
        } else {
          console.warn('⚠️ [ASSINATURAS-SERVICE] Franqueado_id não encontrado');
          query.andWhere('1=0');
        }
      } else if (user.unidade_id) {
        query.andWhere('assinatura.unidade_id = :unidade_id', {
          unidade_id: user.unidade_id,
        });
      }
    }

    if (status) {
      query.andWhere('assinatura.status = :status', { status });
    }

    const result = await query.getMany();

    // Atualizar automaticamente assinaturas expiradas
    await this.atualizarAssinaturasExpiradas(result);

    return result;
  }

  /**
   * Verifica e atualiza automaticamente assinaturas que expiraram
   */
  private async atualizarAssinaturasExpiradas(
    assinaturas: Assinatura[],
  ): Promise<void> {
    const hoje = dayjs().tz('America/Sao_Paulo').startOf('day');

    const assinaturasParaAtualizar = assinaturas.filter((assinatura) => {
      if (assinatura.status === StatusAssinatura.ATIVA && assinatura.data_fim) {
        const dataFim = dayjs(assinatura.data_fim).tz('America/Sao_Paulo').startOf('day');
        return dataFim.isBefore(hoje);
      }
      return false;
    });

    if (assinaturasParaAtualizar.length > 0) {
      for (const assinatura of assinaturasParaAtualizar) {
        assinatura.status = StatusAssinatura.EXPIRADA;
        await this.assinaturaRepository.save(assinatura);
      }
    }
  }

  async findOne(id: string): Promise<Assinatura> {
    const assinatura = await this.assinaturaRepository.findOne({
      where: { id },
      relations: ['aluno', 'plano', 'unidade', 'faturas'],
    });

    if (!assinatura) {
      throw new NotFoundException(`Assinatura ${id} não encontrada`);
    }

    return assinatura;
  }

  async findByAluno(aluno_id: string): Promise<Assinatura[]> {
    return await this.assinaturaRepository.find({
      where: { aluno_id },
      relations: ['plano', 'unidade', 'faturas'],
      order: { created_at: 'DESC' },
    });
  }

  async update(
    id: string,
    updateAssinaturaDto: UpdateAssinaturaDto,
  ): Promise<Assinatura> {
    const assinatura = await this.findOne(id);
    Object.assign(assinatura, updateAssinaturaDto);
    return await this.assinaturaRepository.save(assinatura);
  }

  async cancelar(
    id: string,
    cancelarDto: CancelarAssinaturaDto,
    user: any,
  ): Promise<Assinatura> {
    // Buscar sem relações para evitar problema de aluno_id undefined
    const assinatura = await this.assinaturaRepository.findOne({
      where: { id },
    });

    if (!assinatura) {
      throw new NotFoundException(`Assinatura ${id} não encontrada`);
    }

    assinatura.status = StatusAssinatura.CANCELADA;
    assinatura.cancelado_por = user.id;
    assinatura.cancelado_em = dayjs().tz('America/Sao_Paulo').toDate();
    assinatura.motivo_cancelamento = cancelarDto.motivo_cancelamento;

    const result = await this.assinaturaRepository.save(assinatura);
    
    return result;
  }

  async pausar(id: string): Promise<Assinatura> {
    // Buscar sem relações para evitar problema de aluno_id undefined
    const assinatura = await this.assinaturaRepository.findOne({
      where: { id },
    });

    if (!assinatura) {
      throw new NotFoundException(`Assinatura ${id} não encontrada`);
    }

    assinatura.status = StatusAssinatura.PAUSADA;
    return await this.assinaturaRepository.save(assinatura);
  }

  async reativar(id: string): Promise<Assinatura> {
    const assinatura = await this.findOne(id);

    if (assinatura.status === StatusAssinatura.CANCELADA) {
      throw new BadRequestException(
        'Assinatura cancelada não pode ser reativada',
      );
    }

    assinatura.status = StatusAssinatura.ATIVA;

    // Recalcular próxima cobrança
    let proximaCobranca = dayjs().tz('America/Sao_Paulo').date(assinatura.dia_vencimento);
    if (proximaCobranca.isBefore(dayjs().tz('America/Sao_Paulo'))) {
      proximaCobranca = proximaCobranca.add(1, 'month');
    }
    assinatura.proxima_cobranca = proximaCobranca.toDate();

    return await this.assinaturaRepository.save(assinatura);
  }

  async renovar(id: string): Promise<Assinatura> {
    const assinatura = await this.findOne(id);

    if (assinatura.status === StatusAssinatura.CANCELADA) {
      throw new BadRequestException(
        'Assinatura cancelada não pode ser renovada',
      );
    }

    // Ativar a assinatura
    assinatura.status = StatusAssinatura.ATIVA;

    // Estender a data de fim se houver
    if (assinatura.data_fim) {
      const novaDataFim = dayjs(assinatura.data_fim).tz('America/Sao_Paulo').add(1, 'month');
      // Verificar se o plano é mensal, trimestral, semestral ou anual
      // Para simplificar, vamos adicionar 1 mês (30 dias)
      assinatura.data_fim = novaDataFim.toDate();
    }

    // Recalcular próxima cobrança
    let proximaCobranca = dayjs().tz('America/Sao_Paulo').date(assinatura.dia_vencimento);
    if (proximaCobranca.isBefore(dayjs().tz('America/Sao_Paulo'))) {
      proximaCobranca = proximaCobranca.add(1, 'month');
    }
    assinatura.proxima_cobranca = proximaCobranca.toDate();

    return await this.assinaturaRepository.save(assinatura);
  }

  async alterarPlano(
    id: string,
    alterarPlanoDto: AlterarPlanoDto,
  ): Promise<Assinatura> {
    const assinatura = await this.findOne(id);
    const novoPlano = await this.planoRepository.findOne({
      where: { id: alterarPlanoDto.novo_plano_id },
    });

    if (!novoPlano) {
      throw new NotFoundException('Novo plano não encontrado');
    }

    // Atualizar plano
    assinatura.plano_id = novoPlano.id;
    assinatura.valor = alterarPlanoDto.novo_valor || novoPlano.valor;

    // Recalcular data_fim
    const dataAtual = dayjs().tz('America/Sao_Paulo');
    const novaDataFim = dataAtual.add(novoPlano.duracao_meses, 'month');
    assinatura.data_fim = novaDataFim.toDate();

    return await this.assinaturaRepository.save(assinatura);
  }

  async marcarInadimplente(id: string): Promise<Assinatura> {
    const assinatura = await this.findOne(id);
    assinatura.status = StatusAssinatura.INADIMPLENTE;
    return await this.assinaturaRepository.save(assinatura);
  }

  async verificarInadimplencias(): Promise<void> {
    // Job para verificar assinaturas com 2+ faturas vencidas
    const assinaturas = await this.assinaturaRepository.find({
      where: { status: StatusAssinatura.ATIVA },
      relations: ['faturas'],
    });

    for (const assinatura of assinaturas) {
      const faturasVencidas = assinatura.faturas.filter(
        (f) => f.status === 'VENCIDA',
      );

      if (faturasVencidas.length >= 2) {
        await this.marcarInadimplente(assinatura.id);
      }
    }
  }

  /**
   * Atualiza o cartão de uma assinatura
   * Realiza cobrança teste de R$ 1,00 para validar o cartão
   * Salva novo token e reativa assinatura se estava inadimplente
   */
  async atualizarCartao(
    assinaturaId: string,
    dto: AtualizarCartaoDto,
    user: any,
  ): Promise<any> {
    this.logger.log(`💳 Atualizando cartão da assinatura ${assinaturaId}`);

    // 1. Buscar assinatura com relações
    const assinatura = await this.assinaturaRepository.findOne({
      where: { id: assinaturaId },
      relations: ['aluno', 'unidade', 'plano'],
    });

    if (!assinatura) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    // 2. Validar permissão (dono da assinatura ou admin)
    const isAdmin = user?.tipo_usuario === 'ADMIN' || 
                    user?.perfis?.some((p: any) => 
                      (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'ADMIN'
                    );
    
    const isOwner = user?.aluno_id === assinatura.aluno_id || 
                    user?.id === assinatura.aluno?.usuario_id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar o cartão desta assinatura'
      );
    }

    this.logger.log(`✅ Permissão validada: ${isAdmin ? 'ADMIN' : 'OWNER'}`);

    try {
      // 3. Criar fatura teste de R$ 1,00
      this.logger.log('📄 Criando fatura teste de R$ 1,00...');
      
      const numeroFatura = await this.gerarNumeroFatura();
      const faturaTest = this.faturaRepository.create({
        assinatura_id: assinatura.id,
        aluno_id: assinatura.aluno_id,
        numero_fatura: numeroFatura,
        descricao: 'Teste de validação de cartão',
        valor_original: 1.0,
        valor_desconto: 0,
        valor_acrescimo: 0,
        valor_total: 1.0,
        valor_pago: 0,
        data_vencimento: dayjs().tz('America/Sao_Paulo').toDate(),
        status: StatusFatura.PENDENTE,
        metodo_pagamento: 'CARTAO',
      });
      
      const faturaTestSalva = await this.faturaRepository.save(faturaTest);
      this.logger.log(`✅ Fatura teste criada: ${faturaTestSalva.numero_fatura}`);

      // 4. Processar cobrança teste COM tokenização
      this.logger.log('💳 Processando cobrança teste com tokenização...');
      
      const resultado = await this.paytimeIntegrationService
        .processarPrimeiraCobrancaComToken(
          {
            faturaId: faturaTestSalva.id,
            paymentType: 'CREDIT',
            installments: 1,
            interest: 'ESTABLISHMENT',
            card: dto.card,
            billing_address: dto.billing_address,
            session_id: dto.session_id,
            antifraud_type: (dto.antifraud_type === 'THREEDS' ? 'THREEDS' : 'IDPAY') as 'IDPAY' | 'THREEDS',
          },
          assinaturaId,
          user.id,
        );

      this.logger.log(`📊 Resultado da cobrança teste: ${resultado.status}`);

      // 5. Cancelar transação teste imediatamente (era só validação)
      if (resultado.paytime_transaction_id) {
        this.logger.log('↩️ Cancelando cobrança teste...');
        // TODO: Implementar estorno no PaytimeService se necessário
        // await this.paytimeService.reverseTransaction(resultado.paytime_transaction_id);
      }

      // 6. Marcar fatura teste como cancelada
      faturaTestSalva.status = StatusFatura.CANCELADA;
      await this.faturaRepository.save(faturaTestSalva);
      this.logger.log('✅ Fatura teste cancelada');

      // 7. Se estava INADIMPLENTE, reativar e cobrar dívidas
      const estavaInadimplente = assinatura.status === StatusAssinatura.INADIMPLENTE;
      
      if (estavaInadimplente) {
        this.logger.log('🔄 Assinatura estava INADIMPLENTE, reativando...');
        
        assinatura.status = StatusAssinatura.ATIVA;
        assinatura.retry_count = 0;
        await this.assinaturaRepository.save(assinatura);
        
        this.logger.log('✅ Assinatura reativada');

        // Buscar faturas pendentes para cobrar
        const faturasPendentes = await this.faturaRepository.find({
          where: {
            assinatura_id: assinaturaId,
            status: StatusFatura.PENDENTE,
          },
          order: { data_vencimento: 'ASC' },
        });

        this.logger.log(
          `💰 Cobrando ${faturasPendentes.length} faturas pendentes...`
        );

        // Cobrar cada fatura pendente com o novo token
        for (const fatura of faturasPendentes) {
          try {
            const resultadoCobranca = await this.paytimeIntegrationService
              .cobrarComToken(assinatura, fatura);
            
            if (resultadoCobranca.success) {
              this.logger.log(
                `✅ Fatura ${fatura.numero_fatura} paga com sucesso`
              );
            } else {
              this.logger.warn(
                `⚠️ Falha ao cobrar fatura ${fatura.numero_fatura}: ${resultadoCobranca.error}`
              );
            }
          } catch (error) {
            this.logger.error(
              `❌ Erro ao cobrar fatura ${fatura.numero_fatura}: ${error.message}`
            );
          }
        }
      }

      // 8. Retornar sucesso
      const assinaturaAtualizada = await this.assinaturaRepository.findOne({
        where: { id: assinaturaId },
      });

      if (!assinaturaAtualizada) {
        throw new NotFoundException('Assinatura não encontrada após atualização');
      }

      return {
        success: true,
        message: estavaInadimplente 
          ? 'Cartão atualizado e assinatura reativada com sucesso!'
          : 'Cartão atualizado com sucesso!',
        token_salvo: !!assinaturaAtualizada.token_cartao,
        dados_cartao: {
          last4: assinaturaAtualizada.dados_pagamento?.['last4'],
          brand: assinaturaAtualizada.dados_pagamento?.['brand'],
          exp_month: assinaturaAtualizada.dados_pagamento?.['exp_month'],
          exp_year: assinaturaAtualizada.dados_pagamento?.['exp_year'],
        },
        status: assinaturaAtualizada.status,
        reativada: estavaInadimplente,
      };

    } catch (error) {
      this.logger.error(
        `❌ Erro ao atualizar cartão: ${error.message}`,
        error.stack,
      );
      
      throw new BadRequestException(
        `Não foi possível validar o cartão: ${error.message}. ` +
        'Verifique os dados e tente novamente.'
      );
    }
  }
}

