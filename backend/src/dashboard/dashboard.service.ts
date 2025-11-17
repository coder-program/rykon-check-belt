import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async getStats(unidadeId?: string) {
    try {
      console.log(
        '🔥 [DASHBOARD SERVICE] getStats chamado com unidadeId:',
        unidadeId,
      );

      // Buscar usuários pendentes (inativos aguardando aprovação)
      const usuariosPendentes = await this.usuarioRepository.count({
        where: {
          ativo: false,
          cadastro_completo: true,
        },
      });

      // Total de usuários
      const totalUsuarios = await this.usuarioRepository.count();

      // Total de alunos (FILTRADO POR UNIDADE se fornecido)
      const totalAlunos = await this.alunoRepository.count({
        where: unidadeId
          ? { status: StatusAluno.ATIVO, unidade_id: unidadeId }
          : { status: StatusAluno.ATIVO },
      });
      console.log(
        '🔥 [DASHBOARD SERVICE] Total de alunos encontrados:',
        totalAlunos,
        'unidadeId:',
        unidadeId,
      );

      // Total de professores (FILTRADO POR UNIDADE se fornecido)
      const totalProfessores = await this.personRepository.count({
        where: unidadeId
          ? { tipo_cadastro: TipoCadastro.PROFESSOR, unidade_id: unidadeId }
          : { tipo_cadastro: TipoCadastro.PROFESSOR },
      });

      // Total de unidades
      const totalUnidades = await this.unidadeRepository.count();

      // Total de franqueados
      const totalFranqueados = await this.franqueadoRepository.count();

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
      console.error('❌ Erro ao carregar estatísticas:', error);
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
