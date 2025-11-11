import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Unidade } from './unidade.entity';

@Entity({ name: 'tablet_unidades', schema: 'teamcruz' })
@Unique(['tablet_id', 'unidade_id'])
@Index(['tablet_id'])
@Index(['unidade_id'])
@Index(['ativo'])
export class TabletUnidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tablet_id', type: 'uuid' })
  tablet_id: string;

  @Column({ name: 'unidade_id', type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'tablet_id' })
  tablet: Usuario;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;
}
