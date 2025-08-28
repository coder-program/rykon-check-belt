import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Aluno } from '../../alunos/entities/aluno.entity';

@Entity()
export class Unidade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @OneToMany(() => Aluno, (aluno) => aluno.unidade)
  alunos: Aluno[];
}
