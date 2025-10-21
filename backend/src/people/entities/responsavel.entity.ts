import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'responsaveis', schema: 'teamcruz' })
export class Responsavel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuario_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ length: 255 })
  nome_completo: string;

  @Column({ length: 11, unique: true })
  cpf: string;

  @Column({ length: 20, nullable: true })
  rg: string;

  @Column({ type: 'date', nullable: true })
  data_nascimento: Date;

  @Column({ length: 20, nullable: true })
  genero: string;

  // Contato
  @Column({ length: 255 })
  email: string;

  @Column({ length: 20 })
  telefone: string;

  @Column({ length: 20, nullable: true })
  telefone_secundario: string;

  // Endereço
  @Column({ length: 10, nullable: true })
  cep: string;

  @Column({ length: 255, nullable: true })
  logradouro: string;

  @Column({ length: 10, nullable: true })
  numero: string;

  @Column({ length: 100, nullable: true })
  complemento: string;

  @Column({ length: 100, nullable: true })
  bairro: string;

  @Column({ length: 100, nullable: true })
  cidade: string;

  @Column({ length: 2, nullable: true })
  estado: string;

  @Column({ length: 50, default: 'Brasil', nullable: true })
  pais: string;

  // Profissional
  @Column({ length: 100, nullable: true })
  profissao: string;

  @Column({ length: 255, nullable: true })
  empresa: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  renda_familiar: number;

  // Sistema
  @Column({ default: true })
  ativo: boolean;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ length: 500, nullable: true })
  foto_url: string;

  // Relacionamento com dependentes (alunos)
  @OneToMany('Aluno', 'responsavel')
  dependentes: any[];

  // Auditoria
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;
}
