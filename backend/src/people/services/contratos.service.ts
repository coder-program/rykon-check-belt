import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ContratoUnidade } from '../entities/contrato-unidade.entity';
import { ContratoAssinaturaHistorico, TipoUsuarioAssinatura } from '../entities/contrato-assinatura-historico.entity';
import { Aluno } from '../entities/aluno.entity';
import { Responsavel } from '../entities/responsavel.entity';
import {
  CreateContratoUnidadeDto,
  UpdateContratoUnidadeDto,
  AssinarContratoDto,
  ContratoStatusDto,
} from '../dto/contrato-unidade.dto';

@Injectable()
export class ContratosService {
  constructor(
    @InjectRepository(ContratoUnidade)
    private contratosRepository: Repository<ContratoUnidade>,
    @InjectRepository(ContratoAssinaturaHistorico)
    private historicoRepository: Repository<ContratoAssinaturaHistorico>,
    @InjectRepository(Aluno)
    private alunosRepository: Repository<Aluno>,
    @InjectRepository(Responsavel)
    private responsaveisRepository: Repository<Responsavel>,
    private dataSource: DataSource,
  ) {}

  // ===== CRUD DE CONTRATOS =====

  async create(
    createDto: CreateContratoUnidadeDto,
    usuarioId: string,
  ): Promise<ContratoUnidade> {
    const contrato = this.contratosRepository.create({
      ...createDto,
      versao: 1,
      created_by: usuarioId,
      updated_by: usuarioId,
    });

    return await this.contratosRepository.save(contrato);
  }

  async findAll(unidadeId?: string): Promise<ContratoUnidade[]> {
    const query = this.contratosRepository.createQueryBuilder('contrato');

    if (unidadeId) {
      query.where('contrato.unidade_id = :unidadeId', { unidadeId });
    }

    return await query
      .orderBy('contrato.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<ContratoUnidade> {
    const contrato = await this.contratosRepository.findOne({
      where: { id },
      relations: ['unidade'],
    });

    if (!contrato) {
      throw new NotFoundException(`Contrato com ID ${id} não encontrado`);
    }

    return contrato;
  }

  async findByUnidade(unidadeId: string): Promise<ContratoUnidade[]> {
    return await this.contratosRepository.find({
      where: { unidade_id: unidadeId, ativo: true },
      order: { created_at: 'DESC' },
    });
  }

  async getContratoAtivoUnidade(unidadeId: string): Promise<ContratoUnidade | null> {
    return await this.contratosRepository.findOne({
      where: { unidade_id: unidadeId, ativo: true, obrigatorio: true },
      order: { versao: 'DESC' },
    });
  }

  async update(
    id: string,
    updateDto: UpdateContratoUnidadeDto,
    usuarioId: string,
  ): Promise<ContratoUnidade> {
    const contrato = await this.findOne(id);

    // Incrementar versão se o conteúdo foi alterado
    if (updateDto.conteudo && updateDto.conteudo !== contrato.conteudo) {
      contrato.versao += 1;
    }

    Object.assign(contrato, updateDto);
    contrato.updated_by = usuarioId;

    return await this.contratosRepository.save(contrato);
  }

  async remove(id: string): Promise<void> {
    const contrato = await this.findOne(id);
    contrato.ativo = false;
    await this.contratosRepository.save(contrato);
  }

  // ===== ASSINATURA DE CONTRATOS =====

  async assinarContratoAluno(
    alunoId: string,
    usuarioId: string,
    assinarDto: AssinarContratoDto,
  ): Promise<{ message: string }> {
    const aluno = await this.alunosRepository.findOne({
      where: { id: alunoId },
      relations: ['unidade'],
    });

    if (!aluno) {
      throw new NotFoundException(`Aluno com ID ${alunoId} não encontrado`);
    }

    const contrato = await this.findOne(assinarDto.contrato_id);

    // Verificar se o contrato pertence à unidade do aluno
    if (contrato.unidade_id !== aluno.unidade_id) {
      throw new BadRequestException(
        'Este contrato não pertence à unidade do aluno',
      );
    }

    if (!assinarDto.aceito) {
      throw new BadRequestException(
        'É necessário aceitar o contrato para prosseguir',
      );
    }

    // Atualizar dados do aluno
    aluno.contrato_assinado = true;
    aluno.contrato_id = contrato.id;
    aluno.contrato_assinado_em = new Date();
    aluno.contrato_assinado_ip = assinarDto.ip_address || '';
    aluno.contrato_versao_assinada = contrato.versao;

    await this.alunosRepository.save(aluno);

    // Registrar no histórico
    const historico = this.historicoRepository.create({
      contrato_id: contrato.id,
      usuario_id: usuarioId,
      tipo_usuario: TipoUsuarioAssinatura.ALUNO,
      versao_contrato: contrato.versao,
      ip_address: assinarDto.ip_address,
      user_agent: assinarDto.user_agent,
      aceito: true,
    });

    await this.historicoRepository.save(historico);

    return { message: 'Contrato assinado com sucesso' };
  }

  async assinarContratoResponsavel(
    responsavelId: string,
    usuarioId: string,
    assinarDto: AssinarContratoDto,
  ): Promise<{ message: string }> {
    const responsavel = await this.responsaveisRepository.findOne({
      where: { id: responsavelId },
    });

    if (!responsavel) {
      throw new NotFoundException(
        `Responsável com ID ${responsavelId} não encontrado`,
      );
    }

    const contrato = await this.findOne(assinarDto.contrato_id);

    // Verificar se o contrato pertence à unidade do responsável
    if (contrato.unidade_id !== responsavel.unidade_id) {
      throw new BadRequestException(
        'Este contrato não pertence à unidade do responsável',
      );
    }

    if (!assinarDto.aceito) {
      throw new BadRequestException(
        'É necessário aceitar o contrato para prosseguir',
      );
    }

    // Atualizar dados do responsável
    responsavel.contrato_assinado = true;
    responsavel.contrato_id = contrato.id;
    responsavel.contrato_assinado_em = new Date();
    responsavel.contrato_assinado_ip = assinarDto.ip_address || '';
    responsavel.contrato_versao_assinada = contrato.versao;

    await this.responsaveisRepository.save(responsavel);

    // Registrar no histórico
    const historico = this.historicoRepository.create({
      contrato_id: contrato.id,
      usuario_id: usuarioId,
      tipo_usuario: TipoUsuarioAssinatura.RESPONSAVEL,
      versao_contrato: contrato.versao,
      ip_address: assinarDto.ip_address,
      user_agent: assinarDto.user_agent,
      aceito: true,
    });

    await this.historicoRepository.save(historico);

    return { message: 'Contrato assinado com sucesso' };
  }

  // ===== VERIFICAÇÃO DE STATUS =====

  async verificarStatusAluno(alunoId: string): Promise<ContratoStatusDto> {
    const aluno = await this.alunosRepository.findOne({
      where: { id: alunoId },
    });

    if (!aluno) {
      throw new NotFoundException(`Aluno com ID ${alunoId} não encontrado`);
    }

    const contratoAtivo = await this.getContratoAtivoUnidade(aluno.unidade_id);

    if (!contratoAtivo) {
      return {
        contrato_pendente: false,
      };
    }

    // Verificar se já assinou ou se a versão mudou
    const precisaAssinar =
      !aluno.contrato_assinado ||
      !aluno.contrato_versao_assinada ||
      aluno.contrato_versao_assinada < contratoAtivo.versao;

    return {
      contrato_pendente: precisaAssinar,
      contrato: precisaAssinar
        ? {
            id: contratoAtivo.id,
            titulo: contratoAtivo.titulo,
            conteudo: contratoAtivo.conteudo,
            tipo_contrato: contratoAtivo.tipo_contrato,
            versao: contratoAtivo.versao,
          }
        : undefined,
      ultima_assinatura: aluno.contrato_assinado
        ? {
            data: aluno.contrato_assinado_em,
            versao: aluno.contrato_versao_assinada,
          }
        : undefined,
    };
  }

  async verificarStatusResponsavel(
    responsavelId: string,
  ): Promise<ContratoStatusDto> {
    const responsavel = await this.responsaveisRepository.findOne({
      where: { id: responsavelId },
    });

    if (!responsavel) {
      throw new NotFoundException(
        `Responsável com ID ${responsavelId} não encontrado`,
      );
    }

    const contratoAtivo = await this.getContratoAtivoUnidade(
      responsavel.unidade_id,
    );

    if (!contratoAtivo) {
      return {
        contrato_pendente: false,
      };
    }

    // Verificar se já assinou ou se a versão mudou
    const precisaAssinar =
      !responsavel.contrato_assinado ||
      !responsavel.contrato_versao_assinada ||
      responsavel.contrato_versao_assinada < contratoAtivo.versao;

    return {
      contrato_pendente: precisaAssinar,
      contrato: precisaAssinar
        ? {
            id: contratoAtivo.id,
            titulo: contratoAtivo.titulo,
            conteudo: contratoAtivo.conteudo,
            tipo_contrato: contratoAtivo.tipo_contrato,
            versao: contratoAtivo.versao,
          }
        : undefined,
      ultima_assinatura: responsavel.contrato_assinado
        ? {
            data: responsavel.contrato_assinado_em,
            versao: responsavel.contrato_versao_assinada,
          }
        : undefined,
    };
  }

  async getHistoricoAssinaturas(contratoId: string) {
    return await this.historicoRepository.find({
      where: { contrato_id: contratoId },
      order: { assinado_em: 'DESC' },
      relations: ['usuario'],
    });
  }
}
