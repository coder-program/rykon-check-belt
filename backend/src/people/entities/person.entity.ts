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
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlunoFaixa } from '../../graduacao/entities/aluno-faixa.entity';
import { AlunoGraduacao } from '../../graduacao/entities/aluno-graduacao.entity';
import { Endereco } from '../../enderecos/endereco.entity';

export enum TipoCadastro {
  ALUNO = 'ALUNO',
  PROFESSOR = 'PROFESSOR',
}

export enum StatusCadastro {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  EM_AVALIACAO = 'EM_AVALIACAO',
  SUSPENSO = 'SUSPENSO',
  AFASTADO = 'AFASTADO',
}

export enum Genero {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
  OUTRO = 'OUTRO',
}

export enum FaixaAluno {
  BRANCA = 'BRANCA',
  CINZA_BRANCA = 'CINZA_BRANCA',
  CINZA = 'CINZA',
  CINZA_PRETA = 'CINZA_PRETA',
  AMARELA_BRANCA = 'AMARELA_BRANCA',
  AMARELA = 'AMARELA',
  AMARELA_PRETA = 'AMARELA_PRETA',
  LARANJA_BRANCA = 'LARANJA_BRANCA',
  LARANJA = 'LARANJA',
  LARANJA_PRETA = 'LARANJA_PRETA',
  VERDE_BRANCA = 'VERDE_BRANCA',
  VERDE = 'VERDE',
  VERDE_PRETA = 'VERDE_PRETA',
  AZUL = 'AZUL',
  ROXA = 'ROXA',
  MARROM = 'MARROM',
  PRETA = 'PRETA',
}

export enum FaixaProfessor {
  AZUL = 'AZUL',
  ROXA = 'ROXA',
  MARROM = 'MARROM',
  PRETA = 'PRETA',
  CORAL = 'CORAL',
  VERMELHA = 'VERMELHA',
}

@Entity({ name: 'professores', schema: 'teamcruz' })
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

  @Column({ type: 'varchar', length: 14, unique: true, nullable: true })
  cpf: string;

  @Column({ type: 'date', nullable: true })
  data_nascimento: Date;

  @Column({ type: 'enum', enum: Genero, nullable: true })
  genero: Genero;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone_whatsapp: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  // Referência para endereço
  @Column({ type: 'uuid', nullable: true })
  endereco_id: string;

  @Column({ type: 'uuid', nullable: true })
  unidade_id: string;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string;

  // Relação com endereço
  @ManyToOne(() => Endereco, { nullable: true })
  @JoinColumn({ name: 'endereco_id' })
  endereco: Endereco;

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

  // Validação de faixa por idade (baseado no ano)
  @BeforeInsert()
  @BeforeUpdate()
  validateFaixaRestrita() {
    if (
      this.tipo_cadastro === TipoCadastro.ALUNO &&
      this.data_nascimento &&
      this.faixa_atual
    ) {
      const hoje = new Date();
      const nascimento = new Date(this.data_nascimento);
      const anoAtual = hoje.getFullYear();
      const anoNascimento = nascimento.getFullYear();
      const idadePorAno = anoAtual - anoNascimento;

      // Menores de 16 anos: apenas faixas infantis
      if (
        idadePorAno < 16 &&
        ['AZUL', 'ROXA', 'MARROM', 'PRETA'].includes(this.faixa_atual)
      ) {
        throw new Error(
          'Alunos que fazem menos de 16 anos neste ano não podem ter faixas Azul, Roxa, Marrom ou Preta',
        );
      }

      // 16-17 anos: apenas BRANCA, AZUL ou ROXA
      if (
        idadePorAno >= 16 &&
        idadePorAno < 18 &&
        !['BRANCA', 'AZUL', 'ROXA'].includes(this.faixa_atual)
      ) {
        throw new Error(
          'Alunos de 16 a 17 anos podem ter apenas faixas Branca, Azul ou Roxa',
        );
      }
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
