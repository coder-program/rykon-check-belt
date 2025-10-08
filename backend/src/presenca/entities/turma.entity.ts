import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';
import { Person } from '../../people/entities/person.entity';

@Entity({ name: 'turmas', schema: 'teamcruz' })
@Index(['unidade_id'])
@Index(['professor_id'])
@Index(['ativo'])
export class Turma {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'varchar', length: 20 })
  tipo_turma: string;

  @Column({ type: 'uuid', nullable: true })
  professor_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  unidade_id: string | null;

  @Column({ type: 'int', default: 30 })
  capacidade: number;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nivel: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Person, { eager: false })
  @JoinColumn({ name: 'professor_id' })
  professor: Person;
}
