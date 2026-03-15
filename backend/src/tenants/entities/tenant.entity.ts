import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tenants', schema: 'public' }) // ÚNICA entidade que mantém schema: 'public'
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  nome: string;

  @Column({ name: 'schema_name', unique: true })
  schemaName: string;

  @Column({ default: 'basico' })
  plano: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({ nullable: true, name: 'cor_primaria', default: '#111827' })
  corPrimaria: string;

  @Column({ nullable: true, name: 'cor_secundaria', default: '#dc2626' })
  corSecundaria: string;

  @Column({ nullable: true, name: 'dominio_customizado' })
  dominioCustomizado: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'max_alunos', default: 500 })
  maxAlunos: number;

  @Column({ name: 'max_unidades', default: 3 })
  maxUnidades: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
