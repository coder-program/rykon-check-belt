import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type TipoEvento =
  | 'CONTRATO_CRIADO'
  | 'CONTRATO_ATUALIZADO'
  | 'STATUS_ALTERADO'
  | 'MODULO_ATIVADO'
  | 'MODULO_CANCELADO'
  | 'COBRANCA_GERADA'
  | 'PAGAMENTO_REGISTRADO'
  | 'PARCELA_PAGA'
  | 'CARENCIA_ENCERRADA'
  | 'OBSERVACAO'
  | 'OUTRO';

/**
 * Auditoria e rastreabilidade de eventos por franqueado.
 * Alimenta a aba "Histórico" na tela de detalhe do franqueado.
 */
@Entity({ name: 'franqueado_historico_eventos' })
@Index('idx_fhe_franqueado', ['franqueado_id'])
@Index('idx_fhe_tipo', ['tipo_evento'])
export class FranqueadoHistoricoEvento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Vínculos ─────────────────────────────────────────────────
  @Column({ type: 'uuid' })
  franqueado_id!: string;

  @Column({ type: 'uuid', nullable: true })
  contrato_id!: string | null;

  // ── Evento ───────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 40 })
  tipo_evento!: TipoEvento;

  @Column({ type: 'text' })
  descricao!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  usuario_responsavel!: string | null;

  // ── Dados extras (JSON livre) ─────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  // ── Audit ─────────────────────────────────────────────────────
  @CreateDateColumn()
  created_at!: Date;
}
