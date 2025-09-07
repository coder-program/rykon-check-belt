import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
// import { Faixa } from '../../faixas/entities/faixa.entity';
// import { Aluno } from '../../alunos/entities/aluno.entity';

@Entity()
export class HistoricoGrau {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  grau: string;

  @Column()
  data: Date;

  // TODO: Ativar relacionamentos quando GraduacoesModule for criado
  // @ManyToOne(() => Aluno, (aluno) => aluno.historicoGraus)
  // aluno: Aluno;

  // @ManyToOne(() => Faixa, (faixa) => faixa.historicoGraus)
  // faixa: Faixa;
}
