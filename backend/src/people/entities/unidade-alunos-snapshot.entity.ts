import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * Snapshot periódico consolidado de alunos/uso por unidade.
 * Alimenta dashboards históricos e análise de expansão da Fase 3.
 */
@Entity({ name: 'unidade_alunos_snapshot' })
@Index('idx_uas_unidade_data', ['unidade_id', 'data_referencia'])
@Index('idx_uas_franqueado', ['franqueado_id'])
export class UnidadeAlunosSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Vínculos ─────────────────────────────────────────────────
  @Column({ type: 'uuid' })
  unidade_id!: string;

  @Column({ type: 'uuid', nullable: true })
  franqueado_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  contrato_id!: string | null;

  // ── Referência temporal ───────────────────────────────────────
  @Column({ type: 'date' })
  data_referencia!: string; // e.g. "2026-03-01"

  @Column({ type: 'varchar', length: 7, nullable: true }) // e.g. "2026-03"
  competencia!: string | null;

  // ── Contagens ────────────────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  total_alunos!: number;

  @Column({ type: 'int', default: 0 })
  total_alunos_ativos!: number;

  @Column({ type: 'int', default: 0 })
  total_alunos_inativos!: number;

  @Column({ type: 'int', default: 0 })
  total_professores!: number;

  @Column({ type: 'int', default: 0 })
  total_checkins_mes!: number;

  // ── Expectativa vs. real ──────────────────────────────────────
  @Column({ type: 'int', nullable: true })
  usuarios_esperados!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentual_ocupacao!: number | null; // (ativos / esperados) * 100

  // ── Valor associado ───────────────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  receita_estimativa!: number | null;

  // ── Origem do snapshot ────────────────────────────────────────
  @Column({ type: 'varchar', length: 20, nullable: true, default: 'AUTOMATICO' })
  origem!: string | null; // AUTOMATICO | MANUAL

  @Column({ type: 'text', nullable: true })
  observacao!: string | null;

  // ── Audit ─────────────────────────────────────────────────────
  @CreateDateColumn()
  created_at!: Date;
}
