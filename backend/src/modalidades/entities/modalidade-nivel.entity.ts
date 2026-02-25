import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Modalidade } from './modalidade.entity';

/**
 * Níveis/graduações definidos para uma modalidade.
 * Ex: Muay Thai → Nível 1, 2, 3
 * Ex: Judo → Kyu 5, 4, 3, 2, 1
 */
@Entity({ name: 'modalidade_niveis', schema: 'teamcruz' })
export class ModalidadeNivel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  modalidade_id: string;

  @Column({ type: 'varchar', length: 100 })
  nome: string; // ex: "Nível 1", "Kyu 5", "Faixa Amarela"

  @Column({ type: 'int', default: 0 })
  ordem: number; // Ordem de progressão (0 = inicial)

  @Column({ type: 'varchar', length: 7, nullable: true })
  cor_hex: string | null; // Cor do nível, ex: #FFCC00

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @ManyToOne(() => Modalidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade: Modalidade;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
