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

  @Column({ name: 'pessoa_id' })
  pessoaId: string;

  @Column({ name: 'metodo', nullable: true })
  metodo?: string;

  @Column({ name: 'detalhes', type: 'jsonb', nullable: true })
  detalhes?: any;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'pessoa_id' })
  pessoa: Person;
}
