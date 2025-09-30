import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person, TipoCadastro } from '../people/entities/person.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { Presenca } from '../presenca/entities/presenca.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(AlunoFaixa)
    private alunoFaixaRepository: Repository<AlunoFaixa>,
    @InjectRepository(Presenca)
    private presencaRepository: Repository<Presenca>,
  ) {}

  async getStats() {
    // Total de alunos
    const totalAlunos = await this.personRepository.count({
      where: { tipo_cadastro: TipoCadastro.ALUNO },
    });

    // Aulas hoje (baseado em presenças hoje)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const aulasHoje = await this.presencaRepository
      .createQueryBuilder('p')
      .where('p.data_presenca >= :hoje', { hoje })
      .andWhere('p.data_presenca < :amanha', { amanha })
      .getCount();

    // Próximos graduáveis (alunos com faixa ativa que completaram as aulas necessárias)
    const proximosGraduaveis = await this.alunoFaixaRepository
      .createQueryBuilder('af')
      .innerJoin('af.faixaDef', 'fd')
      .where('af.ativa = true')
      .andWhere('af.presencas_no_ciclo >= fd.aulas_por_grau')
      .getCount();

    // Presenças hoje
    const presencasHoje = await this.presencaRepository.count({
      where: {
        dataPresenca: hoje,
      },
    });

    return {
      totalAlunos,
      aulaHoje: aulasHoje,
      proximosGraduaveis,
      presencasHoje,
    };
  }
}
