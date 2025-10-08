import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { FaixaDef } from './faixa-def.entity';
import { AlunoFaixaGrau } from './aluno-faixa-grau.entity';

@Entity({ name: 'aluno_faixa', schema: 'teamcruz' })
@Index(['aluno_id', 'ativa'])
export class AlunoFaixa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @Column({ type: 'uuid' })
  faixa_def_id: string;

  @Column({ type: 'boolean', default: true })
  ativa: boolean;

  @Column({ type: 'date' })
  dt_inicio: Date;

  @Column({ type: 'date', nullable: true })
  dt_fim: Date;

  @Column({ type: 'int', default: 0 })
  graus_atual: number;

  @Column({ type: 'int', default: 0 })
  presencas_no_ciclo: number;

  @Column({ type: 'int', default: 0 })
  presencas_total_fx: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relações
  @ManyToOne(() => Aluno, (aluno) => aluno.faixas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => FaixaDef, (faixaDef) => faixaDef.alunoFaixas, {
    eager: true,
  })
  @JoinColumn({ name: 'faixa_def_id' })
  faixaDef: FaixaDef;

  @OneToMany(() => AlunoFaixaGrau, (grau) => grau.alunoFaixa)
  graus: AlunoFaixaGrau[];

  // Método helper para calcular quantas aulas faltam
  getAulasFaltantes(): number {
    if (!this.faixaDef) return 0;

    if (this.graus_atual >= this.faixaDef.graus_max) {
      return 0; // Pronto para graduar
    }

    const faltam = this.faixaDef.aulas_por_grau - this.presencas_no_ciclo;
    return Math.max(0, faltam);
  }

  // Verifica se está pronto para graduar
  isProntoParaGraduar(): boolean {
    if (!this.faixaDef) return false;

    // Verificar se tem 4 graus
    const tem4Graus = this.graus_atual >= this.faixaDef.graus_max;

    // Verificar tempo de treino na faixa
    const agora = new Date();
    const dataInicio =
      this.dt_inicio instanceof Date
        ? this.dt_inicio
        : new Date(this.dt_inicio);
    const tempoNaFaixa = agora.getTime() - dataInicio.getTime();
    const diasNaFaixa = tempoNaFaixa / (1000 * 60 * 60 * 24);

    // Faixa branca: 1 ano (365 dias), outras faixas: 2 anos (730 dias)
    const tempoMinimo = this.faixaDef.codigo === 'BRANCA' ? 365 : 730;
    const temTempoSuficiente = diasNaFaixa >= tempoMinimo;

    // Pode graduar se tem 4 graus OU tempo suficiente
    return tem4Graus || temTempoSuficiente;
  }

  // Verifica se pode receber próximo grau
  podeReceberGrau(): boolean {
    if (!this.faixaDef) return false;

    return (
      this.graus_atual < this.faixaDef.graus_max &&
      this.presencas_no_ciclo >= this.faixaDef.aulas_por_grau
    );
  }

  // Calcula o progresso para próxima graduação (considerando tempo e aulas)
  getProgressoGraduacao(): {
    aulas: number;
    tempo: number;
    prontoParaGraduar: boolean;
  } {
    if (!this.faixaDef) return { aulas: 0, tempo: 0, prontoParaGraduar: false };

    // Progresso de aulas (baseado em ter 4 graus)
    const aulasNecessarias =
      this.faixaDef.aulas_por_grau * this.faixaDef.graus_max;
    const aulasRealizadas =
      this.graus_atual * this.faixaDef.aulas_por_grau + this.presencas_no_ciclo;
    const progressoAulas = Math.min(1, aulasRealizadas / aulasNecessarias);

    // Progresso de tempo
    const agora = new Date();
    const dataInicio =
      this.dt_inicio instanceof Date
        ? this.dt_inicio
        : new Date(this.dt_inicio);
    const tempoNaFaixa = agora.getTime() - dataInicio.getTime();
    const diasNaFaixa = tempoNaFaixa / (1000 * 60 * 60 * 24);
    const tempoMinimo = this.faixaDef.codigo === 'BRANCA' ? 365 : 730;
    const progressoTempo = Math.min(1, diasNaFaixa / tempoMinimo);

    return {
      aulas: progressoAulas,
      tempo: progressoTempo,
      prontoParaGraduar: this.isProntoParaGraduar(),
    };
  }
}
