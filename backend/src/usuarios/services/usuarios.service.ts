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

  /**
   * Enriquece lista de usuários com informações da unidade vinculada
   * Para GERENTE_UNIDADE: busca unidade onde responsavel_cpf = cpf do usuário
   * Retorna array serializado (plain objects) para preservar propriedades customizadas
   */
  private async enrichUsersWithUnidade(usuarios: any[]): Promise<any[]> {
    console.log('🔧 [ENRICH] Enriquecendo usuários com unidade:', {
      total: usuarios.length,
      amostra: usuarios[0]?.nome,
    });

    if (!usuarios || usuarios.length === 0) {
      return [];
    }

    const usuariosEnriquecidos = await Promise.all(
      usuarios.map(async (usuario) => {
        // Verificar perfis do usuário
        const perfis = usuario.perfis || [];
        const perfisNomes = perfis.map((p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
        );

        const isGerente = perfisNomes.includes('GERENTE_UNIDADE');
        const isRecepcionista = perfisNomes.includes('RECEPCIONISTA');
        const isProfessor =
          perfisNomes.includes('PROFESSOR') ||
          perfisNomes.includes('INSTRUTOR');

        const needsUnidade = isGerente || isRecepcionista || isProfessor;

        console.log('🔍 [ENRICH] Processando usuário:', {
          nome: usuario.nome,
          cpf: usuario.cpf,
          perfis: perfisNomes,
          needsUnidade,
        });

        let unidade: any = null;

        if (needsUnidade && usuario.cpf) {
          console.log(
            '🔍 [ENRICH] Buscando unidade para usuário:',
            usuario.cpf,
          );

          // Buscar unidade vinculada:
          // - Para GERENTE: via responsavel_cpf em unidades
          // - Para RECEPCIONISTA: via tabela recepcionistas
          // - Para PROFESSOR/INSTRUTOR: via professor_unidades

          if (isGerente) {
            // Gerente: buscar via responsavel_cpf
            const unidadeData = await this.usuarioRepository.query(
              `SELECT id, nome, status FROM teamcruz.unidades WHERE responsavel_cpf = $1`,
              [usuario.cpf],
            );

            if (unidadeData && unidadeData.length > 0) {
              unidade = {
                id: unidadeData[0].id,
                nome: unidadeData[0].nome,
                status: unidadeData[0].status,
              };
            }
          } else if (isRecepcionista) {
            // Recepcionista: buscar via tabela recepcionista_unidades
            const unidadeData = await this.usuarioRepository.query(
              `SELECT u.id, u.nome, u.status
               FROM teamcruz.recepcionista_unidades ru
               INNER JOIN teamcruz.unidades u ON u.id = ru.unidade_id
               WHERE ru.usuario_id = $1 AND ru.ativo = true
               LIMIT 1`,
              [usuario.id],
            );

            if (unidadeData && unidadeData.length > 0) {
              unidade = {
                id: unidadeData[0].id,
                nome: unidadeData[0].nome,
                status: unidadeData[0].status,
              };
            }
          } else if (isProfessor) {
            // Professor: buscar via professor_unidades (primeira unidade)
            const unidadeData = await this.usuarioRepository.query(
              `SELECT u.id, u.nome, u.status
               FROM teamcruz.professores p
               INNER JOIN teamcruz.professor_unidades pu ON pu.professor_id = p.id
               INNER JOIN teamcruz.unidades u ON u.id = pu.unidade_id
               WHERE p.usuario_id = $1
               LIMIT 1`,
              [usuario.id],
            );

            if (unidadeData && unidadeData.length > 0) {
              unidade = {
                id: unidadeData[0].id,
                nome: unidadeData[0].nome,
                status: unidadeData[0].status,
              };
            }
          }

          console.log(
            '📊 [ENRICH] Resultado da query:',
            unidade || 'Nenhuma unidade',
          );

          if (unidade) {
            console.log('✅ [ENRICH] Unidade encontrada:', unidade);
          } else {
            console.log('⚠️ [ENRICH] Nenhuma unidade encontrada');
          }
        }
        return {
          ...usuario,
          unidade,
        };
      }),
    );

    console.log('📦 [ENRICH] ANTES do JSON.parse:', {
      total: usuariosEnriquecidos.length,
      usuarios: usuariosEnriquecidos.map((u) => ({
        nome: u.nome,
        perfil: u.perfis?.[0]?.nome || u.perfis?.[0],
        temUnidade: !!u.unidade,
        unidade: u.unidade,
      })),
    });

    // Serializar para plain objects
    const resultado = JSON.parse(JSON.stringify(usuariosEnriquecidos));

    console.log('✅ [ENRICH] DEPOIS do JSON.parse:', {
      total: resultado.length,
      usuarios: resultado.map((u: any) => ({
        nome: u.nome,
        perfil: u.perfis?.[0]?.nome || u.perfis?.[0],
        temUnidade: !!u.unidade,
        unidade: u.unidade,
      })),
    });

    return resultado;
  }

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
          // Campos podem ser preenchidos depois no complete-profile
          // Apenas criar o registro básico agora

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
              createUsuarioDto.data_nascimento || null,
              createUsuarioDto.genero || null,
              usuarioSalvo.telefone,
              usuarioSalvo.email,
              createUsuarioDto.unidade_id,
              usuarioSalvo.id,
              createUsuarioDto.faixa_ministrante || null,
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
    console.log('🔐 [HIERARCHY] Método findAllWithHierarchy chamado');
    console.log(
      '🔐 [HIERARCHY] Usuário recebido:',
      user
        ? {
            id: user.id,
            nome: user.nome,
            email: user.email,
            cpf: user.cpf,
            perfis: user.perfis,
          }
        : 'NENHUM USUÁRIO',
    );

    if (!user || !user.perfis) {
      console.log('⚠️ [HIERARCHY] Sem usuário ou perfis - retornando todos');
      const usuarios = await this.findAll();
      return this.enrichUsersWithUnidade(usuarios);
    }

    const perfis =
      user.perfis.map((p: any) => (typeof p === 'string' ? p : p.nome)) || [];
    const perfisLower = perfis.map((p: string) => p.toLowerCase());

    console.log('🔐 [HIERARCHY] Perfis detectados:', perfis);
    console.log('🔐 [HIERARCHY] Perfis lowercase:', perfisLower);

    const isMaster =
      perfisLower.includes('master') ||
      perfisLower.includes('admin') ||
      perfisLower.includes('super_admin');
    const isFranqueado = perfisLower.includes('franqueado');
    const isGerente = perfisLower.includes('gerente_unidade');
    const isRecepcionista = perfisLower.includes('recepcionista');

    console.log('🔐 [HIERARCHY] Flags de perfil:', {
      isMaster,
      isFranqueado,
      isGerente,
      isRecepcionista,
    });

    // Master vê todos
    if (isMaster) {
      console.log('✅ [HIERARCHY] Usuário é MASTER - retornando todos');
      const usuarios = await this.findAll();
      return this.enrichUsersWithUnidade(usuarios);
    }

    // Franqueado vê apenas usuários das suas unidades
    if (isFranqueado) {
      console.log('🔍 [FILTRO FRANQUEADO] Iniciando filtro para usuário:', {
        userId: user.id,
        userName: user.nome,
        userCPF: user.cpf,
      });

      const franqueadoData = await this.usuarioRepository.query(
        `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1`,
        [user.id],
      );

      console.log(
        '🔍 [FILTRO FRANQUEADO] Dados do franqueado encontrados:',
        franqueadoData,
      );

      if (!franqueadoData || franqueadoData.length === 0) {
        console.log(
          '⚠️ [FILTRO FRANQUEADO] Nenhum franqueado encontrado para este usuário',
        );
        return [];
      }

      const franqueadoId = franqueadoData[0].id;
      console.log('🔍 [FILTRO FRANQUEADO] ID do franqueado:', franqueadoId);

      // Buscar IDs de usuários das unidades do franqueado
      // Inclui: alunos, professores, gerentes e recepcionistas das unidades
      // EXCLUI: outros franqueados (que devem ver apenas suas próprias listas)
      const usuariosIds = await this.usuarioRepository.query(
        `
        SELECT DISTINCT u.id,
               u.nome,
               u.email,
               CASE
                 WHEN f.id = $1 THEN 'proprio_franqueado'
                 WHEN u.id = $2 THEN 'usuario_autenticado'
                 WHEN un_aluno.franqueado_id = $1 THEN 'aluno_da_unidade'
                 WHEN un_prof.franqueado_id = $1 THEN 'professor_da_unidade'
                 WHEN un_gerente.franqueado_id = $1 THEN 'gerente_da_unidade'
                 ELSE 'outro'
               END as motivo_inclusao
        FROM teamcruz.usuarios u
        LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
        LEFT JOIN teamcruz.professores p ON p.usuario_id = u.id
        LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = p.id
        LEFT JOIN teamcruz.unidades un_aluno ON un_aluno.id = a.unidade_id
        LEFT JOIN teamcruz.unidades un_prof ON un_prof.id = pu.unidade_id
        LEFT JOIN teamcruz.unidades un_gerente ON un_gerente.responsavel_cpf = u.cpf
        LEFT JOIN teamcruz.franqueados f ON f.usuario_id = u.id
        LEFT JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
        LEFT JOIN teamcruz.perfis perfil ON perfil.id = up.perfil_id
        WHERE (
          (un_aluno.franqueado_id = $1 OR un_prof.franqueado_id = $1 OR un_gerente.franqueado_id = $1)
          OR f.id = $1
          OR u.id = $2
        )
        -- Excluir usuários que são FRANQUEADOS de outras franquias
        AND NOT EXISTS (
          SELECT 1
          FROM teamcruz.usuario_perfis up2
          INNER JOIN teamcruz.perfis p2 ON p2.id = up2.perfil_id
          INNER JOIN teamcruz.franqueados f2 ON f2.usuario_id = u.id
          WHERE up2.usuario_id = u.id
            AND UPPER(p2.nome) = 'FRANQUEADO'
            AND f2.id != $1
            AND u.id != $2
        )
        `,
        [franqueadoId, user.id],
      );

      console.log(
        '🔍 [FILTRO FRANQUEADO] Usuários encontrados na query:',
        usuariosIds.map((u: any) => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          motivo: u.motivo_inclusao,
        })),
      );

      const ids = usuariosIds.map((row: any) => row.id);

      if (ids.length === 0) {
        console.log(
          '⚠️ [FILTRO FRANQUEADO] Nenhum usuário encontrado após filtro',
        );
        return [];
      }

      console.log(
        '🔍 [FILTRO FRANQUEADO] IDs dos usuários que serão retornados:',
        ids,
      );

      const resultado = await this.usuarioRepository.find({
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

      console.log(
        '✅ [FILTRO FRANQUEADO] Total de usuários retornados:',
        resultado.length,
      );
      console.log(
        '✅ [FILTRO FRANQUEADO] Usuários:',
        resultado.map((u: any) => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
        })),
      );

      return this.enrichUsersWithUnidade(resultado);
    }

    // Gerente vê apenas usuários da sua unidade
    if (isGerente) {
      const gerenteUnidade = await this.usuarioRepository.query(
        `SELECT id FROM teamcruz.unidades WHERE responsavel_cpf = $1`,
        [user.cpf],
      );

      if (!gerenteUnidade || gerenteUnidade.length === 0) {
        console.log(
          '⚠️ [GERENTE] Nenhuma unidade encontrada para CPF:',
          user.cpf,
        );
        return [];
      }

      const unidadeId = gerenteUnidade[0].id;
      console.log('🔍 [GERENTE] Buscando usuários da unidade:', unidadeId);

      // Buscar TODOS os usuários relacionados à unidade:
      // - Alunos (via tabela alunos)
      // - Professores (via tabela professores -> professor_unidades)
      // - Recepcionistas (via tabela recepcionista_unidades)
      // - Responsáveis (via tabela alunos -> responsaveis)
      const usuariosIds = await this.usuarioRepository.query(
        `
        SELECT DISTINCT u.id
        FROM teamcruz.usuarios u
        LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
        LEFT JOIN teamcruz.professores p ON p.usuario_id = u.id
        LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = p.id
        LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = true
        WHERE
          a.unidade_id = $1
          OR pu.unidade_id = $1
          OR ru.unidade_id = $1
        `,
        [unidadeId],
      );

      console.log('📊 [GERENTE] Usuários encontrados:', usuariosIds.length);

      const ids = usuariosIds.map((row: any) => row.id);

      if (ids.length === 0) {
        return [];
      }

      const usuarios = await this.usuarioRepository.find({
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

      return this.enrichUsersWithUnidade(usuarios);
    }

    // Recepcionista vê apenas usuários da sua unidade
    if (isRecepcionista) {
      const recepcionistaData = await this.usuarioRepository.query(
        `SELECT unidade_id FROM teamcruz.recepcionista_unidades WHERE usuario_id = $1 AND ativo = true`,
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

      const usuarios = await this.usuarioRepository.find({
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

      return this.enrichUsersWithUnidade(usuarios);
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

  async findOne(id: string): Promise<any> {
    console.log('🔍 [FIND_ONE] Buscando usuário:', id);

    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['perfis', 'perfis.permissoes'],
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    console.log('✅ [FIND_ONE] Usuário encontrado:', {
      id: usuario.id,
      nome: usuario.nome,
      perfis: usuario.perfis?.map((p) => p.nome),
    });

    // Enriquecer com dados da unidade
    console.log('🔧 [FIND_ONE] Enriquecendo com unidade...');
    const [usuarioEnriquecido] = await this.enrichUsersWithUnidade([usuario]);

    console.log('📦 [FIND_ONE] Usuário enriquecido:', {
      id: usuarioEnriquecido.id,
      nome: usuarioEnriquecido.nome,
      temUnidade: !!usuarioEnriquecido.unidade,
      unidade: usuarioEnriquecido.unidade,
    });

    return usuarioEnriquecido;
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
    console.log('🔄 [UPDATE] Iniciando atualização de usuário:', {
      id,
      updateData: {
        ...updateData,
        password: updateData.password ? '***' : undefined,
      },
    });

    const usuario = await this.findOne(id);

    console.log('👤 [UPDATE] Usuário carregado:', {
      id: usuario.id,
      nome: usuario.nome,
      perfis: usuario.perfis?.map((p: any) => p.nome),
      unidadeAtual: usuario.unidade,
    });

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

    // Atualizar vinculação de unidade para recepcionistas
    if (updateData.unidade_id && usuario.perfis) {
      const perfisNomes = usuario.perfis.map((p) => p.nome?.toUpperCase());

      if (perfisNomes.includes('RECEPCIONISTA')) {
        try {
          console.log('🔄 [UPDATE] Atualizando unidade da recepcionista:', {
            usuario_id: id,
            unidade_id: updateData.unidade_id,
          });

          // Verificar se já existe registro
          const existing = await this.usuarioRepository.query(
            `SELECT id FROM teamcruz.recepcionista_unidades WHERE usuario_id = $1`,
            [id],
          );

          if (existing && existing.length > 0) {
            // Atualizar registro existente
            await this.usuarioRepository.query(
              `UPDATE teamcruz.recepcionista_unidades
               SET unidade_id = $1, updated_at = NOW()
               WHERE usuario_id = $2`,
              [updateData.unidade_id, id],
            );
            console.log('✅ [UPDATE] Unidade atualizada com sucesso!');
          } else {
            // Criar novo registro
            await this.usuarioRepository.query(
              `INSERT INTO teamcruz.recepcionista_unidades (usuario_id, unidade_id, ativo, created_at, updated_at)
               VALUES ($1, $2, true, NOW(), NOW())`,
              [id, updateData.unidade_id],
            );
            console.log('✅ [UPDATE] Novo vínculo criado com sucesso!');
          }
        } catch (error) {
          console.error(
            '❌ [UPDATE] Erro ao atualizar unidade:',
            error.message,
          );
        }
      }

      if (perfisNomes.includes('GERENTE_UNIDADE')) {
        try {
          console.log('🔄 [UPDATE] Atualizando unidade do gerente:', {
            cpf: usuario.cpf,
            unidade_id: updateData.unidade_id,
          });

          // ✅ PASSO 1: Remover CPF de TODAS as outras unidades (para evitar conflito)
          await this.usuarioRepository.query(
            `UPDATE teamcruz.unidades
             SET responsavel_cpf = NULL, responsavel_papel = NULL, updated_at = NOW()
             WHERE responsavel_cpf = $1 AND responsavel_papel = 'GERENTE'`,
            [usuario.cpf],
          );
          console.log('🧹 [UPDATE] CPF removido de unidades anteriores');

          // ✅ PASSO 2: Definir CPF na nova unidade
          await this.usuarioRepository.query(
            `UPDATE teamcruz.unidades
             SET responsavel_cpf = $1, responsavel_papel = 'GERENTE', updated_at = NOW()
             WHERE id = $2`,
            [usuario.cpf, updateData.unidade_id],
          );
          console.log(
            '✅ [UPDATE] Gerente vinculado à nova unidade com sucesso!',
          );
        } catch (error) {
          console.error('❌ [UPDATE] Erro ao vincular gerente:', error.message);
        }
      }

      if (
        perfisNomes.includes('PROFESSOR') ||
        perfisNomes.includes('INSTRUTOR')
      ) {
        try {
          console.log('🔄 [UPDATE] Atualizando unidade do professor:', {
            usuario_id: id,
            unidade_id: updateData.unidade_id,
          });

          // Buscar professor_id
          const professor = await this.usuarioRepository.query(
            `SELECT id FROM teamcruz.professores WHERE usuario_id = $1`,
            [id],
          );

          if (professor && professor.length > 0) {
            const professorId = professor[0].id;

            // Verificar se já existe vínculo
            const existing = await this.usuarioRepository.query(
              `SELECT id FROM teamcruz.professor_unidades
               WHERE professor_id = $1 AND unidade_id = $2`,
              [professorId, updateData.unidade_id],
            );

            if (!existing || existing.length === 0) {
              // Criar novo vínculo
              await this.usuarioRepository.query(
                `INSERT INTO teamcruz.professor_unidades (professor_id, unidade_id)
                 VALUES ($1, $2)`,
                [professorId, updateData.unidade_id],
              );
              console.log(
                '✅ [UPDATE] Professor vinculado à unidade com sucesso!',
              );
            } else {
              console.log('ℹ️ [UPDATE] Professor já vinculado a esta unidade');
            }
          }
        } catch (error) {
          console.error(
            '❌ [UPDATE] Erro ao vincular professor:',
            error.message,
          );
        }
      }

      delete updateData.unidade_id;
    }

    console.log('💾 [UPDATE] Salvando alterações do usuário:', {
      id,
      campos: Object.keys(updateData),
    });

    Object.assign(usuario, updateData);
    const result = await this.usuarioRepository.save(usuario);

    console.log('✅ [UPDATE] Usuário atualizado com sucesso');

    return result;
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

        // Buscar GERENTES, ALUNOS, RECEPCIONISTAS e PROFESSORES pendentes das unidades do franqueado
        const usuariosPendentes = await this.usuarioRepository.query(
          `
          SELECT DISTINCT u.id, u.username, u.email, u.nome, u.cpf, u.telefone,
                 u.ativo, u.cadastro_completo, u.created_at, u.updated_at,
                 COALESCE(un.id, a_un.id, rec_un.id, prof_un.id) as unidade_id,
                 COALESCE(un.nome, a_un.nome, rec_un.nome, prof_un.nome) as unidade_nome,
                 COALESCE(un.status, a_un.status, rec_un.status, prof_un.status) as unidade_status
          FROM teamcruz.usuarios u
          INNER JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
          INNER JOIN teamcruz.perfis p ON up.perfil_id = p.id

          -- Unidade do Gerente
          LEFT JOIN teamcruz.unidades un ON un.responsavel_cpf = u.cpf AND un.franqueado_id = $1

          -- Unidade do Aluno
          LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
          LEFT JOIN teamcruz.unidades a_un ON a_un.id = a.unidade_id AND a_un.franqueado_id = $1

          -- Unidade do Recepcionista
          LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = true
          LEFT JOIN teamcruz.unidades rec_un ON rec_un.id = ru.unidade_id AND rec_un.franqueado_id = $1

          -- Unidade do Professor
          LEFT JOIN teamcruz.professores prof ON prof.usuario_id = u.id
          LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = prof.id
          LEFT JOIN teamcruz.unidades prof_un ON prof_un.id = pu.unidade_id AND prof_un.franqueado_id = $1

          WHERE u.ativo = false
            AND (
              (UPPER(p.nome) = 'GERENTE_UNIDADE' AND un.id IS NOT NULL)
              OR (UPPER(p.nome) = 'ALUNO' AND a_un.id IS NOT NULL)
              OR (UPPER(p.nome) = 'RECEPCIONISTA' AND rec_un.id IS NOT NULL)
              OR (UPPER(p.nome) IN ('PROFESSOR', 'INSTRUTOR') AND prof_un.id IS NOT NULL)
            )
          ORDER BY u.created_at DESC
          `,
          [franqueadoId],
        );

        // Buscar perfis e unidade para cada usuário
        for (const usuario of usuariosPendentes) {
          console.log('🔍 [PENDENTES] Processando usuário:', {
            id: usuario.id,
            nome: usuario.nome,
            unidade_id: usuario.unidade_id,
            unidade_nome: usuario.unidade_nome,
            unidade_status: usuario.unidade_status,
          });

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

          // Adicionar informação da unidade se houver (verificar campos individuais)
          if (usuario.unidade_id && usuario.unidade_nome) {
            console.log(
              '✅ [PENDENTES] Criando objeto unidade para:',
              usuario.nome,
            );
            usuario.unidade = {
              id: usuario.unidade_id,
              nome: usuario.unidade_nome,
              status: usuario.unidade_status,
            };
            console.log('🏢 [PENDENTES] Unidade criada:', usuario.unidade);
            // Remover campos individuais para limpar o objeto
            delete usuario.unidade_id;
            delete usuario.unidade_nome;
            delete usuario.unidade_status;
          } else {
            console.log('⚠️ [PENDENTES] Sem unidade para:', usuario.nome, {
              unidade_id: usuario.unidade_id,
              unidade_nome: usuario.unidade_nome,
            });
          }

          console.log('📦 [PENDENTES] Usuário final:', {
            id: usuario.id,
            nome: usuario.nome,
            unidade: usuario.unidade,
          });
        }

        console.log(
          '📋 [PENDENTES] Total de usuários processados:',
          usuariosPendentes.length,
        );

        // Força serialização JSON para garantir que propriedades customizadas sejam preservadas
        // TypeORM remove propriedades que não estão na entidade, então precisamos converter para objeto puro
        const usuariosSerializados = JSON.parse(
          JSON.stringify(usuariosPendentes),
        );

        console.log('🔄 [PENDENTES] Após JSON.parse(JSON.stringify()):', {
          total: usuariosSerializados.length,
          primeiroUsuario: usuariosSerializados[0]?.nome,
          temUnidade: !!usuariosSerializados[0]?.unidade,
          unidade: usuariosSerializados[0]?.unidade,
        });

        console.log(
          '✅ [PENDENTES] Retornando usuários serializados diretamente',
        );

        // Retornar direto os usuários serializados - não entrar no Promise.all abaixo
        // pois já temos a unidade correta vinda do LEFT JOIN na query
        return usuariosSerializados;
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
        // Buscar unidade do recepcionista via tabela recepcionista_unidades
        const recepcionistaData = await this.usuarioRepository.query(
          `SELECT unidade_id FROM teamcruz.recepcionista_unidades WHERE usuario_id = $1 AND ativo = true`,
          [user.id],
        );

        if (recepcionistaData && recepcionistaData.length > 0) {
          unidadeId = recepcionistaData[0].unidade_id;
        }
      }

      if (unidadeId) {
        // Buscar ALUNOS, RECEPCIONISTAS, PROFESSORES e RESPONSÁVEIS da unidade que estão pendentes
        const usuariosPendentes = await this.usuarioRepository.query(
          `
          SELECT DISTINCT u.id, u.username, u.email, u.nome, u.cpf, u.telefone,
                 u.ativo, u.cadastro_completo, u.created_at, u.updated_at,
                 $1 as unidade_id
          FROM teamcruz.usuarios u
          INNER JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
          INNER JOIN teamcruz.perfis p ON up.perfil_id = p.id

          -- Alunos da unidade
          LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id AND a.unidade_id = $1

          -- Recepcionistas da unidade
          LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.unidade_id = $1 AND ru.ativo = true

          -- Professores da unidade
          LEFT JOIN teamcruz.professores prof ON prof.usuario_id = u.id
          LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = prof.id AND pu.unidade_id = $1

          WHERE u.ativo = false
            AND (
              (UPPER(p.nome) = 'ALUNO' AND a.id IS NOT NULL)
              OR (UPPER(p.nome) = 'RECEPCIONISTA' AND ru.id IS NOT NULL)
              OR (UPPER(p.nome) IN ('PROFESSOR', 'INSTRUTOR') AND pu.id IS NOT NULL)
              OR (UPPER(p.nome) = 'RESPONSAVEL')
            )
          ORDER BY u.created_at DESC
          `,
          [unidadeId],
        );

        // Buscar perfis e unidade para cada usuário
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

          // Adicionar informação da unidade
          if (usuario.unidade_id) {
            const unidadeData = await this.usuarioRepository.query(
              `SELECT id, nome, status FROM teamcruz.unidades WHERE id = $1`,
              [usuario.unidade_id],
            );
            if (unidadeData && unidadeData.length > 0) {
              usuario.unidade = {
                id: unidadeData[0].id,
                nome: unidadeData[0].nome,
                status: unidadeData[0].status,
              };
            }
            delete usuario.unidade_id;
          }
        }

        console.log(
          `📋 [PENDENTES ${tipoUsuario.toUpperCase()}] Total de usuários pendentes:`,
          usuariosPendentes.length,
        );

        // Serializar para preservar propriedades customizadas
        return JSON.parse(JSON.stringify(usuariosPendentes));
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
