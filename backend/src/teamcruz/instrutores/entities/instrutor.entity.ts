import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Faixa } from '../../faixas/entities/faixa.entity';

@Entity()
export class Instrutor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @ManyToOne(() => Faixa, faixa => faixa.instrutores)
  faixa: Faixa;
}
