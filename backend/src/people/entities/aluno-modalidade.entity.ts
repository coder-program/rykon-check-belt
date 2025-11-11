import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Aluno } from './aluno.entity';
import { Modalidade } from '../../modalidades/entities/modalidade.entity';

@Entity({ name: 'aluno_modalidades', schema: 'teamcruz' })
export class AlunoModalidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @Column({ type: 'uuid' })
  modalidade_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  data_matricula: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_praticado: number; // Valor específico (pode ter desconto)

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @ManyToOne(() => Aluno, (aluno) => aluno.alunoModalidades, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => Modalidade, (modalidade) => modalidade.alunoModalidades, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade: Modalidade;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
