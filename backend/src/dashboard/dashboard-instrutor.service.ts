import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Person, TipoCadastro } from '../people/entities/person.entity';
import { Aula } from '../presenca/entities/aula.entity';
import { Presenca } from '../presenca/entities/presenca.entity';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

// Configurar dayjs com plugins de timezone
dayjs.extend(utc);
dayjs.extend(timezone);

export interface InstrutorDashboardStats {
  meusAlunos: number;
  aulasSemana: number;
  graduacoesPendentes: number;
  novasInscricoes: number;
  presencaMedia: number;
  proximasAulas: number;
  alunosAtivos: number;
  avaliacoesPendentes: number;
}

export interface ProximaAula {
  id: string;
  horario: string;
  tipo: string;
  alunos: number;
  local: string;
  data: Date;
}

export interface AlunoDestaque {
  id: string;
  nome: string;
  faixa: string;
  presencas: number;
  proximaGraduacao: boolean;
  ultimaPresenca: Date;
}

@Injectable()
export class DashboardInstrutorService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Aula)
    private readonly aulaRepository: Repository<Aula>,
    @InjectRepository(Presenca)
    private readonly presencaRepository: Repository<Presenca>,
  ) {}

  async getInstrutorStats(
    usuarioId: string,
  ): Promise<InstrutorDashboardStats> {
    
    // Buscar o professor pelo usuario_id
    const professor = await this.personRepository.findOne({
      where: {
        usuario_id: usuarioId,
        tipo_cadastro: TipoCadastro.PROFESSOR,
      },
    });

    if (!professor) {
      console.error('❌ [INSTRUTOR STATS] Professor não encontrado para usuário:', usuarioId);
      throw new NotFoundException('Professor não encontrado');
    }

    const professorId = professor.id;

    // Buscar aulas do professor
    const aulasProfessor = await this.aulaRepository.find({
      where: { professor_id: professorId },
      relations: ['unidade', 'professor'],
    });

    const aulasIds = aulasProfessor.map((aula) => aula.id);

    // Se não tem aulas, retorna stats zeradas
    if (aulasIds.length === 0) {
      console.warn('⚠️ [INSTRUTOR STATS] Professor sem aulas cadastradas');
      return {
        meusAlunos: 0,
        aulasSemana: 0,
        graduacoesPendentes: 0,
        novasInscricoes: 0,
        presencaMedia: 0,
        proximasAulas: 0,
        alunosAtivos: 0,
        avaliacoesPendentes: 0,
      };
    }

    // Buscar presenças das aulas do professor
    const presencas = await this.presencaRepository.find({
      where: {
        aula_id: In(aulasIds),
      },
      relations: ['aluno'],
    });

    // Alunos únicos do professor
    const alunosUnicos = new Set();
    presencas.forEach((presenca) => {
      if (presenca.aluno) {
        alunosUnicos.add(presenca.aluno.id);
      }
    });

    // Aulas desta semana
    const hoje = dayjs().tz('America/Sao_Paulo');
    const inicioSemana = hoje.startOf('week').toDate();
    const fimSemana = hoje.endOf('week').toDate();

    const aulasSemana = aulasProfessor.filter((aula) => {
      if (!aula.data_hora_inicio) return false;
      const dataAula = new Date(aula.data_hora_inicio);
      return dataAula >= inicioSemana && dataAula <= fimSemana;
    });

    // Próximas aulas (hoje)
    const hojeDate = dayjs().tz('America/Sao_Paulo');
    const hojeStr = hojeDate.format('YYYY-MM-DD');
    
    const proximasAulas = aulasProfessor.filter((aula) => {
      if (!aula.data_hora_inicio) {
        return false;
      }
      const dataAula = dayjs(aula.data_hora_inicio).tz('America/Sao_Paulo');
      const dataAulaStr = dataAula.format('YYYY-MM-DD');
      const isToday = dataAulaStr === hojeStr;
      return isToday;
    });

    // Calcular presença média
    let totalPresencas = 0;
    let totalAulasComPresenca = 0;

    aulasProfessor.forEach((aula) => {
      const presencasAula = presencas.filter((p) => p.aula_id === aula.id);
      if (presencasAula.length > 0) {
        const presentes = presencasAula.filter(
          (p) => p.status === 'presente',
        ).length;
        const totalAula = presencasAula.length;
        if (totalAula > 0) {
          totalPresencas += (presentes / totalAula) * 100;
          totalAulasComPresenca++;
        }
      }
    });

    const presencaMedia =
      totalAulasComPresenca > 0
        ? Math.round(totalPresencas / totalAulasComPresenca)
        : 0;

    // Alunos ativos (com presença nos últimos 30 dias)
    const dataLimite = dayjs().tz('America/Sao_Paulo').subtract(30, 'day').toDate();

    // Buscar aulas do professor nos últimos 30 dias
    const aulasRecentes = aulasProfessor.filter((aula) => {
      if (!aula.data_hora_inicio) return false;
      return dayjs(aula.data_hora_inicio).tz('America/Sao_Paulo').toDate() >= dataLimite;
    });

    const aulasRecentesIds = aulasRecentes.map((aula) => aula.id);

    let presencasRecentes: Presenca[] = [];
    if (aulasRecentesIds.length > 0) {
      presencasRecentes = await this.presencaRepository.find({
        where: {
          status: 'presente',
          aula_id: In(aulasRecentesIds),
        },
        relations: ['aluno'],
      });
    }

    const alunosAtivos = new Set(
      presencasRecentes.map((p) => p.aluno?.id).filter((id) => id),
    ).size;

    const stats = {
      meusAlunos: alunosUnicos.size,
      aulasSemana: aulasSemana.length,
      graduacoesPendentes: 0,
      novasInscricoes: 0,
      presencaMedia,
      proximasAulas: proximasAulas.length,
      alunosAtivos,
      avaliacoesPendentes: 0,
    };

    return stats;
  }

  async getProximasAulas(usuarioId: string): Promise<ProximaAula[]> {
    try {
      // Buscar o professor pelo usuario_id
      const professor = await this.personRepository.findOne({
        where: {
          usuario_id: usuarioId,
          tipo_cadastro: TipoCadastro.PROFESSOR,
        },
      });

      if (!professor) {
        throw new NotFoundException('Professor não encontrado');
      }

      const professorId = professor.id;

      // Pegar dia da semana atual (0 = domingo, 1 = segunda, ..., 6 = sábado)
      const diaSemanaHoje = new Date().getDay();
      // Buscar aulas do dia da semana (aulas recorrentes)
      const aulas = await this.aulaRepository.find({
        where: {
          professor_id: professorId,
          dia_semana: diaSemanaHoje,
          ativo: true,
        },
        relations: ['unidade'],
        order: { data_hora_inicio: 'ASC' },
        take: 3,
      });
      
      // Para cada aula, buscar número de alunos inscritos
      const aulasComAlunos = await Promise.all(
        aulas.map(async (aula) => {
          const numAlunos = await this.presencaRepository.count({
            where: { aula_id: aula.id },
          });

          // Extrair horário da data_hora_inicio e data_hora_fim usando dayjs com timezone
          const horaInicio = aula.data_hora_inicio 
            ? dayjs(aula.data_hora_inicio).tz('America/Sao_Paulo').format('HH:mm')
            : '00:00';
          const horaFim = aula.data_hora_fim 
            ? dayjs(aula.data_hora_fim).tz('America/Sao_Paulo').format('HH:mm')
            : '00:00';

          return {
            id: aula.id,
            horario: `${horaInicio} - ${horaFim}`,
            tipo: aula.tipo || 'Jiu-Jitsu',
            alunos: numAlunos,
            local: aula.unidade?.nome || 'Tatame Principal',
            data: dayjs().tz('America/Sao_Paulo').toDate(), // Data de hoje
          };
        }),
      );

      return aulasComAlunos;
    } catch (error) {
      console.error('❌❌❌ [PRÓXIMAS AULAS] ERRO:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  async getAlunosDestaque(usuarioId: string): Promise<AlunoDestaque[]> {
    // Buscar o professor pelo usuario_id
    const professor = await this.personRepository.findOne({
      where: {
        usuario_id: usuarioId,
        tipo_cadastro: TipoCadastro.PROFESSOR,
      },
    });

    if (!professor) {
      throw new NotFoundException('Professor não encontrado');
    }

    const professorId = professor.id;

    // Buscar aulas do professor
    const aulasProfessor = await this.aulaRepository.find({
      where: { professor_id: professorId },
    });

    const aulasIds = aulasProfessor.map((aula) => aula.id);

    // Se não tem aulas, retorna array vazio
    if (aulasIds.length === 0) {
      return [];
    }

    // Buscar presenças dos alunos nessas aulas
    const presencasAlunos = await this.presencaRepository.find({
      where: {
        aula_id: In(aulasIds),
        status: 'presente',
      },
      relations: ['aluno'],
    });

    const alunosMap = new Map();

    presencasAlunos.forEach((presenca) => {
      if (presenca.aluno) {
        const alunoId = presenca.aluno.id;
        if (!alunosMap.has(alunoId)) {
          alunosMap.set(alunoId, {
            aluno: presenca.aluno,
            presencas: 0,
            ultimaPresenca: presenca.created_at,
          });
        }

        const dados = alunosMap.get(alunoId);
        dados.presencas++;

        if (dayjs(presenca.created_at).tz('America/Sao_Paulo').isAfter(dayjs(dados.ultimaPresenca).tz('America/Sao_Paulo'))) {
          dados.ultimaPresenca = presenca.created_at;
        }
      }
    });

    // Ordenar por presença e pegar os top 5
    const alunosArray = Array.from(alunosMap.values())
      .sort((a, b) => b.presencas - a.presencas)
      .slice(0, 5);

    return alunosArray.map((item) => ({
      id: item.aluno.id,
      nome: item.aluno.nome_completo,
      faixa: item.aluno.faixa_atual || 'Branca',
      presencas: item.presencas,
      proximaGraduacao: item.presencas >= 20, // Lógica simples
      ultimaPresenca: item.ultimaPresenca,
    }));
  }

  async getMeusProfessores(unidadeId?: string): Promise<Person[]> {
    const where: any = { tipo_cadastro: TipoCadastro.PROFESSOR };

    if (unidadeId) {
      where.unidade_id = unidadeId;
    }

    return this.personRepository.find({
      where,
      relations: ['unidade'],
      order: { nome_completo: 'ASC' },
    });
  }
}
