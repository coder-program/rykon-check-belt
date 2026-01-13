import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
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
    // Validar valor maior que zero
    if (!createVendaDto.valor || createVendaDto.valor <= 0) {
      throw new BadRequestException(
        'O valor da venda deve ser maior que zero.',
      );
    }

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

    // Buscar dados do aluno
    const telefoneDestino = telefone || venda.aluno?.telefone;
    const emailDestino = email || venda.aluno?.email;
    const nomeAluno = venda.aluno?.nome_completo || 'Cliente';

    if (telefoneDestino) {
      await this.enviarWhatsApp(
        telefoneDestino,
        nomeAluno,
        venda.numero_venda,
        venda.valor,
        venda.link_pagamento,
      );
    }

    return {
      message: 'Link de pagamento enviado com sucesso',
      link: venda.link_pagamento,
    };
  }

  private async enviarWhatsApp(
    telefone: string,
    nomeAluno: string,
    numeroVenda: string,
    valor: number,
    linkPagamento?: string,
  ): Promise<void> {
    try {
      // Limpar telefone (remover caracteres especiais)
      const telefoneLimpo = telefone.replace(/\D/g, '');

      // Verificar se tem WhatsApp API configurado
      const config = await this.dataSource.query(
        `SELECT whatsapp_api_url, whatsapp_api_token
         FROM teamcruz.configuracoes_cobranca
         LIMIT 1`,
      );

      if (!config || !config[0]?.whatsapp_api_url) {
        return;
      }

      const { whatsapp_api_url, whatsapp_api_token } = config[0];

      // Montar mensagem
      const mensagem = `Olá *${nomeAluno}*! 👋

Você tem uma venda pendente:

📋 *Venda:* ${numeroVenda}
💰 *Valor:* R$ ${Number(valor).toFixed(2)}

${linkPagamento ? `🔗 *Link de Pagamento:*\n${linkPagamento}\n\n` : ''}Qualquer dúvida, estamos à disposição! 😊`;

      // Enviar para API do WhatsApp
      const response = await fetch(whatsapp_api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${whatsapp_api_token}`,
        },
        body: JSON.stringify({
          number: telefoneLimpo,
          message: mensagem,
        }),
      });

      if (response.ok) {
      } else {
        console.error('❌ [WHATSAPP] Erro ao enviar:', await response.text());
      }
    } catch (error) {
      console.error('❌ [WHATSAPP] Erro:', error);
    }
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

    // Buscar a última venda do ano para pegar o último número
    const ultimaVenda = await this.vendasRepository
      .createQueryBuilder('venda')
      .where('venda.numero_venda LIKE :prefixo', { prefixo: `VND${ano}%` })
      .orderBy('venda.created_at', 'DESC')
      .getOne();

    let proximoNumero = 1;

    if (ultimaVenda) {
      // Extrair o número da venda (ex: VND2025000013 -> 13)
      const numeroAtual = parseInt(ultimaVenda.numero_venda.slice(-6));
      proximoNumero = numeroAtual + 1;
    }

    const numero = proximoNumero.toString().padStart(6, '0');
    return `VND${ano}${numero}`;
  }

  async estatisticas(
    unidadeId?: string,
    franqueado_id?: string | null,
  ): Promise<any> {
    const baseQuery = this.vendasRepository
      .createQueryBuilder('venda')
      .leftJoin('venda.unidade', 'unidade');

    // Se foi passado franqueado_id, filtrar pelas unidades desse franqueado
    if (franqueado_id) {
      baseQuery.where('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (unidadeId) {
      baseQuery.where('venda.unidade_id = :unidadeId', { unidadeId });
    }

    const totalVendas = await baseQuery.getCount();

    // Query para vendas pagas
    const queryPagas = this.vendasRepository
      .createQueryBuilder('venda')
      .leftJoin('venda.unidade', 'unidade');
    if (franqueado_id) {
      queryPagas.where('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (unidadeId) {
      queryPagas.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const vendasPagas = await queryPagas
      .andWhere('venda.status = :status', { status: StatusVenda.PAGO })
      .getCount();

    // Query para vendas pendentes
    const queryPendentes = this.vendasRepository
      .createQueryBuilder('venda')
      .leftJoin('venda.unidade', 'unidade');
    if (franqueado_id) {
      queryPendentes.where('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (unidadeId) {
      queryPendentes.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const vendasPendentes = await queryPendentes
      .andWhere('venda.status = :status', { status: StatusVenda.PENDENTE })
      .getCount();

    // Query para vendas falhas
    const queryFalhas = this.vendasRepository
      .createQueryBuilder('venda')
      .leftJoin('venda.unidade', 'unidade');
    if (franqueado_id) {
      queryFalhas.where('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (unidadeId) {
      queryFalhas.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const vendasFalhas = await queryFalhas
      .andWhere('venda.status = :status', { status: StatusVenda.FALHOU })
      .getCount();

    // Valor total
    const queryValorTotal = this.vendasRepository
      .createQueryBuilder('venda')
      .leftJoin('venda.unidade', 'unidade');
    if (franqueado_id) {
      queryValorTotal.where('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (unidadeId) {
      queryValorTotal.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const valorTotal = await queryValorTotal
      .select('SUM(venda.valor)', 'total')
      .getRawOne();

    // Valor pago
    const queryValorPago = this.vendasRepository
      .createQueryBuilder('venda')
      .leftJoin('venda.unidade', 'unidade');
    if (franqueado_id) {
      queryValorPago.where('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (unidadeId) {
      queryValorPago.where('venda.unidade_id = :unidadeId', { unidadeId });
    }
    const valorPago = await queryValorPago
      .select('SUM(venda.valor)', 'total')
      .andWhere('venda.status = :status', { status: StatusVenda.PAGO })
      .getRawOne();

    return {
      totalVendas,
      vendasPagas,
      vendasPendentes,
      vendasFalhas,
      valorTotal: parseFloat(valorTotal?.total || 0),
      valorPago: parseFloat(valorPago?.total || 0),
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const venda = await this.findOne(id);

    // Validar se a venda pode ser excluída
    if (venda.status === StatusVenda.PAGO) {
      throw new BadRequestException(
        'Não é possível excluir uma venda que já foi paga',
      );
    }

    // Verificar se existe transação associada
    const transacao = await this.transacaoRepository.findOne({
      where: {
        venda_id: id,
        origem: OrigemTransacao.VENDA,
        status: StatusTransacao.CONFIRMADA,
      },
    });

    if (transacao) {
      throw new BadRequestException(
        'Não é possível excluir uma venda com transação confirmada',
      );
    }

    // Se existir transação pendente, deletar junto
    await this.transacaoRepository.delete({
      venda_id: id,
      origem: OrigemTransacao.VENDA,
    });

    // Deletar a venda
    await this.vendasRepository.remove(venda);
    return {
      message: 'Venda excluída com sucesso',
    };
  }
}
