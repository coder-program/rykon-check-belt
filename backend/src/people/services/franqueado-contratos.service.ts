import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FranqueadoContrato } from '../entities/franqueado-contrato.entity';
import { FranqueadoModuloContratado } from '../entities/franqueado-modulo-contratado.entity';
import { FranqueadoHistoricoEvento } from '../entities/franqueado-historico-evento.entity';
import {
  CreateFranqueadoContratoDto,
  UpdateFranqueadoContratoDto,
  ListFranqueadoContratosDto,
  CreateModuloContratadoDto,
} from '../dto/franqueado-contratos.dto';

@Injectable()
export class FranqueadoContratosService {
  constructor(
    @InjectRepository(FranqueadoContrato)
    private contratosRepo: Repository<FranqueadoContrato>,
    @InjectRepository(FranqueadoModuloContratado)
    private modulosRepo: Repository<FranqueadoModuloContratado>,
    @InjectRepository(FranqueadoHistoricoEvento)
    private eventoRepo: Repository<FranqueadoHistoricoEvento>,
    private dataSource: DataSource,
  ) {}

  // ── Criar contrato com módulos (transação) ────────────────────
  async create(dto: CreateFranqueadoContratoDto): Promise<FranqueadoContrato> {
    return await this.dataSource.transaction(async (manager) => {
      const { modulos, ...contratoData } = dto;

      const contrato = manager.create(FranqueadoContrato, {
        ...(contratoData as import('typeorm').DeepPartial<FranqueadoContrato>),
        status_contrato: 'EM_IMPLANTACAO' as const,
        ativo: true,
      });

      const saved = await manager.save(FranqueadoContrato, contrato);

      if (modulos && modulos.length > 0) {
        const moduloEntities = modulos.map((m: CreateModuloContratadoDto) =>
          manager.create(FranqueadoModuloContratado, {
            ...(m as import('typeorm').DeepPartial<FranqueadoModuloContratado>),
            contrato_id: saved.id,
            status: 'ATIVO' as const,
          }),
        );
        await manager.save(FranqueadoModuloContratado, moduloEntities);
      }

      const result = (await manager.findOne(FranqueadoContrato, {
        where: { id: saved.id },
        relations: ['modulos'],
      })) as FranqueadoContrato;

      // Registrar evento de auditoria (fire-and-forget, fora da transação)
      this.eventoRepo.save(
        this.eventoRepo.create({
          franqueado_id: result.franqueado_id,
          contrato_id: result.id,
          tipo_evento: 'CONTRATO_CRIADO',
          descricao: `Contrato criado — código: ${result.codigo ?? result.id}, status: ${result.status_contrato ?? 'EM_IMPLANTACAO'}`,
        } as import('typeorm').DeepPartial<FranqueadoHistoricoEvento>),
      ).catch(() => { /* não bloquear em erro de auditoria */ });

      return result;
    });
  }

  // ── Listar ────────────────────────────────────────────────────
  async findAll(query: ListFranqueadoContratosDto): Promise<FranqueadoContrato[]> {
    const qb = this.contratosRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.modulos', 'modulos')
      .leftJoinAndSelect('c.franqueado', 'franqueado')
      .orderBy('c.created_at', 'DESC');

    if (query.franqueado_id) {
      qb.andWhere('c.franqueado_id = :fid', { fid: query.franqueado_id });
    }
    if (query.status_contrato) {
      qb.andWhere('c.status_contrato = :sc', { sc: query.status_contrato });
    }
    if (query.status_implantacao) {
      qb.andWhere('c.status_implantacao = :si', {
        si: query.status_implantacao,
      });
    }

    return await qb.getMany();
  }

  // ── Buscar por ID ─────────────────────────────────────────────
  async findOne(id: string): Promise<FranqueadoContrato> {
    const contrato = await this.contratosRepo.findOne({
      where: { id },
      relations: ['modulos', 'franqueado'],
    });
    if (!contrato) {
      throw new NotFoundException(`Contrato ${id} não encontrado`);
    }
    return contrato;
  }

  // ── Buscar por franqueado_id (ativo mais recente) ─────────────
  async findByFranqueado(franqueadoId: string): Promise<FranqueadoContrato[]> {
    return await this.contratosRepo.find({
      where: { franqueado_id: franqueadoId, ativo: true },
      relations: ['modulos'],
      order: { created_at: 'DESC' },
    });
  }

  // ── Atualizar ─────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateFranqueadoContratoDto,
  ): Promise<FranqueadoContrato> {
    const contrato = await this.findOne(id);
    const { modulos, ...updateData } = dto;

    Object.assign(contrato, updateData);
    await this.contratosRepo.save(contrato);

    if (modulos) {
      // Apaga módulos antigos e recria (estratégia simples)
      await this.modulosRepo.delete({ contrato_id: id });

      const novosModulos = modulos.map((m) =>
        this.modulosRepo.create({
          ...(m as import('typeorm').DeepPartial<FranqueadoModuloContratado>),
          contrato_id: id,
          status: 'ATIVO' as const,
        }),
      );
      await this.modulosRepo.save(novosModulos);
    }

    return await this.findOne(id);
  }

  // ── Desativar ─────────────────────────────────────────────────
  async remove(id: string): Promise<{ message: string }> {
    const contrato = await this.findOne(id);
    contrato.ativo = false;
    contrato.status_contrato = 'ENCERRADO';
    await this.contratosRepo.save(contrato);
    return { message: `Contrato ${id} encerrado` };
  }
}
