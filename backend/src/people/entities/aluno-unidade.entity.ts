import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Aluno } from './aluno.entity';
import { Unidade } from './unidade.entity';

@Entity({ schema: 'teamcruz', name: 'aluno_unidades' })
export class AlunoUnidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({
    type: 'date',
    default: () => 'CURRENT_DATE',
    comment: 'Data de matrícula do aluno nesta unidade',
  })
  data_matricula: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Define se é a unidade principal/primária do aluno',
  })
  is_principal: boolean;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Aluno, (aluno) => aluno.alunoUnidades, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => Unidade, { eager: true })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;
}

// DTO para criar relacionamento aluno-unidade
export class CreateAlunoUnidadeDto {
  aluno_id: string;
  unidade_id: string;
  data_matricula?: Date;
  is_principal?: boolean;
  ativo?: boolean;
  observacoes?: string;
}

// DTO para atualizar relacionamento aluno-unidade
export class UpdateAlunoUnidadeDto {
  data_matricula?: Date;
  is_principal?: boolean;
  ativo?: boolean;
  observacoes?: string;
}
