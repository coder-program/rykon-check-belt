import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';

@Entity({ schema: 'teamcruz', name: 'bank_accounts' })
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'unidade_id', type: 'uuid' })
  unidadeId: string;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  // Dados do banco
  @Column({ name: 'banco_codigo', length: 10 })
  bancoCodigo: string; // Código do banco (341, 001, 104, etc)

  @Column({ name: 'banco_nome', length: 100 })
  bancoNome: string; // Nome do banco

  @Column({ length: 20 })
  agencia: string;

  @Column({ name: 'agencia_digito', length: 2, nullable: true })
  agenciaDigito: string;

  @Column({ length: 30 })
  conta: string;

  @Column({ name: 'conta_digito', length: 2 })
  contaDigito: string;

  @Column({ length: 20 })
  tipo: 'CORRENTE' | 'POUPANCA';

  // Dados do titular
  @Column({ name: 'titular_nome', length: 200 })
  titularNome: string;

  @Column({ name: 'titular_cpf_cnpj', length: 18 })
  titularCpfCnpj: string;

  // Flags
  @Column({ default: false })
  principal: boolean;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
