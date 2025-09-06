import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Perfil } from './perfil.entity';
import { TipoPermissao } from './tipo-permissao.entity';
import { NivelPermissao } from './nivel-permissao.entity';

@Entity({ name: 'permissoes', schema: 'teamcruz' })
export class Permissao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  codigo: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  descricao: string;

  @Column({ name: 'tipo_id' })
  tipoId: string;

  @ManyToOne(() => TipoPermissao, (tipo) => tipo.permissoes)
  @JoinColumn({ name: 'tipo_id' })
  tipo: TipoPermissao;

  @Column({ name: 'nivel_id' })
  nivelId: string;

  @ManyToOne(() => NivelPermissao, (nivel) => nivel.permissoes)
  @JoinColumn({ name: 'nivel_id' })
  nivel: NivelPermissao;

  @Column({ nullable: true })
  modulo: string;

  @Column({ default: true })
  ativo: boolean;

  @ManyToMany(() => Perfil, (perfil) => perfil.permissoes)
  perfis: Perfil[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
