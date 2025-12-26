import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Assinatura, StatusAssinatura } from '../entities/assinatura.entity';
import { Plano } from '../entities/plano.entity';
import { Aluno } from '../../people/entities/aluno.entity';
import { Unidade } from '../../people/entities/unidade.entity';
import {
  CreateAssinaturaDto,
  UpdateAssinaturaDto,
  CancelarAssinaturaDto,
  AlterarPlanoDto,
} from '../dto/assinatura.dto';

@Injectable()
export class AssinaturasService {
  constructor(
    @InjectRepository(Assinatura)
    private assinaturaRepository: Repository<Assinatura>,
    @InjectRepository(Plano)
    private planoRepository: Repository<Plano>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    @Inject(DataSource) private dataSource: DataSource,
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
    });

    if (assinaturaExistente) {
      throw new BadRequestException('Aluno já possui uma assinatura ativa');
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
    const dataInicio = new Date(createAssinaturaDto.data_inicio);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + plano.duracao_meses);

    // Verificar se a assinatura já está expirada
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
    const dataFimComparacao = new Date(dataFim);
    dataFimComparacao.setHours(0, 0, 0, 0);

    if (dataFimComparacao < hoje) {
      throw new BadRequestException(
        `Não é possível criar assinatura com data de término no passado. A assinatura terminaria em ${dataFim.toLocaleDateString('pt-BR')}, que já passou.`,
      );
    }

    const proximaCobranca = new Date(dataInicio);
    const diaVencimento = createAssinaturaDto.dia_vencimento || 10;
    proximaCobranca.setDate(diaVencimento);
    if (proximaCobranca < new Date()) {
      proximaCobranca.setMonth(proximaCobranca.getMonth() + 1);
    }

    // Determinar status inicial
    let statusInicial = StatusAssinatura.ATIVA;
    if (dataFimComparacao <= hoje) {
      statusInicial = StatusAssinatura.EXPIRADA;
    }

    const assinatura = this.assinaturaRepository.create({
      ...createAssinaturaDto,
      valor: plano.valor,
      data_fim: dataFim,
      proxima_cobranca: proximaCobranca,
      dia_vencimento: diaVencimento,
      status: statusInicial,
    });

    return await this.assinaturaRepository.save(assinatura);
  }

  async findAll(
    unidade_id?: string,
    status?: StatusAssinatura,
    user?: any,
  ): Promise<Assinatura[]> {
    console.log('🔧 [ASSINATURAS-SERVICE] findAll chamado:', {
      unidade_id,
      status,
      user_id: user?.id,
      tipo_usuario: user?.tipo_usuario,
      perfis: user?.perfis?.map((p: any) => p.nome || p),
    });

    const query = this.assinaturaRepository
      .createQueryBuilder('assinatura')
      .leftJoinAndSelect('assinatura.aluno', 'aluno')
      .leftJoinAndSelect('assinatura.plano', 'plano')
      .leftJoinAndSelect('assinatura.unidade', 'unidade')
      .orderBy('assinatura.proxima_cobranca', 'ASC');

    // Se unidade_id foi passada, filtrar diretamente por ela
    if (unidade_id) {
      console.log(
        '✅ [ASSINATURAS-SERVICE] Filtrando por unidade_id:',
        unidade_id,
      );
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

      console.log('🔧 [ASSINATURAS-SERVICE] isFranqueado:', isFranqueado);

      if (isFranqueado) {
        console.log(
          '🔍 [ASSINATURAS-SERVICE] Buscando assinaturas de todas unidades do franqueado',
        );
        // Buscar franqueado_id correto
        const franqueadoResult = await this.dataSource.query(
          `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
          [user.id],
        );
        const franqueadoId = franqueadoResult[0]?.id || null;
        console.log('🔍 [ASSINATURAS-SERVICE] Franqueado ID:', franqueadoId);

        if (franqueadoId) {
          // Buscar unidades do franqueado
          const unidades = await this.unidadeRepository.find({
            where: { franqueado_id: franqueadoId },
            select: ['id'],
          });
          const unidadeIds = unidades.map((u) => u.id);
          console.log(
            `✅ [ASSINATURAS-SERVICE] Encontradas ${unidadeIds.length} unidades:`,
            unidadeIds,
          );

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
        console.log(
          '✅ [ASSINATURAS-SERVICE] Filtrando por unidade do usuário:',
          user.unidade_id,
        );
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

    console.log(
      `✅ [ASSINATURAS-SERVICE] Retornando ${result.length} assinaturas`,
    );
    return result;
  }

  /**
   * Verifica e atualiza automaticamente assinaturas que expiraram
   */
  private async atualizarAssinaturasExpiradas(
    assinaturas: Assinatura[],
  ): Promise<void> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const assinaturasParaAtualizar = assinaturas.filter((assinatura) => {
      if (assinatura.status === StatusAssinatura.ATIVA && assinatura.data_fim) {
        const dataFim = new Date(assinatura.data_fim);
        dataFim.setHours(0, 0, 0, 0);
        return dataFim < hoje;
      }
      return false;
    });

    if (assinaturasParaAtualizar.length > 0) {
      console.log(
        `⏰ [ASSINATURAS-SERVICE] Atualizando ${assinaturasParaAtualizar.length} assinatura(s) expirada(s)`,
      );

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
    const assinatura = await this.findOne(id);

    assinatura.status = StatusAssinatura.CANCELADA;
    assinatura.cancelado_por = user.id;
    assinatura.cancelado_em = new Date();
    assinatura.motivo_cancelamento = cancelarDto.motivo_cancelamento;

    return await this.assinaturaRepository.save(assinatura);
  }

  async pausar(id: string): Promise<Assinatura> {
    const assinatura = await this.findOne(id);
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
    const proximaCobranca = new Date();
    proximaCobranca.setDate(assinatura.dia_vencimento);
    if (proximaCobranca < new Date()) {
      proximaCobranca.setMonth(proximaCobranca.getMonth() + 1);
    }
    assinatura.proxima_cobranca = proximaCobranca;

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
    const dataAtual = new Date();
    const novaDataFim = new Date(dataAtual);
    novaDataFim.setMonth(novaDataFim.getMonth() + novoPlano.duracao_meses);
    assinatura.data_fim = novaDataFim;

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
}
