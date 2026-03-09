import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'unidade_recados', schema: 'teamcruz' })
export class UnidadeRecado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  unidade_id!: string;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade!: Unidade;

  @Column({ length: 255 })
  titulo!: string;

  @Column({ type: 'text' })
  mensagem!: string;

  @Column({ default: true })
  ativo!: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  publicado_em!: Date;

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
