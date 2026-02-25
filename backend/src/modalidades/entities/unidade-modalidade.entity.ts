import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Modalidade } from './modalidade.entity';
import { Unidade } from '../../people/entities/unidade.entity';

@Entity({ name: 'unidade_modalidades', schema: 'teamcruz' })
@Unique('uk_unidade_modalidade', ['unidade_id', 'modalidade_id'])
export class UnidadeModalidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'uuid' })
  modalidade_id: string;

  @Column({ type: 'boolean', default: true })
  ativa: boolean;

  @ManyToOne(() => Unidade, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Modalidade, (m) => m.unidadeModalidades, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade: Modalidade;

  @CreateDateColumn()
  created_at: Date;
}
