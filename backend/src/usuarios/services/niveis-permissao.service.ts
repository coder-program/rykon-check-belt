import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NivelPermissao } from '../entities/nivel-permissao.entity';
import { CreateNivelPermissaoDto } from '../dto/create-nivel-permissao.dto';

@Injectable()
export class NiveisPermissaoService {
  constructor(
    @InjectRepository(NivelPermissao)
    private nivelPermissaoRepository: Repository<NivelPermissao>,
  ) {}

  async create(createNivelPermissaoDto: CreateNivelPermissaoDto): Promise<NivelPermissao> {
    // Verificar se código já existe
    const existingCodigo = await this.nivelPermissaoRepository.findOne({
      where: { codigo: createNivelPermissaoDto.codigo }
    });
    if (existingCodigo) {
      throw new ConflictException('Código já existe');
    }

    const nivelPermissao = this.nivelPermissaoRepository.create(createNivelPermissaoDto);
    return await this.nivelPermissaoRepository.save(nivelPermissao);
  }

  async findAll(): Promise<NivelPermissao[]> {
    return await this.nivelPermissaoRepository.find({
      order: { ordem: 'ASC', nome: 'ASC' }
    });
  }

  async findOne(id: string): Promise<NivelPermissao> {
    const nivelPermissao = await this.nivelPermissaoRepository.findOne({
      where: { id },
      relations: ['permissoes']
    });

    if (!nivelPermissao) {
      throw new NotFoundException('Nível de permissão não encontrado');
    }

    return nivelPermissao;
  }

  async findByCodigo(codigo: string): Promise<NivelPermissao> {
    const nivelPermissao = await this.nivelPermissaoRepository.findOne({
      where: { codigo }
    });

    if (!nivelPermissao) {
      throw new NotFoundException('Nível de permissão não encontrado');
    }

    return nivelPermissao;
  }

  async update(id: string, updateData: Partial<CreateNivelPermissaoDto>): Promise<NivelPermissao> {
    const nivelPermissao = await this.findOne(id);

    if (updateData.codigo && updateData.codigo !== nivelPermissao.codigo) {
      const existingCodigo = await this.nivelPermissaoRepository.findOne({
        where: { codigo: updateData.codigo }
      });
      if (existingCodigo) {
        throw new ConflictException('Código já existe');
      }
    }

    Object.assign(nivelPermissao, updateData);
    return await this.nivelPermissaoRepository.save(nivelPermissao);
  }

  async remove(id: string): Promise<void> {
    const nivelPermissao = await this.findOne(id);
    await this.nivelPermissaoRepository.remove(nivelPermissao);
  }

  async findAtivos(): Promise<NivelPermissao[]> {
    return await this.nivelPermissaoRepository.find({
      where: { ativo: true },
      order: { ordem: 'ASC', nome: 'ASC' }
    });
  }
}
