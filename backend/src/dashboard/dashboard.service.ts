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

      const stats = {
        totalUsuarios,
        usuariosPendentes,
        totalFranqueados,
        totalAlunos,
        totalProfessores,
        totalUnidades,
        aulasHoje: 0, // TODO: implementar
        proximosGraduaveis: 0, // TODO: implementar
        presencasHoje: 0, // TODO: implementar
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
}
