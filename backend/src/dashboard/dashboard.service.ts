import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Person, TipoCadastro } from '../people/entities/person.entity';
import { Aluno, StatusAluno } from '../people/entities/aluno.entity';
import { Unidade } from '../people/entities/unidade.entity';
import { Franqueado } from '../people/entities/franqueado.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
    @InjectRepository(Unidade)
    private readonly unidadeRepository: Repository<Unidade>,
    @InjectRepository(Franqueado)
    private readonly franqueadoRepository: Repository<Franqueado>,
    private readonly dataSource: DataSource,
  ) {}

  async getStats(userId: string, unidadeId?: string) {
    try {
      // Buscar o usuário logado e seus perfis
      const usuario = await this.usuarioRepository.findOne({
        where: { id: userId },
        relations: ['perfis'],
      });

      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      const perfis = usuario.perfis.map((p) => p.nome?.toUpperCase());
      const isFranqueado = perfis.includes('FRANQUEADO');
      const isMaster = perfis.includes('MASTER');
      const isGerenteUnidade = perfis.includes('GERENTE_UNIDADE');

      let unidadesDoFranqueado: string[] = [];

      // Se for FRANQUEADO, buscar suas unidades
      if (isFranqueado && !isMaster) {
        const franqueado = await this.franqueadoRepository.findOne({
          where: { usuario_id: userId },
        });

        if (franqueado) {
          // Buscar unidades pelo franqueado_id
          const unidades = await this.unidadeRepository.find({
            where: { franqueado_id: franqueado.id },
          });

          if (unidades && unidades.length > 0) {
            unidadesDoFranqueado = unidades.map((u) => u.id);
          }
        }
      }

      // Se for GERENTE_UNIDADE, buscar unidades que ele gerencia
      if (isGerenteUnidade && !isMaster && !isFranqueado) {
        // Buscar unidades através da tabela gerente_unidades
        const unidadesGerente = await this.dataSource.query(
          `SELECT unidade_id as id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true`,
          [userId],
        );

        if (unidadesGerente && unidadesGerente.length > 0) {
          unidadesDoFranqueado = unidadesGerente.map((u) => u.id);
        }
      }

      // Se for franqueado sem unidades, retornar tudo zerado
      if (
        isFranqueado &&
        !isMaster &&
        (!unidadesDoFranqueado || unidadesDoFranqueado.length === 0)
      ) {
        return {
          totalUsuarios: 0,
          usuariosPendentes: 0,
          totalFranqueados: 0,
          totalAlunos: 0,
          totalProfessores: 0,
          totalUnidades: 0,
          aulasHoje: 0,
          presencasHoje: 0,
          proximosGraduaveis: 0,
        };
      }

      // Buscar usuários pendentes (inativos aguardando aprovação)
      const usuariosPendentes = await this.usuarioRepository.count({
        where: {
          ativo: false,
          cadastro_completo: true,
        },
      });

      // Total de usuários
      const totalUsuarios = await this.usuarioRepository.count();

      // Total de alunos - FILTRADO POR FRANQUIA/UNIDADE
      let totalAlunos = 0;

      if (unidadeId) {
        // Se uma unidade específica foi selecionada
        totalAlunos = await this.alunoRepository.count({
          where: { status: StatusAluno.ATIVO, unidade_id: unidadeId },
        });
      } else if (isFranqueado && unidadesDoFranqueado.length > 0) {
        // Se é franqueado, contar apenas alunos de suas unidades
        const { In } = require('typeorm');
        totalAlunos = await this.alunoRepository.count({
          where: {
            status: StatusAluno.ATIVO,
            unidade_id: In(unidadesDoFranqueado),
          },
        });
      } else if (isGerenteUnidade && unidadesDoFranqueado.length > 0) {
        // Se é gerente, contar apenas alunos de sua unidade
        const { In } = require('typeorm');
        totalAlunos = await this.alunoRepository.count({
          where: {
            status: StatusAluno.ATIVO,
            unidade_id: In(unidadesDoFranqueado),
          },
        });
      } else if (isMaster) {
        // Se é MASTER, contar todos
        totalAlunos = await this.alunoRepository.count({
          where: { status: StatusAluno.ATIVO },
        });
      }

      // Total de professores (usando a tabela professor_unidades)
      let totalProfessores = 0;

      if (unidadeId) {
        // Contar professores vinculados a uma unidade específica
        const result = await this.dataSource.query(
          `
          SELECT COUNT(DISTINCT pu.professor_id) as total
          FROM teamcruz.professor_unidades pu
          WHERE pu.unidade_id = $1
            AND pu.ativo = true
        `,
          [unidadeId],
        );
        totalProfessores = parseInt(result[0]?.total || '0');
      } else if (isFranqueado && unidadesDoFranqueado.length > 0) {
        // Contar professores vinculados às unidades do franqueado
        const result = await this.dataSource.query(
          `
          SELECT COUNT(DISTINCT pu.professor_id) as total
          FROM teamcruz.professor_unidades pu
          WHERE pu.unidade_id = ANY($1::uuid[])
            AND pu.ativo = true
        `,
          [unidadesDoFranqueado],
        );
        totalProfessores = parseInt(result[0]?.total || '0');
      } else if (isGerenteUnidade && unidadesDoFranqueado.length > 0) {
        // Contar professores vinculados às unidades do gerente
        const result = await this.dataSource.query(
          `
          SELECT COUNT(DISTINCT pu.professor_id) as total
          FROM teamcruz.professor_unidades pu
          WHERE pu.unidade_id = ANY($1::uuid[])
            AND pu.ativo = true
        `,
          [unidadesDoFranqueado],
        );
        totalProfessores = parseInt(result[0]?.total || '0');
      } else if (isMaster) {
        // Master vê todos os professores cadastrados
        totalProfessores = await this.personRepository.count({
          where: { tipo_cadastro: TipoCadastro.PROFESSOR },
        });
      }

      // Total de unidades - filtrado por franquia
      let totalUnidades = 0;

      if (isFranqueado && unidadesDoFranqueado.length > 0) {
        totalUnidades = unidadesDoFranqueado.length;
      } else if (isGerenteUnidade && unidadesDoFranqueado.length > 0) {
        totalUnidades = unidadesDoFranqueado.length;
      } else if (isMaster) {
        totalUnidades = await this.unidadeRepository.count();
      }

      // Total de franqueados (apenas MASTER vê todos)
      const totalFranqueados = isMaster
        ? await this.franqueadoRepository.count()
        : 0;

      // Estatísticas detalhadas de alunos
      let alunosAtivos = 0;
      let alunosInativos = 0;
      let novosEsteMes = 0;
      let taxaRetencao = 0;

      // Buscar todos os alunos com base no filtro (unidade/franquia)
      let todosAlunos: Aluno[] = [];

      if (unidadeId) {
        todosAlunos = await this.alunoRepository.find({
          where: { unidade_id: unidadeId },
        });
      } else if (isFranqueado && unidadesDoFranqueado.length > 0) {
        todosAlunos = await this.alunoRepository.find({
          where: { unidade_id: In(unidadesDoFranqueado) },
        });
      } else if (isGerenteUnidade && unidadesDoFranqueado.length > 0) {
        todosAlunos = await this.alunoRepository.find({
          where: { unidade_id: In(unidadesDoFranqueado) },
        });
      } else if (isMaster) {
        todosAlunos = await this.alunoRepository.find();
      }

      // Calcular estatísticas
      alunosAtivos = todosAlunos.filter(
        (a) => a.status === StatusAluno.ATIVO,
      ).length;
      alunosInativos = todosAlunos.filter(
        (a) => a.status !== StatusAluno.ATIVO,
      ).length;

      // Novos este mês
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      novosEsteMes = todosAlunos.filter((a) => {
        if (!a.data_matricula) return false;
        const dtMatricula = new Date(a.data_matricula);
        return (
          dtMatricula.getMonth() === mesAtual &&
          dtMatricula.getFullYear() === anoAtual
        );
      }).length;

      // Taxa de retenção (alunos com mais de 3 meses que ainda estão ativos)
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

      const alunosElegiveis = todosAlunos.filter((a) => {
        if (!a.data_matricula) return false;
        const dtMatricula = new Date(a.data_matricula);
        return dtMatricula <= tresMesesAtras;
      }).length;

      const alunosRetidos = todosAlunos.filter((a) => {
        if (!a.data_matricula) return false;
        const dtMatricula = new Date(a.data_matricula);
        return dtMatricula <= tresMesesAtras && a.status === StatusAluno.ATIVO;
      }).length;

      if (alunosElegiveis > 0) {
        taxaRetencao = Math.round((alunosRetidos / alunosElegiveis) * 100);
      } else {
        // Se não há alunos com mais de 3 meses, calcular taxa com base nos ativos atuais
        const totalTodos = todosAlunos.length;
        if (totalTodos > 0) {
          taxaRetencao = Math.round((alunosAtivos / totalTodos) * 100);
        }
      }

      // Buscar estatísticas complementares
      const aulasHoje = await this.getAulasHoje(unidadeId, unidadesDoFranqueado);
      const proximosGraduaveis = await this.getProximosGraduaveis(unidadeId, unidadesDoFranqueado);
      const presencasHoje = await this.getPresencasHoje(unidadeId, unidadesDoFranqueado);

      console.log('📊 [DASHBOARD STATS]', {
        userId,
        unidadeId,
        isFranqueado,
        unidadesDoFranqueado,
        totalAlunos,
        aulasHoje,
        proximosGraduaveis,
        presencasHoje,
      });

      const stats = {
        totalUsuarios,
        usuariosPendentes,
        totalFranqueados,
        totalAlunos,
        alunosAtivos,
        alunosInativos,
        novosEsteMes,
        taxaRetencao,
        totalProfessores,
        totalUnidades,
        aulasHoje,
        proximosGraduaveis,
        presencasHoje,
      };
      return stats;
    } catch (error) {
      console.error(' Erro ao carregar estatísticas:', error);
      return {
        totalUsuarios: 0,
        usuariosPendentes: 0,
        totalFranqueados: 0,
        totalAlunos: 0,
        totalProfessores: 0,
        totalUnidades: 0,
        aulasHoje: 0,
        proximosGraduaveis: 0,
        presencasHoje: 0,
      };
    }
  }

  private async getAulasHoje(unidadeId?: string, unidadesDoFranqueado?: string[]): Promise<number> {
    try {
      const hoje = new Date();
      const diaSemanaHoje = hoje.getDay();

      let query = `
        SELECT COUNT(*) as total
        FROM teamcruz.aulas
        WHERE ativo = true
          AND dia_semana = $1
      `;

      const params: any[] = [diaSemanaHoje];

      if (unidadeId) {
        query += ` AND unidade_id = $2`;
        params.push(unidadeId);
      } else if (unidadesDoFranqueado && unidadesDoFranqueado.length > 0) {
        query += ` AND unidade_id = ANY($2::uuid[])`;
        params.push(unidadesDoFranqueado);
      }

      console.log('📅 [AULAS HOJE]', { diaSemanaHoje, unidadeId, unidadesDoFranqueado, query, params });

      const result = await this.dataSource.query(query, params);
      const total = parseInt(result[0]?.total || '0');
      
      console.log('✅ [AULAS HOJE] Total:', total);
      return total;
    } catch (error) {
      console.error('❌ [AULAS HOJE] Erro:', error);
      return 0;
    }
  }

  private async getPresencasHoje(unidadeId?: string, unidadesDoFranqueado?: string[]): Promise<number> {
    try {
      const hoje = new Date();
      const hojeStr = hoje.toISOString().split('T')[0];

      let query = `
        SELECT COUNT(*) as total
        FROM teamcruz.presencas p
        INNER JOIN teamcruz.aulas a ON p.aula_id = a.id
        WHERE p.status = 'presente'
          AND DATE(p.hora_checkin) = $1
      `;

      const params: any[] = [hojeStr];

      if (unidadeId) {
        query += ` AND a.unidade_id = $2`;
        params.push(unidadeId);
      } else if (unidadesDoFranqueado && unidadesDoFranqueado.length > 0) {
        query += ` AND a.unidade_id = ANY($2::uuid[])`;
        params.push(unidadesDoFranqueado);
      }

      console.log('✅ [PRESENÇAS HOJE]', { hojeStr, unidadeId, unidadesDoFranqueado });

      const result = await this.dataSource.query(query, params);
      const total = parseInt(result[0]?.total || '0');
      
      console.log('✅ [PRESENÇAS HOJE] Total:', total);
      return total;
    } catch (error) {
      console.error('❌ [PRESENÇAS HOJE] Erro:', error);
      return 0;
    }
  }

  private async getProximosGraduaveis(unidadeId?: string, unidadesDoFranqueado?: string[]): Promise<number> {
    try {
      // Buscar alunos próximos a completar requisitos de graduação
      let query = `
        SELECT COUNT(*) as total
        FROM teamcruz.alunos a
        INNER JOIN teamcruz.aluno_faixa fa ON a.id = fa.aluno_id
        WHERE a.status = 'ATIVO'
          AND fa.ativa = true
      `;

      const params: any[] = [];

      if (unidadeId) {
        query += ` AND a.unidade_id = $1`;
        params.push(unidadeId);
      } else if (unidadesDoFranqueado && unidadesDoFranqueado.length > 0) {
        query += ` AND a.unidade_id = ANY($1::uuid[])`;
        params.push(unidadesDoFranqueado);
      }

      const result = await this.dataSource.query(query, params);
      const total = parseInt(result[0]?.total || '0');
      
      console.log('🎓 [PRÓXIMOS GRADUÁVEIS] Total:', total);
      return total;
    } catch (error) {
      console.error('❌ [PRÓXIMOS GRADUÁVEIS] Erro:', error);
      return 0;
    }
  }
}
