import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Venda, StatusVenda } from '../entities/venda.entity';
import {
  Transacao,
  TipoTransacao,
  OrigemTransacao,
  StatusTransacao,
  CategoriaTransacao,
} from '../entities/transacao.entity';
import {
  CreateVendaDto,
  UpdateVendaDto,
  FiltroVendasDto,
} from '../dto/venda.dto';

@Injectable()
export class VendasService {
  constructor(
    @InjectRepository(Venda)
    private vendasRepository: Repository<Venda>,
    @InjectRepository(Transacao)
    private transacaoRepository: Repository<Transacao>,
    @Inject(DataSource) private dataSource: DataSource,
  ) {}

  async create(createVendaDto: CreateVendaDto, user: any): Promise<Venda> {
    // Gerar número da venda
    const numero_venda = await this.gerarNumeroVenda();

    const venda = this.vendasRepository.create({
      ...createVendaDto,
      numero_venda,
      status: StatusVenda.PENDENTE,
    });

    const vendaSalva = await this.vendasRepository.save(venda);

    // Aqui você pode chamar o gateway de pagamento para gerar link
    // await this.gerarLinkPagamento(vendaSalva);

    return this.findOne(vendaSalva.id);
  }

  async findAll(
    filtro: FiltroVendasDto,
    franqueado_id?: string | null,
  ): Promise<Venda[]> {
    const query = this.vendasRepository
      .createQueryBuilder('venda')
      .leftJoinAndSelect('venda.aluno', 'aluno')
      .leftJoinAndSelect('venda.unidade', 'unidade')
      .leftJoinAndSelect('venda.fatura', 'fatura');

    // Se foi passado franqueado_id, filtrar pelas unidades desse franqueado
    if (franqueado_id) {
      console.log(
        '🔍 [VENDAS SERVICE] Filtrando por franqueado_id:',
        franqueado_id,
      );
      query.andWhere('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (filtro.unidadeId) {
      query.andWhere('venda.unidade_id = :unidadeId', {
        unidadeId: filtro.unidadeId,
      });
    }

    if (filtro.alunoId) {
      query.andWhere('venda.aluno_id = :alunoId', { alunoId: filtro.alunoId });
    }

    if (filtro.status) {
      query.andWhere('venda.status = :status', { status: filtro.status });
    }

    if (filtro.metodo) {
      query.andWhere('venda.metodo_pagamento = :metodo', {
        metodo: filtro.metodo,
      });
    }

    if (filtro.dataInicio && filtro.dataFim) {
      query.andWhere('venda.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio: new Date(filtro.dataInicio),
        dataFim: new Date(filtro.dataFim),
      });
    }

    query.orderBy('venda.created_at', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Venda> {
    const venda = await this.vendasRepository.findOne({
      where: { id },
      relations: ['aluno', 'unidade', 'fatura'],
    });

    if (!venda) {
      throw new NotFoundException(`Venda com ID ${id} não encontrada`);
    }

    return venda;
  }

  async update(id: string, updateVendaDto: UpdateVendaDto): Promise<Venda> {
    const venda = await this.findOne(id);

    Object.assign(venda, updateVendaDto);

    if (updateVendaDto.status === StatusVenda.PAGO && !venda.data_pagamento) {
      venda.data_pagamento = new Date();
    }

    await this.vendasRepository.save(venda);

    return this.findOne(id);
  }

  async baixar(
    id: string,
    dados: { metodo_pagamento?: string; observacoes?: string },
    user: any,
  ): Promise<Venda> {
    const venda = await this.findOne(id);

    // Verificar se já existe transação para esta venda (evita duplicação)
    const transacaoExistente = await this.transacaoRepository.findOne({
      where: {
        venda_id: id,
        origem: OrigemTransacao.VENDA,
      },
    });

    if (transacaoExistente) {
      console.log('⚠️ [VENDAS] Transação já existe para venda:', id);
      // Se já existe transação, apenas atualizar o status da venda
      venda.status = StatusVenda.PAGO;
      venda.data_pagamento = new Date();

      if (dados.metodo_pagamento) {
        venda.metodo_pagamento = dados.metodo_pagamento as any;
      }

      await this.vendasRepository.save(venda);
      return this.findOne(id);
    }

    venda.status = StatusVenda.PAGO;
    venda.data_pagamento = new Date();

    if (dados.metodo_pagamento) {
      venda.metodo_pagamento = dados.metodo_pagamento as any;
    }

    await this.vendasRepository.save(venda);

    console.log('✅ [VENDAS] Criando transação para venda:', id);
    // Criar transação de entrada
    const transacao = this.transacaoRepository.create({
      tipo: TipoTransacao.ENTRADA,
      origem: OrigemTransacao.VENDA,
      categoria: CategoriaTransacao.PRODUTO,
      descricao: `Pagamento da venda ${venda.numero_venda} - ${venda.descricao}`,
      aluno_id: venda.aluno_id,
      unidade_id: venda.unidade_id,
      venda_id: id,
      valor: Number(venda.valor),
      data: new Date(),
      status: StatusTransacao.CONFIRMADA,
      metodo_pagamento: venda.metodo_pagamento as any,
      criado_por: user.id,
    });

    await this.transacaoRepository.save(transacao);

    return this.findOne(id);
  }

  async cancelar(id: string): Promise<Venda> {
    return this.update(id, { status: StatusVenda.CANCELADO });
  }

  async reenviarLink(
    vendaId: string,
    email?: string,
    telefone?: string,
  ): Promise<{ message: string; link?: string }> {
    const venda = await this.findOne(vendaId);

    if (venda.status === StatusVenda.PAGO) {
      return { message: 'Venda já foi paga' };
    }

    if (venda.status === StatusVenda.CANCELADO) {
      return { message: 'Venda cancelada' };
    }

    // Aqui você implementaria o envio real do link
    // Por enquanto, retorna o link existente
    return {
      message: 'Link de pagamento reenviado com sucesso',
      link: venda.link_pagamento,
    };
  }

  async processarWebhook(dados: any): Promise<void> {
    // Processar webhook do gateway de pagamento
    const { gateway_payment_id, status } = dados;

    const venda = await this.vendasRepository.findOne({
      where: { gateway_payment_id },
    });

    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    // Atualizar status baseado no webhook
    if (status === 'approved' || status === 'paid') {
      await this.update(venda.id, {
        status: StatusVenda.PAGO,
        dados_gateway: dados,
      });
    } else if (status === 'failed' || status === 'rejected') {
      await this.update(venda.id, {
        status: StatusVenda.FALHOU,
        dados_gateway: dados,
      });
    }
  }

  private async gerarNumeroVenda(): Promise<string> {
    const ano = new Date().getFullYear();
    const count = await this.vendasRepository.count();
    const numero = (count + 1).toString().padStart(6, '0');
    return `VND${ano}${numero}`;
  }

  async estatisticas(unidadeId?: string): Promise<any> {
    const baseQuery = this.vendasRepository.createQueryBuilder('venda');

    if (unidadeId) {
      baseQuery.where('venda.unidade_id = :unidadeId', { unidadeId });
    }

    const totalVendas = await baseQuery.getCount();

    // Query para vendas pagas
    const queryPagas = this.vendasRepository.createQueryBuilder('venda');
    if (unidadeId) {
      queryPagas.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const vendasPagas = await queryPagas
      .andWhere('venda.status = :status', { status: StatusVenda.PAGO })
      .getCount();

    // Query para vendas pendentes
    const queryPendentes = this.vendasRepository.createQueryBuilder('venda');
    if (unidadeId) {
      queryPendentes.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const vendasPendentes = await queryPendentes
      .andWhere('venda.status = :status', { status: StatusVenda.PENDENTE })
      .getCount();

    // Query para vendas falhas
    const queryFalhas = this.vendasRepository.createQueryBuilder('venda');
    if (unidadeId) {
      queryFalhas.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const vendasFalhas = await queryFalhas
      .andWhere('venda.status = :status', { status: StatusVenda.FALHOU })
      .getCount();

    // Valor total
    const queryValorTotal = this.vendasRepository.createQueryBuilder('venda');
    if (unidadeId) {
      queryValorTotal.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const valorTotal = await queryValorTotal
      .select('SUM(venda.valor)', 'total')
      .getRawOne();

    // Valor pago
    const queryValorPago = this.vendasRepository.createQueryBuilder('venda');
    if (unidadeId) {
      queryValorPago.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const valorPago = await queryValorPago
      .select('SUM(venda.valor)', 'total')
      .andWhere('venda.status = :status', { status: StatusVenda.PAGO })
      .getRawOne();

    console.log('📊 [VENDAS ESTATISTICAS SERVICE]', {
      unidadeId,
      totalVendas,
      vendasPagas,
      vendasPendentes,
      vendasFalhas,
      valorTotal: valorTotal?.total,
      valorPago: valorPago?.total,
    });

    return {
      totalVendas,
      vendasPagas,
      vendasPendentes,
      vendasFalhas,
      valorTotal: parseFloat(valorTotal?.total || 0),
      valorPago: parseFloat(valorPago?.total || 0),
    };
  }
}
