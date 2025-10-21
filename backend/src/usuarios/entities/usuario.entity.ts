import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Perfil } from './perfil.entity';

@Entity({ name: 'usuarios', schema: 'teamcruz' })
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  cpf: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({ type: 'date', nullable: true })
  data_nascimento: Date;

  @Column({ default: true })
  ativo: boolean;

  @Column({ default: false })
  cadastro_completo: boolean;

  @Column({ nullable: true })
  ultimo_login: Date;

  @ManyToMany(() => Perfil, (perfil) => perfil.usuarios)
  @JoinTable({
    name: 'usuario_perfis',
    schema: 'teamcruz',
    joinColumn: { name: 'usuario_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'perfil_id', referencedColumnName: 'id' },
  })
  perfis: Perfil[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
