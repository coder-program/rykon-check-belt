import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Franqueado } from './franqueado.entity';
import { FranqueadoModuloContratado } from './franqueado-modulo-contratado.entity';

export type StatusContrato = 'ATIVO' | 'SUSPENSO' | 'ENCERRADO' | 'EM_IMPLANTACAO';
export type TipoCobranca = 'MENSAL' | 'ANUAL' | 'PIX' | 'BOLETO' | 'TRANSFERENCIA';
export type StatusImplantacao =
  | 'NAO_INICIADA'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'PAUSADA';

@Entity({ name: 'franqueado_contratos', schema: 'teamcruz' })
export class FranqueadoContrato {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Vínculo ──────────────────────────────────────────────────
  @Column({ type: 'uuid' })
  franqueado_id!: string;

  @ManyToOne(() => Franqueado, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'franqueado_id' })
  franqueado!: Franqueado;

  // ── Identificação Comercial (seção 6.1) ──────────────────────
  @Column({ type: 'varchar', length: 40, nullable: true })
  codigo!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nome_fantasia!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cnpj_cpf!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  razao_social!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  segmento!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true, default: 'CONTRATO_FECHADO' })
  status_comercial!: string | null;

  // ── Contato Comercial (seção 6.2) ───────────────────────────
  @Column({ type: 'varchar', length: 150, nullable: true })
  contato_nome!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  contato_cargo!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contato_email!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  contato_telefone!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  financeiro_nome!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  financeiro_email!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  financeiro_whatsapp!: string | null;

  // ── Comercial / Datas (seção 6.3) ───────────────────────────
  @Column({ type: 'date', nullable: true })
  data_implantacao!: string | null;

  @Column({ type: 'date', nullable: true })
  data_go_live!: string | null;

  @Column({ type: 'date', nullable: true })
  data_inicio_cobranca!: string | null;

  @Column({ type: 'int', nullable: true, default: 3 })
  carencia_meses!: number | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  responsavel_comercial!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  responsavel_implantacao!: string | null;

  // Valores
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  mensalidade_base!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  desconto_mensal!: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  desconto_motivo!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  setup_valor_total!: number | null;

  @Column({ type: 'int', nullable: true, default: 1 })
  setup_parcelas!: number | null;

  @Column({ type: 'boolean', default: false })
  setup_cobrar_durante_carencia!: boolean;

  @Column({ type: 'varchar', length: 40, nullable: true, default: 'PIX' })
  tipo_cobranca!: TipoCobranca | null;

  @Column({ type: 'int', nullable: true, default: 10 })
  dia_vencimento!: number | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  forma_reajuste!: string | null;

  // ── Implantação (seção 6.5) ──────────────────────────────────
  @Column({ type: 'int', nullable: true })
  usuarios_ativos_esperados!: number | null;

  @Column({ type: 'int', nullable: true, default: 1 })
  unidades_esperadas!: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true, default: 'media' })
  familiaridade_tecnologia!: string | null;

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
    default: 'NAO_INICIADA',
  })
  status_implantacao!: StatusImplantacao | null;

  @Column({ type: 'boolean', default: false })
  integracao_externa!: boolean;

  @Column({ type: 'text', nullable: true })
  integracoes_previstas!: string | null;

  @Column({ type: 'text', nullable: true })
  observacoes!: string | null;

  // ── Status geral ─────────────────────────────────────────────
  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    default: 'EM_IMPLANTACAO',
  })
  status_contrato!: StatusContrato | null;

  @Column({ default: true })
  ativo!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // ── Relations ────────────────────────────────────────────────
  @OneToMany(() => FranqueadoModuloContratado, (m) => m.contrato, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  modulos!: FranqueadoModuloContratado[];
}
