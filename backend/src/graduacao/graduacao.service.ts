import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FaixaDef } from './entities/faixa-def.entity';
import { AlunoFaixa } from './entities/aluno-faixa.entity';
import { AlunoFaixaGrau, OrigemGrau } from './entities/aluno-faixa-grau.entity';
import { AlunoGraduacao } from './entities/aluno-graduacao.entity';
import { Person, TipoCadastro } from '../people/entities/person.entity';
import { StatusGraduacaoDto } from './dto/status-graduacao.dto';
import {
  ProximoGraduarDto,
  ListaProximosGraduarDto,
} from './dto/proximos-graduar.dto';
import {
  ConcederGrauDto,
  GraduarFaixaDto,
  CriarFaixaAlunoDto,
} from './dto/conceder-grau.dto';

@Injectable()
export class GraduacaoService {
  constructor(
    @InjectRepository(FaixaDef)
    private faixaDefRepository: Repository<FaixaDef>,
    @InjectRepository(AlunoFaixa)
    private alunoFaixaRepository: Repository<AlunoFaixa>,
    @InjectRepository(AlunoFaixaGrau)
    private alunoFaixaGrauRepository: Repository<AlunoFaixaGrau>,
    @InjectRepository(AlunoGraduacao)
    private alunoGraduacaoRepository: Repository<AlunoGraduacao>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    private dataSource: DataSource,
  ) {}

  /**
   * Busca ou cria a faixa ativa do aluno
   */
  async getFaixaAtivaAluno(alunoId: string): Promise<AlunoFaixa | null> {
    const faixaAtiva = await this.alunoFaixaRepository.findOne({
      where: {
        aluno_id: alunoId,
        ativa: true,
      },
      relations: ['faixaDef', 'graus'],
    });

    return faixaAtiva;
  }

  /**
   * Obtém o status de graduação do aluno
   */
  async getStatusGraduacao(alunoId: string): Promise<StatusGraduacaoDto> {
    const aluno = await this.personRepository.findOne({
      where: { id: alunoId, tipo_cadastro: TipoCadastro.ALUNO },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);

    if (!faixaAtiva) {
      // Se não tem faixa ativa, criar uma baseada na faixa_atual do aluno
      if (aluno.faixa_atual) {
        const faixaDef = await this.faixaDefRepository.findOne({
          where: { codigo: aluno.faixa_atual },
        });

        if (faixaDef) {
          await this.criarFaixaAluno(alunoId, {
            faixaDefId: faixaDef.id,
            grausInicial: aluno.grau_atual || 0,
          });

          return this.getStatusGraduacao(alunoId); // Recursão para buscar novamente
        }
      }

      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    const faltamAulas = faixaAtiva.getAulasFaltantes();
    const prontoParaGraduar = faixaAtiva.isProntoParaGraduar();
    const progressoPercentual =
      faixaAtiva.faixaDef.aulas_por_grau > 0
        ? Math.min(
            1,
            faixaAtiva.presencas_no_ciclo / faixaAtiva.faixaDef.aulas_por_grau,
          )
        : 0;

    // Buscar próxima faixa na sequência
    const proximaFaixa = await this.getProximaFaixa(faixaAtiva.faixaDef.id);

    return {
      faixaAtual: faixaAtiva.faixaDef.nome_exibicao,
      corHex: faixaAtiva.faixaDef.cor_hex,
      grausAtual: faixaAtiva.graus_atual,
      grausMax: faixaAtiva.faixaDef.graus_max,
      aulasPorGrau: faixaAtiva.faixaDef.aulas_por_grau,
      presencasNoCiclo: faixaAtiva.presencas_no_ciclo,
      presencasTotalFaixa: faixaAtiva.presencas_total_fx,
      faltamAulas,
      prontoParaGraduar,
      progressoPercentual,
      proximaFaixa: proximaFaixa?.nome_exibicao,
      dtInicioFaixa: faixaAtiva.dt_inicio,
      alunoFaixaId: faixaAtiva.id,
    };
  }

  /**
   * Lista próximos alunos a graduar
   */
  async getProximosGraduar(params: {
    page?: number;
    pageSize?: number;
    unidadeId?: string;
    categoria?: 'adulto' | 'kids' | 'todos';
  }): Promise<ListaProximosGraduarDto> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 50));

    const query = this.alunoFaixaRepository
      .createQueryBuilder('af')
      .innerJoinAndSelect('af.faixaDef', 'fd')
      .innerJoinAndSelect('af.aluno', 'a')
      .where('af.ativa = :ativa', { ativa: true })
      .andWhere('a.tipo_cadastro = :tipo', { tipo: TipoCadastro.ALUNO })
      .andWhere('a.status = :status', { status: 'ATIVO' });

    // Filtro por unidade
    if (params.unidadeId) {
      query.andWhere('a.unidade_id = :unidadeId', {
        unidadeId: params.unidadeId,
      });
    }

    // Filtro por categoria
    if (params.categoria && params.categoria !== 'todos') {
      if (params.categoria === 'kids') {
        query.andWhere('fd.categoria = :categoria', { categoria: 'INFANTIL' });
      } else {
        query.andWhere('fd.categoria = :categoria', { categoria: 'ADULTO' });
      }
    }

    // Ordenar por quem está mais próximo de graduar
    query.addSelect(
      'CASE WHEN af.graus_atual >= fd.graus_max THEN 0 ' +
        'ELSE GREATEST(fd.aulas_por_grau - af.presencas_no_ciclo, 0) END',
      'faltam_aulas',
    );
    query.orderBy('faltam_aulas', 'ASC');
    query.addOrderBy('fd.ordem', 'ASC');

    // Paginação
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    // Mapear para DTO
    const proximosGraduar: ProximoGraduarDto[] = items.map((af) => {
      const faltamAulas = af.getAulasFaltantes();
      const prontoParaGraduar = af.isProntoParaGraduar();
      const progressoPercentual =
        af.faixaDef.aulas_por_grau > 0
          ? Math.min(1, af.presencas_no_ciclo / af.faixaDef.aulas_por_grau)
          : 0;

      return {
        alunoId: af.aluno.id,
        nomeCompleto: af.aluno.nome_completo,
        faixa: af.faixaDef.nome_exibicao,
        corHex: af.faixaDef.cor_hex,
        grausAtual: af.graus_atual,
        grausMax: af.faixaDef.graus_max,
        faltamAulas,
        prontoParaGraduar,
        progressoPercentual,
        unidadeId: af.aluno.unidade_id,
        presencasTotalFaixa: af.presencas_total_fx,
      };
    });

    return {
      items: proximosGraduar,
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  }

  /**
   * Concede um grau ao aluno
   */
  async concederGrau(
    alunoId: string,
    dto: ConcederGrauDto,
  ): Promise<AlunoFaixaGrau> {
    const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);

    if (!faixaAtiva) {
      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    if (faixaAtiva.graus_atual >= faixaAtiva.faixaDef.graus_max) {
      throw new BadRequestException(
        `Aluno já possui o número máximo de graus (${faixaAtiva.faixaDef.graus_max}) para esta faixa`,
      );
    }

    // Usar transação para garantir consistência
    return await this.dataSource.transaction(async (manager) => {
      // Incrementar grau e zerar contador do ciclo
      faixaAtiva.graus_atual += 1;
      faixaAtiva.presencas_no_ciclo = 0;
      await manager.save(faixaAtiva);

      // Registrar no histórico
      const grau = manager.create(AlunoFaixaGrau, {
        aluno_faixa_id: faixaAtiva.id,
        grau_num: faixaAtiva.graus_atual,
        observacao: dto.observacao,
        concedido_por: dto.concedidoPor,
        origem: OrigemGrau.MANUAL,
      });

      return await manager.save(grau);
    });
  }

  /**
   * Gradua o aluno para uma nova faixa
   */
  async graduarFaixa(
    alunoId: string,
    dto: GraduarFaixaDto,
  ): Promise<AlunoGraduacao> {
    const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);

    if (!faixaAtiva) {
      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    const faixaDestino = await this.faixaDefRepository.findOne({
      where: { id: dto.faixaDestinoId },
    });

    if (!faixaDestino) {
      throw new NotFoundException('Faixa de destino não encontrada');
    }

    // Verificar se a graduação faz sentido (ordem crescente)
    if (faixaDestino.ordem <= faixaAtiva.faixaDef.ordem) {
      throw new BadRequestException(
        'A faixa de destino deve ser superior à faixa atual',
      );
    }

    // Usar transação para garantir consistência
    return await this.dataSource.transaction(async (manager) => {
      // 1. Finalizar faixa atual
      faixaAtiva.ativa = false;
      faixaAtiva.dt_fim = new Date();
      await manager.save(faixaAtiva);

      // 2. Criar nova faixa ativa
      const novaFaixa = manager.create(AlunoFaixa, {
        aluno_id: alunoId,
        faixa_def_id: dto.faixaDestinoId,
        ativa: true,
        dt_inicio: new Date(),
        graus_atual: 0,
        presencas_no_ciclo: 0,
        presencas_total_fx: 0,
      });
      await manager.save(novaFaixa);

      // 3. Registrar graduação
      const graduacao = manager.create(AlunoGraduacao, {
        aluno_id: alunoId,
        faixa_origem_id: faixaAtiva.faixa_def_id,
        faixa_destino_id: dto.faixaDestinoId,
        observacao: dto.observacao,
        concedido_por: dto.concedidoPor,
      });
      const graduacaoSalva = await manager.save(graduacao);

      // 4. Atualizar campos na tabela Person (compatibilidade)
      await manager.update(Person, alunoId, {
        faixa_atual: faixaDestino.codigo,
        grau_atual: 0,
      });

      return graduacaoSalva;
    });
  }

  /**
   * Incrementa presença e verifica se deve conceder grau automaticamente
   */
  async incrementarPresenca(alunoId: string): Promise<{
    grauConcedido: boolean;
    statusAtualizado: StatusGraduacaoDto;
  }> {
    const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);

    if (!faixaAtiva) {
      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    let grauConcedido = false;

    await this.dataSource.transaction(async (manager) => {
      // Incrementar contadores
      faixaAtiva.presencas_no_ciclo += 1;
      faixaAtiva.presencas_total_fx += 1;

      // Verificar se pode conceder grau automaticamente
      if (faixaAtiva.podeReceberGrau()) {
        // Conceder grau
        faixaAtiva.graus_atual += 1;
        faixaAtiva.presencas_no_ciclo = 0;

        // Registrar no histórico
        const grau = manager.create(AlunoFaixaGrau, {
          aluno_faixa_id: faixaAtiva.id,
          grau_num: faixaAtiva.graus_atual,
          observacao:
            'Grau concedido automaticamente por atingir o número de presenças',
          origem: OrigemGrau.AUTOMATICO,
        });
        await manager.save(grau);

        grauConcedido = true;
      }

      await manager.save(faixaAtiva);
    });

    const statusAtualizado = await this.getStatusGraduacao(alunoId);

    return {
      grauConcedido,
      statusAtualizado,
    };
  }

  /**
   * Cria uma faixa para o aluno
   */
  async criarFaixaAluno(
    alunoId: string,
    dto: CriarFaixaAlunoDto,
  ): Promise<AlunoFaixa> {
    const aluno = await this.personRepository.findOne({
      where: { id: alunoId, tipo_cadastro: TipoCadastro.ALUNO },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const faixaDef = await this.faixaDefRepository.findOne({
      where: { id: dto.faixaDefId },
    });

    if (!faixaDef) {
      throw new NotFoundException('Faixa não encontrada');
    }

    // Verificar se já existe faixa ativa
    const faixaAtivaExistente = await this.alunoFaixaRepository.findOne({
      where: { aluno_id: alunoId, ativa: true },
    });

    if (faixaAtivaExistente) {
      throw new BadRequestException('Aluno já possui uma faixa ativa');
    }

    const novaFaixa = this.alunoFaixaRepository.create({
      aluno_id: alunoId,
      faixa_def_id: dto.faixaDefId,
      ativa: true,
      dt_inicio: dto.dtInicio || new Date(),
      graus_atual: dto.grausInicial || 0,
      presencas_no_ciclo: 0,
      presencas_total_fx: 0,
    });

    const faixaSalva = await this.alunoFaixaRepository.save(novaFaixa);

    // Atualizar campos na tabela Person (compatibilidade)
    await this.personRepository.update(alunoId, {
      faixa_atual: faixaDef.codigo,
      grau_atual: dto.grausInicial || 0,
    });

    return faixaSalva;
  }

  /**
   * Busca a próxima faixa na sequência
   */
  private async getProximaFaixa(
    faixaAtualId: string,
  ): Promise<FaixaDef | null> {
    const faixaAtual = await this.faixaDefRepository.findOne({
      where: { id: faixaAtualId },
    });

    if (!faixaAtual) {
      return null;
    }

    // Buscar próxima faixa na mesma categoria com ordem maior
    const proximaFaixa = await this.faixaDefRepository
      .createQueryBuilder('fd')
      .where('fd.categoria = :categoria', { categoria: faixaAtual.categoria })
      .andWhere('fd.ordem > :ordem', { ordem: faixaAtual.ordem })
      .andWhere('fd.ativo = :ativo', { ativo: true })
      .orderBy('fd.ordem', 'ASC')
      .getOne();

    return proximaFaixa;
  }

  /**
   * Lista todas as faixas disponíveis
   */
  async listarFaixas(categoria?: string): Promise<FaixaDef[]> {
    const query = this.faixaDefRepository
      .createQueryBuilder('fd')
      .where('fd.ativo = :ativo', { ativo: true });

    if (categoria) {
      query.andWhere('fd.categoria = :categoria', { categoria });
    }

    query.orderBy('fd.ordem', 'ASC');

    return await query.getMany();
  }

  /**
   * Busca o histórico de graduações realizadas
   */
  async getHistoricoGraduacoes(params: {
    page: number;
    pageSize: number;
    unidadeId?: string;
    alunoId?: string;
    categoria?: 'adulto' | 'kids' | 'todos';
  }) {
    const { page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    const query = this.alunoGraduacaoRepository
      .createQueryBuilder('ag')
      .innerJoinAndSelect('ag.aluno', 'a')
      .innerJoinAndSelect('ag.faixaOrigem', 'fo')
      .innerJoinAndSelect('ag.faixaDestino', 'fd')
      .orderBy('ag.created_at', 'DESC');

    // Filtros opcionais
    if (params.alunoId) {
      query.andWhere('ag.aluno_id = :alunoId', { alunoId: params.alunoId });
    }

    if (params.unidadeId) {
      query.andWhere('a.unidade_id = :unidadeId', {
        unidadeId: params.unidadeId,
      });
    }

    if (params.categoria && params.categoria !== 'todos') {
      const categoriaFiltro =
        params.categoria === 'kids' ? 'INFANTIL' : 'ADULTO';
      query.andWhere('fd.categoria = :categoria', {
        categoria: categoriaFiltro,
      });
    }

    const [items, total] = await query
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // Mapear para formato de resposta
    const historicoItems = items.map((graduacao) => ({
      id: graduacao.id,
      alunoId: graduacao.aluno_id,
      nomeAluno: graduacao.aluno.nome_completo,
      faixaAnterior: graduacao.faixaOrigem.nome_exibicao,
      faixaAnteriorCor: graduacao.faixaOrigem.cor_hex,
      novaFaixa: graduacao.faixaDestino.nome_exibicao,
      novaFaixaCor: graduacao.faixaDestino.cor_hex,
      dataGraduacao: graduacao.created_at,
      observacao: graduacao.observacao,
      concedidoPor: graduacao.concedido_por,
      unidadeId: graduacao.aluno.unidade_id,
    }));

    return {
      items: historicoItems,
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  }
}
