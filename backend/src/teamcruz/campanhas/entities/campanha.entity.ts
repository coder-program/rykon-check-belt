import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('campanhas', { schema: 'teamcruz' })
export class Campanha {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  titulo: string;

  @Column({ type: 'text' })
  descricao: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: 'promocao' | 'evento' | 'graduacao' | 'comunicado';

  @Column({ type: 'date' })
  dataInicio: string;

  @Column({ type: 'date' })
  dataFim: string;

  @Column({ type: 'varchar', length: 20, default: 'todos' })
  canal: 'email' | 'sms' | 'whatsapp' | 'push' | 'todos';

  @Column({ type: 'varchar', length: 20, default: 'todos' })
  segmento:
    | 'todos'
    | 'iniciantes'
    | 'avancados'
    | 'criancas'
    | 'adultos'
    | 'competidores';

  @Column({ type: 'varchar', length: 20, default: 'rascunho' })
  status: 'rascunho' | 'agendada' | 'ativa' | 'finalizada';

  @Column({ type: 'int', default: 0 })
  enviados: number;

  @Column({ type: 'int', default: 0 })
  abertos: number;

  @Column({ type: 'int', default: 0 })
  cliques: number;

  @Column({ type: 'text', nullable: true })
  imagem?: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  botaoCTA?: string;

  @Column({ type: 'text', nullable: true })
  linkCTA?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
