import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assinatura, StatusAssinatura } from '../entities/assinatura.entity';
import { Plano } from '../entities/plano.entity';
import { Aluno } from '../../people/entities/aluno.entity';
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

    // Calcular data_fim e proxima_cobranca
    const dataInicio = new Date(createAssinaturaDto.data_inicio);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + plano.duracao_meses);

    const proximaCobranca = new Date(dataInicio);
    const diaVencimento = createAssinaturaDto.dia_vencimento || 10;
    proximaCobranca.setDate(diaVencimento);
    if (proximaCobranca < new Date()) {
      proximaCobranca.setMonth(proximaCobranca.getMonth() + 1);
    }

    const assinatura = this.assinaturaRepository.create({
      ...createAssinaturaDto,
      valor: plano.valor,
      data_fim: dataFim,
      proxima_cobranca: proximaCobranca,
      dia_vencimento: diaVencimento,
      status: StatusAssinatura.ATIVA,
    });

    return await this.assinaturaRepository.save(assinatura);
  }

  async findAll(
    unidade_id?: string,
    status?: StatusAssinatura,
    user?: any,
  ): Promise<Assinatura[]> {
    console.log(
      '🔥🔥🔥 [ASSINATURAS SERVICE] unidade_id recebido:',
      unidade_id,
    );
    console.log('🔥🔥🔥 [ASSINATURAS SERVICE] tipo:', typeof unidade_id);

    const query = this.assinaturaRepository
      .createQueryBuilder('assinatura')
      .leftJoinAndSelect('assinatura.aluno', 'aluno')
      .leftJoinAndSelect('assinatura.plano', 'plano')
      .leftJoinAndSelect('assinatura.unidade', 'unidade')
      .orderBy('assinatura.proxima_cobranca', 'ASC');

    // Se unidade_id foi passada, filtrar diretamente por ela
    if (unidade_id) {
      console.log(
        '🔥🔥🔥 [ASSINATURAS SERVICE] Filtrando por unidade_id:',
        unidade_id,
      );
      query.andWhere('assinatura.unidade_id = :unidade_id', { unidade_id });
    } else if (user) {
      console.log(
        '🔥🔥🔥 [ASSINATURAS SERVICE] unidade_id vazio, verificando franqueado...',
      );
      // Senão, se for franqueado, filtrar por todas suas unidades
      const isFranqueado = user.perfis?.some(
        (p: any) =>
          (typeof p === 'string' && p.toLowerCase() === 'franqueado') ||
          (typeof p === 'object' && p?.nome?.toLowerCase() === 'franqueado'),
      );

      if (isFranqueado) {
        console.log(
          '🔥🔥🔥 [ASSINATURAS SERVICE] É franqueado, filtrando por suas unidades',
        );
        // Buscar unidades do franqueado via join
        query
          .leftJoin('unidade.franqueado', 'franqueado')
          .leftJoin('franqueado.usuario', 'usuario')
          .andWhere('usuario.id = :userId', { userId: user.id });
      }
    }

    if (status) {
      query.andWhere('assinatura.status = :status', { status });
    }

    const result = await query.getMany();
    console.log(
      '🔥🔥🔥 [ASSINATURAS SERVICE] Total encontrado:',
      result.length,
    );
    console.log(
      '🔥🔥🔥 [ASSINATURAS SERVICE] Unidades:',
      result.map((a) => a.unidade_id),
    );

    return result;
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
