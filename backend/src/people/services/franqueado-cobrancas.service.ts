import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { FranqueadoCobranca } from '../entities/franqueado-cobranca.entity';
import { FranqueadoCobrancaItem } from '../entities/franqueado-cobranca-item.entity';
import { FranqueadoSetupParcela } from '../entities/franqueado-setup-parcela.entity';
import { FranqueadoContrato } from '../entities/franqueado-contrato.entity';
import { FranqueadoHistoricoEvento } from '../entities/franqueado-historico-evento.entity';
import {
  CreateFranqueadoCobrancaDto,
  UpdateFranqueadoCobrancaDto,
  ListFranqueadoCobrancasDto,
  RegistrarPagamentoDto,
  CreateSetupParcelaDto,
  UpdateSetupParcelaDto,
  RegistrarPagamentoParcelaDto,
  GerarCobrancasDto,
  CreateCobrancaItemDto,
} from '../dto/franqueado-cobrancas.dto';

@Injectable()
export class FranqueadoCobrancasService {
  constructor(
    @InjectRepository(FranqueadoCobranca)
    private cobrancasRepo: Repository<FranqueadoCobranca>,
    @InjectRepository(FranqueadoCobrancaItem)
    private itensRepo: Repository<FranqueadoCobrancaItem>,
    @InjectRepository(FranqueadoSetupParcela)
    private parcelasRepo: Repository<FranqueadoSetupParcela>,
    @InjectRepository(FranqueadoContrato)
    private contratosRepo: Repository<FranqueadoContrato>,
    @InjectRepository(FranqueadoHistoricoEvento)
    private eventoRepo: Repository<FranqueadoHistoricoEvento>,
    private dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════════
  // COBRANÇAS
  // ══════════════════════════════════════════════════════════════

  async createCobranca(dto: CreateFranqueadoCobrancaDto): Promise<FranqueadoCobranca> {
    return await this.dataSource.transaction(async (manager) => {
      const { itens, ...cobrancaData } = dto;

      const cobranca = manager.create(FranqueadoCobranca, {
        ...(cobrancaData as import('typeorm').DeepPartial<FranqueadoCobranca>),
      });
      const saved = await manager.save(FranqueadoCobranca, cobranca);

      if (itens && itens.length > 0) {
        const itemEntities = itens.map((it: CreateCobrancaItemDto) =>
          manager.create(FranqueadoCobrancaItem, {
            ...(it as import('typeorm').DeepPartial<FranqueadoCobrancaItem>),
            cobranca_id: saved.id,
          }),
        );
        await manager.save(FranqueadoCobrancaItem, itemEntities);
      }

      return (await manager.findOne(FranqueadoCobranca, {
        where: { id: saved.id },
        relations: ['itens'],
      })) as FranqueadoCobranca;
    });
  }

  async findAllCobrancas(query: ListFranqueadoCobrancasDto): Promise<{
    items: FranqueadoCobranca[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.cobrancasRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.itens', 'itens')
      .leftJoinAndSelect('c.contrato', 'contrato')
      .leftJoinAndSelect('contrato.franqueado', 'franqueado')
      .orderBy('c.data_vencimento', 'DESC');

    if (query.contrato_id) {
      qb.andWhere('c.contrato_id = :cid', { cid: query.contrato_id });
    }
    if (query.status) {
      qb.andWhere('c.status = :s', { s: query.status });
    }
    if (query.competencia) {
      qb.andWhere('c.competencia = :comp', { comp: query.competencia });
    }

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { items, total, page, pageSize };
  }

  async findOneCobranca(id: string): Promise<FranqueadoCobranca> {
    const cobranca = await this.cobrancasRepo.findOne({
      where: { id },
      relations: ['itens', 'contrato', 'contrato.franqueado'],
    });
    if (!cobranca) throw new NotFoundException(`Cobrança ${id} não encontrada`);
    return cobranca;
  }

  async findCobrancasByContrato(
    contratoId: string,
  ): Promise<FranqueadoCobranca[]> {
    return this.cobrancasRepo.find({
      where: { contrato_id: contratoId },
      relations: ['itens'],
      order: { data_vencimento: 'DESC' },
    });
  }

  async updateCobranca(
    id: string,
    dto: UpdateFranqueadoCobrancaDto,
  ): Promise<FranqueadoCobranca> {
    const cobranca = await this.findOneCobranca(id);
    Object.assign(cobranca, dto);
    await this.cobrancasRepo.save(cobranca);
    return this.findOneCobranca(id);
  }

  async registrarPagamento(
    id: string,
    dto: RegistrarPagamentoDto,
  ): Promise<FranqueadoCobranca> {
    const cobranca = await this.findOneCobranca(id);
    cobranca.status = dto.status as FranqueadoCobranca['status'];
    if (dto.data_pagamento) cobranca.data_pagamento = dto.data_pagamento;
    if (dto.forma_pagamento) cobranca.forma_pagamento = dto.forma_pagamento;
    if (dto.observacao) cobranca.observacao = dto.observacao;
    await this.cobrancasRepo.save(cobranca);

    // Registrar evento de auditoria (fire-and-forget)
    const franqueadoId = cobranca.contrato?.franqueado_id;
    if (franqueadoId) {
      this.eventoRepo.save(
        this.eventoRepo.create({
          franqueado_id: franqueadoId,
          contrato_id: cobranca.contrato_id,
          tipo_evento: 'PAGAMENTO_REGISTRADO',
          descricao: `Pagamento registrado — competência ${cobranca.competencia ?? id} — status: ${dto.status}${dto.forma_pagamento ? ' — ' + dto.forma_pagamento : ''}`,
        } as import('typeorm').DeepPartial<FranqueadoHistoricoEvento>),
      ).catch(() => { /* não bloquear em erro de auditoria */ });
    }

    return this.findOneCobranca(id);
  }

  async removeCobranca(id: string): Promise<void> {
    const cobranca = await this.findOneCobranca(id);
    await this.cobrancasRepo.remove(cobranca);
  }

  // ── Geração automática ────────────────────────────────────────
  async gerarCobrancas(dto: GerarCobrancasDto): Promise<{
    geradas: number;
    ignoradas: number;
    erros: string[];
  }> {
    const qb = this.contratosRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.modulos', 'modulos')
      .where('c.ativo = true')
      .andWhere('c.status_contrato IN (:...status)', {
        status: ['EM_IMPLANTACAO', 'ATIVO'],
      });

    if (dto.contrato_ids && dto.contrato_ids.length > 0) {
      qb.andWhere('c.id IN (:...ids)', { ids: dto.contrato_ids });
    }

    const contratos = await qb.getMany();
    let geradas = 0;
    let ignoradas = 0;
    const erros: string[] = [];

    for (const contrato of contratos) {
      try {
        // Verificar se já existe cobrança para esta competência
        const existing = await this.cobrancasRepo.findOne({
          where: { contrato_id: contrato.id, competencia: dto.competencia },
        });
        if (existing) {
          ignoradas++;
          continue;
        }

        // Calcular valor total
        const mensalidade = Number(contrato.mensalidade_base ?? 0);
        const desconto = Number(contrato.desconto_mensal ?? 0);
        const modulosValor = (contrato.modulos ?? []).reduce(
          (sum, m) => sum + Number(m.valor_mensal_contratado ?? 0),
          0,
        );
        const valorTotal = mensalidade + modulosValor - desconto;

        // Verificar carência
        const dataInicioCobranca = contrato.data_inicio_cobranca;
        const competenciaDate = new Date(`${dto.competencia}-01`);
        const emCarencia =
          dataInicioCobranca &&
          competenciaDate < new Date(dataInicioCobranca);

        // Calcular dia de vencimento
        const [ano, mes] = dto.competencia.split('-');
        const diaVenc = contrato.dia_vencimento ?? 10;
        const dataVencimento = `${ano}-${mes}-${String(diaVenc).padStart(2, '0')}`;

        // Itens da cobrança
        const itens: Partial<FranqueadoCobrancaItem>[] = [];

        if (!emCarencia) {
          itens.push({
            tipo_item: 'MENSALIDADE_BASE',
            descricao: `Mensalidade base — ${dto.competencia}`,
            quantidade: 1,
            valor_unitario: mensalidade,
            valor_total: mensalidade,
          } as Partial<FranqueadoCobrancaItem>);

          for (const modulo of contrato.modulos ?? []) {
            if (modulo.status === 'ATIVO') {
              const vMod = Number(modulo.valor_mensal_contratado ?? 0);
              itens.push({
                tipo_item: 'MODULO_EXTRA',
                descricao: modulo.nome_comercial,
                referencia_id: modulo.id,
                quantidade: 1,
                valor_unitario: vMod,
                valor_total: vMod,
              } as Partial<FranqueadoCobrancaItem>);
            }
          }

          if (desconto > 0) {
            itens.push({
              tipo_item: 'DESCONTO',
              descricao: contrato.desconto_motivo ?? 'Desconto comercial',
              quantidade: 1,
              valor_unitario: -desconto,
              valor_total: -desconto,
            } as Partial<FranqueadoCobrancaItem>);
          }
        }

        await this.createCobranca({
          contrato_id: contrato.id,
          competencia: dto.competencia,
          data_emissao: new Date().toISOString().split('T')[0],
          data_vencimento: dataVencimento,
          valor_total: emCarencia ? 0 : valorTotal,
          status: emCarencia ? 'ISENTA' : 'PENDENTE',
          origem: 'AUTOMATICA',
          carencia_aplicada: !!emCarencia,
          itens: itens as CreateCobrancaItemDto[],
        });
        geradas++;
      } catch (err) {
        erros.push(`Contrato ${contrato.id}: ${(err as Error).message}`);
      }
    }

    return { geradas, ignoradas, erros };
  }

  // ══════════════════════════════════════════════════════════════
  // SETUP PARCELAS
  // ══════════════════════════════════════════════════════════════

  async createParcela(dto: CreateSetupParcelaDto): Promise<FranqueadoSetupParcela> {
    const parcela = this.parcelasRepo.create({
      ...(dto as import('typeorm').DeepPartial<FranqueadoSetupParcela>),
    });
    return this.parcelasRepo.save(parcela);
  }

  async gerarParcelas(contratoId: string): Promise<FranqueadoSetupParcela[]> {
    const contrato = await this.contratosRepo.findOne({
      where: { id: contratoId },
    });
    if (!contrato) throw new NotFoundException(`Contrato ${contratoId} não encontrado`);

    const totalSetup = Number(contrato.setup_valor_total ?? 0);
    const nParcelas = contrato.setup_parcelas ?? 1;

    if (totalSetup <= 0) throw new BadRequestException('Setup sem valor definido');

    // Verificar se já existem parcelas
    const existing = await this.parcelasRepo.count({ where: { contrato_id: contratoId } });
    if (existing > 0) throw new BadRequestException('Parcelas já geradas para este contrato');

    const valorParcela = parseFloat((totalSetup / nParcelas).toFixed(2));
    const hoje = new Date();
    const parcelas: FranqueadoSetupParcela[] = [];

    for (let i = 1; i <= nParcelas; i++) {
      const vencData = new Date(hoje);
      vencData.setMonth(vencData.getMonth() + i - 1);
      vencData.setDate(contrato.dia_vencimento ?? 10);
      const dataVenc = vencData.toISOString().split('T')[0];

      const parcela = this.parcelasRepo.create({
        contrato_id: contratoId,
        numero_parcela: i,
        total_parcelas: nParcelas,
        data_vencimento: dataVenc,
        valor_parcela: valorParcela,
        status: 'PENDENTE',
      } as import('typeorm').DeepPartial<FranqueadoSetupParcela>);

      parcelas.push(await this.parcelasRepo.save(parcela));
    }

    return parcelas;
  }

  async findParcelasByContrato(contratoId: string): Promise<FranqueadoSetupParcela[]> {
    return this.parcelasRepo.find({
      where: { contrato_id: contratoId },
      order: { numero_parcela: 'ASC' },
    });
  }

  async findOneParcela(id: string): Promise<FranqueadoSetupParcela> {
    const parcela = await this.parcelasRepo.findOne({ where: { id } });
    if (!parcela) throw new NotFoundException(`Parcela ${id} não encontrada`);
    return parcela;
  }

  async updateParcela(
    id: string,
    dto: UpdateSetupParcelaDto,
  ): Promise<FranqueadoSetupParcela> {
    const parcela = await this.findOneParcela(id);
    Object.assign(parcela, dto);
    return this.parcelasRepo.save(parcela);
  }

  async registrarPagamentoParcela(
    id: string,
    dto: RegistrarPagamentoParcelaDto,
  ): Promise<FranqueadoSetupParcela> {
    const parcela = await this.findOneParcela(id);
    parcela.status = dto.status as FranqueadoSetupParcela['status'];
    if (dto.data_pagamento) parcela.data_pagamento = dto.data_pagamento;
    if (dto.observacao) parcela.observacao = dto.observacao;
    const saved = await this.parcelasRepo.save(parcela);

    // Registrar evento de auditoria (fire-and-forget)
    const contrato = await this.contratosRepo.findOne({ where: { id: parcela.contrato_id } });
    if (contrato?.franqueado_id) {
      this.eventoRepo.save(
        this.eventoRepo.create({
          franqueado_id: contrato.franqueado_id,
          contrato_id: parcela.contrato_id,
          tipo_evento: 'PARCELA_PAGA',
          descricao: `Parcela ${parcela.numero_parcela}/${parcela.total_parcelas ?? '?'} de setup registrada — status: ${dto.status}`,
        } as import('typeorm').DeepPartial<FranqueadoHistoricoEvento>),
      ).catch(() => { /* não bloquear em erro de auditoria */ });
    }

    return saved;
  }

  async removeParcela(id: string): Promise<void> {
    const parcela = await this.findOneParcela(id);
    await this.parcelasRepo.remove(parcela);
  }

  // ══════════════════════════════════════════════════════════════
  // ESTATÍSTICAS / KPIs
  // ══════════════════════════════════════════════════════════════

  async getKpis(): Promise<{
    mrr: number;
    setupPendente: number;
    cobrancasAtrasadas: number;
    cobrancasVencendo7dias: number;
    totalCobrancasMes: number;
  }> {
    const hoje = new Date();
    const em7Dias = new Date(hoje);
    em7Dias.setDate(hoje.getDate() + 7);
    const hojeStr = hoje.toISOString().split('T')[0];
    const em7DiasStr = em7Dias.toISOString().split('T')[0];

    // MRR: soma de mensalidade_base + módulos ativos para contratos ativos
    const mrrRaw = await this.contratosRepo
      .createQueryBuilder('c')
      .leftJoin('c.modulos', 'm')
      .select([
        'SUM(CAST(c.mensalidade_base AS NUMERIC)) as base',
        'SUM(CASE WHEN m.status = \'ATIVO\' THEN CAST(m.valor_mensal_contratado AS NUMERIC) ELSE 0 END) as modulos',
        'SUM(CAST(c.desconto_mensal AS NUMERIC)) as descontos',
      ])
      .where('c.ativo = true')
      .andWhere('c.status_contrato = :s', { s: 'ATIVO' })
      .getRawOne();

    const mrr =
      Number(mrrRaw?.base ?? 0) +
      Number(mrrRaw?.modulos ?? 0) -
      Number(mrrRaw?.descontos ?? 0);

    // Setup pendente: parcelas PENDENTE ou ATRASADA
    const setupRaw = await this.parcelasRepo
      .createQueryBuilder('p')
      .select('SUM(CAST(p.valor_parcela AS NUMERIC))', 'total')
      .where('p.status IN (:...s)', { s: ['PENDENTE', 'ATRASADA'] })
      .getRawOne();

    const setupPendente = Number(setupRaw?.total ?? 0);

    // Cobranças atrasadas
    const cobrancasAtrasadas = await this.cobrancasRepo.count({
      where: { status: 'ATRASADA' },
    });

    // Cobranças vencendo nos próximos 7 dias (PENDENTE)
    const cobrancasVencendo7dias = await this.cobrancasRepo
      .createQueryBuilder('c')
      .where('c.status = :s', { s: 'PENDENTE' })
      .andWhere('c.data_vencimento >= :hoje', { hoje: hojeStr })
      .andWhere('c.data_vencimento <= :em7dias', { em7dias: em7DiasStr })
      .getCount();

    // Total faturado no mês corrente
    const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const mesRaw = await this.cobrancasRepo
      .createQueryBuilder('c')
      .select('SUM(CAST(c.valor_total AS NUMERIC))', 'total')
      .where('c.competencia = :comp', { comp: anoMes })
      .andWhere('c.status != :s', { s: 'CANCELADA' })
      .getRawOne();

    const totalCobrancasMes = Number(mesRaw?.total ?? 0);

    return {
      mrr,
      setupPendente,
      cobrancasAtrasadas,
      cobrancasVencendo7dias,
      totalCobrancasMes,
    };
  }
}
