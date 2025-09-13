import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFaixasJiuJitsu1757100100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Inserir faixas adultas com regras específicas
    await queryRunner.query(`
      INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria) VALUES
      -- Faixas Adultas
      ('BRANCA', 'Branca', '#FFFFFF', 1, 4, 20, 'ADULTO'),     -- Branca = 20 aulas por grau
      ('AZUL', 'Azul', '#0066CC', 2, 4, 40, 'ADULTO'),         -- Azul = 40 aulas por grau
      ('ROXA', 'Roxa', '#663399', 3, 4, 40, 'ADULTO'),         -- Roxa = 40 aulas por grau
      ('MARROM', 'Marrom', '#8B4513', 4, 4, 40, 'ADULTO'),     -- Marrom = 40 aulas por grau
      ('PRETA', 'Preta', '#000000', 5, 6, 40, 'ADULTO'),       -- Preta = 6 graus possíveis
      ('CORAL', 'Coral', '#FF6B6B', 6, 6, 40, 'MESTRE'),       -- Coral (7º dan)
      ('VERMELHA', 'Vermelha', '#CC0000', 7, 0, 0, 'MESTRE'),  -- Vermelha (9º e 10º dan)
      
      -- Faixas Infantis
      ('CINZA', 'Cinza', '#808080', 11, 4, 40, 'INFANTIL'),
      ('AMARELA', 'Amarela', '#FFD700', 12, 4, 40, 'INFANTIL'),
      ('LARANJA', 'Laranja', '#FF8C00', 13, 4, 40, 'INFANTIL'),
      ('VERDE', 'Verde', '#228B22', 14, 4, 40, 'INFANTIL')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM teamcruz.faixa_def WHERE codigo IN (
        'BRANCA', 'AZUL', 'ROXA', 'MARROM', 'PRETA', 'CORAL', 'VERMELHA',
        'CINZA', 'AMARELA', 'LARANJA', 'VERDE'
      )
    `);
  }
}
