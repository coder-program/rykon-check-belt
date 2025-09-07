import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Permissao } from './permissao.entity';

@Entity({ name: 'niveis_permissao', schema: 'teamcruz' })
export class NivelPermissao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  codigo: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  descricao: string;

  @Column({ default: 0 })
  ordem: number; // Para ordenação na interface (leitura < escrita < admin)

  @Column({ nullable: true })
  cor: string; // Cor para exibição na interface (#28a745 para leitura, #dc3545 para admin)

  @OneToMany(() => Permissao, (permissao) => permissao.nivel)
  permissoes: Permissao[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
