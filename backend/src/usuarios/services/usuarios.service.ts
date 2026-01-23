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
import { GerenteUnidadesService } from '../../people/services/gerente-unidades.service';
import { EmailService } from '../../email/email.service';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Perfil)
    private perfilRepository: Repository<Perfil>,
    private dataSource: DataSource,
    private gerenteUnidadesService: GerenteUnidadesService,
    private emailService: EmailService,
    private whatsappService: WhatsAppService,
  ) {}

  /**
   * Enriquece lista de usuários com informações da unidade vinculada
   * Para GERENTE_UNIDADE: busca unidade via tabela gerente_unidades
   * Retorna array serializado (plain objects) para preservar propriedades customizadas
   */
  private async enrichUsersWithUnidade(usuarios: any[]): Promise<any[]> {
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
        const isAluno = perfisNomes.includes('ALUNO');
        const isResponsavel = perfisNomes.includes('RESPONSAVEL');
        const isTablet = perfisNomes.includes('TABLET_CHECKIN');

        const needsUnidade =
          isGerente ||
          isRecepcionista ||
          isProfessor ||
          isAluno ||
          isResponsavel ||
          isTablet;

        let unidade: any = null;

        if (needsUnidade) {
          if (isGerente) {
            // Gerente: buscar via tabela gerente_unidades
            const unidadeData = await this.usuarioRepository.query(
              `SELECT u.id, u.nome, u.status
               FROM teamcruz.gerente_unidades gu
               INNER JOIN teamcruz.unidades u ON u.id = gu.unidade_id
               WHERE gu.usuario_id = $1 AND gu.ativo = true
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
            // Professor: buscar via professor_unidades
            // Pode ser via professor_id (cadastro completo) ou usuario_id (pendente)
            const unidadeData = await this.usuarioRepository.query(
              `SELECT u.id, u.nome, u.status
               FROM teamcruz.professor_unidades pu
               INNER JOIN teamcruz.unidades u ON u.id = pu.unidade_id
               LEFT JOIN teamcruz.professores p ON p.id = pu.professor_id
               WHERE (p.usuario_id = $1 OR pu.usuario_id = $1)
               AND pu.ativo = true
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
          } else if (isAluno) {
            // Aluno: buscar via tabela alunos
            const unidadeData = await this.usuarioRepository.query(
              `SELECT u.id, u.nome, u.status
               FROM teamcruz.alunos a
               INNER JOIN teamcruz.unidades u ON u.id = a.unidade_id
               WHERE a.usuario_id = $1
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
          } else if (isResponsavel) {
            // Responsável: buscar via tabela responsaveis
            const unidadeData = await this.usuarioRepository.query(
              `SELECT u.id, u.nome, u.status
               FROM teamcruz.responsaveis r
               INNER JOIN teamcruz.unidades u ON u.id = r.unidade_id
               WHERE r.usuario_id = $1
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
          } else if (isTablet) {
            // Tablet: buscar via tabela tablet_unidades
            const unidadeData = await this.usuarioRepository.query(
              `SELECT u.id, u.nome, u.status
               FROM teamcruz.tablet_unidades tu
               INNER JOIN teamcruz.unidades u ON u.id = tu.unidade_id
               WHERE tu.tablet_id = $1 AND tu.ativo = true
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
        }

        return {
          ...usuario,
          unidade,
          unidades: unidade ? [unidade] : [], // Array para compatibilidade com frontend
        };
      }),
    );

    // Serializar para plain objects
    const resultado = JSON.parse(JSON.stringify(usuariosEnriquecidos));

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

    // ✅ VALIDAÇÃO: Verificar se unidade está ativa (quando unidade_id for informada)
    if (createUsuarioDto.unidade_id) {
      const unidadeData = await this.dataSource.query(
        `SELECT id, nome, status FROM teamcruz.unidades WHERE id = $1`,
        [createUsuarioDto.unidade_id],
      );

      if (!unidadeData || unidadeData.length === 0) {
        throw new BadRequestException(
          'Unidade não encontrada. Verifique o ID informado.',
        );
      }

      if (unidadeData[0].status !== 'ATIVA') {
        throw new BadRequestException(
          `Não é possível cadastrar usuário na unidade "${unidadeData[0].nome}" pois ela está com status "${unidadeData[0].status}". Apenas unidades ATIVAS podem receber novos cadastros.`,
        );
      }
    }

    // ⚠️ VALIDAÇÃO: Perfis que requerem cadastro completo
    // FRANQUEADO foi removido - pode ser criado sem cadastro completo
    if (createUsuarioDto.perfil_ids && createUsuarioDto.perfil_ids.length > 0) {
      const perfis = await this.perfilRepository.find({
        where: createUsuarioDto.perfil_ids.map((id) => ({ id })),
      });

      const perfisQueRequeremCadastroCompleto = [
        'GERENTE_UNIDADE',
        'RECEPCIONISTA',
        'INSTRUTOR',
      ];
      const temPerfilQueRequerCadastroCompleto = perfis.some((p) =>
        perfisQueRequeremCadastroCompleto.includes(p.nome?.toUpperCase()),
      );

      if (
        temPerfilQueRequerCadastroCompleto &&
        !createUsuarioDto.cadastro_completo
      ) {
        const perfisNomes = perfis
          .filter((p) =>
            perfisQueRequeremCadastroCompleto.includes(p.nome?.toUpperCase()),
          )
          .map((p) => p.nome)
          .join(', ');

        throw new BadRequestException(
          `Os perfis ${perfisNomes} requerem cadastro completo. Marque a opção "Cadastro Completo" e preencha todos os dados necessários.`,
        );
      }
    }

    // Verificar se CPF já existe para o MESMO PERFIL
    if (
      createUsuarioDto.cpf &&
      createUsuarioDto.perfil_ids &&
      createUsuarioDto.perfil_ids.length > 0
    ) {
      const cpfLimpo = createUsuarioDto.cpf.replace(/\D/g, '');

      // Buscar usuários com o mesmo CPF
      const usuariosComMesmoCpf = await this.usuarioRepository
        .createQueryBuilder('usuario')
        .leftJoinAndSelect('usuario.perfis', 'perfil')
        .where('usuario.cpf = :cpf', { cpf: cpfLimpo })
        .getMany();

      // Verificar se algum tem o mesmo perfil
      const perfilIds = createUsuarioDto.perfil_ids;
      for (const usuario of usuariosComMesmoCpf) {
        const perfilIdsExistentes = usuario.perfis.map((p) => p.id);
        const temPerfilDuplicado = perfilIds.some((novoPerfilId) =>
          perfilIdsExistentes.includes(novoPerfilId),
        );

        if (temPerfilDuplicado) {
          const perfil = usuario.perfis.find((p) => perfilIds.includes(p.id));
          throw new ConflictException(
            `Já existe um usuário com este CPF e perfil ${perfil?.nome || 'selecionado'}`,
          );
        }
      }
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

    // ✅ Verificar se o perfil é FRANQUEADO para definir status ativo por padrão
    const isFranqueado = perfis.some(
      (p) => p.nome?.toUpperCase() === 'FRANQUEADO',
    );

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
      foto: createUsuarioDto.foto || undefined,
      perfis,
      // Se for FRANQUEADO, sempre ativo = true, senão usa o valor informado ou true por padrão
      ativo: isFranqueado ? true : (createUsuarioDto.ativo ?? true),
      cadastro_completo: createUsuarioDto.cadastro_completo ?? true, // Padrão TRUE - apenas ALUNO auto-registro usa false
    });

    let usuarioSalvo = await this.usuarioRepository.save(usuario);

    // Garantir que usuarioSalvo seja um objeto único
    if (Array.isArray(usuarioSalvo)) {
      usuarioSalvo = usuarioSalvo[0];
    }

    // ===== PROCESSAMENTO PÓS-CRIAÇÃO BASEADO NO PERFIL =====
    if (perfis && perfis.length > 0) {
      const perfilNome = perfis[0].nome.toUpperCase();

      try {
        // GERENTE_UNIDADE: vincular via tabela gerente_unidades
        if (perfilNome === 'GERENTE_UNIDADE' && createUsuarioDto.unidade_id) {
          await this.gerenteUnidadesService.vincular(
            usuarioSalvo.id,
            createUsuarioDto.unidade_id,
          );
        }

        // PROFESSOR / INSTRUTOR: criar registro na tabela professores e professor_unidades
        if (
          (perfilNome === 'PROFESSOR' || perfilNome === 'INSTRUTOR') &&
          createUsuarioDto.unidade_id
        ) {
          // 1. Criar registro na tabela professores
          const professorResult = await this.dataSource.query(
            `
            INSERT INTO teamcruz.professores
            (usuario_id, tipo_cadastro, nome_completo, cpf, data_nascimento, genero,
             telefone_whatsapp, email, unidade_id, especialidades, faixa_ministrante,
             observacoes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            RETURNING id
            `,
            [
              usuarioSalvo.id,
              'PROFESSOR', // tipo_cadastro obrigatório
              usuarioSalvo.nome, // nome_completo obrigatório
              cpfLimpo || null,
              createUsuarioDto.data_nascimento || null,
              createUsuarioDto.genero || 'MASCULINO', // genero obrigatório, padrão MASCULINO
              telefoneLimpo || null,
              usuarioSalvo.email || null,
              createUsuarioDto.unidade_id,
              createUsuarioDto.especialidades || null,
              createUsuarioDto.faixa_ministrante || null,
              createUsuarioDto.observacoes || null,
            ],
          );

          const professorId = professorResult[0].id;

          // 2. Criar registro na professor_unidades vinculando professor à unidade
          await this.dataSource.query(
            `
            INSERT INTO teamcruz.professor_unidades
            (professor_id, unidade_id, usuario_id, ativo, created_at, updated_at)
            VALUES ($1, $2, $3, true, NOW(), NOW())
            `,
            [professorId, createUsuarioDto.unidade_id, usuarioSalvo.id],
          );
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

        // TABLET_CHECKIN: criar registro na tabela tablet_unidades
        if (perfilNome === 'TABLET_CHECKIN' && createUsuarioDto.unidade_id) {
          await this.dataSource.query(
            `
            INSERT INTO teamcruz.tablet_unidades
            (tablet_id, unidade_id, ativo, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            `,
            [usuarioSalvo.id, createUsuarioDto.unidade_id, true],
          );
        }

        // RESPONSAVEL: criar registro na tabela responsaveis
        if (perfilNome === 'RESPONSAVEL' && createUsuarioDto.unidade_id) {
          const responsavelResult = await this.dataSource.query(
            `
            INSERT INTO teamcruz.responsaveis
            (usuario_id, unidade_id, nome_completo, cpf, email, telefone,
             data_nascimento, genero, ativo, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING id
            `,
            [
              usuarioSalvo.id,
              createUsuarioDto.unidade_id,
              usuarioSalvo.nome,
              cpfLimpo || null,
              usuarioSalvo.email || null,
              telefoneLimpo || null,
              createUsuarioDto.data_nascimento || null,
              createUsuarioDto.genero || 'MASCULINO',
              true, // Responsável ativo por padrão
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

    // Enviar email com credenciais para perfis específicos
    const perfisQueRecebemEmail = [
      'FRANQUEADO',
      'GERENTE_UNIDADE',
      'PROFESSOR',
      'INSTRUTOR',
      'RECEPCIONISTA',
      'RECEPCAO',
    ];

    const perfisDoUsuario = perfis.map((p) => p.nome?.toUpperCase());
    const deveEnviarEmail = perfisDoUsuario.some((perfil) =>
      perfisQueRecebemEmail.includes(perfil),
    );

    if (deveEnviarEmail && usuarioSalvo.email) {
      // Enviar email em background (não bloqueia a resposta)
      const perfilPrincipal =
        perfisDoUsuario.find((p) => perfisQueRecebemEmail.includes(p)) ||
        'USUARIO';

      this.emailService
        .sendCredentialsEmail(
          usuarioSalvo.email,
          usuarioSalvo.nome,
          usuarioSalvo.username,
          createUsuarioDto.password, // Senha em texto plano antes do hash
          perfilPrincipal,
        )
        .then(() => {})
        .catch((error) => {
          // Log do erro mas não falha a criação do usuário
          console.error(
            ` [EMAIL] Erro ao enviar email de credenciais para ${usuarioSalvo.email}:`,
            error.message,
          );
        });
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
      const usuarios = await this.findAll();
      return this.enrichUsersWithUnidade(usuarios);
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
      const usuarios = await this.findAll();
      return this.enrichUsersWithUnidade(usuarios);
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

      // LOG: Verificar tablets antes da query principal
      const debugTablets = await this.usuarioRepository.query(
        `SELECT u.id, u.nome, u.email, tu.unidade_id, un.franqueado_id, tu.ativo as tablet_ativo
         FROM teamcruz.usuarios u
         INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
         INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
         LEFT JOIN teamcruz.tablet_unidades tu ON tu.tablet_id = u.id
         LEFT JOIN teamcruz.unidades un ON un.id = tu.unidade_id
         WHERE p.nome = 'TABLET_CHECKIN'`,
      );

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
                 WHEN un_prof_pendente.franqueado_id = $1 THEN 'professor_pendente_da_unidade'
                 WHEN un_gerente.franqueado_id = $1 THEN 'gerente_da_unidade'
                 WHEN un_recep.franqueado_id = $1 THEN 'recepcionista_da_unidade'
                 WHEN un_tablet.franqueado_id = $1 THEN 'tablet_da_unidade'
                 WHEN perfil.nome = 'RESPONSAVEL' AND resp.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = $1) THEN 'responsavel_da_unidade'
                 WHEN perfil.nome = 'RESPONSAVEL' AND un_resp_aluno.franqueado_id = $1 THEN 'responsavel_com_aluno_na_unidade'
                 ELSE 'outro'
               END as motivo_inclusao
        FROM teamcruz.usuarios u
        LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
        LEFT JOIN teamcruz.professores p ON p.usuario_id = u.id
        LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = p.id
        LEFT JOIN teamcruz.professor_unidades pu_pendente ON pu_pendente.usuario_id = u.id AND pu_pendente.professor_id IS NULL
        LEFT JOIN teamcruz.unidades un_aluno ON un_aluno.id = a.unidade_id
        LEFT JOIN teamcruz.unidades un_prof ON un_prof.id = pu.unidade_id
        LEFT JOIN teamcruz.unidades un_prof_pendente ON un_prof_pendente.id = pu_pendente.unidade_id
        LEFT JOIN teamcruz.gerente_unidades gu ON gu.usuario_id = u.id AND gu.ativo = TRUE
        LEFT JOIN teamcruz.unidades un_gerente ON un_gerente.id = gu.unidade_id
        LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = TRUE
        LEFT JOIN teamcruz.unidades un_recep ON un_recep.id = ru.unidade_id
        LEFT JOIN teamcruz.tablet_unidades tu ON tu.tablet_id = u.id AND tu.ativo = TRUE
        LEFT JOIN teamcruz.unidades un_tablet ON un_tablet.id = tu.unidade_id
        LEFT JOIN teamcruz.franqueados f ON f.usuario_id = u.id
        LEFT JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
        LEFT JOIN teamcruz.perfis perfil ON perfil.id = up.perfil_id
        LEFT JOIN teamcruz.responsaveis resp ON resp.usuario_id = u.id
        LEFT JOIN teamcruz.alunos aluno_resp ON aluno_resp.responsavel_id = resp.id
        LEFT JOIN teamcruz.unidades un_resp_aluno ON un_resp_aluno.id = aluno_resp.unidade_id
        WHERE (
          (un_aluno.franqueado_id = $1 OR un_prof.franqueado_id = $1 OR un_prof_pendente.franqueado_id = $1 OR un_gerente.franqueado_id = $1 OR un_recep.franqueado_id = $1 OR un_tablet.franqueado_id = $1)
          OR f.id = $1
          OR u.id = $2
          OR (UPPER(perfil.nome) = 'RESPONSAVEL' AND resp.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = $1))
          OR (UPPER(perfil.nome) = 'RESPONSAVEL' AND un_resp_aluno.franqueado_id = $1)
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

      // 🔥 LOG: Comparar tablets do sistema com os retornados
      const tabletsRetornados = usuariosIds.filter(
        (u) => u.motivo_inclusao === 'tablet',
      );

      // 🔥 LOG DETALHADO: Quantos alunos foram retornados pela query
      const totalAlunos = usuariosIds.filter(
        (u: any) => u.motivo_inclusao === 'aluno_da_unidade',
      ).length;

      const ids = usuariosIds.map((row: any) => row.id);

      if (ids.length === 0) {
        return [];
      }

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

      return this.enrichUsersWithUnidade(resultado);
    }

    // Gerente vê apenas usuários da sua unidade
    if (isGerente) {
      // Buscar unidade do gerente via tabela gerente_unidades
      const gerenteUnidade = await this.usuarioRepository.query(
        `SELECT unidade_id FROM teamcruz.gerente_unidades
         WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );

      if (!gerenteUnidade || gerenteUnidade.length === 0) {
        return [];
      }

      const unidadeId = gerenteUnidade[0].unidade_id;

      // Buscar usuários relacionados à unidade do gerente
      // Incluindo o próprio gerente para que ele apareça na lista
      const usuariosIds = await this.usuarioRepository.query(
        `
        SELECT DISTINCT u.id
        FROM teamcruz.usuarios u
        LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
        LEFT JOIN teamcruz.professores p ON p.usuario_id = u.id
        LEFT JOIN teamcruz.professor_unidades pu ON (pu.professor_id = p.id OR pu.usuario_id = u.id)
        LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = true
        LEFT JOIN teamcruz.gerente_unidades gu ON gu.usuario_id = u.id AND gu.ativo = true
        LEFT JOIN teamcruz.responsaveis resp ON resp.usuario_id = u.id
        WHERE
          -- Alunos da unidade
          a.unidade_id = $1
          -- Professores que já completaram cadastro OU ainda pendentes (via usuario_id)
          OR pu.unidade_id = $1
          -- Recepcionistas vinculados
          OR ru.unidade_id = $1
          -- Apenas o próprio gerente logado (não outros gerentes)
          OR (gu.unidade_id = $1 AND gu.usuario_id = $2)
          -- Responsáveis vinculados à unidade
          OR resp.unidade_id = $1
        `,
        [unidadeId, user.id],
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

      // Buscar TODOS os usuários relacionados à unidade (alunos, recepcionistas, gerentes, professores)
      const usuariosIds = await this.usuarioRepository.query(
        `
        SELECT DISTINCT u.id, u.nome, u.email
        FROM teamcruz.usuarios u
        LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
        LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id
        LEFT JOIN teamcruz.gerente_unidades gu ON gu.usuario_id = u.id
        LEFT JOIN teamcruz.professor_unidades pu ON pu.usuario_id = u.id
        WHERE a.unidade_id = $1
           OR ru.unidade_id = $1
           OR gu.unidade_id = $1
           OR pu.unidade_id = $1
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
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['perfis', 'perfis.permissoes'],
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Enriquecer com dados da unidade
    const [usuarioEnriquecido] = await this.enrichUsersWithUnidade([usuario]);

    return usuarioEnriquecido;
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

    // Atualizar vinculação de unidade para recepcionistas
    if (updateData.unidade_id && usuario.perfis) {
      const perfisNomes = usuario.perfis.map((p) => p.nome?.toUpperCase());

      if (perfisNomes.includes('RECEPCIONISTA')) {
        try {
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
          } else {
            // Criar novo registro
            await this.usuarioRepository.query(
              `INSERT INTO teamcruz.recepcionista_unidades (usuario_id, unidade_id, ativo, created_at, updated_at)
               VALUES ($1, $2, true, NOW(), NOW())`,
              [id, updateData.unidade_id],
            );
          }
        } catch (error) {
          console.error(' [UPDATE] Erro ao atualizar unidade:', error.message);
        }
      }

      if (perfisNomes.includes('TABLET_CHECKIN')) {
        try {
          // Verificar se já existe registro
          const existing = await this.usuarioRepository.query(
            `SELECT id FROM teamcruz.tablet_unidades WHERE tablet_id = $1`,
            [id],
          );

          if (existing && existing.length > 0) {
            // Atualizar registro existente
            await this.usuarioRepository.query(
              `UPDATE teamcruz.tablet_unidades
               SET unidade_id = $1, updated_at = NOW()
               WHERE tablet_id = $2`,
              [updateData.unidade_id, id],
            );
          } else {
            // Criar novo registro
            await this.usuarioRepository.query(
              `INSERT INTO teamcruz.tablet_unidades (tablet_id, unidade_id, ativo, created_at, updated_at)
               VALUES ($1, $2, true, NOW(), NOW())`,
              [id, updateData.unidade_id],
            );
          }
        } catch (error) {
          console.error(
            ' [UPDATE] Erro ao atualizar tablet_unidades:',
            error.message,
          );
        }
      }

      if (perfisNomes.includes('GERENTE_UNIDADE')) {
        try {
          // Desvincular gerente da unidade anterior via tabela gerente_unidades
          await this.usuarioRepository.query(
            `UPDATE teamcruz.gerente_unidades
             SET ativo = false, updated_at = NOW()
             WHERE usuario_id = $1`,
            [id],
          );

          // Vincular gerente à nova unidade via tabela gerente_unidades
          if (updateData.unidade_id) {
            await this.usuarioRepository.query(
              `INSERT INTO teamcruz.gerente_unidades (usuario_id, unidade_id, ativo, data_vinculo)
               VALUES ($1, $2, true, NOW())
               ON CONFLICT (usuario_id) DO UPDATE
               SET unidade_id = $2, ativo = true, updated_at = NOW()`,
              [id, updateData.unidade_id],
            );
          }
        } catch (error) {
          console.error(' [UPDATE] Erro ao vincular gerente:', error.message);
        }
      }

      if (
        perfisNomes.includes('PROFESSOR') ||
        perfisNomes.includes('INSTRUTOR')
      ) {
        try {
          // Buscar professor_id
          const professor = await this.usuarioRepository.query(
            `SELECT id FROM teamcruz.professores WHERE usuario_id = $1`,
            [id],
          );

          if (professor && professor.length > 0) {
            const professorId = professor[0].id;

            // Atualizar unidade do professor
            await this.usuarioRepository.query(
              `UPDATE teamcruz.professores
               SET unidade_id = $1, updated_at = NOW()
               WHERE id = $2`,
              [updateData.unidade_id, professorId],
            );

            // Desativar vínculos anteriores
            await this.usuarioRepository.query(
              `UPDATE teamcruz.professor_unidades
               SET ativo = false, updated_at = NOW()
               WHERE professor_id = $1`,
              [professorId],
            );

            // Verificar se já existe vínculo com a nova unidade
            const existing = await this.usuarioRepository.query(
              `SELECT id FROM teamcruz.professor_unidades
               WHERE professor_id = $1 AND unidade_id = $2`,
              [professorId, updateData.unidade_id],
            );

            if (existing && existing.length > 0) {
              // Reativar vínculo existente
              await this.usuarioRepository.query(
                `UPDATE teamcruz.professor_unidades
                 SET ativo = true, updated_at = NOW()
                 WHERE professor_id = $1 AND unidade_id = $2`,
                [professorId, updateData.unidade_id],
              );
            } else {
              // Criar novo vínculo
              await this.usuarioRepository.query(
                `INSERT INTO teamcruz.professor_unidades (professor_id, unidade_id, usuario_id, ativo, created_at, updated_at)
                 VALUES ($1, $2, $3, true, NOW(), NOW())`,
                [professorId, updateData.unidade_id, id],
              );
            }
          } else {
            // CRIAR PROFESSOR SE NÃO EXISTIR
            const professorResult = await this.usuarioRepository.query(
              `INSERT INTO teamcruz.professores
               (usuario_id, tipo_cadastro, nome_completo, cpf, telefone_whatsapp, email, unidade_id, 
                status, cadastro_completo, created_at, updated_at)
               VALUES ($1, 'PROFESSOR', $2, $3, $4, $5, $6, 'ATIVO', true, NOW(), NOW())
               RETURNING id`,
              [
                id,
                usuario.nome,
                usuario.cpf || null,
                usuario.telefone || null,
                usuario.email,
                updateData.unidade_id,
              ],
            );

            const professorId = professorResult[0].id;

            // Criar vínculo na professor_unidades
            await this.usuarioRepository.query(
              `INSERT INTO teamcruz.professor_unidades
               (professor_id, unidade_id, usuario_id, ativo, created_at, updated_at)
               VALUES ($1, $2, $3, true, NOW(), NOW())`,
              [professorId, updateData.unidade_id, id],
            );

          }
        } catch (error) {
          console.error(' [UPDATE] Erro ao vincular professor:', error.message);
        }
      }

      delete updateData.unidade_id;
    }

    Object.assign(usuario, updateData);
    const result = await this.usuarioRepository.save(usuario);

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

  async findByUsername(username: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({
      where: { username },
      relations: ['perfis', 'perfis.permissoes'],
    });
  }

  async findByEmailOrUsername(
    emailOrUsername: string,
  ): Promise<Usuario | null> {
    // Detectar se é email (contém @) ou username
    const isEmail = emailOrUsername.includes('@');

    if (isEmail) {
      return await this.findByEmail(emailOrUsername);
    } else {
      return await this.findByUsername(emailOrUsername);
    }
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

        // DEBUG: Verificar usuários inativos no banco
        const usuariosInativos = await this.usuarioRepository.query(
          `SELECT u.id, u.nome, u.email, u.ativo, u.created_at
           FROM teamcruz.usuarios u
           WHERE u.ativo = false
           ORDER BY u.created_at DESC
           LIMIT 10`,
        );

        // DEBUG: Verificar alunos vinculados a usuários inativos
        const alunosInativos = await this.usuarioRepository.query(
          `SELECT u.id as usuario_id, u.nome as usuario_nome, u.ativo as usuario_ativo,
                  a.id as aluno_id, a.nome_completo as aluno_nome, a.unidade_id,
                  un.nome as unidade_nome, un.franqueado_id
           FROM teamcruz.usuarios u
           INNER JOIN teamcruz.alunos a ON a.usuario_id = u.id
           LEFT JOIN teamcruz.unidades un ON un.id = a.unidade_id
           WHERE u.ativo = false
           ORDER BY u.created_at DESC
           LIMIT 10`,
        );

        // DEBUG: Verificar perfis dos usuários inativos
        const perfisInativos = await this.usuarioRepository.query(
          `SELECT u.id as usuario_id, u.nome as usuario_nome, p.nome as perfil_nome
           FROM teamcruz.usuarios u
           INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
           INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
           WHERE u.ativo = false
           ORDER BY u.created_at DESC
           LIMIT 20`,
        );

        // Buscar GERENTES, ALUNOS, RECEPCIONISTAS, PROFESSORES e RESPONSAVEIS pendentes das unidades do franqueado
        
        const usuariosPendentes = await this.usuarioRepository.query(
          `
          SELECT DISTINCT u.id, u.username, u.email, u.nome, u.cpf, u.telefone,
                 u.ativo, u.cadastro_completo, u.created_at, u.updated_at,
                 COALESCE(gu_un.id, a_un.id, rec_un.id, prof_un.id, resp_un.id) as unidade_id,
                 COALESCE(gu_un.nome, a_un.nome, rec_un.nome, prof_un.nome, resp_un.nome) as unidade_nome,
                 COALESCE(gu_un.status, a_un.status, rec_un.status, prof_un.status, resp_un.status) as unidade_status
          FROM teamcruz.usuarios u
          INNER JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
          INNER JOIN teamcruz.perfis p ON up.perfil_id = p.id

          -- Unidade do Gerente (via tabela gerente_unidades)
          LEFT JOIN teamcruz.gerente_unidades gu ON gu.usuario_id = u.id AND gu.ativo = true
          LEFT JOIN teamcruz.unidades gu_un ON gu_un.id = gu.unidade_id AND gu_un.franqueado_id = $1

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

          -- Unidade do Responsavel
          LEFT JOIN teamcruz.responsaveis resp ON resp.usuario_id = u.id
          LEFT JOIN teamcruz.unidades resp_un ON resp_un.id = resp.unidade_id AND resp_un.franqueado_id = $1

          WHERE u.ativo = false
            AND (
              (UPPER(p.nome) = 'GERENTE_UNIDADE' AND gu_un.id IS NOT NULL)
              OR (UPPER(p.nome) = 'ALUNO' AND a_un.id IS NOT NULL)
              OR (UPPER(p.nome) = 'RECEPCIONISTA' AND rec_un.id IS NOT NULL)
              OR (UPPER(p.nome) IN ('PROFESSOR', 'INSTRUTOR') AND prof_un.id IS NOT NULL)
              OR (UPPER(p.nome) = 'RESPONSAVEL' AND resp_un.id IS NOT NULL)
            )
          ORDER BY u.created_at DESC
          `,
          [franqueadoId],
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

          // Adicionar informação da unidade se houver (verificar campos individuais)
          if (usuario.unidade_id && usuario.unidade_nome) {
            usuario.unidade = {
              id: usuario.unidade_id,
              nome: usuario.unidade_nome,
              status: usuario.unidade_status,
            };
            // Remover campos individuais para limpar o objeto
            delete usuario.unidade_id;
            delete usuario.unidade_nome;
            delete usuario.unidade_status;
          } else {
          }
        }

        // Força serialização JSON para garantir que propriedades customizadas sejam preservadas
        // TypeORM remove propriedades que não estão na entidade, então precisamos converter para objeto puro
        const usuariosSerializados = JSON.parse(
          JSON.stringify(usuariosPendentes),
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

      // Para gerente: buscar via tabela gerente_unidades
      // Para recepcionista: buscar via tabela recepcionista_unidades
      let unidadeId = null;

      if (isGerente) {
        const gerenteUnidade = await this.usuarioRepository.query(
          `SELECT unidade_id FROM teamcruz.gerente_unidades
           WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
          [user.id],
        );

        if (gerenteUnidade && gerenteUnidade.length > 0) {
          unidadeId = gerenteUnidade[0].unidade_id;
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

          -- Responsaveis da unidade
          LEFT JOIN teamcruz.responsaveis resp ON resp.usuario_id = u.id AND resp.unidade_id = $1

          WHERE u.ativo = false
            AND (
              (UPPER(p.nome) = 'ALUNO' AND a.id IS NOT NULL)
              OR (UPPER(p.nome) = 'RECEPCIONISTA' AND ru.id IS NOT NULL)
              OR (UPPER(p.nome) IN ('PROFESSOR', 'INSTRUTOR') AND pu.id IS NOT NULL)
              OR (UPPER(p.nome) = 'RESPONSAVEL' AND resp.id IS NOT NULL)
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

    // Enviar email de aprovação (não bloqueia se falhar)
    try {
      await this.emailService.sendApprovalEmail(usuario.email, usuario.nome);
    } catch (error) {
      console.error('Erro ao enviar email de aprovação:', error);
    }

    // Enviar WhatsApp se telefone estiver cadastrado (não bloqueia se falhar)
    if (usuario.telefone) {
      try {
        await this.whatsappService.sendApprovalMessage(
          usuario.telefone,
          usuario.nome,
        );
      } catch (error) {
        console.error('Erro ao enviar WhatsApp de aprovação:', error);
      }
    }

    return {
      message: 'Usuário aprovado com sucesso! Email e WhatsApp enviados.',
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

  async findMyResponsavel(usuarioId: string): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `
        SELECT
          r.id,
          r.usuario_id,
          r.unidade_id,
          r.nome_completo,
          r.ativo,
          u.nome as unidade_nome
        FROM teamcruz.responsaveis r
        LEFT JOIN teamcruz.unidades u ON u.id = r.unidade_id
        WHERE r.usuario_id = $1
        LIMIT 1
        `,
        [usuarioId],
      );

      if (!result || result.length === 0) {
        throw new NotFoundException(
          'Responsável não encontrado para este usuário',
        );
      }

      return result[0];
    } catch (error) {
      console.error('[FIND MY RESPONSAVEL] Erro:', error);
      throw error;
    }
  }
}
