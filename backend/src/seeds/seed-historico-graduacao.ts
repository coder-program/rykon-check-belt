import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Carregar variáveis de ambiente
config({ path: join(__dirname, '../../.env') });

// Importar entidades
import { Person, TipoCadastro } from '../people/entities/person.entity';
import {
  FaixaDef,
  CategoriaFaixa,
} from '../graduacao/entities/faixa-def.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { AlunoGraduacao } from '../graduacao/entities/aluno-graduacao.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AlunoFaixaGrau } from '../graduacao/entities/aluno-faixa-grau.entity';

// Configuração do DataSource
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'teamcruz',
  entities: [
    Person,
    FaixaDef,
    AlunoFaixa,
    AlunoGraduacao,
    Usuario,
    AlunoFaixaGrau,
  ],
  synchronize: false,
  logging: true,
});

async function seedHistoricoGraduacao() {
  try {
    await AppDataSource.initialize();
    console.log('DataSource inicializado');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Buscar alunos existentes
      const alunos = await queryRunner.manager.find(Person, {
        where: { tipo_cadastro: TipoCadastro.ALUNO },
        take: 2, // Pegar apenas 2 alunos para criar histórico
      });

      if (alunos.length === 0) {
        console.log('Nenhum aluno encontrado');
        await queryRunner.rollbackTransaction();
        return;
      }

      // Buscar faixas para simular graduações
      const faixas = await queryRunner.manager.find(FaixaDef, {
        where: { categoria: CategoriaFaixa.ADULTO, ativo: true },
        order: { ordem: 'ASC' },
      });

      if (faixas.length < 3) {
        console.log('Não há faixas suficientes para simular graduações');
        await queryRunner.rollbackTransaction();
        return;
      }

      console.log(
        `Criando histórico de graduação para ${alunos.length} alunos...`,
      );

      for (let i = 0; i < Math.min(alunos.length, 2); i++) {
        const aluno = alunos[i];

        // Simular graduação da faixa branca para amarela
        if (faixas.length >= 2) {
          const graduacao1 = queryRunner.manager.create(AlunoGraduacao, {
            aluno_id: aluno.id,
            faixa_origem_id: faixas[0].id, // Branca
            faixa_destino_id: faixas[1].id, // Amarela
            observacao: 'Graduação de teste - primeira graduação',
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 dias atrás
          });
          await queryRunner.manager.save(graduacao1);
          console.log(
            `Graduação criada: ${aluno.nome_completo} - Branca -> Amarela`,
          );
        }

        // Para o primeiro aluno, simular também graduação de amarela para laranja
        if (i === 0 && faixas.length >= 3) {
          const graduacao2 = queryRunner.manager.create(AlunoGraduacao, {
            aluno_id: aluno.id,
            faixa_origem_id: faixas[1].id, // Amarela
            faixa_destino_id: faixas[2].id, // Laranja
            observacao: 'Graduação de teste - segunda graduação',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
          });
          await queryRunner.manager.save(graduacao2);
          console.log(
            `Graduação criada: ${aluno.nome_completo} - Amarela -> Laranja`,
          );
        }
      }

      await queryRunner.commitTransaction();
      console.log('Histórico de graduações criado com sucesso!');

      // Verificar total de graduações
      const totalGraduacoes = await AppDataSource.manager.count(AlunoGraduacao);
      console.log(`Total de graduações no banco: ${totalGraduacoes}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Erro durante a transação:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Erro ao executar seed:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Executar o seed
seedHistoricoGraduacao();
