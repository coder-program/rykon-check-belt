import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Person } from './person.entity';
import { Unidade } from './unidade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'professor_unidades', schema: 'teamcruz' })
@Index(['professor_id'])
@Index(['unidade_id'])
@Index(['usuario_id'])
@Index(['ativo'])
export class ProfessorUnidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  professor_id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string;

  @Column({ type: 'boolean', default: false })
  is_principal: boolean;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  data_vinculo: Date;

  @Column({ type: 'date', nullable: true })
  data_desvinculo: Date;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relações
  @ManyToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professor_id' })
  professor: Person;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
