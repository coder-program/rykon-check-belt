import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'unidade_produtos', schema: 'teamcruz' })
export class UnidadeProduto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  unidade_id!: string;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade!: Unidade;

  @Column({ length: 255 })
  nome!: string;

  @Column({ type: 'text', nullable: true })
  descricao!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  preco!: number;

  @Column({ type: 'text', nullable: true })
  url_imagem!: string | null;

  @Column({ length: 10, default: 'LOCAL' })
  visibilidade!: 'LOCAL' | 'GLOBAL';

  @Column({ default: false })
  permite_parcelamento!: boolean;

  @Column({ default: 1 })
  max_parcelas!: number;

  @Column({ default: 0 })
  estoque!: number;

  @Column({ default: true })
  ativo!: boolean;

  @Column({ type: 'uuid', nullable: true })
  criado_por!: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  criador!: Usuario | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em!: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em!: Date;
}
