import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Aluno } from '../../alunos/entities/aluno.entity';

@Entity()
export class HistoricoFaixa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  faixa: string;

  @Column()
  data: Date;

  @ManyToOne(() => Aluno, aluno => aluno.historicoFaixas)
  aluno: Aluno;
}
