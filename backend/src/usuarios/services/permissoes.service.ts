import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permissao } from '../entities/permissao.entity';
import { CreatePermissaoDto } from '../dto/create-permissao.dto';

@Injectable()
export class PermissoesService {
  constructor(
    @InjectRepository(Permissao)
    private permissaoRepository: Repository<Permissao>,
  ) {}

  async create(createPermissaoDto: CreatePermissaoDto): Promise<Permissao> {
    // Verificar se código já existe
    const existingPermissao = await this.permissaoRepository.findOne({
      where: { codigo: createPermissaoDto.codigo }
    });
    if (existingPermissao) {
      throw new ConflictException('Código da permissão já existe');
    }

    const permissao = this.permissaoRepository.create(createPermissaoDto);
    return await this.permissaoRepository.save(permissao);
  }

  async findAll(): Promise<Permissao[]> {
    return await this.permissaoRepository.find({
      relations: ['perfis']
    });
  }

  async findOne(id: string): Promise<Permissao> {
    const permissao = await this.permissaoRepository.findOne({
      where: { id },
      relations: ['perfis']
    });

    if (!permissao) {
      throw new NotFoundException('Permissão não encontrada');
    }

    return permissao;
  }

  async findByModulo(modulo: string): Promise<Permissao[]> {
    return await this.permissaoRepository.find({
      where: { modulo },
      relations: ['perfis']
    });
  }

  async update(id: string, updateData: Partial<CreatePermissaoDto>): Promise<Permissao> {
    const permissao = await this.findOne(id);
    Object.assign(permissao, updateData);
    return await this.permissaoRepository.save(permissao);
  }

  async remove(id: string): Promise<void> {
    const permissao = await this.findOne(id);
    await this.permissaoRepository.remove(permissao);
  }

  async seedDefaultPermissions(): Promise<void> {
    const defaultPermissions = [
      // Administração
      { codigo: 'ADMIN_FULL', nome: 'Administração Completa', descricao: 'Acesso total ao sistema', modulo: 'admin' },
      
      // Contabilidade
      { codigo: 'CONTABILIDADE_READ', nome: 'Visualizar Contabilidade', descricao: 'Visualizar dados de contabilidade', modulo: 'contabilidade' },
      { codigo: 'CONTABILIDADE_WRITE', nome: 'Editar Contabilidade', descricao: 'Criar e editar dados de contabilidade', modulo: 'contabilidade' },
      { codigo: 'CONTABILIDADE_DELETE', nome: 'Excluir Contabilidade', descricao: 'Excluir dados de contabilidade', modulo: 'contabilidade' },
      
      // Orçamento e Financeiro
      { codigo: 'ORCAMENTO_READ', nome: 'Visualizar Orçamento', descricao: 'Visualizar dados orçamentários', modulo: 'orcamento' },
      { codigo: 'ORCAMENTO_WRITE', nome: 'Editar Orçamento', descricao: 'Criar e editar dados orçamentários', modulo: 'orcamento' },
      { codigo: 'ORCAMENTO_DELETE', nome: 'Excluir Orçamento', descricao: 'Excluir dados orçamentários', modulo: 'orcamento' },
      
      // Patrimônio
      { codigo: 'PATRIMONIO_READ', nome: 'Visualizar Patrimônio', descricao: 'Visualizar dados patrimoniais', modulo: 'patrimonio' },
      { codigo: 'PATRIMONIO_WRITE', nome: 'Editar Patrimônio', descricao: 'Criar e editar dados patrimoniais', modulo: 'patrimonio' },
      { codigo: 'PATRIMONIO_DELETE', nome: 'Excluir Patrimônio', descricao: 'Excluir dados patrimoniais', modulo: 'patrimonio' },
      
      // Usuários e Perfis
      { codigo: 'USUARIOS_READ', nome: 'Visualizar Usuários', descricao: 'Visualizar usuários', modulo: 'usuarios' },
      { codigo: 'USUARIOS_WRITE', nome: 'Editar Usuários', descricao: 'Criar e editar usuários', modulo: 'usuarios' },
      { codigo: 'USUARIOS_DELETE', nome: 'Excluir Usuários', descricao: 'Excluir usuários', modulo: 'usuarios' },
      
      // Relatórios
      { codigo: 'RELATORIOS_READ', nome: 'Visualizar Relatórios', descricao: 'Visualizar relatórios', modulo: 'relatorios' },
      { codigo: 'RELATORIOS_EXPORT', nome: 'Exportar Relatórios', descricao: 'Exportar relatórios', modulo: 'relatorios' },
    ];

    for (const permData of defaultPermissions) {
      const existing = await this.permissaoRepository.findOne({
        where: { codigo: permData.codigo }
      });
      
      if (!existing) {
        const permissao = this.permissaoRepository.create(permData);
        await this.permissaoRepository.save(permissao);
      }
    }
  }
}
