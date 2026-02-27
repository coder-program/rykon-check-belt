import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modalidade } from './entities/modalidade.entity';
import { UnidadeModalidade } from './entities/unidade-modalidade.entity';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';
import { StatusAluno } from '../people/entities/aluno.entity';

@Injectable()
export class ModalidadesService {
  constructor(
    @InjectRepository(Modalidade)
    private modalidadeRepository: Repository<Modalidade>,
    @InjectRepository(UnidadeModalidade)
    private unidadeModalidadeRepository: Repository<UnidadeModalidade>,
  ) {}

  // ── MODALIDADES (catálogo global) ─────────────────────────────────────────

  async create(createModalidadeDto: CreateModalidadeDto): Promise<Modalidade> {
    const existente = await this.modalidadeRepository.findOne({
      where: { nome: createModalidadeDto.nome },
    });
    if (existente) {
      throw new ConflictException(
        `Modalidade "${createModalidadeDto.nome}" já existe no catálogo`,
      );
    }
    const modalidade = this.modalidadeRepository.create(createModalidadeDto);
    return this.modalidadeRepository.save(modalidade);
  }

  async findAll(
    unidade_id?: string,
    apenasAtivas?: boolean,
  ): Promise<(Modalidade & { totalAlunos: number })[]> {
    const query = this.modalidadeRepository
      .createQueryBuilder('modalidade')
      .loadRelationCountAndMap(
        'modalidade.totalAlunos',
        'modalidade.alunoModalidades',
        'am',
        (qb) => qb.where('am.ativo = :ativo', { ativo: true }),
      );

    if (unidade_id) {
      // Filtra apenas modalidades vinculadas à unidade via junction table
      query.innerJoin(
        UnidadeModalidade,
        'um',
        'um.modalidade_id = modalidade.id AND um.unidade_id = :unidade_id AND um.ativa IS NOT FALSE',
        { unidade_id },
      );
    }

    if (apenasAtivas) {
      query.andWhere('modalidade.ativo IS NOT FALSE');
    }

    query.orderBy('modalidade.nome', 'ASC');

    const result = await query.getMany();
    return result as unknown as (Modalidade & { totalAlunos: number })[];
  }

  async findOne(id: string): Promise<Modalidade> {
    const modalidade = await this.modalidadeRepository.findOne({ where: { id } });
    if (!modalidade) {
      throw new NotFoundException(`Modalidade com ID ${id} não encontrada`);
    }
    return modalidade;
  }

  async update(
    id: string,
    updateModalidadeDto: UpdateModalidadeDto,
  ): Promise<Modalidade> {
    const modalidade = await this.findOne(id);

    if (updateModalidadeDto.nome && updateModalidadeDto.nome !== modalidade.nome) {
      const existente = await this.modalidadeRepository.findOne({
        where: { nome: updateModalidadeDto.nome },
      });
      if (existente) {
        throw new ConflictException(
          `Modalidade "${updateModalidadeDto.nome}" já existe no catálogo`,
        );
      }
    }

    Object.assign(modalidade, updateModalidadeDto);
    return this.modalidadeRepository.save(modalidade);
  }

  async remove(id: string): Promise<void> {
    const modalidade = await this.modalidadeRepository
      .createQueryBuilder('modalidade')
      .loadRelationCountAndMap('modalidade.totalAlunos', 'modalidade.alunoModalidades')
      .where('modalidade.id = :id', { id })
      .getOne();

    if (!modalidade) {
      throw new NotFoundException(`Modalidade com ID ${id} não encontrada`);
    }

    const totalAlunos = (modalidade as any).totalAlunos || 0;
    if (totalAlunos > 0) {
      throw new BadRequestException(
        `Não é possível excluir esta modalidade pois ${totalAlunos} aluno(s) estão matriculados.`,
      );
    }

    await this.modalidadeRepository.remove(modalidade);
  }

  async desativar(
    id: string,
  ): Promise<{ modalidade: Modalidade; totalAlunos: number }> {
    const modalidade = await this.modalidadeRepository
      .createQueryBuilder('modalidade')
      .loadRelationCountAndMap(
        'modalidade.totalAlunos',
        'modalidade.alunoModalidades',
        'am',
        (qb) => qb.where('am.ativo = :ativo', { ativo: true }),
      )
      .where('modalidade.id = :id', { id })
      .getOne();

    if (!modalidade) {
      throw new NotFoundException(`Modalidade com ID ${id} não encontrada`);
    }

    const totalAlunos = (modalidade as any).totalAlunos || 0;
    modalidade.ativo = false;
    const saved = await this.modalidadeRepository.save(modalidade);
    return { modalidade: saved, totalAlunos };
  }

  async ativar(id: string): Promise<Modalidade> {
    const modalidade = await this.findOne(id);
    modalidade.ativo = true;
    return this.modalidadeRepository.save(modalidade);
  }

  // ── VÍNCULO UNIDADE ↔ MODALIDADE ──────────────────────────────────────────

  async vincularUnidade(
    modalidade_id: string,
    unidade_id: string,
  ): Promise<UnidadeModalidade> {
    await this.findOne(modalidade_id);

    const existente = await this.unidadeModalidadeRepository.findOne({
      where: { unidade_id, modalidade_id },
    });

    if (existente) {
      if (existente.ativa) {
        throw new ConflictException('Esta modalidade já está vinculada à unidade');
      }
      existente.ativa = true;
      return this.unidadeModalidadeRepository.save(existente);
    }

    const vinculo = this.unidadeModalidadeRepository.create({
      unidade_id,
      modalidade_id,
      ativa: true,
    });
    return this.unidadeModalidadeRepository.save(vinculo);
  }

  async desvincularUnidade(
    modalidade_id: string,
    unidade_id: string,
  ): Promise<void> {
    const vinculo = await this.unidadeModalidadeRepository.findOne({
      where: { unidade_id, modalidade_id },
    });
    if (!vinculo) {
      throw new NotFoundException('Vínculo não encontrado');
    }
    await this.unidadeModalidadeRepository.remove(vinculo);
  }

  async listUnidadeModalidades(
    unidade_id?: string,
  ): Promise<UnidadeModalidade[]> {
    const qb = this.unidadeModalidadeRepository
      .createQueryBuilder('um')
      .leftJoinAndSelect('um.modalidade', 'modalidade');

    if (unidade_id) {
      qb.where('um.unidade_id = :unidade_id', { unidade_id });
    }

    return qb.orderBy('modalidade.nome', 'ASC').getMany();
  }

  // ── ALUNOS / ESTATÍSTICAS ─────────────────────────────────────────────────

  async getAlunos(id: string): Promise<any[]> {
    await this.findOne(id);

    const registros = await this.modalidadeRepository
      .createQueryBuilder('modalidade')
      .leftJoinAndSelect('modalidade.alunoModalidades', 'am')
      .leftJoinAndSelect('am.aluno', 'aluno')
      .where('modalidade.id = :id', { id })
      .getOne();

    if (!registros?.alunoModalidades) return [];

    return registros.alunoModalidades
      .filter((am) => am.ativo)
      .map((am) => ({
      id: am.id,
      aluno_id: am.aluno_id,
      nome: am.aluno?.nome_completo || 'Sem nome',
      email: am.aluno?.email || null,
      telefone: am.aluno?.telefone || null,
      data_matricula: am.data_matricula,
      valor_praticado: am.valor_praticado ?? null,
      ativo: am.ativo,
      aluno_ativo: am.aluno?.status === StatusAluno.ATIVO,
    }));
  }

  async getEstatisticas(id: string): Promise<any> {
    const modalidade = await this.modalidadeRepository
      .createQueryBuilder('modalidade')
      .leftJoinAndSelect('modalidade.alunoModalidades', 'alunoModalidade')
      .leftJoinAndSelect('alunoModalidade.aluno', 'aluno')
      .where('modalidade.id = :id', { id })
      .andWhere('alunoModalidade.ativo = :ativo', { ativo: true })
      .andWhere('aluno.status = :alunoStatus', { alunoStatus: StatusAluno.ATIVO })
      .getOne();

    if (!modalidade) {
      throw new NotFoundException(`Modalidade com ID ${id} não encontrada`);
    }

    const totalAlunos = modalidade.alunoModalidades?.length || 0;
    const faturamentoReal =
      modalidade.alunoModalidades?.reduce((total, am) => {
        return total + Number(am.valor_praticado || 0);
      }, 0) || 0;

    return {
      modalidade: { id: modalidade.id, nome: modalidade.nome, cor: modalidade.cor },
      totalAlunos,
      faturamentoReal,
    };
  }
}
