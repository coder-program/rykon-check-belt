import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'convites_cadastro', schema: 'teamcruz' })
export class ConviteCadastro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 20 })
  tipo_cadastro: 'ALUNO' | 'RESPONSAVEL';

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome_pre_cadastro: string;

  @Column({ type: 'varchar', length: 14, nullable: true })
  cpf: string;

  @Column({ type: 'boolean', default: false })
  usado: boolean;

  @Column({ type: 'uuid', nullable: true })
  usuario_criado_id: string;

  @Column({ type: 'timestamp' })
  data_expiracao: Date;

  @Column({ type: 'uuid', nullable: true })
  criado_por: string;

  @CreateDateColumn()
  criado_em: Date;

  @Column({ type: 'timestamp', nullable: true })
  usado_em: Date;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criador: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_criado_id' })
  usuarioCriado: Usuario;
}
