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
import { Aluno } from '../people/entities/aluno.entity';
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
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
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
    console.log(
      '🥋 [getStatusGraduacao] Buscando status de graus para aluno (usuario_id):',
      alunoId,
    );

    // Buscar aluno pelo usuario_id (que é o que vem no JWT)
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: alunoId },
    });

    if (!aluno) {
      console.log(
        '❌ [getStatusGraduacao] Aluno não encontrado com usuario_id:',
        alunoId,
      );
      throw new NotFoundException('Aluno não encontrado');
    }

    console.log(
      '👤 [getStatusGraduacao] Aluno encontrado:',
      aluno.nome_completo,
      'Faixa atual:',
      aluno.faixa_atual,
      'Graus:',
      aluno.graus,
    );

    const faixaAtiva = await this.getFaixaAtivaAluno(aluno.id);
    console.log(
      '🎯 [getStatusGraduacao] Faixa ativa encontrada:',
      faixaAtiva
        ? `${faixaAtiva.faixaDef?.nome_exibicao} (${faixaAtiva.graus_atual} graus)`
        : 'Nenhuma',
    );

    if (!faixaAtiva) {
      // Se não tem faixa ativa, criar uma baseada na faixa_atual do aluno
      if (aluno.faixa_atual) {
        const faixaDef = await this.faixaDefRepository.findOne({
          where: { codigo: aluno.faixa_atual },
        });

        if (faixaDef) {
          await this.criarFaixaAluno(aluno.id, {
            faixaDefId: faixaDef.id,
            grausInicial: aluno.graus || 0,
          });

          return this.getStatusGraduacao(alunoId); // Recursão para buscar novamente
        }
      }

      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    const faltamAulas = faixaAtiva.getAulasFaltantes();
    const progresso = faixaAtiva.getProgressoGraduacao();
    const prontoParaProximoGrau = faixaAtiva.podeReceberGrau();

    // Progresso baseado no que estiver mais próximo de completar
    const progressoPercentual = Math.max(progresso.aulas, progresso.tempo);

    // Buscar próxima faixa na sequência
    const proximaFaixa = await this.getProximaFaixa(faixaAtiva.faixaDef.id);

    // Calcular tempo na faixa
    const agora = new Date();
    const dataInicio =
      faixaAtiva.dt_inicio instanceof Date
        ? faixaAtiva.dt_inicio
        : new Date(faixaAtiva.dt_inicio);
    const tempoNaFaixa = agora.getTime() - dataInicio.getTime();
    const diasNaFaixa = Math.floor(tempoNaFaixa / (1000 * 60 * 60 * 24));
    const tempoMinimo = faixaAtiva.faixaDef.codigo === 'BRANCA' ? 365 : 730;
    const diasRestantes = Math.max(0, tempoMinimo - diasNaFaixa);

    return {
      faixaAtual: faixaAtiva.faixaDef.nome_exibicao,
      corHex: faixaAtiva.faixaDef.cor_hex,
      grausAtual: faixaAtiva.graus_atual,
      grausMax: faixaAtiva.faixaDef.graus_max,
      aulasPorGrau: faixaAtiva.faixaDef.aulas_por_grau,
      presencasNoCiclo: faixaAtiva.presencas_no_ciclo,
      presencasTotalFaixa: faixaAtiva.presencas_total_fx,
      faltamAulas,
      prontoParaGraduar: prontoParaProximoGrau,
      progressoPercentual,
      progressoAulas: progresso.aulas,
      progressoTempo: progresso.tempo,
      diasNaFaixa,
      diasRestantes,
      tempoMinimoAnos: faixaAtiva.faixaDef.codigo === 'BRANCA' ? 1 : 2,
      proximaFaixa: proximaFaixa?.nome_exibicao,
      dtInicioFaixa: dataInicio,
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
    // Desabilitado para evitar consultas automáticas ao banco
    console.log(
      'getProximosGraduar desabilitado - não executando query automática',
    );

    return {
      items: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      hasNextPage: false,
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

  /**
   * Obtém a graduação atual do usuário logado
   */
  async getMinhaGraduacao(userId: string) {
    const faixaAtiva = await this.getFaixaAtivaAluno(userId);

    if (!faixaAtiva) {
      return {
        id: null,
        faixa: 'Branca',
        grau: 1,
        dataConcessao: new Date().toISOString(),
        pontosAtuais: 0,
        pontosNecessarios: 100,
        proximaFaixa: 'Azul',
        proximoGrau: 1,
        tempoNaGraduacao: '0 meses',
      };
    }

    const statusAtual = await this.getStatusGraduacao(userId);
    const proximaGraduacao = await this.calcularProximaGraduacao(faixaAtiva);

    const tempoNaGraduacao = this.calcularTempoNaGraduacao(
      faixaAtiva.created_at,
    );

    return {
      id: faixaAtiva.id,
      faixa: faixaAtiva.faixaDef.nome_exibicao,
      grau: faixaAtiva.graus_atual,
      dataConcessao: faixaAtiva.created_at.toISOString(),
      pontosAtuais: statusAtual.presencasNoCiclo,
      pontosNecessarios: statusAtual.aulasPorGrau,
      proximaFaixa: proximaGraduacao.faixa,
      proximoGrau: proximaGraduacao.grau,
      tempoNaGraduacao,
    };
  }

  /**
   * Histórico de graduações do usuário
   */
  async getMeuHistorico(userId: string) {
    const graduacoes = await this.alunoGraduacaoRepository.find({
      where: { aluno_id: userId },
      relations: ['faixaOrigem', 'faixaDestino'],
      order: { created_at: 'DESC' },
    });

    return graduacoes.map((graduacao) => ({
      id: graduacao.id,
      faixa: graduacao.faixaDestino.nome_exibicao,
      grau: 1, // Assumindo grau 1 por padrão, ajustar conforme necessário
      dataConcessao: graduacao.created_at.toISOString(),
      professor: graduacao.concedido_por || 'Sistema',
      observacoes: graduacao.observacao,
    }));
  }

  /**
   * Competências técnicas do usuário
   */
  async getMinhasCompetencias(userId: string) {
    // Por enquanto retornar dados mockados, mas pode ser implementado com uma tabela específica
    const faixaAtiva = await this.getFaixaAtivaAluno(userId);

    if (!faixaAtiva) {
      return [];
    }

    // Competências baseadas na faixa atual
    const competenciasPorFaixa = {
      Branca: [
        {
          nome: 'Posição Básica',
          categoria: 'Fundamentos',
          dominada: true,
          progresso: 100,
          descricao: 'Postura correta e movimentação básica',
        },
        {
          nome: 'Guarda Fechada',
          categoria: 'Posições',
          dominada: false,
          progresso: 60,
          descricao: 'Controle e manutenção da guarda fechada',
        },
      ],
      Azul: [
        {
          nome: 'Guarda Fechada',
          categoria: 'Posições',
          dominada: true,
          progresso: 100,
          descricao: 'Domínio completo da guarda fechada',
        },
        {
          nome: 'Passagem de Guarda',
          categoria: 'Técnicas',
          dominada: false,
          progresso: 75,
          descricao: 'Técnicas de passagem de guarda',
        },
        {
          nome: 'Finalizações Básicas',
          categoria: 'Submissões',
          dominada: false,
          progresso: 65,
          descricao: 'Armlock, triângulo e estrangulamentos',
        },
      ],
    };

    return competenciasPorFaixa[faixaAtiva.faixaDef.nome_exibicao] || [];
  }

  /**
   * Objetivos do usuário
   */
  async getMeusObjetivos(userId: string) {
    const faixaAtiva = await this.getFaixaAtivaAluno(userId);
    const statusAtual = await this.getStatusGraduacao(userId);

    if (!faixaAtiva) {
      return [];
    }

    const proximaGraduacao = await this.calcularProximaGraduacao(faixaAtiva);
    const progressoAtual = Math.round(
      (statusAtual.presencasNoCiclo / statusAtual.aulasPorGrau) * 100,
    );

    return [
      {
        id: '1',
        titulo: 'Próxima Graduação',
        descricao: `Alcançar ${proximaGraduacao.faixa} ${proximaGraduacao.grau}° Grau`,
        prazo: this.calcularPrazoEstimado(statusAtual.faltamAulas),
        progresso: Math.min(progressoAtual, 100),
        concluido: progressoAtual >= 100,
        categoria: 'graduacao',
      },
      {
        id: '2',
        titulo: 'Consistência nas Aulas',
        descricao: 'Manter 80% de presença mensal',
        prazo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        progresso: Math.min(
          Math.round((statusAtual.presencasNoCiclo / 20) * 100),
          100,
        ),
        concluido: false,
        categoria: 'fisica',
      },
    ];
  }

  private async calcularProximaGraduacao(faixaAtiva: AlunoFaixa) {
    // Se ainda pode evoluir na faixa atual
    if (faixaAtiva.graus_atual < faixaAtiva.faixaDef.graus_max) {
      return {
        faixa: faixaAtiva.faixaDef.nome_exibicao,
        grau: faixaAtiva.graus_atual + 1,
      };
    }

    // Precisa evoluir para próxima faixa
    const proximaFaixa = await this.faixaDefRepository.findOne({
      where: {
        categoria: faixaAtiva.faixaDef.categoria,
        ordem: faixaAtiva.faixaDef.ordem + 1,
      },
    });

    return {
      faixa: proximaFaixa?.nome_exibicao || 'Próxima Faixa',
      grau: 1,
    };
  }

  private calcularTempoNaGraduacao(dataConcessao: Date): string {
    const agora = new Date();
    const diffMs = agora.getTime() - dataConcessao.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const meses = Math.floor(diffDays / 30);

    if (meses === 0) {
      return `${diffDays} dias`;
    }

    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }

  private calcularPrazoEstimado(presencasRestantes: number): string {
    // Assumindo 3 aulas por semana, calcular prazo estimado
    const semanasNecessarias = Math.ceil(presencasRestantes / 3);
    const prazoEstimado = new Date();
    prazoEstimado.setDate(prazoEstimado.getDate() + semanasNecessarias * 7);

    return prazoEstimado.toISOString().split('T')[0];
  }

  /**
   * Lista todas as definições de faixas
   */
  async listarFaixasDefinicao(): Promise<FaixaDef[]> {
    return await this.faixaDefRepository.find({
      where: { ativo: true },
      order: { categoria: 'ASC', ordem: 'ASC' },
    });
  }

  /**
   * Obtém estatísticas gerais de graduação
   */
  async getEstatisticasGraduacao() {
    const totalAlunos = await this.personRepository.count({
      where: { tipo_cadastro: TipoCadastro.ALUNO },
    });

    const totalComFaixa = await this.alunoFaixaRepository.count({
      where: { ativa: true },
    });

    const prontosGraduar = await this.alunoFaixaRepository
      .createQueryBuilder('af')
      .innerJoin('af.faixaDef', 'fd')
      .where('af.ativa = true')
      .andWhere('af.presencas_no_ciclo >= fd.aulas_por_grau')
      .getCount();

    const graduacoesEsteAno = await this.alunoGraduacaoRepository
      .createQueryBuilder('ag')
      .where('EXTRACT(YEAR FROM ag.dt_graduacao) = :ano', {
        ano: new Date().getFullYear(),
      })
      .getCount();

    return {
      totalAlunos,
      totalComFaixa,
      prontosGraduar,
      graduacoesEsteAno,
      percentualComFaixa:
        totalAlunos > 0 ? (totalComFaixa / totalAlunos) * 100 : 0,
    };
  }

  /**
   * Gradua um aluno para a próxima faixa
   */
  async graduarAluno(alunoId: string, observacao?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);
      if (!faixaAtiva) {
        throw new BadRequestException('Aluno não possui faixa ativa');
      }

      // Verificar se está pronto para graduação
      const faixaDef = await this.faixaDefRepository.findOne({
        where: { id: faixaAtiva.faixa_def_id },
      });

      if (!faixaDef) {
        throw new NotFoundException('Faixa não encontrada');
      }

      if (faixaAtiva.presencas_no_ciclo < faixaDef.aulas_por_grau) {
        throw new BadRequestException(
          'Aluno não possui presenças suficientes para graduação',
        );
      }

      // Buscar próxima faixa
      const proximaFaixa = await this.faixaDefRepository.findOne({
        where: {
          categoria: faixaDef.categoria,
          ordem: faixaDef.ordem + 1,
          ativo: true,
        },
      });

      if (!proximaFaixa) {
        throw new BadRequestException('Não há próxima faixa disponível');
      }

      // Desativar faixa atual
      await queryRunner.manager.update(AlunoFaixa, faixaAtiva.id, {
        ativa: false,
        dt_fim: new Date(),
      });

      // Criar nova faixa
      const novaFaixa = queryRunner.manager.create(AlunoFaixa, {
        aluno_id: alunoId,
        faixa_def_id: proximaFaixa.id,
        ativa: true,
        dt_inicio: new Date(),
        graus_atual: 1, // Começa com primeiro grau da nova faixa
        presencas_no_ciclo: 0,
        presencas_total_fx: 0,
      });

      await queryRunner.manager.save(novaFaixa);

      // Registrar graduação
      const graduacao = queryRunner.manager.create(AlunoGraduacao, {
        aluno_id: alunoId,
        faixa_origem_id: faixaAtiva.faixa_def_id,
        faixa_destino_id: proximaFaixa.id,
        dt_graduacao: new Date(),
        observacao: observacao || 'Graduação automática',
      });

      await queryRunner.manager.save(graduacao);

      // Atualizar dados do aluno na tabela pessoas
      await queryRunner.manager.update(Person, alunoId, {
        faixa_atual: proximaFaixa.codigo,
        grau_atual: 1,
      });

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Aluno graduado para ${proximaFaixa.nome_exibicao}`,
        novaFaixa: proximaFaixa.nome_exibicao,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Adiciona um grau manualmente ao aluno
   */
  async adicionarGrau(alunoId: string, observacao: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);
      if (!faixaAtiva) {
        throw new BadRequestException('Aluno não possui faixa ativa');
      }

      const faixaDef = await this.faixaDefRepository.findOne({
        where: { id: faixaAtiva.faixa_def_id },
      });

      if (!faixaDef) {
        throw new NotFoundException('Faixa não encontrada');
      }

      // Verificar se pode receber mais graus
      if (faixaAtiva.graus_atual >= faixaDef.graus_max) {
        throw new BadRequestException(
          'Aluno já possui o máximo de graus para esta faixa',
        );
      }

      // Incrementar grau
      const novoGrau = faixaAtiva.graus_atual + 1;

      await queryRunner.manager.update(AlunoFaixa, faixaAtiva.id, {
        graus_atual: novoGrau,
        presencas_no_ciclo: 0, // Reset das presenças para o novo ciclo
      });

      // Registrar grau
      const grau = queryRunner.manager.create(AlunoFaixaGrau, {
        aluno_faixa_id: faixaAtiva.id,
        grau_num: novoGrau,
        dt_concessao: new Date(),
        observacao,
        origem: OrigemGrau.MANUAL,
      });

      await queryRunner.manager.save(grau);

      // Atualizar tabela pessoas
      await queryRunner.manager.update(Person, alunoId, {
        grau_atual: novoGrau,
      });

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `${novoGrau}º grau adicionado com sucesso`,
        grauAtual: novoGrau,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Aprova uma graduação pendente
   */
  async aprovarGraduacao(
    graduacaoId: string,
    aprovadoPor: string,
    observacao?: string,
  ) {
    const graduacao = await this.alunoGraduacaoRepository.findOne({
      where: { id: graduacaoId },
      relations: ['aluno', 'faixaOrigem', 'faixaDestino'],
    });

    if (!graduacao) {
      throw new NotFoundException('Graduação não encontrada');
    }

    if (graduacao.aprovado) {
      throw new BadRequestException('Graduação já foi aprovada');
    }

    // Atualizar graduação
    graduacao.aprovado = true;
    graduacao.aprovado_por = aprovadoPor;
    graduacao.dt_aprovacao = new Date();

    if (observacao) {
      graduacao.observacao = `${graduacao.observacao || ''}\n\nAprovação: ${observacao}`;
    }

    await this.alunoGraduacaoRepository.save(graduacao);

    return {
      success: true,
      message: 'Graduação aprovada com sucesso',
      graduacao,
    };
  }

  /**
   * Lista graduações pendentes de aprovação
   */
  async getPendentesAprovacao(params: {
    page?: number;
    pageSize?: number;
    unidadeId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));

    const query = this.alunoGraduacaoRepository
      .createQueryBuilder('ag')
      .leftJoinAndSelect('ag.aluno', 'a')
      .leftJoinAndSelect('ag.faixaOrigem', 'fo')
      .leftJoinAndSelect('ag.faixaDestino', 'fd')
      .leftJoinAndSelect('ag.concedidoPor', 'cp')
      .where('ag.aprovado = :aprovado', { aprovado: false });

    if (params.unidadeId) {
      query.andWhere('a.unidade_id = :unidadeId', {
        unidadeId: params.unidadeId,
      });
    }

    query.orderBy('ag.dt_graduacao', 'DESC');

    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  }

  /**
   * Valida tempo mínimo na faixa antes de graduar
   */
  async validarTempoMinimo(alunoId: string): Promise<{
    valido: boolean;
    mesesNaFaixa: number;
    tempoMinimo: number;
    faixaAtual: string;
  }> {
    const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);

    if (!faixaAtiva) {
      return {
        valido: false,
        mesesNaFaixa: 0,
        tempoMinimo: 0,
        faixaAtual: '',
      };
    }

    const agora = new Date();
    const inicio = new Date(faixaAtiva.dt_inicio);
    const diffMs = agora.getTime() - inicio.getTime();
    const mesesNaFaixa = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));

    // Definir tempo mínimo por faixa
    const tempoMinimo = faixaAtiva.faixaDef.codigo === 'BRANCA' ? 12 : 24; // 1 ano para branca, 2 anos para demais

    return {
      valido: mesesNaFaixa >= tempoMinimo,
      mesesNaFaixa,
      tempoMinimo,
      faixaAtual: faixaAtiva.faixaDef.nome_exibicao,
    };
  }
}
