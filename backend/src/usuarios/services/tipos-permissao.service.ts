import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoPermissao } from '../entities/tipo-permissao.entity';
import { CreateTipoPermissaoDto } from '../dto/create-tipo-permissao.dto';

@Injectable()
export class TiposPermissaoService {
  constructor(
    @InjectRepository(TipoPermissao)
    private tipoPermissaoRepository: Repository<TipoPermissao>,
  ) {}

  async create(createTipoPermissaoDto: CreateTipoPermissaoDto): Promise<TipoPermissao> {
    // Verificar se código já existe
    const existingCodigo = await this.tipoPermissaoRepository.findOne({
      where: { codigo: createTipoPermissaoDto.codigo }
    });
    if (existingCodigo) {
      throw new ConflictException('Código já existe');
    }

    const tipoPermissao = this.tipoPermissaoRepository.create(createTipoPermissaoDto);
    return await this.tipoPermissaoRepository.save(tipoPermissao);
  }

  async findAll(): Promise<TipoPermissao[]> {
    return await this.tipoPermissaoRepository.find({
      order: { ordem: 'ASC', nome: 'ASC' }
    });
  }

  async findOne(id: string): Promise<TipoPermissao> {
    const tipoPermissao = await this.tipoPermissaoRepository.findOne({
      where: { id },
      relations: ['permissoes']
    });

    if (!tipoPermissao) {
      throw new NotFoundException('Tipo de permissão não encontrado');
    }

    return tipoPermissao;
  }

  async findByCodigo(codigo: string): Promise<TipoPermissao> {
    const tipoPermissao = await this.tipoPermissaoRepository.findOne({
      where: { codigo }
    });

    if (!tipoPermissao) {
      throw new NotFoundException('Tipo de permissão não encontrado');
    }

    return tipoPermissao;
  }

  async update(id: string, updateData: Partial<CreateTipoPermissaoDto>): Promise<TipoPermissao> {
    const tipoPermissao = await this.findOne(id);

    if (updateData.codigo && updateData.codigo !== tipoPermissao.codigo) {
      const existingCodigo = await this.tipoPermissaoRepository.findOne({
        where: { codigo: updateData.codigo }
      });
      if (existingCodigo) {
        throw new ConflictException('Código já existe');
      }
    }

    Object.assign(tipoPermissao, updateData);
    return await this.tipoPermissaoRepository.save(tipoPermissao);
  }

  async remove(id: string): Promise<void> {
    const tipoPermissao = await this.findOne(id);
    await this.tipoPermissaoRepository.remove(tipoPermissao);
  }

  async findAtivos(): Promise<TipoPermissao[]> {
    return await this.tipoPermissaoRepository.find({
      where: { ativo: true },
      order: { ordem: 'ASC', nome: 'ASC' }
    });
  }
}
