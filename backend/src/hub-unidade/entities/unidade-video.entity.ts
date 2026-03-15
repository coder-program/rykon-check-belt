import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';
import { Modalidade } from '../../modalidades/entities/modalidade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'unidade_videos' })
export class UnidadeVideo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  unidade_id!: string;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade!: Unidade;

  @Column({ type: 'uuid', nullable: true })
  modalidade_id!: string | null;

  @ManyToOne(() => Modalidade, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade!: Modalidade | null;

  @Column({ length: 255 })
  titulo!: string;

  @Column({ length: 500 })
  url_youtube!: string;

  @Column({ type: 'text', nullable: true })
  descricao!: string | null;

  @Column({ default: true })
  ativo!: boolean;

  @Column({ default: 0 })
  ordem!: number;

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
