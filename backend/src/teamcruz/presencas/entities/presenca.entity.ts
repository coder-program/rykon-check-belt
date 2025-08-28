import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Aluno } from '../../alunos/entities/aluno.entity';

@Entity()
export class Presenca {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  data: Date;

  @ManyToOne(() => Aluno, aluno => aluno.presencas)
  aluno: Aluno;
}
