import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Perfil } from '../entities/perfil.entity';
import { Permissao } from '../entities/permissao.entity';
import { CreatePerfilDto } from '../dto/create-perfil.dto';

@Injectable()
export class PerfisService {
  constructor(
    @InjectRepository(Perfil)
    private perfilRepository: Repository<Perfil>,
    @InjectRepository(Permissao)
    private permissaoRepository: Repository<Permissao>,
  ) {}

  async create(createPerfilDto: CreatePerfilDto): Promise<Perfil> {
    // Verificar se nome já existe
    const existingPerfil = await this.perfilRepository.findOne({
      where: { nome: createPerfilDto.nome },
    });
    if (existingPerfil) {
      throw new ConflictException('Nome do perfil já existe');
    }

    // Buscar permissões se fornecidas
    let permissoes: Permissao[] = [];
    if (
      createPerfilDto.permissao_ids &&
      createPerfilDto.permissao_ids.length > 0
    ) {
      permissoes = await this.permissaoRepository.find({
        where: createPerfilDto.permissao_ids.map((id) => ({ id })),
      });
    }

    const perfil = this.perfilRepository.create({
      ...createPerfilDto,
      permissoes,
    });

    return await this.perfilRepository.save(perfil);
  }

  async findAll(): Promise<Perfil[]> {
    return await this.perfilRepository.find({
      relations: ['permissoes', 'usuarios'],
    });
  }

  async findAllSimple(): Promise<Perfil[]> {
    // Query otimizada: retorna apenas dados básicos SEM relations
    // Usado para dropdowns e listagens simples
    return await this.perfilRepository.find({
      select: ['id', 'nome', 'descricao', 'ativo', 'created_at', 'updated_at'],
      order: { nome: 'ASC' },
    });
  }

  async findPublicos(): Promise<Perfil[]> {
    // Query otimizada: busca apenas 2 perfis SEM relations
    return await this.perfilRepository
      .createQueryBuilder('perfil')
      .where('LOWER(perfil.nome) IN (:...nomes)', {
        nomes: ['aluno', 'responsavel'],
      })
      .andWhere('perfil.ativo = :ativo', { ativo: true })
      .select([
        'perfil.id',
        'perfil.nome',
        'perfil.descricao',
        'perfil.ativo',
        'perfil.created_at',
        'perfil.updated_at',
      ])
      .getMany();
  }

  async findOne(id: string): Promise<Perfil> {
    const perfil = await this.perfilRepository.findOne({
      where: { id },
      relations: ['permissoes', 'usuarios'],
    });

    if (!perfil) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return perfil;
  }

  async update(
    id: string,
    updateData: Partial<CreatePerfilDto>,
  ): Promise<Perfil> {
    const perfil = await this.findOne(id);

    if (updateData.permissao_ids) {
      const permissoes = await this.permissaoRepository.find({
        where: updateData.permissao_ids.map((id) => ({ id })),
      });
      perfil.permissoes = permissoes;
      delete updateData.permissao_ids;
    }

    Object.assign(perfil, updateData);
    return await this.perfilRepository.save(perfil);
  }

  async remove(id: string): Promise<void> {
    const perfil = await this.findOne(id);
    await this.perfilRepository.remove(perfil);
  }

  async findByName(nome: string): Promise<Perfil | null> {
    return await this.perfilRepository.findOne({
      where: { nome },
      relations: ['permissoes'],
    });
  }

  async addPermissao(perfilId: string, permissaoId: string): Promise<Perfil> {
    const perfil = await this.findOne(perfilId);
    const permissao = await this.permissaoRepository.findOne({
      where: { id: permissaoId },
    });

    if (!permissao) {
      throw new NotFoundException('Permissão não encontrada');
    }

    if (!perfil.permissoes.find((p) => p.id === permissaoId)) {
      perfil.permissoes.push(permissao);
      await this.perfilRepository.save(perfil);
    }

    return perfil;
  }

  async removePermissao(
    perfilId: string,
    permissaoId: string,
  ): Promise<Perfil> {
    const perfil = await this.findOne(perfilId);
    perfil.permissoes = perfil.permissoes.filter((p) => p.id !== permissaoId);
    return await this.perfilRepository.save(perfil);
  }
}
