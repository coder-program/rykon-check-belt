import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgendamentoAulaExperimental } from './entities/agendamento-aula-experimental.entity';
import { ConfigAulaExperimental } from './entities/config-aula-experimental.entity';
import {
  CriarAgendamentoDto,
  AtualizarStatusAgendamentoDto,
  UpsertConfigAulaExperimentalDto,
} from './dto/aula-experimental.dto';

@Injectable()
export class AulaExperimentalService {
  constructor(
    @InjectRepository(AgendamentoAulaExperimental)
    private agendamentoRepo: Repository<AgendamentoAulaExperimental>,
    @InjectRepository(ConfigAulaExperimental)
    private configRepo: Repository<ConfigAulaExperimental>,
  ) {}

  // ── CONFIG ─────────────────────────────────────────────────────────

  async getConfig(unidade_id: string, modalidade_id: string): Promise<ConfigAulaExperimental> {
    let config = await this.configRepo.findOne({ where: { unidade_id, modalidade_id } });
    if (!config) {
      // Retorna default sem salvar (lazy)
      config = this.configRepo.create({
        unidade_id,
        modalidade_id,
        ativo: true,
        max_aulas: 1,
        duracao_minutos: 60,
      });
    }
    return config;
  }

  async upsertConfig(
    unidade_id: string,
    modalidade_id: string,
    dto: UpsertConfigAulaExperimentalDto,
  ): Promise<ConfigAulaExperimental> {
    let config = await this.configRepo.findOne({ where: { unidade_id, modalidade_id } });
    if (!config) {
      config = this.configRepo.create({ unidade_id, modalidade_id });
    }
    Object.assign(config, dto);
    return this.configRepo.save(config);
  }

  // ── AGENDAMENTOS ───────────────────────────────────────────────────

  async listar(
    unidade_id?: string,
    modalidade_id?: string,
    franqueado_id?: string,
  ): Promise<AgendamentoAulaExperimental[]> {
    const qb = this.agendamentoRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.unidade', 'unidade')
      .leftJoinAndSelect('a.modalidade', 'modalidade')
      .leftJoin('a.criador', 'criador')
      .addSelect(['criador.id', 'criador.nome', 'criador.username', 'criador.email'])
      .orderBy('a.data_aula', 'DESC')
      .addOrderBy('a.horario', 'ASC');

    if (franqueado_id) {
      // unidade já está joined — filtra pela coluna franqueado_id da unidade
      qb.andWhere('unidade.franqueado_id = :franqueado_id', { franqueado_id });
    } else if (unidade_id) {
      qb.where('a.unidade_id = :unidade_id', { unidade_id });
    }

    if (modalidade_id) {
      qb.andWhere('a.modalidade_id = :modalidade_id', { modalidade_id });
    }

    return qb.getMany();
  }

  async criar(
    dto: CriarAgendamentoDto,
    criado_por?: string,
  ): Promise<AgendamentoAulaExperimental> {
    // Verificar limite por modalidade se o aluno já tem agendamentos
    if (dto.cpf) {
      const config = await this.getConfig(dto.unidade_id, dto.modalidade_id);
      if (config.ativo && config.max_aulas > 0) {
        const existentes = await this.agendamentoRepo.count({
          where: {
            unidade_id: dto.unidade_id,
            modalidade_id: dto.modalidade_id,
            cpf: dto.cpf,
          },
        });
        if (existentes >= config.max_aulas) {
          throw new BadRequestException(
            `Este CPF já atingiu o limite de ${config.max_aulas} aula(s) experimental(is) para esta modalidade nesta unidade.`,
          );
        }
      }
    }

    const agendamento = this.agendamentoRepo.create({
      ...dto,
      criado_por: criado_por ?? null,
    });

    return this.agendamentoRepo.save(agendamento);
  }

  async atualizarStatus(
    id: string,
    dto: AtualizarStatusAgendamentoDto,
  ): Promise<AgendamentoAulaExperimental> {
    const agendamento = await this.agendamentoRepo.findOne({ where: { id } });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado');

    agendamento.status = dto.status as any;
    if (dto.observacoes !== undefined) {
      agendamento.observacoes = dto.observacoes;
    }

    return this.agendamentoRepo.save(agendamento);
  }

  async remover(id: string): Promise<void> {
    const agendamento = await this.agendamentoRepo.findOne({ where: { id } });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado');
    await this.agendamentoRepo.remove(agendamento);
  }
}
