import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plano } from '../entities/plano.entity';
import { CreatePlanoDto, UpdatePlanoDto } from '../dto/plano.dto';

@Injectable()
export class PlanosService {
  constructor(
    @InjectRepository(Plano)
    private planoRepository: Repository<Plano>,
  ) {}

  async create(createPlanoDto: CreatePlanoDto): Promise<Plano> {
    const plano = this.planoRepository.create(createPlanoDto);
    return await this.planoRepository.save(plano);
  }

  async findAll(
    unidade_id?: string,
    franqueado_id?: string | null,
  ): Promise<Plano[]> {
    const query = this.planoRepository
      .createQueryBuilder('plano')
      .leftJoinAndSelect('plano.unidade', 'unidade')
      .orderBy('plano.ativo', 'DESC')
      .addOrderBy('plano.valor', 'ASC');

    // Se foi passado franqueado_id, filtrar pelas unidades desse franqueado
    if (franqueado_id) {
      console.log(
        '🔍 [PLANOS SERVICE] Filtrando por franqueado_id:',
        franqueado_id,
      );
      query.andWhere(
        '(unidade.franqueado_id = :franqueado_id OR plano.unidade_id IS NULL)',
        {
          franqueado_id,
        },
      );
    } else if (unidade_id) {
      query.andWhere(
        '(plano.unidade_id = :unidade_id OR plano.unidade_id IS NULL)',
        {
          unidade_id,
        },
      );
    }

    const result = await query.getMany();
    console.log('📊 [PLANOS SERVICE] Planos encontrados:', result.length);
    return result;
  }

  async findOne(id: string): Promise<Plano> {
    const plano = await this.planoRepository.findOne({
      where: { id },
      relations: ['unidade', 'assinaturas'],
    });

    if (!plano) {
      throw new NotFoundException(`Plano ${id} não encontrado`);
    }

    return plano;
  }

  async update(id: string, updatePlanoDto: UpdatePlanoDto): Promise<Plano> {
    const plano = await this.findOne(id);
    Object.assign(plano, updatePlanoDto);
    return await this.planoRepository.save(plano);
  }

  async remove(id: string): Promise<void> {
    const plano = await this.findOne(id);
    plano.ativo = false;
    await this.planoRepository.save(plano);
  }

  async findByTipo(tipo: string, unidade_id?: string): Promise<Plano[]> {
    const query = this.planoRepository
      .createQueryBuilder('plano')
      .where('plano.tipo = :tipo', { tipo })
      .andWhere('plano.ativo = :ativo', { ativo: true });

    if (unidade_id) {
      query.andWhere(
        '(plano.unidade_id = :unidade_id OR plano.unidade_id IS NULL)',
        {
          unidade_id,
        },
      );
    }

    return await query.getMany();
  }
}
