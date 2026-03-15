import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'videos_treinamento' })
export class VideoTreinamento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  titulo!: string;

  @Column({ type: 'text', nullable: true })
  descricao!: string | null;

  @Column({ type: 'varchar', length: 500 })
  youtube_url!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modalidade_tag!: string | null;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'integer', default: 0 })
  ordem!: number;

  @Column({ type: 'uuid', nullable: true })
  criado_por!: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em!: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em!: Date;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  criador!: Usuario;
}
