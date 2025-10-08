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
    console.log('📊 Carregando estatísticas reais do dashboard...');

    try {
      // Buscar usuários pendentes (inativos aguardando aprovação)
      const usuariosPendentes = await this.usuarioRepository.count({
        where: {
          ativo: false,
          cadastro_completo: true,
        },
      });

      // Total de usuários
      const totalUsuarios = await this.usuarioRepository.count();

      // Total de alunos (da tabela alunos específica)
      const totalAlunos = await this.alunoRepository.count({
        where: { status: StatusAluno.ATIVO },
      });

      // Total de professores
      const totalProfessores = await this.personRepository.count({
        where: { tipo_cadastro: TipoCadastro.PROFESSOR },
      }); // Total de unidades
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

      console.log('✅ Estatísticas carregadas:', stats);
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
