import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Responsavel } from '../entities/responsavel.entity';
import {
  CreateResponsavelDto,
  UpdateResponsavelDto,
} from '../dto/responsavel.dto';

@Injectable()
export class ResponsaveisService {
  constructor(
    @InjectRepository(Responsavel)
    private responsaveisRepository: Repository<Responsavel>,
  ) {}

  async create(
    createResponsavelDto: CreateResponsavelDto,
  ): Promise<Responsavel> {
    const responsavel =
      this.responsaveisRepository.create(createResponsavelDto);
    return await this.responsaveisRepository.save(responsavel);
  }

  async findAll(): Promise<Responsavel[]> {
    return await this.responsaveisRepository.find({
      relations: ['usuario', 'dependentes'],
    });
  }

  async findOne(id: string): Promise<Responsavel> {
    const responsavel = await this.responsaveisRepository.findOne({
      where: { id },
      relations: ['usuario', 'dependentes'],
    });

    if (!responsavel) {
      throw new NotFoundException(`Responsável com ID ${id} não encontrado`);
    }

    return responsavel;
  }

  async findByUsuarioId(usuario_id: string): Promise<Responsavel> {
    const responsavel = await this.responsaveisRepository.findOne({
      where: { usuario_id },
      relations: ['usuario', 'dependentes'],
    });

    if (!responsavel) {
      throw new NotFoundException(
        `Responsável com usuário ID ${usuario_id} não encontrado`,
      );
    }

    return responsavel;
  }

  async update(
    id: string,
    updateResponsavelDto: UpdateResponsavelDto,
  ): Promise<Responsavel> {
    const responsavel = await this.findOne(id);
    Object.assign(responsavel, updateResponsavelDto);
    return await this.responsaveisRepository.save(responsavel);
  }

  async remove(id: string): Promise<void> {
    const responsavel = await this.findOne(id);
    responsavel.ativo = false;
    await this.responsaveisRepository.save(responsavel);
  }

  async getDependentes(responsavel_id: string) {
    const responsavel = await this.responsaveisRepository.findOne({
      where: { id: responsavel_id },
      relations: ['dependentes', 'dependentes.faixa', 'dependentes.unidade'],
    });

    if (!responsavel) {
      throw new NotFoundException(
        `Responsável com ID ${responsavel_id} não encontrado`,
      );
    }

    return responsavel.dependentes;
  }
}
