import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private dataSource: DataSource,
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

    // Limpar CPF e telefone (remover formatação) - garantir que salva só números
    const cpfLimpo =
      createUsuarioDto.cpf?.replace(/\D/g, '') || createUsuarioDto.cpf;
    const telefoneLimpo =
      createUsuarioDto.telefone?.replace(/\D/g, '') ||
      createUsuarioDto.telefone;

    const usuario = this.usuarioRepository.create({
      username: createUsuarioDto.username,
      email: createUsuarioDto.email,
      password: hashedPassword,
      nome: createUsuarioDto.nome,
      cpf: cpfLimpo,
      telefone: telefoneLimpo,
      data_nascimento: createUsuarioDto.data_nascimento
        ? new Date(createUsuarioDto.data_nascimento)
        : undefined,
      perfis,
      // Admin pode definir o status, senão usa padrões
      ativo: createUsuarioDto.ativo ?? true,
      cadastro_completo: createUsuarioDto.cadastro_completo ?? true, // Padrão TRUE - apenas ALUNO auto-registro usa false
    });

    const usuarioSalvo = await this.usuarioRepository.save(usuario);

    // ===== PROCESSAMENTO PÓS-CRIAÇÃO BASEADO NO PERFIL =====
    if (perfis && perfis.length > 0) {
      const perfilNome = perfis[0].nome.toUpperCase();

      try {
        // GERENTE_UNIDADE: atualizar responsavel_cpf na tabela unidades
        if (perfilNome === 'GERENTE_UNIDADE' && createUsuarioDto.unidade_id) {
          await this.dataSource.query(
            `UPDATE teamcruz.unidades SET responsavel_cpf = $1 WHERE id = $2`,
            [usuarioSalvo.cpf, createUsuarioDto.unidade_id],
          );
        }

        // PROFESSOR / INSTRUTOR: criar registro na tabela professores e professor_unidades
        if (
          (perfilNome === 'PROFESSOR' || perfilNome === 'INSTRUTOR') &&
          createUsuarioDto.unidade_id
        ) {
          if (
            !createUsuarioDto.data_nascimento ||
            !createUsuarioDto.genero ||
            !createUsuarioDto.faixa_ministrante
          ) {
            throw new BadRequestException(
              'Campos obrigatórios para Professor: data_nascimento, genero, faixa_ministrante',
            );
          }

          // Criar registro na tabela professores (Person)
          const professorResult = await this.dataSource.query(
            `
            INSERT INTO teamcruz.professores
            (tipo_cadastro, nome_completo, cpf, data_nascimento, genero, telefone_whatsapp, email,
             unidade_id, usuario_id, faixa_ministrante, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
            `,
            [
              'PROFESSOR',
              usuarioSalvo.nome,
              usuarioSalvo.cpf,
              createUsuarioDto.data_nascimento,
              createUsuarioDto.genero,
              usuarioSalvo.telefone,
              usuarioSalvo.email,
              createUsuarioDto.unidade_id,
              usuarioSalvo.id,
              createUsuarioDto.faixa_ministrante,
              usuarioSalvo.ativo ? 'ATIVO' : 'INATIVO',
            ],
          );

          const professorId = professorResult[0]?.id;

          // Criar vínculo na tabela professor_unidades
          if (professorId) {
            await this.dataSource.query(
              `
              INSERT INTO teamcruz.professor_unidades
              (professor_id, unidade_id, is_principal, ativo)
              VALUES ($1, $2, $3, $4)
              `,
              [professorId, createUsuarioDto.unidade_id, true, true],
            );
          }
        }

        // RECEPCIONISTA: criar registro na tabela recepcionista_unidades
        if (perfilNome === 'RECEPCIONISTA' && createUsuarioDto.unidade_id) {
          await this.dataSource.query(
            `
            INSERT INTO teamcruz.recepcionista_unidades
            (usuario_id, unidade_id, turno, horario_entrada, horario_saida, ativo)
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              usuarioSalvo.id,
              createUsuarioDto.unidade_id,
              createUsuarioDto.turno || null,
              createUsuarioDto.horario_entrada || null,
              createUsuarioDto.horario_saida || null,
              true,
            ],
          );
        }
      } catch (error) {
        // Se falhar a vinculação, remover o usuário criado
        await this.usuarioRepository.remove(usuarioSalvo);
        throw new BadRequestException(
          `Erro ao vincular usuário: ${error.message}`,
        );
      }
    }

    return usuarioSalvo;
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
        cadastro_completo: true,
        ultimo_login: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async findAllWithHierarchy(user?: any): Promise<Usuario[]> {
    if (!user || !user.perfis) {
      return this.findAll();
    }

    const perfis =
      user.perfis.map((p: any) => (typeof p === 'string' ? p : p.nome)) || [];
    const perfisLower = perfis.map((p: string) => p.toLowerCase());

    const isMaster =
      perfisLower.includes('master') ||
      perfisLower.includes('admin') ||
      perfisLower.includes('super_admin');
    const isFranqueado = perfisLower.includes('franqueado');
    const isGerente = perfisLower.includes('gerente_unidade');
    const isRecepcionista = perfisLower.includes('recepcionista');

    // Master vê todos
    if (isMaster) {
      return this.findAll();
    }

    // Franqueado vê apenas usuários das suas unidades
    if (isFranqueado) {
      const franqueadoData = await this.usuarioRepository.query(
        `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1`,
        [user.id],
      );

      if (!franqueadoData || franqueadoData.length === 0) {
        return [];
      }

      const franqueadoId = franqueadoData[0].id;

      // Buscar IDs de usuários das unidades do franqueado
      const usuariosIds = await this.usuarioRepository.query(
        `
        SELECT DISTINCT u.id
        FROM teamcruz.usuarios u
        LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
        LEFT JOIN teamcruz.professores p ON p.usuario_id = u.id
        LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = p.id
        LEFT JOIN teamcruz.unidades un_aluno ON un_aluno.id = a.unidade_id
        LEFT JOIN teamcruz.unidades un_prof ON un_prof.id = pu.unidade_id
        LEFT JOIN teamcruz.unidades un_gerente ON un_gerente.responsavel_cpf = u.cpf
        WHERE (un_aluno.franqueado_id = $1
           OR un_prof.franqueado_id = $1
           OR un_gerente.franqueado_id = $1)
        `,
        [franqueadoId],
      );

      const ids = usuariosIds.map((row: any) => row.id);

      if (ids.length === 0) {
        return [];
      }

      return await this.usuarioRepository.find({
        where: ids.map((id) => ({ id })),
        relations: ['perfis'],
        select: {
          id: true,
          username: true,
          email: true,
          nome: true,
          cpf: true,
          telefone: true,
          ativo: true,
          cadastro_completo: true,
          ultimo_login: true,
          created_at: true,
          updated_at: true,
        },
      });
    }

    // Gerente vê apenas usuários da sua unidade
    if (isGerente) {
      const gerenteUnidade = await this.usuarioRepository.query(
        `SELECT id FROM teamcruz.unidades WHERE responsavel_cpf = $1`,
        [user.cpf],
      );

      if (!gerenteUnidade || gerenteUnidade.length === 0) {
        return [];
      }

      const unidadeId = gerenteUnidade[0].id;

      const usuariosIds = await this.usuarioRepository.query(
        `
        SELECT DISTINCT u.id
        FROM teamcruz.usuarios u
        LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
        WHERE a.unidade_id = $1
        `,
        [unidadeId],
      );

      const ids = usuariosIds.map((row: any) => row.id);

      if (ids.length === 0) {
        return [];
      }

      return await this.usuarioRepository.find({
        where: ids.map((id) => ({ id })),
        relations: ['perfis'],
        select: {
          id: true,
          username: true,
          email: true,
          nome: true,
          cpf: true,
          telefone: true,
          ativo: true,
          cadastro_completo: true,
          ultimo_login: true,
          created_at: true,
          updated_at: true,
        },
      });
    }

    // Recepcionista vê apenas usuários da sua unidade
    if (isRecepcionista) {
      const recepcionistaData = await this.usuarioRepository.query(
        `SELECT unidade_id FROM teamcruz.recepcionistas WHERE usuario_id = $1`,
        [user.id],
      );

      if (!recepcionistaData || recepcionistaData.length === 0) {
        return [];
      }

      const unidadeId = recepcionistaData[0].unidade_id;

      const usuariosIds = await this.usuarioRepository.query(
        `
        SELECT DISTINCT u.id
        FROM teamcruz.usuarios u
        LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
        WHERE a.unidade_id = $1
        `,
        [unidadeId],
      );

      const ids = usuariosIds.map((row: any) => row.id);

      if (ids.length === 0) {
        return [];
      }

      return await this.usuarioRepository.find({
        where: ids.map((id) => ({ id })),
        relations: ['perfis'],
        select: {
          id: true,
          username: true,
          email: true,
          nome: true,
          cpf: true,
          telefone: true,
          ativo: true,
          cadastro_completo: true,
          ultimo_login: true,
          created_at: true,
          updated_at: true,
        },
      });
    }

    // Sem permissão
    return [];
  }

  async findByPerfil(perfilNome: string): Promise<Usuario[]> {
    const usuarios = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.perfis', 'perfil')
      .where('perfil.nome = :perfilNome', { perfilNome })
      .andWhere('usuario.ativo = :ativo', { ativo: true })
      .select([
        'usuario.id',
        'usuario.username',
        'usuario.email',
        'usuario.nome',
        'usuario.cpf',
        'usuario.telefone',
        'usuario.ativo',
        'usuario.cadastro_completo',
        'perfil.id',
        'perfil.nome',
      ])
      .getMany();

    return usuarios;
  }

  async findOne(id: string): Promise<Usuario> {
    console.log('🔍 [UsuariosService.findOne] Buscando usuário ID:', id);

    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['perfis', 'perfis.permissoes'],
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    console.log('✅ [UsuariosService.findOne] Usuário encontrado:');
    console.log('   - ID:', usuario.id);
    console.log('   - Nome:', usuario.nome);
    console.log('   - Email:', usuario.email);
    console.log('   - data_nascimento:', usuario.data_nascimento);
    console.log('   - data_nascimento type:', typeof usuario.data_nascimento);

    return usuario;
  }

  async findByUsername(username: string): Promise<Usuario | null> {
    try {
      // Busca por username OU email
      const user = await this.usuarioRepository
        .createQueryBuilder('usuario')
        .leftJoinAndSelect('usuario.perfis', 'perfis')
        .leftJoinAndSelect('perfis.permissoes', 'permissoes')
        .where('usuario.username = :username OR usuario.email = :email', {
          username,
          email: username,
        })
        .getOne();

      return user;
    } catch (error) {
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
    try {
      const result = await bcrypt.compare(password, hashedPassword);
      return result;
    } catch (error) {
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

  async findPendingApproval(user?: any): Promise<any[]> {
    // Detectar perfil do usuário logado
    const perfis =
      user?.perfis?.map((p: any) => (typeof p === 'string' ? p : p.nome)) || [];

    // Converter tudo para minúsculas para comparação case-insensitive
    const perfisLower = perfis.map((p: string) => p.toLowerCase());

    const isMaster =
      perfisLower.includes('master') || perfisLower.includes('admin');
    const isFranqueado = perfisLower.includes('franqueado');
    const isGerente = perfisLower.includes('gerente_unidade');
    const isRecepcionista = perfisLower.includes('recepcionista');

    // Buscar usuários que estão inativos (aguardando aprovação)
    let usuarios: any[] = [];

    if (isMaster) {
      // Master vê todos os usuários pendentes
      usuarios = await this.usuarioRepository.find({
        where: {
          ativo: false,
        },
        relations: ['perfis'],
        select: {
          id: true,
          username: true,
          email: true,
          nome: true,
          cpf: true,
          telefone: true,
          ativo: true,
          cadastro_completo: true,
          created_at: true,
          updated_at: true,
        },
        order: {
          created_at: 'DESC',
        },
      });
    } else if (isFranqueado) {
      const franqueadoData = await this.usuarioRepository.query(
        `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1`,
        [user.id],
      );

      if (franqueadoData && franqueadoData.length > 0) {
        const franqueadoId = franqueadoData[0].id;

        console.log('🔍 [findPendingApproval] Franqueado ID:', franqueadoId);

        // Buscar GERENTES e ALUNOS pendentes das unidades do franqueado
        const usuariosPendentes = await this.usuarioRepository.query(
          `
          SELECT DISTINCT u.id, u.username, u.email, u.nome, u.cpf, u.telefone,
                 u.ativo, u.cadastro_completo, u.created_at, u.updated_at
          FROM teamcruz.usuarios u
          INNER JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
          INNER JOIN teamcruz.perfis p ON up.perfil_id = p.id
          LEFT JOIN teamcruz.unidades un ON un.responsavel_cpf = u.cpf
          LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
          WHERE u.ativo = false
            AND (
              (UPPER(p.nome) = 'GERENTE_UNIDADE' AND un.franqueado_id = $1)
              OR
              (UPPER(p.nome) = 'ALUNO' AND a.unidade_id IN (
                SELECT id FROM teamcruz.unidades WHERE franqueado_id = $1
              ))
            )
          ORDER BY u.created_at DESC
          `,
          [franqueadoId],
        );

        console.log(
          '🔍 [findPendingApproval] Usuarios pendentes encontrados:',
          usuariosPendentes.length,
        );
        console.log(
          '🔍 [findPendingApproval] Detalhes:',
          JSON.stringify(usuariosPendentes, null, 2),
        );

        // Buscar perfis para cada usuário
        for (const usuario of usuariosPendentes) {
          const perfisData = await this.usuarioRepository.query(
            `
            SELECT p.*
            FROM teamcruz.perfis p
            INNER JOIN teamcruz.usuario_perfis up ON p.id = up.perfil_id
            WHERE up.usuario_id = $1
            `,
            [usuario.id],
          );
          usuario.perfis = perfisData;
        }

        usuarios = usuariosPendentes;
      } else {
        return [];
      }
    } else if (isGerente || isRecepcionista) {
      // Gerente ou Recepcionista vêem apenas alunos da sua unidade
      const tipoUsuario = isGerente ? 'Gerente' : 'Recepcionista';

      // Para gerente: buscar via responsavel_cpf
      // Para recepcionista: buscar via tabela recepcionistas
      let unidadeId = null;

      if (isGerente) {
        const gerenteUnidade = await this.usuarioRepository.query(
          `SELECT id FROM teamcruz.unidades WHERE responsavel_cpf = $1`,
          [user.cpf],
        );

        if (gerenteUnidade && gerenteUnidade.length > 0) {
          unidadeId = gerenteUnidade[0].id;
        }
      } else if (isRecepcionista) {
        // Buscar unidade do recepcionista via tabela recepcionistas
        const recepcionistaData = await this.usuarioRepository.query(
          `SELECT unidade_id FROM teamcruz.recepcionistas WHERE usuario_id = $1`,
          [user.id],
        );

        if (recepcionistaData && recepcionistaData.length > 0) {
          unidadeId = recepcionistaData[0].unidade_id;
        }
      }

      if (unidadeId) {
        // Buscar alunos da unidade que estão pendentes
        const alunosPendentes = await this.usuarioRepository.query(
          `
          SELECT DISTINCT u.id, u.username, u.email, u.nome, u.cpf, u.telefone,
                 u.ativo, u.cadastro_completo, u.created_at, u.updated_at
          FROM teamcruz.usuarios u
          INNER JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
          INNER JOIN teamcruz.perfis p ON up.perfil_id = p.id
          INNER JOIN teamcruz.alunos a ON a.usuario_id = u.id
          WHERE u.ativo = false
            AND p.nome = 'aluno'
            AND a.unidade_id = $1
          ORDER BY u.created_at DESC
          `,
          [unidadeId],
        );

        // Buscar perfis para cada usuário
        for (const usuario of alunosPendentes) {
          const perfisData = await this.usuarioRepository.query(
            `
            SELECT p.*
            FROM teamcruz.perfis p
            INNER JOIN teamcruz.usuario_perfis up ON p.id = up.perfil_id
            WHERE up.usuario_id = $1
            `,
            [usuario.id],
          );
          usuario.perfis = perfisData;
        }

        usuarios = alunosPendentes;
      } else {
        return [];
      }
    } else {
      return [];
    }

    // Para cada usuário, buscar dados de aluno/professor e unidade
    const usuariosComUnidade = await Promise.all(
      usuarios.map(async (usuario) => {
        const usuarioComUnidade = { ...usuario, unidade: null as any };

        try {
          // Tentar buscar como aluno
          const aluno = await this.usuarioRepository.query(
            `
            SELECT a.*, u.nome as unidade_nome
            FROM teamcruz.alunos a
            LEFT JOIN teamcruz.unidades u ON a.unidade_id = u.id
            WHERE a.usuario_id = $1
          `,
            [usuario.id],
          );

          if (aluno && aluno.length > 0) {
            usuarioComUnidade.unidade = {
              id: aluno[0].unidade_id,
              nome: aluno[0].unidade_nome,
              tipo: 'ALUNO',
            };
          } else {
            // Tentar buscar como professor
            const professor = await this.usuarioRepository.query(
              `
              SELECT p.*, pu.unidade_id, u.nome as unidade_nome
              FROM teamcruz.professores p
              LEFT JOIN teamcruz.professor_unidades pu ON p.id = pu.professor_id
              LEFT JOIN teamcruz.unidades u ON pu.unidade_id = u.id
              WHERE p.usuario_id = $1
            `,
              [usuario.id],
            );

            if (professor && professor.length > 0) {
              usuarioComUnidade.unidade = {
                id: professor[0].unidade_id,
                nome: professor[0].unidade_nome,
                tipo: 'PROFESSOR',
              };
            }
          }
        } catch (error) {
          // Error silenciado
        }

        return usuarioComUnidade;
      }),
    );

    return usuariosComUnidade;
  }

  async approveUser(userId: string): Promise<{ message: string }> {
    const usuario = await this.findOne(userId);

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (usuario.ativo) {
      throw new ConflictException('Usuário já está ativo');
    }

    // Ativar o usuário
    await this.usuarioRepository.update(userId, {
      ativo: true,
    });

    // TODO: Enviar email de confirmação ao usuário

    return {
      message: 'Usuário aprovado com sucesso!',
    };
  }

  async rejectUser(userId: string): Promise<{ message: string }> {
    const usuario = await this.findOne(userId);

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Remover o usuário do sistema
    await this.usuarioRepository.remove(usuario);

    // TODO: Enviar email informando sobre a rejeição

    return {
      message: 'Cadastro rejeitado e usuário removido do sistema.',
    };
  }
}
