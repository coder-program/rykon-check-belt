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
    return this.graus_atual >= this.faixaDef.graus_max;
  }

  // Verifica se pode receber próximo grau
  podeReceberGrau(): boolean {
    if (!this.faixaDef) return false;

    return (
      this.graus_atual < this.faixaDef.graus_max &&
      this.presencas_no_ciclo >= this.faixaDef.aulas_por_grau
    );
  }
}
