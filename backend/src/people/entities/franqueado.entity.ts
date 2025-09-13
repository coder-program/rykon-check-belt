import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'franqueados', schema: 'teamcruz' })
export class Franqueado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nome: string;

  @Column({ length: 120, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  telefone: string;

  @Column({ length: 18, unique: true })
  cnpj: string;

  @Column({ type: 'simple-array', nullable: true })
  unidades_gerencia: string[]; // IDs das unidades

  @Column({ type: 'date' })
  data_contrato: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  taxa_franquia: number;

  @Column({ type: 'jsonb', nullable: true })
  dados_bancarios: {
    banco: string;
    agencia: string;
    conta: string;
    titular: string;
    documento: string;
  } | null;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
