import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Person } from '../../../people/entities/person.entity';

@Entity({ name: 'presencas', schema: 'teamcruz' })
export class Presenca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  data: Date;

  @Column({ name: 'aluno_id' })
  aluno_id: string;

  @Column({ name: 'modo_registro', nullable: true })
  modo_registro?: string;

  @Column({ name: 'observacoes', type: 'text', nullable: true })
  observacoes?: string;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'aluno_id' })
  aluno: Person;
}
