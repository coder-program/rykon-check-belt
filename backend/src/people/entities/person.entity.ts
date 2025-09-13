import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
} from 'typeorm';
import { AlunoFaixa } from '../../graduacao/entities/aluno-faixa.entity';
import { AlunoGraduacao } from '../../graduacao/entities/aluno-graduacao.entity';

export enum TipoCadastro {
  ALUNO = 'ALUNO',
  PROFESSOR = 'PROFESSOR',
}

export enum StatusCadastro {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  EM_AVALIACAO = 'EM_AVALIACAO',
}

export enum Genero {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
  OUTRO = 'OUTRO',
}

export enum FaixaAluno {
  BRANCA = 'BRANCA',
  CINZA = 'CINZA',
  AMARELA = 'AMARELA',
  LARANJA = 'LARANJA',
  VERDE = 'VERDE',
  AZUL = 'AZUL',
  ROXA = 'ROXA',
  MARROM = 'MARROM',
  PRETA = 'PRETA',
}

export enum FaixaProfessor {
  ROXA = 'ROXA',
  MARROM = 'MARROM',
  PRETA = 'PRETA',
  CORAL = 'CORAL',
  VERMELHA = 'VERMELHA',
}

@Entity({ name: 'pessoas', schema: 'teamcruz' })
@Index(['cpf'], { unique: true })
@Index(['tipo_cadastro'])
@Index(['status'])
@Index(['unidade_id'])
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== CAMPOS COMUNS =====
  @Column({ type: 'enum', enum: TipoCadastro })
  tipo_cadastro: TipoCadastro;

  @Column({ type: 'varchar', length: 255 })
  nome_completo: string;

  @Column({ type: 'varchar', length: 14, unique: true })
  cpf: string;

  @Column({ type: 'date' })
  data_nascimento: Date;

  @Column({ type: 'enum', enum: Genero, nullable: true })
  genero: Genero;

  @Column({ type: 'varchar', length: 20 })
  telefone_whatsapp: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  // Endereço (opcional)
  @Column({ type: 'varchar', length: 10, nullable: true })
  cep: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logradouro: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  numero: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  complemento: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bairro: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cidade: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  uf: string;

  @Column({ type: 'uuid', nullable: true })
  unidade_id: string;

  @Column({ type: 'enum', enum: StatusCadastro, default: StatusCadastro.ATIVO })
  status: StatusCadastro;

  // ===== CAMPOS ESPECÍFICOS DE ALUNO =====
  @Column({ type: 'date', nullable: true })
  data_matricula: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  faixa_atual: string;

  @Column({ type: 'int', default: 0, nullable: true })
  grau_atual: number;

  // Responsável (para menores de 18 anos)
  @Column({ type: 'varchar', length: 255, nullable: true })
  responsavel_nome: string;

  @Column({ type: 'varchar', length: 14, nullable: true })
  responsavel_cpf: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  responsavel_telefone: string;

  // ===== CAMPOS ESPECÍFICOS DE PROFESSOR =====
  @Column({ type: 'varchar', length: 20, nullable: true })
  faixa_ministrante: string;

  @Column({ type: 'date', nullable: true })
  data_inicio_docencia: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  registro_profissional: string;

  // ===== CAMPOS DE CONTROLE =====
  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  // ===== CAMPOS CALCULADOS =====
  idade?: number;

  // ===== RELAÇÕES =====
  @OneToMany(() => AlunoFaixa, (alunoFaixa) => alunoFaixa.aluno)
  faixas: AlunoFaixa[];

  @OneToMany(() => AlunoGraduacao, (graduacao) => graduacao.aluno)
  graduacoes: AlunoGraduacao[];

  @BeforeInsert()
  @BeforeUpdate()
  calculateAge() {
    if (this.data_nascimento) {
      const hoje = new Date();
      const nascimento = new Date(this.data_nascimento);
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const mesAtual = hoje.getMonth();
      const mesNascimento = nascimento.getMonth();

      if (
        mesAtual < mesNascimento ||
        (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
      ) {
        idade--;
      }

      this.idade = idade;
    }
  }

  @BeforeInsert()
  setDefaultValues() {
    if (this.tipo_cadastro === TipoCadastro.ALUNO && !this.data_matricula) {
      this.data_matricula = new Date();
    }

    // Zera o grau se não for informado
    if (
      this.tipo_cadastro === TipoCadastro.ALUNO &&
      this.grau_atual === undefined
    ) {
      this.grau_atual = 0;
    }
  }

  @BeforeUpdate()
  resetGrauOnFaixaChange() {
    // Se mudou de faixa, zera o grau
    if (this.tipo_cadastro === TipoCadastro.ALUNO && this.faixa_atual) {
      // Esta lógica seria mais complexa em produção, verificando o valor anterior
      // Por ora, apenas garantimos que o grau está entre 0 e 4
      if (this.grau_atual && (this.grau_atual < 0 || this.grau_atual > 4)) {
        this.grau_atual = 0;
      }
    }
  }
}
