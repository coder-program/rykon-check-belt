import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'enderecos', schema: 'teamcruz' })
export class Endereco {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 8 })
  cep: string;

  @Column({ length: 200 })
  logradouro: string;

  @Column({ length: 20 })
  numero: string;

  @Column({ length: 100, nullable: true })
  complemento: string;

  @Column({ length: 100 })
  bairro: string;

  @Column({ length: 100 })
  cidade: string;

  @Column({ length: 2 })
  estado: string;

  @Column({ length: 50, default: 'Brasil' })
  pais: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
