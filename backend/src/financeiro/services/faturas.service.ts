import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

@Injectable()
export class FaturasService {
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
  ): Promise<Fatura[]> {
    const query = this.faturaRepository
      .createQueryBuilder('fatura')
      .leftJoinAndSelect('fatura.aluno', 'aluno')
      .leftJoinAndSelect('fatura.assinatura', 'assinatura')
      .leftJoinAndSelect('assinatura.plano', 'plano')
      .leftJoinAndSelect('assinatura.unidade', 'unidade')
      .orderBy('fatura.data_vencimento', 'DESC');

    if (unidade_id) {
      query.andWhere('unidade.id = :unidade_id', { unidade_id });
    }

    if (status) {
      query.andWhere('fatura.status = :status', { status });
    }

    if (mes) {
      const [ano, mesNum] = mes.split('-');
      const dataInicio = new Date(parseInt(ano), parseInt(mesNum) - 1, 1);
      const dataFim = new Date(parseInt(ano), parseInt(mesNum), 0);

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
    const dataPagamento = baixarDto.data_pagamento
      ? new Date(baixarDto.data_pagamento)
      : new Date();

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

    const transacaoSalva = await this.transacaoRepository.save(transacao);

    return faturaAtualizada;
  }

  async cancelar(id: string, motivo: string): Promise<Fatura> {
    const fatura = await this.findOne(id);
    fatura.status = StatusFatura.CANCELADA;
    fatura.observacoes = `${fatura.observacoes || ''}\nCancelada: ${motivo}`;
    return await this.faturaRepository.save(fatura);
  }

  async verificarVencimentos(): Promise<void> {
    // Job para marcar faturas vencidas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

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

  async findByAluno(alunoId: string): Promise<Fatura[]> {
    return await this.faturaRepository.find({
      where: { aluno_id: alunoId },
      relations: ['assinatura', 'assinatura.plano'],
      order: { data_vencimento: 'DESC' },
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
      const dataVencimento = new Date(faturaOriginal.data_vencimento);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);

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
    // Buscar assinaturas ativas que precisam gerar fatura
    const query = this.assinaturaRepository
      .createQueryBuilder('assinatura')
      .leftJoinAndSelect('assinatura.plano', 'plano')
      .leftJoinAndSelect('assinatura.aluno', 'aluno')
      .leftJoinAndSelect('assinatura.unidade', 'unidade')
      .where('assinatura.status = :status', { status: 'ATIVA' });

    if (unidadeId) {
      query.andWhere('assinatura.unidade_id = :unidadeId', { unidadeId });
    }

    const assinaturas = await query.getMany();

    const faturasGeradas: Fatura[] = [];
    const hoje = new Date();

    for (const assinatura of assinaturas) {
      // Verificar se já existe fatura para o período atual
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();

      const faturaExistente = await this.faturaRepository.findOne({
        where: {
          assinatura_id: assinatura.id,
        },
        order: {
          created_at: 'DESC',
        },
      });

      // Se já existe fatura deste mês, pular
      if (faturaExistente) {
        const dataFatura = new Date(faturaExistente.created_at);
        if (
          dataFatura.getMonth() === mesAtual &&
          dataFatura.getFullYear() === anoAtual
        ) {
          continue;
        }
      }

      // Calcular data de vencimento baseada no dia_vencimento da assinatura
      const dataVencimento = new Date(
        anoAtual,
        mesAtual,
        assinatura.dia_vencimento || 10,
      );

      // Gerar número da fatura
      const numeroFatura = await this.gerarNumeroFatura();

      // Criar fatura
      const fatura = this.faturaRepository.create({
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

      const faturaSalva = await this.faturaRepository.save(fatura);
      faturasGeradas.push(faturaSalva);
    }

    return {
      geradas: faturasGeradas.length,
      faturas: faturasGeradas,
    };
  }
}
