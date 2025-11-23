import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { GraduacaoParametro } from '../people/entities/graduacao-parametro.entity';
import { AlunoGraduacao } from './entities/aluno-graduacao.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { AlunoFaixa } from './entities/aluno-faixa.entity';
import { FaixaDef } from './entities/faixa-def.entity';
import {
  CreateGraduacaoParametroDto,
  UpdateGraduacaoParametroDto,
  AprovarGraduacaoDto,
  SolicitarGraduacaoDto,
} from '../people/dto/graduacao-parametro.dto';

@Injectable()
export class GraduacaoParametrosService {
  constructor(
    @InjectRepository(GraduacaoParametro)
    private parametroRepository: Repository<GraduacaoParametro>,
    @InjectRepository(AlunoGraduacao)
    private graduacaoRepository: Repository<AlunoGraduacao>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(AlunoFaixa)
    private alunoFaixaRepository: Repository<AlunoFaixa>,
    @InjectRepository(FaixaDef)
    private faixaDefRepository: Repository<FaixaDef>,
  ) {}

  // ============================================
  // CRUD de Parâmetros
  // ============================================

  async create(dto: CreateGraduacaoParametroDto, userId: string) {
    const parametro = this.parametroRepository.create({
      ...dto,
      created_by: userId,
    });
    return await this.parametroRepository.save(parametro);
  }

  async findAll(unidadeId?: string) {
    const where: any = { ativo: true };

    if (unidadeId) {
      where.unidade_id = In([unidadeId, IsNull()]);
    }

    return await this.parametroRepository.find({
      where,
      relations: ['unidade'],
      order: { data_inicio: 'DESC' },
    });
  }

  async findOne(id: string) {
    const parametro = await this.parametroRepository.findOne({
      where: { id },
      relations: ['unidade'],
    });

    if (!parametro) {
      throw new NotFoundException('Parâmetro de graduação não encontrado');
    }

    return parametro;
  }

  async update(id: string, dto: UpdateGraduacaoParametroDto) {
    await this.findOne(id);
    await this.parametroRepository.update(id, dto);
    return await this.findOne(id);
  }

  async remove(id: string) {
    const parametro = await this.findOne(id);
    parametro.ativo = false;
    return await this.parametroRepository.save(parametro);
  }

  // ============================================
  // Listar Alunos Aptos para Graduação
  // ============================================

  async getAlunosAptosGraduacao(parametroId?: string, unidadeIds?: string[]) {
    console.log(
      '🔥 🔥 🔥 [GRADUACAO SERVICE] Iniciando getAlunosAptosGraduacao',
    );
    console.log('🔥 🔥 🔥 [GRADUACAO SERVICE] parametroId:', parametroId);
    console.log(
      '🔥 🔥 🔥 [GRADUACAO SERVICE] unidadeIds recebidos:',
      unidadeIds,
    );
    console.log(
      '🔥 🔥 🔥 [GRADUACAO SERVICE] Total de unidades:',
      unidadeIds?.length,
    );

    // Buscar parâmetro ou usar padrão
    let parametro: GraduacaoParametro | null = null;
    if (parametroId) {
      parametro = await this.parametroRepository.findOne({
        where: { id: parametroId, ativo: true },
      });
    } else {
      // Buscar parâmetro ativo atual
      parametro = await this.parametroRepository.findOne({
        where: {
          ativo: true,
          unidade_id: IsNull(),
        },
        order: { data_inicio: 'DESC' },
      });
    }

    const graus_minimos = parametro?.graus_minimos || 4;
    const presencas_minimas = parametro?.presencas_minimas || 160;

    console.log('🔥 🔥 🔥 [GRADUACAO SERVICE] Parâmetros:', {
      graus_minimos,
      presencas_minimas,
    });

    // Query builder para buscar alunos aptos
    const query = this.alunoRepository
      .createQueryBuilder('aluno')
      .leftJoinAndSelect('aluno.unidade', 'unidade')
      .leftJoinAndSelect(
        'aluno.faixas',
        'aluno_faixa',
        'aluno_faixa.ativa = :faixaAtiva',
        { faixaAtiva: true },
      )
      .leftJoinAndSelect('aluno_faixa.faixaDef', 'faixa_def')
      .leftJoinAndSelect(
        'aluno.graduacoes',
        'graduacao',
        'graduacao.faixa_origem_id = aluno_faixa.faixa_def_id AND graduacao.parametro_id = :parametroId',
        { parametroId: parametroId || null },
      )
      .where('aluno.status = :status', { status: 'ATIVO' })
      .andWhere('aluno_faixa.ativa = :ativa', { ativa: true })
      .andWhere('aluno_faixa.graus_atual >= :grausMin', {
        grausMin: graus_minimos,
      })
      .andWhere('aluno_faixa.presencas_total_fx >= :presencasMin', {
        presencasMin: presencas_minimas,
      })
      .andWhere('faixa_def.codigo != :faixaPreta', { faixaPreta: 'PRETA' }); // Preta tem regras especiais

    // Filtro por unidades (para perfis que veem apenas suas unidades)
    if (unidadeIds && unidadeIds.length > 0) {
      console.log(
        '🔥 🔥 🔥 [GRADUACAO SERVICE] APLICANDO FILTRO DE UNIDADES:',
        unidadeIds,
      );
      query.andWhere('aluno.unidade_id IN (:...unidadeIds)', { unidadeIds });
    } else {
      console.log(
        '🔥 🔥 🔥 [GRADUACAO SERVICE] ⚠️  SEM FILTRO DE UNIDADES - RETORNANDO TODOS!',
      );
    }

    const alunos = await query.getMany();

    console.log(
      '🔥 🔥 🔥 [GRADUACAO SERVICE] Total de alunos encontrados:',
      alunos.length,
    );
    if (alunos.length > 0) {
      console.log(
        '🔥 🔥 🔥 [GRADUACAO SERVICE] Primeiros 3 alunos:',
        alunos.slice(0, 3).map((a) => ({
          nome: a.nome_completo,
          unidade_id: a.unidade_id,
          unidade_nome: a.unidade?.nome,
        })),
      );
    }

    // Formatar resultado
    const resultado = await Promise.all(
      alunos.map(async (aluno) => {
        // Buscar faixa ativa
        const faixaAtiva = aluno.faixas?.find((f) => f.ativa);
        if (!faixaAtiva) {
          return null; // Pular aluno sem faixa ativa
        }

        const faixaDef = faixaAtiva.faixaDef;

        // Buscar próxima faixa
        const proximaFaixa = await this.faixaDefRepository.findOne({
          where: {
            ordem: faixaDef.ordem + 1,
            categoria: faixaDef.categoria,
          },
        });

        // Buscar graduação existente
        const graduacao = aluno.graduacoes?.[0] || null;

        return {
          aluno_id: aluno.id,
          aluno_nome: aluno.nome_completo,
          aluno_cpf: aluno.cpf,
          unidade_id: aluno.unidade_id,
          unidade_nome: aluno.unidade?.nome,

          // Faixa atual
          faixa_atual_id: faixaDef.id,
          faixa_atual_codigo: faixaDef.codigo,
          faixa_atual_nome: faixaDef.nome_exibicao,
          faixa_atual_cor: faixaDef.cor_hex,
          graus_atual: faixaAtiva.graus_atual,
          presencas_total: faixaAtiva.presencas_total_fx,
          data_inicio_faixa: faixaAtiva.dt_inicio,

          // Próxima faixa
          proxima_faixa_id: proximaFaixa?.id,
          proxima_faixa_codigo: proximaFaixa?.codigo,
          proxima_faixa_nome: proximaFaixa?.nome_exibicao,
          proxima_faixa_cor: proximaFaixa?.cor_hex,

          // Status graduação
          graduacao_id: graduacao?.id,
          graduacao_aprovada: graduacao?.aprovado || false,
          graduacao_aprovado_por_id: graduacao?.aprovado_por,
          graduacao_data_aprovacao: graduacao?.dt_aprovacao,
          solicitado_em: graduacao?.solicitado_em,
          observacao: graduacao?.observacao,
          observacao_aprovacao: graduacao?.observacao_aprovacao,

          // Verificações
          graus_suficientes: faixaAtiva.graus_atual >= graus_minimos,
          presencas_suficientes:
            faixaAtiva.presencas_total_fx >= presencas_minimas,
          apto_graduar: true, // Já filtrado pela query
        };
      }),
    );

    // Filtrar resultados nulos
    return resultado.filter((r) => r !== null);
  }

  // ============================================
  // ============================================
  // Solicitar Graduação
  // ============================================

  async solicitarGraduacao(dto: SolicitarGraduacaoDto, userId: string) {
    const aluno = await this.alunoRepository.findOne({
      where: { id: dto.aluno_id },
      relations: ['faixas', 'faixas.faixaDef'],
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const faixaAtiva = aluno.faixas?.find((f) => f.ativa);
    if (!faixaAtiva) {
      throw new BadRequestException('Aluno sem faixa ativa');
    }

    const parametro = await this.findOne(dto.parametro_id);

    // Buscar próxima faixa
    const proximaFaixa = await this.faixaDefRepository.findOne({
      where: {
        ordem: faixaAtiva.faixaDef.ordem + 1,
        categoria: faixaAtiva.faixaDef.categoria,
      },
    });

    if (!proximaFaixa) {
      throw new BadRequestException('Próxima faixa não encontrada');
    }

    // Verificar se já existe solicitação
    const existente = await this.graduacaoRepository.findOne({
      where: {
        aluno_id: dto.aluno_id,
        faixa_origem_id: faixaAtiva.faixa_def_id,
        parametro_id: dto.parametro_id,
      },
    });

    if (existente) {
      throw new BadRequestException(
        'Já existe solicitação de graduação para este aluno',
      );
    }

    // Criar solicitação
    const graduacao = this.graduacaoRepository.create({
      aluno_id: dto.aluno_id,
      faixa_origem_id: faixaAtiva.faixa_def_id,
      faixa_destino_id: proximaFaixa.id,
      parametro_id: dto.parametro_id,
      solicitado_em: new Date(),
      observacao: dto.observacao,
      concedido_por: userId,
      aprovado: false,
    });

    return await this.graduacaoRepository.save(graduacao);
  }

  // ============================================
  // Aprovar Graduação
  // ============================================

  async aprovarGraduacao(dto: AprovarGraduacaoDto, userId: string) {
    // Buscar solicitação existente ou criar nova
    let graduacao = await this.graduacaoRepository.findOne({
      where: {
        aluno_id: dto.aluno_id,
        faixa_origem_id: dto.faixa_origem_id,
        parametro_id: dto.parametro_id || IsNull(),
      },
    });

    if (!graduacao) {
      // Criar nova graduação
      graduacao = this.graduacaoRepository.create({
        aluno_id: dto.aluno_id,
        faixa_origem_id: dto.faixa_origem_id,
        faixa_destino_id: dto.faixa_destino_id,
        parametro_id: dto.parametro_id,
        concedido_por: userId,
      });
    }

    // Aprovar
    graduacao.aprovado = true;
    graduacao.aprovado_por = userId;
    graduacao.dt_aprovacao = new Date();
    graduacao.observacao_aprovacao = dto.observacao_aprovacao || null;

    const resultado = await this.graduacaoRepository.save(graduacao);

    return resultado;
  }

  // ============================================
  // Reprovar Graduação
  // ============================================

  async reprovarGraduacao(
    graduacaoId: string,
    observacao: string,
    userId: string,
  ) {
    const graduacao = await this.graduacaoRepository.findOne({
      where: { id: graduacaoId },
    });

    if (!graduacao) {
      throw new NotFoundException('Graduação não encontrada');
    }

    graduacao.aprovado = false;
    graduacao.aprovado_por = userId;
    graduacao.dt_aprovacao = new Date();
    graduacao.observacao_aprovacao = observacao;

    return await this.graduacaoRepository.save(graduacao);
  }
}
