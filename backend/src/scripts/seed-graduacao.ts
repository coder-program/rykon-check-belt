import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // 1. Verificar alunos existentes
    const alunos = await dataSource.query(`
      SELECT id, nome_completo, faixa_atual, grau_atual
      FROM pessoas
      WHERE tipo_cadastro = 'ALUNO' AND status = 'ATIVO'
    `);

    if (alunos.length === 0) {
      await app.close();
      return;
    }

    // 2. Verificar e usar faixas existentes
    const faixasExistentes = await dataSource.query(`
      SELECT id, codigo, nome_exibicao FROM teamcruz.faixa_def
      WHERE categoria = 'ADULTO' ORDER BY ordem ASC
    `);

    if (faixasExistentes.length === 0) {
      console.log('   Inserindo definições de faixas...');
      // Se não houver faixas, tentar criar usando a migração existente
      await dataSource.query(`
        INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, categoria, graus_max, aulas_por_grau, ativo)
        VALUES
          ('BRANCA', 'Branca', '#FFFFFF', 1, 'ADULTO', 4, 20, true),
          ('AZUL', 'Azul', '#0066CC', 2, 'ADULTO', 4, 25, true),
          ('ROXA', 'Roxa', '#663399', 3, 'ADULTO', 4, 30, true),
          ('MARROM', 'Marrom', '#8B4513', 4, 'ADULTO', 4, 35, true),
          ('PRETA', 'Preta', '#000000', 5, 'ADULTO', 6, 40, true)
        ON CONFLICT (codigo) DO NOTHING
      `);
    }
    // 3. Criar registros em aluno_faixa
    for (const aluno of alunos) {
      // Verificar se já existe
      const existing = await dataSource.query(
        `
        SELECT id FROM teamcruz.aluno_faixa
        WHERE aluno_id = $1 AND ativa = true
      `,
        [aluno.id],
      );

      if (existing.length > 0) {
        continue;
      }

      // Buscar o ID real da faixa baseado no código
      const faixaUpper = (aluno.faixa_atual || 'BRANCA').toUpperCase();
      let codigoFaixa = 'BRANCA'; // Default

      if (faixaUpper.includes('AZUL')) codigoFaixa = 'AZUL';
      else if (faixaUpper.includes('ROXA')) codigoFaixa = 'ROXA';
      else if (faixaUpper.includes('MARROM')) codigoFaixa = 'MARROM';
      else if (faixaUpper.includes('PRETA')) codigoFaixa = 'PRETA';

      // Buscar o ID real da faixa
      const faixaResult = await dataSource.query(
        `
        SELECT id FROM teamcruz.faixa_def WHERE codigo = $1
      `,
        [codigoFaixa],
      );

      if (faixaResult.length === 0) {
        console.log(
          `   ⚠️  Faixa ${codigoFaixa} não encontrada, pulando ${aluno.nome_completo}`,
        );
        continue;
      }

      const faixaDefId = faixaResult[0].id;

      // Inserir registro
      await dataSource.query(
        `
        INSERT INTO teamcruz.aluno_faixa (
          aluno_id,
          faixa_def_id,
          ativa,
          dt_inicio,
          graus_atual,
          presencas_no_ciclo,
          presencas_total_fx
        ) VALUES ($1, $2, true, CURRENT_DATE - INTERVAL '6 months', $3, $4, $5)
      `,
        [
          aluno.id,
          faixaDefId,
          aluno.grau_atual || 0,
          Math.floor(Math.random() * 20), // Simula presenças no ciclo atual
          Math.floor(Math.random() * 100), // Simula total de presenças
        ],
      );

      console.log(
        `   ✅ ${aluno.nome_completo} - Faixa: ${aluno.faixa_atual || 'Branca'}, Graus: ${aluno.grau_atual || 0}`,
      );
    }

    // 4. Verificar resultado
    console.log('\n📊 Verificando dados criados...\n');
    const resultado = await dataSource.query(`
      SELECT
        p.nome_completo,
        fd.nome_exibicao as faixa,
        af.graus_atual,
        af.presencas_no_ciclo,
        fd.aulas_por_grau - af.presencas_no_ciclo as faltam_aulas
      FROM teamcruz.aluno_faixa af
      JOIN pessoas p ON p.id = af.aluno_id
      JOIN teamcruz.faixa_def fd ON fd.id = af.faixa_def_id
      WHERE af.ativa = true
      ORDER BY faltam_aulas ASC
    `);

    resultado.forEach((r: any) => {});
  } catch (error) {
    console.error('❌ Erro ao popular dados:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
