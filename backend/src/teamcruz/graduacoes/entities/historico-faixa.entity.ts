import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
// import { Aluno } from '../../alunos/entities/aluno.entity';

@Entity()
export class HistoricoFaixa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  faixa: string;

  @Column()
  data: Date;

  // TODO: Ativar relacionamento quando GraduacoesModule for criado
  // @ManyToOne(() => Aluno, (aluno) => aluno.historicoFaixas)
  // aluno: Aluno;
}
