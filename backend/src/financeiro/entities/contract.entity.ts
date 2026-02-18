import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';

@Entity({ schema: 'teamcruz', name: 'contracts' })
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'unidade_id', type: 'uuid' })
  unidadeId: string;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  // Dados do contrato
  @Column({ length: 50, default: 'rykon-pay' })
  tipo: string; // 'rykon-pay', 'franquia', 'adesao'

  @Column({ length: 200 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  conteudo: string; // Template do contrato em HTML

  @Column({ length: 10, default: '1.0' })
  versao: string;

  // Status
  @Column({ length: 30, default: 'PENDENTE' })
  status: 'PENDENTE' | 'ATIVO' | 'CANCELADO' | 'EXPIRADO';

  @Column({ default: false })
  assinado: boolean;

  @Column({ name: 'data_assinatura', type: 'timestamp', nullable: true })
  dataAssinatura: Date;

  @Column({ name: 'assinado_por_nome', length: 200, nullable: true })
  assinadoPorNome: string;

  @Column({ name: 'assinado_por_cpf', length: 14, nullable: true })
  assinadoPorCpf: string;

  // Arquivos
  @Column({ name: 'pdf_url', length: 500, nullable: true })
  pdfUrl: string;

  @Column({ name: 'pdf_path', length: 500, nullable: true })
  pdfPath: string;

  // Datas contratuais
  @Column({ name: 'data_inicio', type: 'date' })
  dataInicio: Date;

  @Column({ name: 'data_fim', type: 'date', nullable: true })
  dataFim: Date;

  // Valores
  @Column({ name: 'valor_mensal', type: 'decimal', precision: 10, scale: 2, nullable: true })
  valorMensal: number;

  @Column({ name: 'taxa_transacao', type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxaTransacao: number;

  // Metadados
  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;
}
