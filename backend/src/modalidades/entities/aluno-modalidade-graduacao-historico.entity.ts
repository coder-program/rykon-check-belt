import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { Modalidade } from './modalidade.entity';
import { ModalidadeNivel } from './modalidade-nivel.entity';

export enum OrigemGraduacaoModalidade {
  MANUAL = 'MANUAL',
  CERIMONIA = 'CERIMONIA',
  SISTEMA = 'SISTEMA',
}

/**
 * Histórico de graduações do aluno em modalidades não-BJJ.
 * Cada promoção registrada gera uma entrada aqui.
 */
@Entity({ name: 'aluno_modalidade_graduacao_historico', schema: 'teamcruz' })
export class AlunoModalidadeGraduacaoHistorico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @Column({ type: 'uuid' })
  modalidade_id: string;

  @Column({ type: 'uuid', nullable: true })
  nivel_anterior_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  nivel_novo_id: string | null;

  @Column({ type: 'int', default: 0 })
  graus_anterior: number;

  @Column({ type: 'int', default: 0 })
  graus_novo: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dt_graduacao: Date;

  @Column({
    type: 'enum',
    enum: OrigemGraduacaoModalidade,
    default: OrigemGraduacaoModalidade.MANUAL,
  })
  origem: OrigemGraduacaoModalidade;

  @Column({ type: 'uuid', nullable: true })
  graduado_por_id: string | null; // ID do usuário que realizou a graduação

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @ManyToOne(() => Aluno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => Modalidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade: Modalidade;

  @ManyToOne(() => ModalidadeNivel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nivel_anterior_id' })
  nivelAnterior: ModalidadeNivel | null;

  @ManyToOne(() => ModalidadeNivel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nivel_novo_id' })
  nivelNovo: ModalidadeNivel | null;

  @CreateDateColumn()
  created_at: Date;
}
