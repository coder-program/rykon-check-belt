import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Person, TipoCadastro } from '../people/entities/person.entity';
import { Aula } from '../presenca/entities/aula.entity';
import { Presenca } from '../presenca/entities/presenca.entity';

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
    console.log('🎯 [INSTRUTOR STATS] Iniciando busca de estatísticas para usuário:', usuarioId);
    
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

    console.log('✅ [INSTRUTOR STATS] Professor encontrado:', professor.id, professor.nome_completo);
    const professorId = professor.id;

    // Buscar aulas do professor
    const aulasProfessor = await this.aulaRepository.find({
      where: { professor_id: professorId },
      relations: ['unidade', 'professor'],
    });

    console.log('📚 [INSTRUTOR STATS] Total de aulas do professor:', aulasProfessor.length);

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

    console.log('👥 [INSTRUTOR STATS] Total de presenças encontradas:', presencas.length);

    // Alunos únicos do professor
    const alunosUnicos = new Set();
    presencas.forEach((presenca) => {
      if (presenca.aluno) {
        alunosUnicos.add(presenca.aluno.id);
      }
    });

    console.log('🎓 [INSTRUTOR STATS] Alunos únicos:', alunosUnicos.size);

    // Aulas desta semana
    const hoje = new Date();
    const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

    const aulasSemana = aulasProfessor.filter((aula) => {
      if (!aula.data_hora_inicio) return false;
      const dataAula = new Date(aula.data_hora_inicio);
      return dataAula >= inicioSemana && dataAula <= fimSemana;
    });

    console.log('📅 [INSTRUTOR STATS] Aulas desta semana:', aulasSemana.length);

    // Próximas aulas (hoje)
    const hojeDate = new Date();
    const hojeStr = hojeDate.toISOString().split('T')[0];
    
    console.log('📆 [INSTRUTOR STATS] Data de hoje (ISO):', hojeStr);
    console.log('📚 [INSTRUTOR STATS] Analisando', aulasProfessor.length, 'aulas para encontrar as de hoje');
    
    const proximasAulas = aulasProfessor.filter((aula) => {
      if (!aula.data_hora_inicio) {
        console.log('⚠️ [INSTRUTOR STATS] Aula sem data_hora_inicio:', aula.id);
        return false;
      }
      const dataAula = new Date(aula.data_hora_inicio);
      const dataAulaStr = dataAula.toISOString().split('T')[0];
      const isToday = dataAulaStr === hojeStr;
      
      if (isToday) {
        console.log('✅ [INSTRUTOR STATS] Aula de hoje encontrada:', {
          id: aula.id,
          nome: aula.nome,
          data_hora_inicio: aula.data_hora_inicio,
          dataAulaStr,
        });
      }
      
      return isToday;
    });

    console.log('⏰ [INSTRUTOR STATS] Total de aulas hoje:', proximasAulas.length);

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

    console.log('📊 [INSTRUTOR STATS] Presença média:', presencaMedia + '%');

    // Alunos ativos (com presença nos últimos 30 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    // Buscar aulas do professor nos últimos 30 dias
    const aulasRecentes = aulasProfessor.filter((aula) => {
      if (!aula.data_hora_inicio) return false;
      return new Date(aula.data_hora_inicio) >= dataLimite;
    });

    console.log('🕐 [INSTRUTOR STATS] Aulas recentes (últimos 30 dias):', aulasRecentes.length);

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

    console.log('✅ [INSTRUTOR STATS] Presenças recentes:', presencasRecentes.length);

    const alunosAtivos = new Set(
      presencasRecentes.map((p) => p.aluno?.id).filter((id) => id),
    ).size;

    console.log('🏃 [INSTRUTOR STATS] Alunos ativos:', alunosAtivos);

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

    console.log('📈 [INSTRUTOR STATS] Estatísticas finais:', JSON.stringify(stats, null, 2));

    return stats;
  }

  async getProximasAulas(usuarioId: string): Promise<ProximaAula[]> {
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

    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);

    const aulas = await this.aulaRepository.find({
      where: {
        professor_id: professorId,
        data_hora_inicio: {
          $gte: hoje,
          $lte: amanha,
        } as any,
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

        return {
          id: aula.id,
          horario: `${aula.hora_inicio} - ${aula.hora_fim}`,
          tipo: aula.tipo || 'Jiu-Jitsu',
          alunos: numAlunos,
          local: aula.unidade?.nome || 'Tatame Principal',
          data: aula.data_hora_inicio || new Date(),
        };
      }),
    );

    return aulasComAlunos;
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

        if (new Date(presenca.created_at) > new Date(dados.ultimaPresenca)) {
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
