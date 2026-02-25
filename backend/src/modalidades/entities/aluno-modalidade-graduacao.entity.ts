import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { Modalidade } from './modalidade.entity';
import { ModalidadeNivel } from './modalidade-nivel.entity';

/**
 * Graduação atual do aluno em uma modalidade específica.
 * Cada aluno matriculado em uma modalidade com tipo_graduacao != NENHUM
 * tem um registro ativo aqui.
 */
@Entity({ name: 'aluno_modalidade_graduacao', schema: 'teamcruz' })
export class AlunoModalidadeGraduacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @Column({ type: 'uuid' })
  modalidade_id: string;

  @Column({ type: 'uuid', nullable: true })
  nivel_id: string | null; // Nível atual (de modalidade_niveis)

  @Column({ type: 'int', default: 0 })
  graus: number; // Graus/stripes dentro do nível atual (0-4)

  @Column({ type: 'timestamp', nullable: true })
  dt_ultima_graduacao: Date | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @ManyToOne(() => Aluno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => Modalidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade: Modalidade;

  @ManyToOne(() => ModalidadeNivel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nivel_id' })
  nivel: ModalidadeNivel | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
