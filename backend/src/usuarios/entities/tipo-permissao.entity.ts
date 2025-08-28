import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Permissao } from './permissao.entity';

@Entity('tipos_permissao')
export class TipoPermissao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  codigo: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  descricao: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ default: 0 })
  ordem: number; // Para ordenação na interface

  @OneToMany(() => Permissao, permissao => permissao.tipo)
  permissoes: Permissao[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
