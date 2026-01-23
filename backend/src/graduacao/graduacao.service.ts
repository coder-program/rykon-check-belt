import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { FaixaDef, CategoriaFaixa } from './entities/faixa-def.entity';
import { AlunoFaixa } from './entities/aluno-faixa.entity';
import { AlunoFaixaGrau, OrigemGrau } from './entities/aluno-faixa-grau.entity';
import { AlunoGraduacao } from './entities/aluno-graduacao.entity';
import { ConfiguracaoGraduacao } from './entities/configuracao-graduacao.entity';
import { Person, TipoCadastro } from '../people/entities/person.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Franqueado } from '../people/entities/franqueado.entity';
import { Unidade } from '../people/entities/unidade.entity';
import { GerenteUnidade } from '../people/entities/gerente-unidade.entity';
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
    @InjectRepository(ConfiguracaoGraduacao)
    private configuracaoGraduacaoRepository: Repository<ConfiguracaoGraduacao>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Franqueado)
    private franqueadoRepository: Repository<Franqueado>,
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    @InjectRepository(GerenteUnidade)
    private gerenteRepository: Repository<GerenteUnidade>,
    private dataSource: DataSource,
  ) {}

  /**
   * Calcula o número de meses entre duas datas
   */
  private calcularMesesEntreDatas(dataInicio: Date, dataFim: Date): number {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    let meses =
      (fim.getFullYear() - inicio.getFullYear()) * 12 +
      (fim.getMonth() - inicio.getMonth());

    // Se o dia final for menor que o dia inicial, subtrair 1 mês
    if (fim.getDate() < inicio.getDate()) {
      meses--;
    }

    return Math.max(0, meses);
  }

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
    // Primeiro tenta buscar por usuario_id (para alunos com login)
    let aluno = await this.alunoRepository.findOne({
      where: { usuario_id: alunoId },
    });

    // Se não encontrar, tenta buscar diretamente pelo ID do aluno (para dependentes sem login)
    if (!aluno) {
      aluno = await this.alunoRepository.findOne({
        where: { id: alunoId },
      });
    }

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const faixaAtiva = await this.getFaixaAtivaAluno(aluno.id);

    if (!faixaAtiva) {
      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    // Buscar configuração da unidade para obter aulas_por_grau correto
    const config = await this.getConfiguracaoGraduacao(aluno.unidade_id);
    const faixaConfig = config.config_faixas[faixaAtiva.faixaDef.codigo];
    
    // Usar aulas_por_grau da configuração da unidade, ou fallback para faixaDef
    const aulasPorGrau = faixaConfig?.aulas_por_grau ?? faixaAtiva.faixaDef.aulas_por_grau;

    // Calcular aulas faltantes usando configuração da unidade
    let faltamAulas = 0;
    if (faixaAtiva.graus_atual < faixaAtiva.faixaDef.graus_max) {
      faltamAulas = Math.max(0, aulasPorGrau - faixaAtiva.presencas_no_ciclo);
    }

    const progresso = faixaAtiva.getProgressoGraduacao();
    
    // Verificar se pode receber grau usando configuração da unidade
    const prontoParaProximoGrau = 
      faixaAtiva.graus_atual < faixaAtiva.faixaDef.graus_max &&
      faixaAtiva.presencas_no_ciclo >= aulasPorGrau;

    // Progresso baseado no que estiver mais próximo de completar
    const progressoPercentual = Math.max(progresso.aulas, progresso.tempo);

    // Buscar próxima faixa na sequência
    const proximaFaixa = await this.getProximaFaixa(faixaAtiva.faixaDef.id);

    // Calcular tempo na faixa
    // Usar dt_inicio da faixa ativa como referência
    const agora = new Date();
    const dataInicio =
      faixaAtiva.dt_inicio instanceof Date
        ? faixaAtiva.dt_inicio
        : new Date(faixaAtiva.dt_inicio);

    const tempoNaFaixa = agora.getTime() - dataInicio.getTime();
    const diasNaFaixa = Math.floor(tempoNaFaixa / (1000 * 60 * 60 * 24));

    // Buscar tempo mínimo baseado na configuração da unidade do aluno
    const tempoMinimo = await this.getTempoMinimoDiasPorFaixa(
      faixaAtiva.faixaDef.codigo,
      aluno.unidade_id,
    );

    const tempoMinimoAnos = Number((tempoMinimo / 365.25).toFixed(1));
    const diasRestantes = Math.max(0, tempoMinimo - diasNaFaixa);

    return {
      faixaAtual: faixaAtiva.faixaDef.nome_exibicao,
      corHex: faixaAtiva.faixaDef.cor_hex,
      grausAtual: faixaAtiva.graus_atual,
      grausMax: faixaAtiva.faixaDef.graus_max,
      aulasPorGrau: aulasPorGrau, // Usar valor da configuração da unidade
      presencasNoCiclo: faixaAtiva.presencas_no_ciclo,
      presencasTotalFaixa: faixaAtiva.presencas_total_fx,
      faltamAulas,
      prontoParaGraduar: prontoParaProximoGrau,
      progressoPercentual,
      progressoAulas: progresso.aulas,
      progressoTempo: progresso.tempo,
      diasNaFaixa,
      diasRestantes,
      tempoMinimoAnos,
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
    faixa?: string;
    userId?: string;
  }): Promise<ListaProximosGraduarDto> {

    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const skip = (page - 1) * pageSize;

    // Se não passou unidadeId mas passou userId, buscar unidades do franqueado
    let unidadesDoFranqueado: string[] = [];
    if (!params.unidadeId && params.userId) {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: params.userId },
        relations: ['perfis'],
      });

      const isFranqueado = usuario?.perfis?.some(
        (p) => p.nome?.toUpperCase() === 'FRANQUEADO',
      );

      if (isFranqueado) {
        const franqueado = await this.franqueadoRepository.findOne({
          where: { usuario_id: params.userId },
        });

        if (franqueado) {
          const unidades = await this.unidadeRepository.find({
            where: { franqueado_id: franqueado.id },
          });
          unidadesDoFranqueado = unidades.map((u) => u.id);
        }
      }
    }

    // Query para buscar alunos próximos de graduar
    let query = this.alunoFaixaRepository
      .createQueryBuilder('af')
      .leftJoinAndSelect('af.aluno', 'aluno')
      .leftJoinAndSelect('af.faixaDef', 'faixaDef')
      .where('af.ativa = true')
      .andWhere('aluno.id IS NOT NULL'); // Garantir que o aluno existe
    // Removido filtro af.graus_atual < faixaDef.graus_max para incluir alunos prontos para nova faixa

    // Filtrar por unidade se fornecido
    if (params.unidadeId) {
      query = query.andWhere('aluno.unidade_id = :unidadeId', {
        unidadeId: params.unidadeId,
      });
    } else if (unidadesDoFranqueado.length > 0) {
      query = query.andWhere('aluno.unidade_id IN (:...unidades)', {
        unidades: unidadesDoFranqueado,
      });
    } else if (params.userId) {
      // Se passou userId (franqueado) mas não tem unidades, retornar vazio
      console.warn('⚠️ [PROXIMOS GRADUAR] Franqueado sem unidades - retornando vazio');
      query = query.andWhere('1 = 0'); // Retorna vazio
    }

    // Filtrar por categoria se fornecido
    if (params.categoria && params.categoria !== 'todos') {
      const isKids = params.categoria === 'kids';
      // Filtrar pela categoria da faixa
      if (isKids) {
        query = query.andWhere('faixaDef.categoria = :categoria', {
          categoria: 'INFANTIL',
        });
      } else {
        query = query.andWhere('faixaDef.categoria = :categoria', {
          categoria: 'ADULTO',
        });
      }
    }

    // Filtrar por faixa específica se fornecido
    if (params.faixa) {
      query = query.andWhere('faixaDef.codigo = :faixa', {
        faixa: params.faixa,
      });
    }

    // Ordenar por quem está mais próximo (mais presenças no ciclo)
    query = query
      .orderBy('af.presencas_no_ciclo', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [items, total] = await query.getManyAndCount();

    // Buscar configurações de graduação de todas as unidades envolvidas
    const unidadesIds = [
      ...new Set(items.map((af) => af.aluno?.unidade_id).filter(Boolean)),
    ];
    const configuracoesMap = new Map<string, any>();

    if (unidadesIds.length > 0) {
      const configuracoes = await this.configuracaoGraduacaoRepository.find({
        where: unidadesIds.map((uid) => ({ unidade_id: uid })),
      });

      configuracoes.forEach((config) => {
        configuracoesMap.set(config.unidade_id, config.config_faixas);
      });

    }

    // Mapear para o DTO
    const mappedItems = items
      .filter((af) => af.aluno != null) // Filtrar registros sem aluno
      .map((af) => {
        // Calcular idade do aluno
        const hoje = new Date();
        const nascimento = new Date(af.aluno.data_nascimento);
        const idade = hoje.getFullYear() - nascimento.getFullYear();
        const isKids = idade < 16;

        // Buscar configuração personalizada da unidade para esta faixa
        const unidadeId = af.aluno.unidade_id;
        const faixaCodigo = af.faixaDef?.codigo;
        const configUnidade = configuracoesMap.get(unidadeId);

        // Tentar encontrar config da faixa com fallback inteligente
        let configFaixa = configUnidade?.[faixaCodigo];

        // Se não encontrou exato, tentar variações comuns
        if (!configFaixa && faixaCodigo) {
          // Tentar com sufixo _INF (infantil)
          configFaixa = configUnidade?.[`${faixaCodigo}_INF`];

          // Tentar sem sufixo _INFANTIL
          if (!configFaixa && faixaCodigo.endsWith('_INFANTIL')) {
            const codigoSemSufixo = faixaCodigo.replace('_INFANTIL', '_INF');
            configFaixa = configUnidade?.[codigoSemSufixo];
          }

          // Tentar abreviações (AMARELA_BRANCA -> AMAR_BRANCA_INF)
          if (!configFaixa) {
            const codigoAbreviado = faixaCodigo
              .replace('AMARELA', 'AMAR')
              .replace('LARANJA', 'LARA')
              .replace('_INFANTIL', '_INF');
            configFaixa =
              configUnidade?.[`${codigoAbreviado}_INF`] ||
              configUnidade?.[codigoAbreviado];
          }
        }

        // Usar configuração personalizada se existir, senão usar padrão da faixaDef
        const aulasPorGrau =
          configFaixa?.aulas_por_grau || af.faixaDef?.aulas_por_grau || 40;
        const grausMax =
          configFaixa?.graus_maximos || af.faixaDef?.graus_max || 4;
        const tempoMinimoMeses = configFaixa?.tempo_minimo_meses || null;

        // REGRA ESPECIAL: Faixa Preta é por TEMPO (36 meses), não por aulas
        const isFaixaPreta = faixaCodigo === 'PRETA';
        let faltamAulas = 0;
        let prontoParaGraduar = false;
        let progressoPercentual = 0;

        if (isFaixaPreta) {
          // Para faixa preta: calcular tempo desde último grau
          const tempoMinimoRequerido = tempoMinimoMeses || 36; // 36 meses (3 anos)
          const dataInicioFaixa = af.dt_inicio || af.created_at;
          const mesesNaFaixa = this.calcularMesesEntreDatas(
            dataInicioFaixa,
            hoje,
          );

          faltamAulas = Math.max(0, tempoMinimoRequerido - mesesNaFaixa);
          prontoParaGraduar = mesesNaFaixa >= tempoMinimoRequerido;
          progressoPercentual = Math.min(
            mesesNaFaixa / tempoMinimoRequerido,
            1.0,
          );

        } else {
          // Para outras faixas: calcular por aulas
          faltamAulas = Math.max(0, aulasPorGrau - af.presencas_no_ciclo);
          prontoParaGraduar = af.presencas_no_ciclo >= aulasPorGrau;
          progressoPercentual = af.presencas_no_ciclo / aulasPorGrau;

        }

        return {
          alunoId: af.aluno.id,
          nomeCompleto: af.aluno.nome_completo || 'Nome não disponível',
          faixa: af.faixaDef?.nome_exibicao || 'Não definida',
          corHex: af.faixaDef?.cor_hex || '#CCCCCC',
          grausAtual: af.graus_atual,
          grausMax: grausMax,
          faltamAulas: faltamAulas,
          prontoParaGraduar: prontoParaGraduar,
          progressoPercentual: progressoPercentual,
          presencasTotalFaixa: af.presencas_no_ciclo,
          kids: isKids,
          isFaixaPreta: isFaixaPreta, // Adicionar flag para frontend saber se é tempo ou aulas
        };
      });

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
      hasNextPage: skip + items.length < total,
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

    // ✅ VALIDAR SE JÁ EXISTE GRADUAÇÃO PENDENTE PARA ESSA FAIXA
    const graduacaoPendente = await this.alunoGraduacaoRepository.findOne({
      where: {
        aluno_id: alunoId,
        faixa_destino_id: dto.faixaDestinoId,
        aprovado: false,
      },
    });

    if (graduacaoPendente) {
      throw new BadRequestException(
        'Já existe uma graduação pendente para esta faixa. Aprove ou cancele a graduação anterior.',
      );
    }

    // ✅ VALIDAR SE JÁ POSSUI ESSA FAIXA APROVADA
    const graduacaoAprovada = await this.alunoGraduacaoRepository.findOne({
      where: {
        aluno_id: alunoId,
        faixa_destino_id: dto.faixaDestinoId,
        aprovado: true,
      },
    });

    if (graduacaoAprovada) {
      throw new BadRequestException(
        'Aluno já possui graduação aprovada para esta faixa.',
      );
    }

    // Usar transação para garantir consistência
    return await this.dataSource.transaction(async (manager) => {
      const aprovado = dto.aprovarDireto || false;

      // 1. Registrar graduação PRIMEIRO (antes de mexer nas faixas)
      const graduacao = new AlunoGraduacao();
      graduacao.aluno_id = alunoId;
      graduacao.faixa_origem_id = faixaAtiva.faixa_def_id;
      graduacao.faixa_destino_id = dto.faixaDestinoId;
      graduacao.observacao = dto.observacao || null;
      graduacao.tamanho_faixa = dto.tamanhoFaixa || null;
      graduacao.concedido_por = dto.concedidoPor || null;
      graduacao.aprovado = aprovado;
      graduacao.dt_aprovacao = aprovado ? new Date() : null;
      graduacao.aprovado_por = aprovado ? dto.concedidoPor || null : null;

      const graduacaoSalva = await manager.save(graduacao);

      // 2. SOMENTE se aprovado direto: trocar as faixas e atualizar Person
      if (aprovado) {
        // Finalizar faixa atual
        faixaAtiva.ativa = false;
        faixaAtiva.dt_fim = new Date();
        await manager.save(faixaAtiva);

        // Criar nova faixa ativa
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

        // Atualizar campos na tabela Person (compatibilidade)
        // NOTA: faixa_atual removida - usar apenas aluno_faixas
      }

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
      console.error('❌ [INCREMENTAR PRESENCA] Aluno não possui faixa ativa');
      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    // Buscar aluno para obter unidade_id
    const aluno = await this.alunoRepository.findOne({
      where: { id: alunoId },
      select: ['id', 'unidade_id'],
    });

    if (!aluno) {
      console.error('❌ [INCREMENTAR PRESENCA] Aluno não encontrado');
      throw new NotFoundException('Aluno não encontrado');
    }

    // Buscar configuração da unidade para obter aulas_por_grau correto
    const config = await this.getConfiguracaoGraduacao(aluno.unidade_id);
    const faixaConfig = config.config_faixas[faixaAtiva.faixaDef.codigo];
    
    // Usar aulas_por_grau da configuração da unidade, ou fallback para faixaDef
    const aulasPorGrau = faixaConfig?.aulas_por_grau ?? faixaAtiva.faixaDef.aulas_por_grau;

    let grauConcedido = false;

    await this.dataSource.transaction(async (manager) => {
      // Incrementar contadores
      const presencasAntesIncremento = faixaAtiva.presencas_no_ciclo;
      faixaAtiva.presencas_no_ciclo += 1;
      faixaAtiva.presencas_total_fx += 1;

      // Verificar se pode conceder grau automaticamente usando configuração da unidade
      const podeReceberGrau = 
        faixaAtiva.graus_atual < faixaAtiva.faixaDef.graus_max &&
        faixaAtiva.presencas_no_ciclo >= aulasPorGrau;

      if (podeReceberGrau) {
        // Incrementar grau e zerar contador do ciclo (mesmo padrão da concederGrau manual)
        faixaAtiva.graus_atual += 1;
        faixaAtiva.presencas_no_ciclo = 0;
        await manager.save(faixaAtiva);

        // Registrar no histórico (mesmo padrão da concederGrau manual)
        const grau = manager.create(AlunoFaixaGrau, {
          aluno_faixa_id: faixaAtiva.id,
          grau_num: faixaAtiva.graus_atual,
          observacao: 'Grau concedido automaticamente por atingir o número de presenças',
          origem: OrigemGrau.AUTOMATICO,
        });

        await manager.save(grau);

        grauConcedido = true;
      } else {
        // Salvar faixaAtiva apenas com presencas incrementadas
        await manager.save(faixaAtiva);
      }

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

    const result = await query.getMany();
    return result;
  }

  /**
   * Lista apenas a próxima faixa válida para o aluno graduar
   */
  async listarProximaFaixaValida(alunoId: string): Promise<FaixaDef[]> {
    // Buscar aluno e faixa atual
    const aluno = await this.alunoRepository.findOne({
      where: { id: alunoId },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);

    if (!faixaAtiva || !faixaAtiva.faixaDef) {
      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    const faixaAtual = faixaAtiva.faixaDef;
    const grausAtuais = faixaAtiva.graus?.length || 0;

    // Se tem menos de 4 graus, não pode graduar para próxima faixa
    // Retorna array vazio
    if (grausAtuais < 4) {
      return [];
    }

    // Buscar a próxima faixa (ordem imediatamente superior)
    const proximaFaixa = await this.faixaDefRepository.findOne({
      where: {
        categoria: faixaAtual.categoria,
        ordem: faixaAtual.ordem + 1,
        ativo: true,
      },
    });

    return proximaFaixa ? [proximaFaixa] : [];
  }

  /**
   * Listar próxima faixa válida para GRADUAÇÃO MANUAL
   * NÃO valida quantidade de graus (permite graduar com menos de 4 graus)
   */
  async listarProximaFaixaValidaManual(alunoId: string): Promise<FaixaDef[]> {
    // Buscar aluno e faixa atual
    const aluno = await this.alunoRepository.findOne({
      where: { id: alunoId },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const faixaAtiva = await this.getFaixaAtivaAluno(alunoId);

    if (!faixaAtiva || !faixaAtiva.faixaDef) {
      throw new NotFoundException('Aluno não possui faixa ativa');
    }

    const faixaAtual = faixaAtiva.faixaDef;

    // Calcular idade do aluno
    const dataNascimento = aluno.data_nascimento;
    let idade = 0;
    if (dataNascimento) {
      const hoje = new Date();
      const nascimento = new Date(dataNascimento);
      idade = hoje.getFullYear() - nascimento.getFullYear();
      const mesAtual = hoje.getMonth();
      const mesNascimento = nascimento.getMonth();
      if (
        mesAtual < mesNascimento ||
        (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
      ) {
        idade--;
      }
    }

    // Determinar categoria baseado na idade
    // Kids (≤15 anos): BRANCA_INFANTIL até VERDE_PRETA
    // Adulto (16+ anos): AZUL, ROXA, MARROM, PRETA, CORAL, VERMELHA
    const isKids = idade <= 15;

    // Buscar TODAS as faixas com ordem superior (não apenas a próxima)
    // Filtrar por categoria baseado na idade
    let faixasSuperiores: FaixaDef[];

    if (isKids) {
      // Kids: apenas faixas infantis com ordem superior
      faixasSuperiores = await this.faixaDefRepository.find({
        where: {
          categoria: CategoriaFaixa.INFANTIL,
          ativo: true,
        },
        order: {
          ordem: 'ASC',
        },
      });
      // Filtrar apenas ordens superiores à atual
      faixasSuperiores = faixasSuperiores.filter(
        (f) => f.ordem > faixaAtual.ordem,
      );
    } else {
      // Adulto: apenas faixas adultas com ordem superior
      faixasSuperiores = await this.faixaDefRepository.find({
        where: {
          categoria: CategoriaFaixa.ADULTO,
          ativo: true,
        },
        order: {
          ordem: 'ASC',
        },
      });
      // Filtrar apenas ordens superiores à atual
      faixasSuperiores = faixasSuperiores.filter(
        (f) => f.ordem > faixaAtual.ordem,
      );
    }

    return faixasSuperiores;
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
    // ✅ Atualizar faixa_atual do aluno quando aprovar
    try {
      const faixaDestino = await this.faixaDefRepository.findOne({
        where: { id: graduacao.faixa_destino_id },
      });

      if (faixaDestino) {
        // Finalizar faixa atual

        const faixaAtiva = await this.alunoFaixaRepository.findOne({
          where: { aluno_id: graduacao.aluno_id, ativa: true },
        });

        if (faixaAtiva) {
          faixaAtiva.ativa = false;
          faixaAtiva.dt_fim = new Date();
          await this.alunoFaixaRepository.save(faixaAtiva);
        }

        // Criar nova faixa ativa
        const novaFaixa = this.alunoFaixaRepository.create({
          aluno_id: graduacao.aluno_id,
          faixa_def_id: graduacao.faixa_destino_id,
          ativa: true,
          dt_inicio: new Date(),
          graus_atual: 0,
          presencas_no_ciclo: 0,
          presencas_total_fx: 0,
        });
        await this.alunoFaixaRepository.save(novaFaixa);
      }
    } catch (error) {
      console.error(' [APROVAR GRADUAÇÃO] Erro ao atualizar faixa:', error);
    }

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
      query.andWhere('a.unidade_id::text = :unidadeId', {
        unidadeId: params.unidadeId,
      });
    }

    query.orderBy('ag.dt_graduacao', 'DESC');

    const [rawItems, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    // Transformar dados para formato amigável
    const items = rawItems.map((grad) => ({
      id: grad.id,
      aluno_id: grad.aluno?.id,
      aluno_nome: grad.aluno?.nome_completo,
      faixa: grad.faixaDestino?.nome_exibicao,
      faixa_origem: grad.faixaOrigem?.nome_exibicao,
      faixa_destino: grad.faixaDestino?.nome_exibicao,
      cor_faixa: grad.faixaDestino?.cor_hex,
      grau: 1, // Graduação de faixa sempre inicia no grau 1
      data_graduacao: grad.dt_graduacao,
      categoria: grad.faixaDestino?.categoria,
      observacao: grad.observacao,
      concedido_por: grad.concedidoPor?.nome,
      solicitado_em: grad.solicitado_em,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  }

  async getTaxaAprovacaoPorProfessor(user: any, unidadeId?: string) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 90); // Últimos 3 meses

    // Query para buscar professores com taxa de aprovação
    let query = `
      SELECT
        prof.id,
        prof.usuario_id,
        u.nome as nome_completo,
        prof.faixa_ministrante as faixa_nome,
        COUNT(DISTINCT ag.id) as total_graduacoes,
        COUNT(DISTINCT ag.id) FILTER (WHERE ag.aprovado = true) as total_aprovadas,
        COUNT(DISTINCT ag.id) FILTER (WHERE ag.aprovado = false) as total_pendentes,
        ROUND(
          (COUNT(DISTINCT ag.id) FILTER (WHERE ag.aprovado = true)::numeric /
          NULLIF(COUNT(DISTINCT ag.id), 0) * 100), 1
        ) as taxa_aprovacao
      FROM teamcruz.professores prof
      INNER JOIN teamcruz.usuarios u ON u.id = prof.usuario_id
      LEFT JOIN teamcruz.aluno_graduacao ag ON ag.concedido_por::uuid = u.id
        AND ag.dt_graduacao >= $1
      WHERE prof.status = 'ATIVO'
    `;

    const params: any[] = [dataLimite];

    if (unidadeId) {
      query += ` AND prof.unidade_id = $2`;
      params.push(unidadeId);
    }

    query += `
      GROUP BY prof.id, prof.usuario_id, u.nome, prof.faixa_ministrante
      HAVING COUNT(DISTINCT ag.id) > 0
      ORDER BY taxa_aprovacao DESC, total_graduacoes DESC
      LIMIT 20
    `;

    const resultado = await this.alunoGraduacaoRepository.manager.query(
      query,
      params,
    );

    return resultado.map((r: any) => ({
      id: r.id,
      nome: r.nome_completo,
      faixa: {
        nome: r.faixa_nome || 'Não definida',
      },
      totalGraduacoes: parseInt(r.total_graduacoes) || 0,
      totalAprovadas: parseInt(r.total_aprovadas) || 0,
      totalPendentes: parseInt(r.total_pendentes) || 0,
      taxaAprovacao: parseFloat(r.taxa_aprovacao) || 0,
    }));
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

  /**
   * Lista graduações pendentes de aprovação
   */
  async listarGraduacoesPendentes(user?: any) {
    const userId = user?.id;

    // Construir where condition baseado no perfil
    let whereCondition: any = { aprovado: false };

    if (userId) {
      // Normalizar perfis
      const perfisNormalizados = (user?.perfis || []).map((p: any) =>
        (typeof p === 'string' ? p : p?.nome || p)?.toLowerCase(),
      );

      const isFranqueado = perfisNormalizados.includes('franqueado');
      const isGerenteUnidade = perfisNormalizados.includes('gerente_unidade');

      if (isFranqueado) {
        const franqueado = await this.franqueadoRepository.findOne({
          where: { usuario_id: userId },
        });

        if (franqueado) {
          const unidades = await this.unidadeRepository.find({
            where: { franqueado_id: franqueado.id },
          });

          const unidadeIds = unidades.map((u) => u.id);

          if (unidadeIds.length > 0) {
            whereCondition = {
              aprovado: false,
              aluno: {
                unidade_id: In(unidadeIds),
              },
            };
          } else {
            return [];
          }
        }
      } else if (isGerenteUnidade) {
        const gerente = await this.gerenteRepository.findOne({
          where: { usuario_id: userId },
          relations: ['unidade'],
        });

        if (gerente?.unidade) {
          whereCondition = {
            aprovado: false,
            aluno: {
              unidade_id: gerente.unidade.id,
            },
          };
        }
      }
    }

    const graduacoes = await this.alunoGraduacaoRepository.find({
      where: whereCondition,
      relations: ['aluno', 'faixaOrigem', 'faixaDestino'],
      order: { created_at: 'DESC' },
    });

    return graduacoes;
  }

  /**
   * Lista graduações aprovadas
   */
  async listarGraduacoesAprovadas(user?: any) {
    const userId = user?.id;

    // Construir where condition baseado no perfil
    let whereCondition: any = { aprovado: true };

    if (userId) {
      // Normalizar perfis
      const perfisNormalizados = (user?.perfis || []).map((p: any) =>
        (typeof p === 'string' ? p : p?.nome || p)?.toLowerCase(),
      );

      // Buscar unidades do usuário (se for franqueado ou gerente)
      const isFranqueado = perfisNormalizados.includes('franqueado');
      const isGerenteUnidade = perfisNormalizados.includes('gerente_unidade');

      if (isFranqueado) {
        // Buscar franqueado
        const franqueado = await this.franqueadoRepository.findOne({
          where: { usuario_id: userId },
        });

        if (franqueado) {
          // Buscar unidades do franqueado
          const unidades = await this.unidadeRepository.find({
            where: { franqueado_id: franqueado.id },
          });

          const unidadeIds = unidades.map((u) => u.id);

          if (unidadeIds.length > 0) {
            whereCondition = {
              aprovado: true,
              aluno: {
                unidade_id: In(unidadeIds),
              },
            };
          } else {
            // Se não tem unidades, retornar vazio
            return [];
          }
        }
      } else if (isGerenteUnidade) {
        // Buscar unidade do gerente
        const gerente = await this.gerenteRepository.findOne({
          where: { usuario_id: userId },
          relations: ['unidade'],
        });

        if (gerente?.unidade) {
          whereCondition = {
            aprovado: true,
            aluno: {
              unidade_id: gerente.unidade.id,
            },
          };
        }
      }
    }

    const graduacoes = await this.alunoGraduacaoRepository.find({
      where: whereCondition,
      relations: ['aluno', 'faixaOrigem', 'faixaDestino'],
      order: { dt_aprovacao: 'DESC' },
    });

    return graduacoes;
  }

  /**
   * Aprova múltiplas graduações em massa
   */
  async aprovarGraduacoesEmMassa(graduacaoIds: string[], aprovadorId: string) {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      let aprovadorIdFinal: string | null = null;

      // Só usa aprovador se for um UUID válido (não "sistema")
      if (aprovadorId && aprovadorId !== 'sistema') {
        const aprovador = await manager.findOne(Person, {
          where: { id: aprovadorId },
        });

        if (aprovador) {
          aprovadorIdFinal = aprovador.id;
        }
      }

      const graduacoes = await manager.find(AlunoGraduacao, {
        where: { id: In(graduacaoIds), aprovado: false },
        relations: ['aluno', 'faixaDestino'],
      });

      if (graduacoes.length === 0) {
        throw new NotFoundException('Nenhuma graduação pendente encontrada');
      }

      const now = new Date();

      for (const graduacao of graduacoes) {
        // Buscar a faixa ativa do aluno
        const faixaAtiva = await manager.findOne(AlunoFaixa, {
          where: { aluno_id: graduacao.aluno_id, ativa: true },
        });

        if (faixaAtiva) {
          // Finalizar faixa atual
          faixaAtiva.ativa = false;
          faixaAtiva.dt_fim = now;
          await manager.save(faixaAtiva);

          // Criar nova faixa ativa
          const novaFaixa = manager.create(AlunoFaixa, {
            aluno_id: graduacao.aluno_id,
            faixa_def_id: graduacao.faixa_destino_id,
            ativa: true,
            dt_inicio: now,
            graus_atual: 0,
            presencas_no_ciclo: 0,
            presencas_total_fx: 0,
          });
          await manager.save(novaFaixa);
        }

        // Atualiza a graduação
        await manager.update(AlunoGraduacao, graduacao.id, {
          aprovado: true,
          dt_aprovacao: now,
          aprovado_por: aprovadorIdFinal, // UUID ou null (não string "Sistema")
        });
      }

      return {
        aprovadas: graduacoes.length,
        graduacoes: graduacoes.map((g) => ({
          id: g.id,
          alunoId: g.aluno_id,
          nomeAluno: g.aluno?.nome_completo,
        })),
      };
    });
  }

  /**
   * Cancela/Remove uma graduação pendente
   */
  async cancelarGraduacao(graduacaoId: string) {
    const graduacao = await this.alunoGraduacaoRepository.findOne({
      where: { id: graduacaoId },
    });

    if (!graduacao) {
      throw new NotFoundException('Graduação não encontrada');
    }

    if (graduacao.aprovado) {
      throw new BadRequestException(
        'Não é possível cancelar uma graduação já aprovada',
      );
    }

    await this.alunoGraduacaoRepository.remove(graduacao);

    return {
      success: true,
      message: 'Graduação cancelada com sucesso',
    };
  }

  /**
   * Cadastra faixa inicial do aluno logado
   */
  async cadastrarFaixaInicial(
    user: any,
    faixa_codigo: string,
    graus: number,
    data_graduacao: string,
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('Usuário não identificado');
    }

    // Buscar aluno
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se já tem faixa ativa
    const faixaAtiva = await this.alunoFaixaRepository.findOne({
      where: { aluno_id: aluno.id, ativa: true },
    });

    if (faixaAtiva) {
      throw new BadRequestException('Aluno já possui faixa ativa');
    }

    // Buscar faixa
    const faixa = await this.faixaDefRepository.findOne({
      where: { codigo: faixa_codigo },
    });

    if (!faixa) {
      throw new NotFoundException('Faixa não encontrada');
    }

    // Criar registro de faixa usando SQL direto
    await this.dataSource.query(
      `INSERT INTO teamcruz.aluno_faixa (aluno_id, faixa_def_id, dt_inicio, ativa)
       VALUES ($1, $2, $3, $4)`,
      [aluno.id, faixa.id, new Date(data_graduacao), true],
    );

    // Criar registro de graus
    for (let i = 0; i < graus; i++) {
      await this.dataSource.query(
        `INSERT INTO teamcruz.aluno_faixa_grau (aluno_id, faixa_def_id, dt_grau, grau_numero)
         VALUES ($1, $2, $3, $4)`,
        [aluno.id, faixa.id, new Date(data_graduacao), i + 1],
      );
    }

    return {
      success: true,
      message: 'Faixa inicial cadastrada com sucesso!',
      faixa: {
        codigo: faixa.codigo,
        graus: graus,
      },
    };
  }

  // ==================== CONFIGURAÇÃO DE GRADUAÇÃO POR UNIDADE ====================

  /**
   * Busca configuração de graduação da unidade
   * Se não existir, retorna configuração padrão
   */
  async getConfiguracaoGraduacao(
    unidadeId: string,
  ): Promise<ConfiguracaoGraduacao> {
    const config = await this.configuracaoGraduacaoRepository.findOne({
      where: { unidade_id: unidadeId },
      relations: ['unidade'],
    });

    if (!config) {
      // Retorna configuração padrão com todas as faixas
      return {
        id: null,
        unidade_id: unidadeId,
        unidade: null,
        config_faixas: {
          BRANCA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          CINZA_BRANCA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          CINZA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          CINZA_PRETA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          AMAR_BRANCA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          AMARELA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          AMAR_PRETA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          LARA_BRANCA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          LARANJA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          LARA_PRETA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          VERDE_BRANCA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          VERDE_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          VERDE_PRETA_INF: {
            tempo_minimo_meses: 6,
            aulas_por_grau: 30,
            graus_maximos: 4,
          },
          BRANCA: {
            tempo_minimo_meses: 12,
            aulas_por_grau: 40,
            graus_maximos: 4,
          },
          AZUL: {
            tempo_minimo_meses: 24,
            aulas_por_grau: 40,
            graus_maximos: 4,
          },
          ROXA: {
            tempo_minimo_meses: 24,
            aulas_por_grau: 40,
            graus_maximos: 4,
          },
          MARROM: {
            tempo_minimo_meses: 18,
            aulas_por_grau: 40,
            graus_maximos: 4,
          },
          PRETA: {
            tempo_minimo_meses: null,
            aulas_por_grau: 40,
            graus_maximos: 10,
          },
        },
        percentual_frequencia_minima: 75.0,
        config_adicional: null,
        created_at: null,
        updated_at: null,
      } as any;
    }

    return config;
  }

  /**
   * Salva ou atualiza configuração de graduação da unidade
   */
  async salvarConfiguracaoGraduacao(
    data: any,
    user: any,
  ): Promise<ConfiguracaoGraduacao> {

    // Verificar permissões
    const temPermissao = await this.verificarPermissaoUnidade(
      user,
      data.unidade_id,
    );
    if (!temPermissao) {
      console.error('🚫 Permissão negada para usuário:', user?.id);
      throw new ForbiddenException(
        'Você não tem permissão para configurar esta unidade',
      );
    }

    // Verificar se já existe configuração
    let config = await this.configuracaoGraduacaoRepository.findOne({
      where: { unidade_id: data.unidade_id },
    });

    if (config) {
      // Atualizar existente
      Object.assign(config, {
        config_faixas: data.config_faixas,
        percentual_frequencia_minima: data.percentual_frequencia_minima,
        config_adicional: data.config_adicional,
      });
    } else {
      // Criar nova
      config = this.configuracaoGraduacaoRepository.create({
        unidade_id: data.unidade_id,
        config_faixas: data.config_faixas,
        percentual_frequencia_minima: data.percentual_frequencia_minima,
        config_adicional: data.config_adicional,
      });
    }

    return await this.configuracaoGraduacaoRepository.save(config);
  }

  /**
   * Lista todas as configurações (para ADMIN_MASTER ou FRANQUEADO)
   */
  async listarConfiguracoes(user: any): Promise<ConfiguracaoGraduacao[]> {
    const perfis = user?.perfis || [];

    if (perfis.includes('ADMIN_MASTER')) {
      // Admin Master vê todas
      return await this.configuracaoGraduacaoRepository.find({
        relations: ['unidade'],
        order: { created_at: 'DESC' },
      });
    }

    if (perfis.includes('FRANQUEADO')) {
      // Franqueado vê apenas suas unidades
      const franqueado = await this.franqueadoRepository.findOne({
        where: { usuario_id: user.id },
      });

      if (!franqueado) {
        return [];
      }

      return await this.configuracaoGraduacaoRepository
        .createQueryBuilder('config')
        .innerJoin('config.unidade', 'unidade')
        .where('unidade.franqueado_id = :franqueadoId', {
          franqueadoId: franqueado.id,
        })
        .orderBy('config.created_at', 'DESC')
        .getMany();
    }

    throw new ForbiddenException(
      'Você não tem permissão para listar configurações',
    );
  }

  /**
   * Verifica se usuário tem permissão para configurar a unidade
   */
  private async verificarPermissaoUnidade(
    user: any,
    unidadeId: string,
  ): Promise<boolean> {
    const perfis = user?.perfis || [];

    // Extrair nomes dos perfis (pode ser array de strings ou array de objetos)
    const nomesPerfis = perfis.map((p: any) =>
      typeof p === 'string' ? p : p.nome,
    );

    // ADMIN_MASTER tem acesso total
    if (nomesPerfis.includes('ADMIN_MASTER')) {
      return true;
    }

    // FRANQUEADO tem acesso às suas unidades
    if (nomesPerfis.includes('FRANQUEADO')) {
      const franqueado = await this.franqueadoRepository.findOne({
        where: { usuario_id: user.id },
      });

      if (!franqueado) {
        return false;
      }

      const unidade = await this.unidadeRepository.findOne({
        where: { id: unidadeId, franqueado_id: franqueado.id },
      });

      return !!unidade;
    }

    // GERENTE_UNIDADE tem acesso à sua unidade
    if (nomesPerfis.includes('GERENTE_UNIDADE')) {
      const gerente = await this.gerenteRepository.findOne({
        where: { usuario_id: user.id },
      });

      if (!gerente) {
        return false;
      }

      return gerente.unidade_id === unidadeId;
    }

    return false;
  }

  /**
   * Obtém tempo mínimo em dias para uma faixa específica baseado na config da unidade
   */
  async getTempoMinimoDiasPorFaixa(
    faixaCodigo: string,
    unidadeId: string,
  ): Promise<number> {
    const config = await this.getConfiguracaoGraduacao(unidadeId);

    const mesesParaDias = (meses: number) => Math.floor(meses * 30.44); // Média de dias por mês

    // Buscar config da faixa no JSONB
    const faixaConfig = config.config_faixas[faixaCodigo];

    if (!faixaConfig) {
      // Faixa não encontrada, retorna default 24 meses (2 anos)
      return mesesParaDias(24);
    }

    // Se tempo_minimo_meses for null, retorna 0 (sem limite)
    if (faixaConfig.tempo_minimo_meses === null) {
      return 0;
    }

    return mesesParaDias(faixaConfig.tempo_minimo_meses);
  }
}
