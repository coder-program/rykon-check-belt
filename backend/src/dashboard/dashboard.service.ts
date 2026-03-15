import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { tenantAsyncStorage } from '../common/tenant-context';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async getStats(userId: string, unidadeId?: string, schema?: string) {
    schema = schema || tenantAsyncStorage.getStore()?.schema || 'teamcruz';
    console.log(`[DashboardService.getStats] schema=${schema} userId=${userId}`);

    try {
      // Buscar perfis do usuário APENAS no schema do tenant — sem cruzamento entre tenants
      const perfisRows = await this.dataSource.query(
        `SELECT p.nome
         FROM "${schema}".perfis p
         INNER JOIN "${schema}".usuario_perfis up ON p.id = up.perfil_id
         WHERE up.usuario_id = $1`,
        [userId],
      );

      const usuarioRows = await this.dataSource.query(
        `SELECT id FROM "${schema}".usuarios WHERE id = $1`,
        [userId],
      );

      if (!usuarioRows || usuarioRows.length === 0) {
        throw new Error('Usuário não encontrado no tenant');
      }

      const perfis = perfisRows.map((p: any) => p.nome?.toUpperCase());
      const isFranqueado = perfis.includes('FRANQUEADO');
      const isMaster = perfis.includes('MASTER') || perfis.includes('SUPER_ADMIN');
      const isGerenteUnidade = perfis.includes('GERENTE_UNIDADE') && !isMaster;

      let unidadesDoFranqueado: string[] = [];

      // Se for FRANQUEADO, buscar suas unidades
      if (isFranqueado && !isMaster) {
        const franqueadoRows = await this.dataSource.query(
          `SELECT id FROM "${schema}".franqueados WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
          [userId],
        );
        const franqueadoId = franqueadoRows[0]?.id ?? null;

        if (franqueadoId) {
          const unidades = await this.dataSource.query(
            `SELECT id FROM "${schema}".unidades WHERE franqueado_id = $1`,
            [franqueadoId],
          );
          if (unidades && unidades.length > 0) {
            unidadesDoFranqueado = unidades.map((u: { id: string }) => u.id);
          }
        } else {
          const emailRows = await this.dataSource.query(
            `SELECT f.id FROM "${schema}".franqueados f
             INNER JOIN "${schema}".usuarios u ON u.email = f.email
             WHERE u.id = $1 AND f.ativo = true LIMIT 1`,
            [userId],
          );
          const franqueadoIdEmail = emailRows[0]?.id ?? null;
          if (franqueadoIdEmail) {
            await this.dataSource.query(
              `UPDATE "${schema}".franqueados SET usuario_id = $1 WHERE id = $2`,
              [userId, franqueadoIdEmail],
            );
            const unidades = await this.dataSource.query(
              `SELECT id FROM "${schema}".unidades WHERE franqueado_id = $1`,
              [franqueadoIdEmail],
            );
            if (unidades && unidades.length > 0) {
              unidadesDoFranqueado = unidades.map((u: { id: string }) => u.id);
            }
          }
        }
      }

      // Se for GERENTE_UNIDADE, buscar unidades que ele gerencia
      if (isGerenteUnidade && !isMaster && !isFranqueado) {
        const unidadesGerente = await this.dataSource.query(
          `SELECT unidade_id as id FROM "${schema}".gerente_unidades WHERE usuario_id = $1 AND ativo = true`,
          [userId],
        );
        if (unidadesGerente && unidadesGerente.length > 0) {
          unidadesDoFranqueado = unidadesGerente.map((u: any) => u.id);
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

      // Usuários pendentes
      const pendentesResult = await this.dataSource.query(
        `SELECT COUNT(*) as total FROM "${schema}".usuarios WHERE ativo = false AND cadastro_completo = true`,
      );
      const usuariosPendentes = parseInt(pendentesResult[0]?.total || '0');

      // Total de usuários
      const totalUsuariosResult = await this.dataSource.query(
        `SELECT COUNT(*) as total FROM "${schema}".usuarios`,
      );
      const totalUsuarios = parseInt(totalUsuariosResult[0]?.total || '0');

      // Total de alunos - filtrado por franquia/unidade
      let totalAlunos = 0;
      if (unidadeId) {
        const r = await this.dataSource.query(
          `SELECT COUNT(*) as total FROM "${schema}".alunos WHERE status = 'ATIVO' AND unidade_id = $1`,
          [unidadeId],
        );
        totalAlunos = parseInt(r[0]?.total || '0');
      } else if ((isFranqueado || isGerenteUnidade) && unidadesDoFranqueado.length > 0) {
        const r = await this.dataSource.query(
          `SELECT COUNT(*) as total FROM "${schema}".alunos WHERE status = 'ATIVO' AND unidade_id = ANY($1::uuid[])`,
          [unidadesDoFranqueado],
        );
        totalAlunos = parseInt(r[0]?.total || '0');
      } else if (isMaster) {
        const r = await this.dataSource.query(
          `SELECT COUNT(*) as total FROM "${schema}".alunos WHERE status = 'ATIVO'`,
        );
        totalAlunos = parseInt(r[0]?.total || '0');
      }

      // Total de professores
      let totalProfessores = 0;
      if (unidadeId) {
        const result = await this.dataSource.query(
          `SELECT COUNT(DISTINCT pu.professor_id) as total
           FROM "${schema}".professor_unidades pu
           WHERE pu.unidade_id = $1 AND pu.ativo = true`,
          [unidadeId],
        );
        totalProfessores = parseInt(result[0]?.total || '0');
      } else if ((isFranqueado || isGerenteUnidade) && unidadesDoFranqueado.length > 0) {
        const result = await this.dataSource.query(
          `SELECT COUNT(DISTINCT pu.professor_id) as total
           FROM "${schema}".professor_unidades pu
           WHERE pu.unidade_id = ANY($1::uuid[]) AND pu.ativo = true`,
          [unidadesDoFranqueado],
        );
        totalProfessores = parseInt(result[0]?.total || '0');
      } else if (isMaster) {
        const result = await this.dataSource.query(
          `SELECT COUNT(*) as total FROM "${schema}".professores`,
        );
        totalProfessores = parseInt(result[0]?.total || '0');
      }

      // Total de unidades
      let totalUnidades = 0;
      if (isFranqueado && unidadesDoFranqueado.length > 0) {
        totalUnidades = unidadesDoFranqueado.length;
      } else if (isGerenteUnidade && unidadesDoFranqueado.length > 0) {
        totalUnidades = unidadesDoFranqueado.length;
      } else if (isMaster) {
        const r = await this.dataSource.query(
          `SELECT COUNT(*) as total FROM "${schema}".unidades`,
        );
        totalUnidades = parseInt(r[0]?.total || '0');
      }

      // Total de franqueados
      let totalFranqueados = 0;
      if (isMaster) {
        const r = await this.dataSource.query(
          `SELECT COUNT(*) as total FROM "${schema}".franqueados`,
        );
        totalFranqueados = parseInt(r[0]?.total || '0');
      }

      // Buscar alunos para estatísticas detalhadas
      let alunosRows: Array<{ status: string; data_matricula: string }> = [];
      if (unidadeId) {
        alunosRows = await this.dataSource.query(
          `SELECT status, data_matricula FROM "${schema}".alunos WHERE unidade_id = $1`,
          [unidadeId],
        );
      } else if ((isFranqueado || isGerenteUnidade) && unidadesDoFranqueado.length > 0) {
        alunosRows = await this.dataSource.query(
          `SELECT status, data_matricula FROM "${schema}".alunos WHERE unidade_id = ANY($1::uuid[])`,
          [unidadesDoFranqueado],
        );
      } else if (isMaster) {
        alunosRows = await this.dataSource.query(
          `SELECT status, data_matricula FROM "${schema}".alunos`,
        );
      }

      const alunosAtivos = alunosRows.filter((a) => a.status === 'ATIVO').length;
      const alunosInativos = alunosRows.filter((a) => a.status !== 'ATIVO').length;

      const agora = dayjs().tz('America/Sao_Paulo');
      const mesAtual = agora.month();
      const anoAtual = agora.year();
      const novosEsteMes = alunosRows.filter((a) => {
        if (!a.data_matricula) return false;
        const dt = dayjs(a.data_matricula).tz('America/Sao_Paulo');
        return dt.month() === mesAtual && dt.year() === anoAtual;
      }).length;

      const tresMesesAtras = dayjs().tz('America/Sao_Paulo').subtract(3, 'month').toDate();
      const alunosElegiveis = alunosRows.filter((a) => {
        if (!a.data_matricula) return false;
        return new Date(a.data_matricula) <= tresMesesAtras;
      }).length;
      const alunosRetidos = alunosRows.filter((a) => {
        if (!a.data_matricula) return false;
        return new Date(a.data_matricula) <= tresMesesAtras && a.status === 'ATIVO';
      }).length;

      let taxaRetencao = 0;
      if (alunosElegiveis > 0) {
        taxaRetencao = Math.round((alunosRetidos / alunosElegiveis) * 100);
      } else if (alunosRows.length > 0) {
        taxaRetencao = Math.round((alunosAtivos / alunosRows.length) * 100);
      }

      const aulasHoje = await this.getAulasHoje(schema, unidadeId, unidadesDoFranqueado);
      const proximosGraduaveis = await this.getProximosGraduaveis(schema, unidadeId, unidadesDoFranqueado);
      const presencasHoje = await this.getPresencasHoje(schema, unidadeId, unidadesDoFranqueado);

      return {
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

  private async getAulasHoje(schema: string, unidadeId?: string, unidadesDoFranqueado?: string[]): Promise<number> {
    try {
      const diaSemanaHoje = dayjs().tz('America/Sao_Paulo').day();

      let query = `SELECT COUNT(*) as total FROM "${schema}".aulas WHERE ativo = true AND dia_semana = $1`;
      const params: any[] = [diaSemanaHoje];

      if (unidadeId) {
        query += ` AND unidade_id = $2`;
        params.push(unidadeId);
      } else if (unidadesDoFranqueado && unidadesDoFranqueado.length > 0) {
        query += ` AND unidade_id = ANY($2::uuid[])`;
        params.push(unidadesDoFranqueado);
      }

      const result = await this.dataSource.query(query, params);
      return parseInt(result[0]?.total || '0');
    } catch (error) {
      console.error('❌ [AULAS HOJE] Erro:', error);
      return 0;
    }
  }

  private async getPresencasHoje(schema: string, unidadeId?: string, unidadesDoFranqueado?: string[]): Promise<number> {
    try {
      const hojeBrasil = dayjs().tz('America/Sao_Paulo').startOf('day');
      const hoje = hojeBrasil.utc().toDate();
      const amanha = hojeBrasil.add(1, 'day').utc().toDate();

      let query = `
        SELECT COUNT(*) as total
        FROM "${schema}".presencas p
        INNER JOIN "${schema}".aulas a ON p.aula_id = a.id
        WHERE p.status = 'presente'
          AND p.hora_checkin >= $1
          AND p.hora_checkin < $2
      `;
      const params: any[] = [hoje, amanha];

      if (unidadeId) {
        query += ` AND a.unidade_id = $3`;
        params.push(unidadeId);
      } else if (unidadesDoFranqueado && unidadesDoFranqueado.length > 0) {
        query += ` AND a.unidade_id = ANY($3::uuid[])`;
        params.push(unidadesDoFranqueado);
      }

      const result = await this.dataSource.query(query, params);
      return parseInt(result[0]?.total || '0');
    } catch (error) {
      console.error('❌ [PRESENÇAS HOJE] Erro:', error);
      return 0;
    }
  }

  private async getProximosGraduaveis(schema: string, unidadeId?: string, unidadesDoFranqueado?: string[]): Promise<number> {
    try {
      let query = `
        SELECT COUNT(*) as total
        FROM "${schema}".alunos a
        INNER JOIN "${schema}".aluno_faixa fa ON a.id = fa.aluno_id
        WHERE a.status = 'ATIVO' AND fa.ativa = true
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
      return parseInt(result[0]?.total || '0');
    } catch (error) {
      console.error('❌ [PRÓXIMOS GRADUÁVEIS] Erro:', error);
      return 0;
    }
  }
}
