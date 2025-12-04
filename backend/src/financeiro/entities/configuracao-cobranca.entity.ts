import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';

@Entity({ name: 'configuracoes_cobranca', schema: 'teamcruz' })
export class ConfiguracaoCobranca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  unidade_id: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  // Métodos de pagamento aceitos
  @Column({ type: 'boolean', default: true })
  aceita_pix: boolean;

  @Column({ type: 'boolean', default: true })
  aceita_cartao: boolean;

  @Column({ type: 'boolean', default: true })
  aceita_boleto: boolean;

  @Column({ type: 'boolean', default: true })
  aceita_dinheiro: boolean;

  @Column({ type: 'boolean', default: true })
  aceita_transferencia: boolean;

  // Regras de cobrança
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2.0 })
  multa_atraso_percentual: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.033 })
  juros_diario_percentual: number;

  @Column({ type: 'int', default: 30 })
  dias_bloqueio_inadimplencia: number;

  @Column({ type: 'int', default: 10 })
  dia_vencimento_padrao: number;

  @Column({ type: 'int', default: 2 })
  faturas_vencidas_para_inadimplencia: number;

  // Integração Gateway
  @Column({ type: 'varchar', length: 100, nullable: true })
  gateway_tipo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gateway_api_key: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gateway_secret_key: string;

  @Column({ type: 'boolean', default: false })
  gateway_modo_producao: boolean;

  @Column({ type: 'jsonb', nullable: true })
  gateway_configuracoes: any;

  // Integração Gympass / Corporate
  @Column({ type: 'boolean', default: false })
  gympass_ativo: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gympass_unidade_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  gympass_percentual_repasse: number;

  @Column({ type: 'jsonb', nullable: true })
  mensagem_cobranca_whatsapp: string;

  @Column({ type: 'jsonb', nullable: true })
  mensagem_cobranca_email: string;

  @Column({ type: 'boolean', default: true })
  enviar_lembrete_vencimento: boolean;

  @Column({ type: 'int', default: 3 })
  dias_antecedencia_lembrete: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
