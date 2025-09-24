import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Aluno } from '../../teamcruz/alunos/entities/aluno.entity';

@Entity('face_embeddings')
export class FaceEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  alunoId?: string;

  // @Column({ nullable: true })
  // instrutorId?: string;

  @Column('text')
  imageBase64: string;

  @Column('jsonb')
  faceDescriptor: number[];

  @Column('decimal', { precision: 10, scale: 8 })
  confidence: number;

  @Column()
  imageUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Aluno, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'alunoId' })
  aluno?: Aluno;

  // @ManyToOne(() => Instrutor, { onDelete: 'CASCADE', nullable: true })
  // @JoinColumn({ name: 'instrutorId' })
  // instrutor?: Instrutor;
}