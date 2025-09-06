import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Permissao } from './permissao.entity';

@Entity({ name: 'perfis', schema: 'teamcruz' })
export class Perfil {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nome: string;

  @Column({ nullable: true })
  descricao: string;

  @Column({ default: true })
  ativo: boolean;

  @ManyToMany(() => Usuario, (usuario) => usuario.perfis)
  usuarios: Usuario[];

  @ManyToMany(() => Permissao, (permissao) => permissao.perfis)
  @JoinTable({
    name: 'perfil_permissoes',
    joinColumn: { name: 'perfil_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissao_id', referencedColumnName: 'id' },
  })
  permissoes: Permissao[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
