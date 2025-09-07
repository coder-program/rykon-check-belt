import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../entities/usuario.entity';
import { Perfil } from '../entities/perfil.entity';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Perfil)
    private perfilRepository: Repository<Perfil>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    // Verificar se username já existe
    const existingUsername = await this.usuarioRepository.findOne({
      where: { username: createUsuarioDto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username já existe');
    }

    // Verificar se email já existe
    const existingEmail = await this.usuarioRepository.findOne({
      where: { email: createUsuarioDto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email já existe');
    }

    // Hash da senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUsuarioDto.password,
      saltRounds,
    );

    // Buscar perfis se fornecidos
    let perfis: Perfil[] = [];
    if (createUsuarioDto.perfil_ids && createUsuarioDto.perfil_ids.length > 0) {
      perfis = await this.perfilRepository.find({
        where: createUsuarioDto.perfil_ids.map((id) => ({ id })),
      });
    }

    const usuario = this.usuarioRepository.create({
      ...createUsuarioDto,
      password: hashedPassword,
      perfis,
    });

    return await this.usuarioRepository.save(usuario);
  }

  async findAll(): Promise<Usuario[]> {
    return await this.usuarioRepository.find({
      relations: ['perfis', 'perfis.permissoes'],
      select: {
        id: true,
        username: true,
        email: true,
        nome: true,
        cpf: true,
        telefone: true,
        ativo: true,
        ultimo_login: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['perfis', 'perfis.permissoes'],
      select: {
        id: true,
        username: true,
        email: true,
        nome: true,
        cpf: true,
        telefone: true,
        ativo: true,
        ultimo_login: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return usuario;
  }

  async findByUsername(username: string): Promise<Usuario | null> {
    console.log('🔍 UsuariosService.findByUsername - Buscando usuário:', username);
    
    try {
      // Busca por username OU email
      const user = await this.usuarioRepository
        .createQueryBuilder('usuario')
        .leftJoinAndSelect('usuario.perfis', 'perfis')
        .leftJoinAndSelect('perfis.permissoes', 'permissoes')
        .where('usuario.username = :username OR usuario.email = :email', { 
          username, 
          email: username 
        })
        .getOne();
      
      console.log('🔍 Usuário encontrado no banco?', !!user);
      if (user) {
        console.log('🔍 ID do usuário:', user.id);
        console.log('🔍 Username do usuário:', user.username);
        console.log('🔍 Email do usuário:', user.email);
        console.log('🔍 Perfis do usuário:', user.perfis?.map(p => p.nome));
      }
      
      return user;
    } catch (error) {
      console.error('❌ Erro ao buscar usuário por username:', error);
      throw error;
    }
  }

  async update(
    id: string,
    updateData: Partial<CreateUsuarioDto>,
  ): Promise<Usuario> {
    const usuario = await this.findOne(id);

    if (updateData.password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    if (updateData.perfil_ids) {
      const perfis = await this.perfilRepository.find({
        where: updateData.perfil_ids.map((id) => ({ id })),
      });
      usuario.perfis = perfis;
      delete updateData.perfil_ids;
    }

    Object.assign(usuario, updateData);
    return await this.usuarioRepository.save(usuario);
  }

  async remove(id: string): Promise<void> {
    const usuario = await this.findOne(id);
    await this.usuarioRepository.remove(usuario);
  }

  async updateUltimoLogin(id: string): Promise<void> {
    await this.usuarioRepository.update(id, {
      ultimo_login: new Date(),
    });
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    console.log('🔐 ===== VALIDAÇÃO DE SENHA =====');
    console.log('🔐 Senha recebida (plain):', password);
    console.log('🔐 Tamanho da senha recebida:', password?.length);
    console.log('🔐 Hash do banco:', hashedPassword);
    console.log('🔐 Tamanho do hash:', hashedPassword?.length);
    console.log('🔐 Hash começa com $2b$?', hashedPassword?.startsWith('$2b$'));
    
    try {
      const result = await bcrypt.compare(password, hashedPassword);
      console.log('🔐 Resultado do bcrypt.compare:', result);
      console.log('🔐 ===== FIM VALIDAÇÃO =====');
      return result;
    } catch (error) {
      console.error('🔐 ERRO no bcrypt.compare:', error);
      console.log('🔐 ===== FIM VALIDAÇÃO COM ERRO =====');
      return false;
    }
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({
      where: { email },
      relations: ['perfis', 'perfis.permissoes'],
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.usuarioRepository.update(userId, {
      password: hashedPassword,
    });
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: userId },
      relations: ['perfis', 'perfis.permissoes'],
    });

    if (!usuario) {
      return [];
    }

    const permissions = new Set<string>();
    usuario.perfis.forEach((perfil) => {
      perfil.permissoes.forEach((permissao) => {
        permissions.add(permissao.codigo);
      });
    });

    return Array.from(permissions);
  }

  async getUserPermissionsDetail(userId: string): Promise<any[]> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: userId },
      relations: [
        'perfis',
        'perfis.permissoes',
        'perfis.permissoes.tipo',
        'perfis.permissoes.nivel',
      ],
    });

    if (!usuario) {
      return [];
    }

    const permissionsMap = new Map();
    usuario.perfis.forEach((perfil) => {
      perfil.permissoes.forEach((permissao) => {
        if (!permissionsMap.has(permissao.codigo)) {
          permissionsMap.set(permissao.codigo, {
            codigo: permissao.codigo,
            nome: permissao.nome,
            descricao: permissao.descricao,
            modulo: permissao.modulo,
            nivel: {
              nome: permissao.nivel.nome,
              descricao: permissao.nivel.descricao,
              cor: permissao.nivel.cor,
            },
            tipo: {
              nome: permissao.tipo.nome,
              descricao: permissao.tipo.descricao,
            },
          });
        }
      });
    });

    return Array.from(permissionsMap.values());
  }

  async getUserPerfis(userId: string): Promise<string[]> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: userId },
      relations: ['perfis'],
    });

    if (!usuario) {
      return [];
    }

    return usuario.perfis.map((perfil) => perfil.nome);
  }
}
