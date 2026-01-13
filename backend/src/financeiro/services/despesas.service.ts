import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Despesa,
  StatusDespesa,
  CategoriaDespesa,
} from '../entities/despesa.entity';
import {
  Transacao,
  TipoTransacao,
  OrigemTransacao,
  StatusTransacao,
  CategoriaTransacao,
} from '../entities/transacao.entity';
import {
  CreateDespesaDto,
  UpdateDespesaDto,
  BaixarDespesaDto,
} from '../dto/despesa.dto';

@Injectable()
export class DespesasService {
  constructor(
    @InjectRepository(Despesa)
    private despesaRepository: Repository<Despesa>,
    @InjectRepository(Transacao)
    private transacaoRepository: Repository<Transacao>,
  ) {}

  /**
   * Mapeia categoria de despesa para categoria de transação
   */
  private mapCategoriaDespesaToTransacao(
    categoriaDespesa: CategoriaDespesa,
  ): CategoriaTransacao {
    const mapeamento: Record<CategoriaDespesa, CategoriaTransacao> = {
      [CategoriaDespesa.SISTEMA]: CategoriaTransacao.SISTEMA,
      [CategoriaDespesa.ALUGUEL]: CategoriaTransacao.ALUGUEL,
      [CategoriaDespesa.SALARIO]: CategoriaTransacao.SALARIO,
      [CategoriaDespesa.FORNECEDOR]: CategoriaTransacao.FORNECEDOR,
      [CategoriaDespesa.TAXA]: CategoriaTransacao.TAXA,
      // Mapear categorias de utilidades (agua, luz, internet, telefone) para UTILIDADE
      [CategoriaDespesa.AGUA]: CategoriaTransacao.UTILIDADE,
      [CategoriaDespesa.LUZ]: CategoriaTransacao.UTILIDADE,
      [CategoriaDespesa.INTERNET]: CategoriaTransacao.UTILIDADE,
      [CategoriaDespesa.TELEFONE]: CategoriaTransacao.UTILIDADE,
      // Mapear outras categorias para OUTRO
      [CategoriaDespesa.MANUTENCAO]: CategoriaTransacao.OUTRO,
      [CategoriaDespesa.MATERIAL]: CategoriaTransacao.OUTRO,
      [CategoriaDespesa.LIMPEZA]: CategoriaTransacao.OUTRO,
      [CategoriaDespesa.MARKETING]: CategoriaTransacao.OUTRO,
      [CategoriaDespesa.OUTRO]: CategoriaTransacao.OUTRO,
    };

    return mapeamento[categoriaDespesa] || CategoriaTransacao.OUTRO;
  }

  async create(
    createDespesaDto: CreateDespesaDto,
    user: any,
  ): Promise<Despesa> {
    // Validar valor maior que zero
    if (!createDespesaDto.valor || createDespesaDto.valor <= 0) {
      throw new BadRequestException(
        'O valor da despesa deve ser maior que zero.',
      );
    }

    const despesa = this.despesaRepository.create({
      ...createDespesaDto,
      criado_por: user.id,
    });

    return await this.despesaRepository.save(despesa);
  }

  async findAll(
    unidade_id?: string,
    status?: StatusDespesa,
    franqueado_id?: string | null,
  ): Promise<Despesa[]> {
    const query = this.despesaRepository
      .createQueryBuilder('despesa')
      .leftJoinAndSelect('despesa.unidade', 'unidade')
      .orderBy('despesa.data_vencimento', 'ASC');

    // Se foi passado franqueado_id, filtrar pelas unidades desse franqueado
    if (franqueado_id) {
      query.andWhere('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (unidade_id) {
      query.andWhere('despesa.unidade_id = :unidade_id', { unidade_id });
    }

    if (status) {
      query.andWhere('despesa.status = :status', { status });
    }

    const despesas = await query.getMany();

    // Atualizar status de despesas atrasadas automaticamente
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const despesasParaAtualizar = despesas.filter((despesa) => {
      if (despesa.status !== StatusDespesa.A_PAGAR) return false;
      
      const dataVencimento = new Date(despesa.data_vencimento);
      dataVencimento.setHours(0, 0, 0, 0);
      
      return dataVencimento < hoje;
    });

    if (despesasParaAtualizar.length > 0) {
      await this.despesaRepository
        .createQueryBuilder()
        .update(Despesa)
        .set({ status: StatusDespesa.ATRASADA })
        .where('id IN (:...ids)', { ids: despesasParaAtualizar.map(d => d.id) })
        .execute();

      // Atualizar os objetos em memória
      despesasParaAtualizar.forEach(d => d.status = StatusDespesa.ATRASADA);
    }

    return despesas;
  }

  async findOne(id: string): Promise<Despesa> {
    const despesa = await this.despesaRepository.findOne({
      where: { id },
      relations: ['unidade', 'transacoes'],
    });

    if (!despesa) {
      throw new NotFoundException(`Despesa ${id} não encontrada`);
    }

    return despesa;
  }

  async update(
    id: string,
    updateDespesaDto: UpdateDespesaDto,
  ): Promise<Despesa> {
    const despesa = await this.findOne(id);
    Object.assign(despesa, updateDespesaDto);
    const resultado = await this.despesaRepository.save(despesa);
    return resultado;
  }

  async baixar(
    id: string,
    baixarDto: BaixarDespesaDto,
    user: any,
  ): Promise<Despesa> {
    const despesa = await this.findOne(id);

    // Verificar se já existe transação para esta despesa (evita duplicação)
    const transacaoExistente = await this.transacaoRepository.findOne({
      where: {
        despesa_id: id,
        origem: OrigemTransacao.DESPESA,
      },
    });

    if (transacaoExistente) {
      // Se já existe transação, apenas atualizar status se necessário
      if (despesa.status !== StatusDespesa.PAGA) {
        despesa.status = StatusDespesa.PAGA;
        despesa.data_pagamento = baixarDto.data_pagamento
          ? new Date(baixarDto.data_pagamento)
          : new Date();
        despesa.pago_por = user?.id || null;
        if (baixarDto.observacoes) {
          despesa.observacoes = baixarDto.observacoes;
        }
        await this.despesaRepository.save(despesa);
      }
      return despesa;
    }

    const dataPagamento = baixarDto.data_pagamento
      ? new Date(baixarDto.data_pagamento)
      : new Date();

    despesa.data_pagamento = dataPagamento;
    despesa.status = StatusDespesa.PAGA;
    despesa.pago_por = user?.id || null;

    if (baixarDto.observacoes) {
      despesa.observacoes = baixarDto.observacoes;
    }

    const despesaAtualizada = await this.despesaRepository.save(despesa);

    // Criar transação de saída
    const transacao = this.transacaoRepository.create({
      tipo: TipoTransacao.SAIDA,
      origem: OrigemTransacao.DESPESA,
      categoria: this.mapCategoriaDespesaToTransacao(despesa.categoria),
      descricao: despesa.descricao,
      unidade_id: despesa.unidade_id,
      despesa_id: despesa.id,
      valor: despesa.valor,
      data: dataPagamento,
      status: StatusTransacao.CONFIRMADA,
      criado_por: user?.id || null,
    });

await this.transacaoRepository.save(transacao);
    return despesaAtualizada;
  }

  async remove(id: string): Promise<void> {
    const despesa = await this.findOne(id);

    // Validar se a despesa já foi paga
    if (despesa.status === StatusDespesa.PAGA) {
      throw new BadRequestException(
        'Não é possível excluir uma despesa que já foi paga.',
      );
    }

    despesa.status = StatusDespesa.CANCELADA;
    await this.despesaRepository.save(despesa);
  }

  async verificarVencimentos(): Promise<void> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    await this.despesaRepository
      .createQueryBuilder()
      .update(Despesa)
      .set({ status: StatusDespesa.ATRASADA })
      .where('data_vencimento < :hoje', { hoje })
      .andWhere('status = :status', { status: StatusDespesa.A_PAGAR })
      .execute();
  }

  async somarPendentes(unidade_id?: string): Promise<number> {
    const query = this.despesaRepository
      .createQueryBuilder('despesa')
      .select('SUM(despesa.valor)', 'total')
      .where('despesa.status IN (:...status)', {
        status: [StatusDespesa.A_PAGAR, StatusDespesa.ATRASADA],
      });

    if (unidade_id) {
      query.andWhere('despesa.unidade_id = :unidade_id', { unidade_id });
    }

    const result = await query.getRawOne();
    return parseFloat(result.total) || 0;
  }

  async contarPendentes(unidade_id?: string): Promise<number> {
    const query = this.despesaRepository
      .createQueryBuilder('despesa')
      .where('despesa.status IN (:...status)', {
        status: [StatusDespesa.A_PAGAR, StatusDespesa.ATRASADA],
      });

    if (unidade_id) {
      query.andWhere('despesa.unidade_id = :unidade_id', { unidade_id });
    }

    return await query.getCount();
  }
}
