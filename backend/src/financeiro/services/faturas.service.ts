import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Fatura, StatusFatura } from '../entities/fatura.entity';
import { Assinatura } from '../entities/assinatura.entity';
import { Aluno } from '../../people/entities/aluno.entity';
import {
  Transacao,
  TipoTransacao,
  OrigemTransacao,
  CategoriaTransacao,
  StatusTransacao,
} from '../entities/transacao.entity';
import {
  CreateFaturaDto,
  UpdateFaturaDto,
  BaixarFaturaDto,
} from '../dto/fatura.dto';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

// Configurar dayjs com plugins de timezone
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class FaturasService {
  private readonly logger = new Logger(FaturasService.name);

  constructor(
    @InjectRepository(Fatura)
    private faturaRepository: Repository<Fatura>,
    @InjectRepository(Assinatura)
    private assinaturaRepository: Repository<Assinatura>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Transacao)
    private transacaoRepository: Repository<Transacao>,
  ) {}

  async create(createFaturaDto: CreateFaturaDto, user: any): Promise<Fatura> {
    // Verificar aluno
    const aluno = await this.alunoRepository.findOne({
      where: { id: createFaturaDto.aluno_id },
    });
    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Gerar número da fatura
    const ultimaFatura = await this.faturaRepository
      .createQueryBuilder('fatura')
      .orderBy('fatura.created_at', 'DESC')
      .getOne();

    const proximoNumero = ultimaFatura
      ? parseInt(ultimaFatura.numero_fatura.split('-')[1]) + 1
      : 1;
    const numeroFatura = `FAT-${proximoNumero.toString().padStart(6, '0')}`;

    // Calcular valor total
    const valorTotal =
      createFaturaDto.valor_original -
      (createFaturaDto.valor_desconto || 0) +
      (createFaturaDto.valor_acrescimo || 0);

    const fatura = this.faturaRepository.create({
      ...createFaturaDto,
      numero_fatura: numeroFatura,
      valor_total: valorTotal,
      valor_desconto: createFaturaDto.valor_desconto || 0,
      valor_acrescimo: createFaturaDto.valor_acrescimo || 0,
      valor_pago: 0,
      status: StatusFatura.PENDENTE,
      criado_por: user.id,
    });

    return await this.faturaRepository.save(fatura);
  }

  async findAll(
    unidade_id?: string,
    status?: StatusFatura,
    mes?: string,
    franqueado_id?: string | null,
  ): Promise<Fatura[]> {
    const query = this.faturaRepository
      .createQueryBuilder('fatura')
      .leftJoinAndSelect('fatura.aluno', 'aluno')
      .leftJoinAndSelect('aluno.unidade', 'alunoUnidade')
      .leftJoinAndSelect('fatura.assinatura', 'assinatura')
      .leftJoinAndSelect('assinatura.plano', 'plano')
      .leftJoinAndSelect('assinatura.unidade', 'unidade')
      .orderBy('fatura.data_vencimento', 'DESC');

    // Se foi passado franqueado_id, filtrar pelas unidades desse franqueado
    if (franqueado_id) {
      query.andWhere(
        '(unidade.franqueado_id = :franqueado_id OR alunoUnidade.franqueado_id = :franqueado_id)',
        { franqueado_id },
      );
    } else if (unidade_id) {
      query.andWhere(
        '(unidade.id = :unidade_id OR alunoUnidade.id = :unidade_id)',
        { unidade_id },
      );
    }

    if (status) {
      query.andWhere('fatura.status = :status', { status });
    }

    if (mes) {
      const [ano, mesNum] = mes.split('-');
      const dataInicio = dayjs(`${ano}-${mesNum}-01`).tz('America/Sao_Paulo').startOf('month').toDate();
      const dataFim = dayjs(`${ano}-${mesNum}-01`).tz('America/Sao_Paulo').endOf('month').toDate();

      query.andWhere(
        'fatura.data_vencimento BETWEEN :dataInicio AND :dataFim',
        {
          dataInicio,
          dataFim,
        },
      );
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Fatura> {
    const fatura = await this.faturaRepository.findOne({
      where: { id },
      relations: [
        'aluno',
        'aluno.unidade',
        'assinatura',
        'assinatura.plano',
        'assinatura.unidade',
        'transacoes',
      ],
    });

    if (!fatura) {
      throw new NotFoundException(`Fatura ${id} não encontrada`);
    }

    return fatura;
  }

  async update(id: string, updateFaturaDto: UpdateFaturaDto): Promise<Fatura> {
    const fatura = await this.findOne(id);

    // Recalcular valor total se necessário
    if (
      updateFaturaDto.valor_original ||
      updateFaturaDto.valor_desconto ||
      updateFaturaDto.valor_acrescimo
    ) {
      const valorOriginal =
        updateFaturaDto.valor_original || fatura.valor_original;
      const valorDesconto =
        updateFaturaDto.valor_desconto !== undefined
          ? updateFaturaDto.valor_desconto
          : fatura.valor_desconto;
      const valorAcrescimo =
        updateFaturaDto.valor_acrescimo !== undefined
          ? updateFaturaDto.valor_acrescimo
          : fatura.valor_acrescimo;

      fatura.valor_total = valorOriginal - valorDesconto + valorAcrescimo;
    }

    Object.assign(fatura, updateFaturaDto);
    return await this.faturaRepository.save(fatura);
  }

  async baixar(
    id: string,
    baixarDto: BaixarFaturaDto,
    user: any,
  ): Promise<Fatura> {
    const fatura = await this.findOne(id);

    const valorPago = baixarDto.valor_pago || fatura.valor_total;

    // Validar valor maior que zero
    if (valorPago <= 0) {
      throw new BadRequestException(
        'O valor do pagamento deve ser maior que zero.',
      );
    }

    const dataPagamento = baixarDto.data_pagamento
      ? dayjs(baixarDto.data_pagamento).tz('America/Sao_Paulo').toDate()
      : dayjs().tz('America/Sao_Paulo').toDate();

    fatura.valor_pago = valorPago;
    fatura.data_pagamento = dataPagamento;
    fatura.metodo_pagamento = baixarDto.metodo_pagamento;
    fatura.status =
      valorPago >= fatura.valor_total
        ? StatusFatura.PAGA
        : StatusFatura.PARCIALMENTE_PAGA;

    if (baixarDto.observacoes) {
      fatura.observacoes = baixarDto.observacoes;
    }

    const faturaAtualizada = await this.faturaRepository.save(fatura);

    // Criar transação de entrada
    const transacao = this.transacaoRepository.create({
      tipo: TipoTransacao.ENTRADA,
      origem: OrigemTransacao.FATURA,
      categoria: CategoriaTransacao.MENSALIDADE,
      descricao: `Pagamento da fatura ${fatura.numero_fatura}`,
      aluno_id: fatura.aluno_id,
      fatura_id: fatura.id,
      unidade_id: fatura.assinatura?.unidade_id,
      valor: valorPago,
      data: dataPagamento,
      status: StatusTransacao.CONFIRMADA,
      metodo_pagamento: baixarDto.metodo_pagamento,
      criado_por: user.id,
    });

    await this.transacaoRepository.save(transacao);

    // Renovar assinatura automaticamente quando fatura é paga integralmente
    if (
      faturaAtualizada.status === StatusFatura.PAGA &&
      faturaAtualizada.assinatura_id
    ) {
      try {
        const assinatura = await this.assinaturaRepository.findOne({
          where: { id: faturaAtualizada.assinatura_id },
          relations: ['plano'],
        });

        if (assinatura && assinatura.plano) {
          const duracaoDias = assinatura.plano.duracao_dias || 30;

          // Estende a partir do data_fim atual (ou hoje se já expirou)
          const baseRenovacao = assinatura.data_fim
            ? dayjs(assinatura.data_fim).tz('America/Sao_Paulo')
            : dayjs().tz('America/Sao_Paulo');

          const novaDataFim = baseRenovacao
            .add(duracaoDias, 'day')
            .toDate();

          const novaProximaCobranca = dayjs(novaDataFim)
            .subtract(5, 'day')
            .toDate();

          assinatura.data_fim = novaDataFim;
          assinatura.proxima_cobranca = novaProximaCobranca;

          // Reativar assinatura se estava expirada ou inadimplente
          if (
            assinatura.status === 'EXPIRADA' ||
            assinatura.status === 'INADIMPLENTE'
          ) {
            assinatura.status = 'ATIVA' as any;
          }

          await this.assinaturaRepository.save(assinatura);

          this.logger.log(
            `🔄 Assinatura ${assinatura.id} renovada automaticamente: data_fim → ${dayjs(novaDataFim).format('DD/MM/YYYY')} (+${duracaoDias} dias)`,
          );

          // Gerar fatura do próximo mês
          await this.gerarProximaFatura(assinatura);
        }
      } catch (err) {
        // Não falha o pagamento por erro na renovação
        this.logger.error(
          `⚠️ Erro ao renovar assinatura ${faturaAtualizada.assinatura_id}: ${err.message}`,
        );
      }
    }

    return faturaAtualizada;
  }

  private async gerarProximaFatura(assinatura: Assinatura): Promise<void> {
    try {
      const hoje = dayjs().tz('America/Sao_Paulo');
      const diaVenc = assinatura.dia_vencimento || 10;

      // Vencimento no próximo mês no dia configurado da assinatura
      const proximoVencimento = hoje
        .add(1, 'month')
        .date(diaVenc)
        .startOf('day')
        .toDate();

      const inicioProximoMes = hoje.add(1, 'month').startOf('month').toDate();
      const fimProximoMes = hoje.add(1, 'month').endOf('month').toDate();

      // Verificar se já existe fatura para o próximo mês
      const faturaExistente = await this.faturaRepository
        .createQueryBuilder('f')
        .where('f.assinatura_id = :aid', { aid: assinatura.id })
        .andWhere('f.data_vencimento >= :inicio', { inicio: inicioProximoMes })
        .andWhere('f.data_vencimento <= :fim', { fim: fimProximoMes })
        .getOne();

      if (faturaExistente) {
        this.logger.log(`ℹ️ Fatura do próximo mês já existe para assinatura ${assinatura.id} (${faturaExistente.numero_fatura})`);
        return;
      }

      // Gerar número sequencial
      const ultimaFatura = await this.faturaRepository
        .createQueryBuilder('f')
        .orderBy('f.numero_fatura', 'DESC')
        .getOne();
      const proximoNum = ultimaFatura
        ? parseInt(ultimaFatura.numero_fatura.split('-')[1]) + 1
        : 1;
      const numeroFatura = `FAT-${proximoNum.toString().padStart(6, '0')}`;

      const mesVenc = proximoVencimento.getMonth() + 1;
      const anoVenc = proximoVencimento.getFullYear();

      await this.faturaRepository.save({
        numero_fatura: numeroFatura,
        assinatura_id: assinatura.id,
        aluno_id: assinatura.aluno_id,
        descricao: `Mensalidade - ${assinatura.plano.nome} - ${mesVenc.toString().padStart(2, '0')}/${anoVenc}`,
        valor_original: assinatura.valor,
        valor_desconto: 0,
        valor_acrescimo: 0,
        valor_total: assinatura.valor,
        valor_pago: 0,
        data_vencimento: proximoVencimento,
        status: StatusFatura.PENDENTE,
        metodo_pagamento: assinatura.metodo_pagamento,
      });

      this.logger.log(
        `📄 Próxima fatura gerada automaticamente: ${numeroFatura} — venc. ${dayjs(proximoVencimento).format('DD/MM/YYYY')}`,
      );
    } catch (err) {
      this.logger.error(`⚠️ Erro ao gerar próxima fatura para assinatura ${assinatura.id}: ${err.message}`);
    }
  }

  async cancelar(id: string, motivo: string): Promise<Fatura> {
    const fatura = await this.findOne(id);
    fatura.status = StatusFatura.CANCELADA;
    fatura.observacoes = `${fatura.observacoes || ''}\nCancelada: ${motivo}`;
    return await this.faturaRepository.save(fatura);
  }

  async verificarVencimentos(): Promise<void> {
    // Job para marcar faturas vencidas
    const hoje = dayjs().tz('America/Sao_Paulo').startOf('day').toDate();

    await this.faturaRepository
      .createQueryBuilder()
      .update(Fatura)
      .set({ status: StatusFatura.VENCIDA })
      .where('data_vencimento < :hoje', { hoje })
      .andWhere('status = :status', { status: StatusFatura.PENDENTE })
      .execute();
  }

  async contarPendentes(unidade_id?: string): Promise<number> {
    const query = this.faturaRepository
      .createQueryBuilder('fatura')
      .where('fatura.status IN (:...status)', {
        status: [StatusFatura.PENDENTE, StatusFatura.VENCIDA],
      });

    if (unidade_id) {
      query
        .leftJoin('fatura.assinatura', 'assinatura')
        .andWhere('assinatura.unidade_id = :unidade_id', { unidade_id });
    }

    return await query.getCount();
  }

  async somarPendentes(unidade_id?: string): Promise<number> {
    const query = this.faturaRepository
      .createQueryBuilder('fatura')
      .select('SUM(fatura.valor_total)', 'total')
      .where('fatura.status IN (:...status)', {
        status: [StatusFatura.PENDENTE, StatusFatura.VENCIDA],
      });

    if (unidade_id) {
      query
        .leftJoin('fatura.assinatura', 'assinatura')
        .andWhere('assinatura.unidade_id = :unidade_id', { unidade_id });
    }

    const result = await query.getRawOne();
    return parseFloat(result.total) || 0;
  }

  async contarAtrasadas(unidade_id?: string): Promise<number> {
    const query = this.faturaRepository
      .createQueryBuilder('fatura')
      .where('fatura.status = :status', { status: StatusFatura.VENCIDA });

    if (unidade_id) {
      query
        .leftJoin('fatura.assinatura', 'assinatura')
        .andWhere('assinatura.unidade_id = :unidade_id', { unidade_id });
    }

    return await query.getCount();
  }

  async findByAluno(alunoId: string): Promise<any[]> {
    this.logger.log(`🔍 Buscando faturas para aluno: ${alunoId}`);
    
    const faturas = await this.faturaRepository.find({
      where: { aluno_id: alunoId },
      relations: ['aluno', 'aluno.unidade', 'assinatura', 'assinatura.plano', 'transacoes'],
      order: { data_vencimento: 'DESC' },
    });
    
    this.logger.log(`📄 Encontradas ${faturas.length} faturas para o aluno ${alunoId}`);

    // Buscar TODAS as assinaturas do aluno que tenham token salvo
    const assinaturasComToken = await this.assinaturaRepository
      .createQueryBuilder('a')
      .select(['a.id', 'a.token_cartao', 'a.dados_pagamento'])
      .where('a.aluno_id = :alunoId', { alunoId })
      .andWhere('a.token_cartao IS NOT NULL')
      .getMany();
    this.logger.debug(`🔑 Assinaturas com token para aluno ${alunoId}: ${assinaturasComToken.length} | tokens: ${assinaturasComToken.map(a => a.token_cartao?.substring(0,8)).join(',')}`);
    const assinaturaComToken = assinaturasComToken[0] ?? null;
    
    // Log das assinaturas carregadas via relação nas faturas
    faturas.forEach(f => {
      if (f.assinatura) {
        this.logger.debug(`📋 Fatura ${f.numero_fatura} | assinatura.id=${f.assinatura.id} | token_cartao=${f.assinatura.token_cartao ? f.assinatura.token_cartao.substring(0,8)+'...' : 'null'}`);
      }
    });
    
    // Mapear adicionando card_info da transação confirmada de cartão (se houver)
    return faturas.map((f) => {
      const transacaoCartao = (f.transacoes || []).find(
        (t) =>
          t.metodo_pagamento === 'CARTAO' ||
          t.metodo_pagamento === 'CARTAO_CREDITO' ||
          t.paytime_payment_type === 'CREDIT' ||
          t.paytime_payment_type === 'DEBIT',
      );
      const cardInfo = transacaoCartao?.paytime_metadata
        ? {
            brand: transacaoCartao.paytime_metadata.brand_name || null,
            last4: transacaoCartao.paytime_metadata.last4_digits || null,
            holder: transacaoCartao.paytime_metadata.holder_name || null,
          }
        : null;

      // token_salvo = true se a assinatura DA FATURA tem token OU se qualquer assinatura do aluno tem
      const tokenNaAssinatura = !!(f.assinatura?.token_cartao);
      const tokenSalvo = tokenNaAssinatura || !!assinaturaComToken;

      // dados_pagamento: preferir da assinatura da fatura, fallback para a que tem token
      const dadosPgto = (f.assinatura as any)?.dados_pagamento
        || (assinaturaComToken as any)?.dados_pagamento
        || null;
      const cardInfoAssinatura = tokenSalvo && dadosPgto
        ? {
            brand: dadosPgto.brand || dadosPgto.brand_name || null,
            last4: dadosPgto.last4 || dadosPgto.last4_digits || null,
          }
        : null;

      const { transacoes, ...rest } = f as any;
      return { ...rest, card_info: cardInfo, token_salvo: tokenSalvo, card_info_assinatura: cardInfoAssinatura };
    });
  }

  async parcelarFatura(
    id: string,
    numeroParcelas: number,
    user: any,
  ): Promise<Fatura[]> {
    const faturaOriginal = await this.findOne(id);

    if (faturaOriginal.status === StatusFatura.PAGA) {
      throw new BadRequestException('Fatura já está paga');
    }

    if (numeroParcelas < 2 || numeroParcelas > 12) {
      throw new BadRequestException(
        'Número de parcelas deve estar entre 2 e 12',
      );
    }

    // Cancelar fatura original
    faturaOriginal.status = StatusFatura.CANCELADA;
    faturaOriginal.observacoes = `Parcelada em ${numeroParcelas}x`;
    await this.faturaRepository.save(faturaOriginal);

    // Criar parcelas
    const valorParcela = faturaOriginal.valor_total / numeroParcelas;
    const parcelas: Fatura[] = [];

    for (let i = 0; i < numeroParcelas; i++) {
      const dataVencimento = dayjs(faturaOriginal.data_vencimento)
        .tz('America/Sao_Paulo')
        .add(i, 'month')
        .toDate();

      const numeroFatura = await this.gerarNumeroFatura();

      const parcela = this.faturaRepository.create({
        numero_fatura: numeroFatura,
        assinatura_id: faturaOriginal.assinatura_id,
        aluno_id: faturaOriginal.aluno_id,
        descricao: `${faturaOriginal.descricao} - Parcela ${i + 1}/${numeroParcelas}`,
        valor_original: valorParcela,
        valor_desconto: 0,
        valor_acrescimo: 0,
        valor_total: valorParcela,
        valor_pago: 0,
        data_vencimento: dataVencimento,
        status: StatusFatura.PENDENTE,
        metodo_pagamento: faturaOriginal.metodo_pagamento,
        criado_por: user.id,
      });

      const parcelaSalva = await this.faturaRepository.save(parcela);
      parcelas.push(parcelaSalva);
    }

    return parcelas;
  }

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

  async gerarFaturasAssinaturas(unidadeId?: string): Promise<{
    geradas: number;
    faturas: Fatura[];
  }> {
    // Usar transaction com lock para evitar race condition
    return await this.faturaRepository.manager.transaction(async (transactionalEntityManager) => {
      // Buscar assinaturas ativas que precisam gerar fatura
      const query = transactionalEntityManager
        .getRepository(Assinatura)
        .createQueryBuilder('assinatura')
        .leftJoinAndSelect('assinatura.plano', 'plano')
        .leftJoinAndSelect('assinatura.aluno', 'aluno')
        .leftJoinAndSelect('assinatura.unidade', 'unidade')
        .where('assinatura.status = :status', { status: 'ATIVA' });

      if (unidadeId) {
        query.andWhere('assinatura.unidade_id = :unidadeId', { unidadeId });
      }

      const assinaturas = await query.getMany();

    if (assinaturas.length === 0) {
      return { geradas: 0, faturas: [] };
    }

    const hoje = dayjs().tz('America/Sao_Paulo').toDate();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Primeiro dia do mês atual
    const inicioMes = dayjs().tz('America/Sao_Paulo').startOf('month').toDate();

    // Buscar TODAS as faturas do mês atual em UMA única query
    const assinaturaIds = assinaturas.map(a => a.id);
      const faturasExistentes = await transactionalEntityManager
        .getRepository(Fatura)
        .createQueryBuilder('fatura')
        .where('fatura.assinatura_id IN (:...ids)', { ids: assinaturaIds })
        .andWhere('fatura.created_at >= :inicioMes', { inicioMes })
        .getMany();

      // Criar um Set com IDs de assinaturas que já têm fatura este mês
      const assinaturasComFatura = new Set(
        faturasExistentes.map(f => f.assinatura_id)
      );

      // Filtrar assinaturas que ainda não têm fatura
      const assinaturasSemFatura = assinaturas.filter(
        a => !assinaturasComFatura.has(a.id)
      );

      if (assinaturasSemFatura.length === 0) {
        return { geradas: 0, faturas: [] };
      }

      // Buscar o MAIOR número de fatura COM LOCK para evitar race condition
      const ultimaFatura = await transactionalEntityManager
        .getRepository(Fatura)
        .createQueryBuilder('fatura')
        .orderBy('fatura.numero_fatura', 'DESC')
        .setLock('pessimistic_write')
        .getOne();

      let proximoNumero = ultimaFatura
        ? parseInt(ultimaFatura.numero_fatura.split('-')[1]) + 1
        : 1;

      // Buscar apenas números próximos já existentes para evitar duplicação
      const inicioRange = Math.max(1, proximoNumero - 10);
      const fimRange = proximoNumero + assinaturasSemFatura.length + 10;
      
      const numerosNaRange = await transactionalEntityManager
        .getRepository(Fatura)
        .createQueryBuilder('fatura')
        .select('fatura.numero_fatura')
        .where('fatura.numero_fatura >= :inicio AND fatura.numero_fatura <= :fim', {
          inicio: `FAT-${inicioRange.toString().padStart(6, '0')}`,
          fim: `FAT-${fimRange.toString().padStart(6, '0')}`
        })
        .getMany();
      
      const numerosExistentes = new Set(numerosNaRange.map(f => f.numero_fatura));

      // Preparar todas as faturas para salvar em lote
      const faturasParaCriar: Partial<Fatura>[] = [];

      for (const assinatura of assinaturasSemFatura) {
        // Calcular data de vencimento baseada no dia_vencimento da assinatura
        const dataVencimento = dayjs()
          .tz('America/Sao_Paulo')
          .year(anoAtual)
          .month(mesAtual)
          .date(assinatura.dia_vencimento || 10)
          .startOf('day')
          .toDate();

        // Gerar número da fatura sequencialmente, pulando duplicados
        let numeroFatura: string;
        do {
          numeroFatura = `FAT-${proximoNumero.toString().padStart(6, '0')}`;
          proximoNumero++;
        } while (numerosExistentes.has(numeroFatura));

        // Adicionar ao Set para evitar duplicação neste mesmo lote
        numerosExistentes.add(numeroFatura);

        // Criar fatura
        faturasParaCriar.push({
          numero_fatura: numeroFatura,
          assinatura_id: assinatura.id,
          aluno_id: assinatura.aluno_id,
          descricao: `Mensalidade - ${assinatura.plano.nome} - ${(mesAtual + 1).toString().padStart(2, '0')}/${anoAtual}`,
          valor_original: assinatura.valor,
          valor_desconto: 0,
          valor_acrescimo: 0,
          valor_total: assinatura.valor,
          valor_pago: 0,
          data_vencimento: dataVencimento,
          status: StatusFatura.PENDENTE,
          metodo_pagamento: assinatura.metodo_pagamento,
        });
      }

      // Salvar TODAS as faturas em uma única operação dentro da transaction
      const faturasGeradas = await transactionalEntityManager
        .getRepository(Fatura)
        .save(faturasParaCriar);

      return {
        geradas: faturasGeradas.length,
        faturas: faturasGeradas,
      };
    });
  }
}
