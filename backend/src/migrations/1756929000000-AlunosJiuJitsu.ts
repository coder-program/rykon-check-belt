import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlunosJiuJitsu1756929000000 implements MigrationInterface {
  name = 'AlunosJiuJitsu1756929000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para gênero
    await queryRunner.query(`
      CREATE TYPE genero_enum AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO')
    `);

    // Criar enum para status do aluno
    await queryRunner.query(`
      CREATE TYPE status_aluno_enum AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO', 'CANCELADO')
    `);

    // Criar enum para faixas
    await queryRunner.query(`
      CREATE TYPE faixa_enum AS ENUM (
        'BRANCA', 
        'CINZA_BRANCA', 'CINZA', 'CINZA_PRETA',
        'AMARELA_BRANCA', 'AMARELA', 'AMARELA_PRETA',
        'LARANJA_BRANCA', 'LARANJA', 'LARANJA_PRETA',
        'VERDE_BRANCA', 'VERDE', 'VERDE_PRETA',
        'AZUL', 'ROXA', 'MARROM', 'PRETA',
        'CORAL', 'VERMELHA'
      )
    `);

    // Recriar tabela de alunos com todos os campos necessários
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teamcruz.alunos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        
        -- Dados pessoais
        nome_completo VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) UNIQUE NOT NULL,
        data_nascimento DATE NOT NULL,
        genero genero_enum NOT NULL,
        
        -- Contato
        email VARCHAR(255),
        telefone VARCHAR(20),
        telefone_emergencia VARCHAR(20),
        nome_contato_emergencia VARCHAR(255),
        
        -- Endereço (referência para tabela de endereços)
        endereco_id UUID REFERENCES teamcruz.enderecos(id) ON DELETE SET NULL,
        
        -- Dados de matrícula
        numero_matricula VARCHAR(20) UNIQUE,
        data_matricula DATE NOT NULL DEFAULT CURRENT_DATE,
        unidade_id UUID NOT NULL REFERENCES teamcruz.unidades(id),
        status status_aluno_enum NOT NULL DEFAULT 'ATIVO',
        
        -- Graduação
        faixa_atual faixa_enum NOT NULL DEFAULT 'BRANCA',
        graus INTEGER DEFAULT 0 CHECK (graus >= 0 AND graus <= 4),
        data_ultima_graduacao DATE,
        
        -- Dados médicos
        observacoes_medicas TEXT,
        alergias TEXT,
        medicamentos_uso_continuo TEXT,
        
        -- Responsável (para menores)
        responsavel_nome VARCHAR(255),
        responsavel_cpf VARCHAR(14),
        responsavel_telefone VARCHAR(20),
        responsavel_parentesco VARCHAR(50),
        
        -- Dados financeiros
        dia_vencimento INTEGER CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
        valor_mensalidade DECIMAL(10,2),
        desconto_percentual DECIMAL(5,2) DEFAULT 0,
        
        -- Metadados
        observacoes TEXT,
        foto_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Índices para otimização de buscas
    await queryRunner.query(`CREATE INDEX idx_alunos_nome ON teamcruz.alunos(nome_completo)`);
    await queryRunner.query(`CREATE INDEX idx_alunos_cpf ON teamcruz.alunos(cpf)`);
    await queryRunner.query(`CREATE INDEX idx_alunos_unidade ON teamcruz.alunos(unidade_id)`);
    await queryRunner.query(`CREATE INDEX idx_alunos_status ON teamcruz.alunos(status)`);
    await queryRunner.query(`CREATE INDEX idx_alunos_faixa ON teamcruz.alunos(faixa_atual)`);
    await queryRunner.query(`CREATE INDEX idx_alunos_matricula ON teamcruz.alunos(numero_matricula)`);

    // Trigger para atualizar updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION teamcruz.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_alunos_updated_at 
      BEFORE UPDATE ON teamcruz.alunos 
      FOR EACH ROW 
      EXECUTE FUNCTION teamcruz.update_updated_at_column();
    `);

    // Criar função para gerar número de matrícula
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION teamcruz.gerar_numero_matricula()
      RETURNS TRIGGER AS $$
      DECLARE
        novo_numero VARCHAR(20);
        ano_atual VARCHAR(4);
        sequencia INTEGER;
      BEGIN
        IF NEW.numero_matricula IS NULL THEN
          ano_atual := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
          
          SELECT COALESCE(MAX(CAST(SUBSTRING(numero_matricula FROM 5) AS INTEGER)), 0) + 1
          INTO sequencia
          FROM teamcruz.alunos
          WHERE numero_matricula LIKE ano_atual || '%';
          
          novo_numero := ano_atual || LPAD(sequencia::VARCHAR, 6, '0');
          NEW.numero_matricula := novo_numero;
        END IF;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER gerar_matricula_aluno
      BEFORE INSERT ON teamcruz.alunos
      FOR EACH ROW
      EXECUTE FUNCTION teamcruz.gerar_numero_matricula();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS gerar_matricula_aluno ON teamcruz.alunos`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_alunos_updated_at ON teamcruz.alunos`);
    
    // Remover funções
    await queryRunner.query(`DROP FUNCTION IF EXISTS teamcruz.gerar_numero_matricula()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS teamcruz.update_updated_at_column()`);
    
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_alunos_matricula`);
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_alunos_faixa`);
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_alunos_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_alunos_unidade`);
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_alunos_cpf`);
    await queryRunner.query(`DROP INDEX IF EXISTS teamcruz.idx_alunos_nome`);
    
    // Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS teamcruz.alunos`);
    
    // Remover enums
    await queryRunner.query(`DROP TYPE IF EXISTS faixa_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS status_aluno_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS genero_enum`);
  }
}
