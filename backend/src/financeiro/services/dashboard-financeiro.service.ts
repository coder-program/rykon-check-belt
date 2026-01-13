import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { FaturasService } from './faturas.service';
import { DespesasService } from './despesas.service';
import { TransacoesService } from './transacoes.service';
import { AssinaturasService } from './assinaturas.service';
import { VendasService } from './vendas.service';
import { StatusFatura } from '../entities/fatura.entity';
import { Unidade } from '../../people/entities/unidade.entity';

@Injectable()
export class DashboardFinanceiroService {
  constructor(
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    private faturasService: FaturasService,
    private despesasService: DespesasService,
    private transacoesService: TransacoesService,
    private assinaturasService: AssinaturasService,
    private vendasService: VendasService,
    private readonly dataSource: DataSource,
  ) {}

  async getDashboard(
    user: any,
    unidade_id?: string,
    mes?: string,
  ): Promise<any> {
    try {
      // Verificar se é franqueado (pode estar em perfis ou tipo_usuario)
      const isFranqueado =
        user.tipo_usuario === 'FRANQUEADO' ||
        user.perfis?.some(
          (p: any) =>
            (typeof p === 'string' ? p : p.nome)?.toUpperCase() ===
            'FRANQUEADO',
        );

      // Se for franqueado e não tem unidade_id, buscar todas as unidades do franqueado
      let unidadeFiltro = unidade_id;
      let unidadesIds: string[] = [];

      if (!unidade_id && isFranqueado) {
        // Buscar franqueado_id na tabela franqueados
        const franqueadoResult = await this.dataSource.query(
          'SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1',
          [user.id],
        );

        if (franqueadoResult.length === 0) {
          console.error(
            '❌ [DASHBOARD-SERVICE] Franqueado não encontrado para usuario_id:',
            user.id,
          );
          return this.getEmptyDashboard();
        }

        const franqueado_id = franqueadoResult[0].id;
        // Buscar unidades do franqueado
        const unidades = await this.unidadeRepository.find({
          where: { franqueado_id: franqueado_id },
          select: ['id'],
        });

        if (unidades.length === 0) {
          console.warn('⚠️ Franqueado sem unidades');
          return this.getEmptyDashboard();
        }

        // Salvar IDs das unidades para filtrar dados agregados
        unidadesIds = unidades.map((u) => u.id);

        // Vamos agregar dados de TODAS as unidades do franqueado
        // Para queries simples (que aceitam um unidade_id), vamos iterar
        // Para queries mais complexas, vamos precisar de outra abordagem
      }

      // Buscar faturas pendentes (quantidade, não valor)
      let faturasPendentesCount = 0;
      let faturasAtrasadasCount = 0;
      let valorPendente = 0;
      
      if (unidadesIds.length > 0) {
        // Franqueado: soma de todas as unidades
        for (const uid of unidadesIds) {
          faturasPendentesCount += await this.faturasService.contarPendentes(uid);
          faturasAtrasadasCount += await this.faturasService.contarAtrasadas(uid);
          valorPendente += await this.faturasService.somarPendentes(uid);
        }
      } else {
        // Gerente ou outro: uma unidade apenas
        faturasPendentesCount = await this.faturasService.contarPendentes(unidadeFiltro);
        faturasAtrasadasCount = await this.faturasService.contarAtrasadas(unidadeFiltro);
        valorPendente = await this.faturasService.somarPendentes(unidadeFiltro);
      }

      // Buscar despesas pendentes (quantidade e valor)
      let despesasPendentesCount = 0;
      let despesasPendentesValor = 0;
      try {
        if (unidadesIds.length > 0) {
          for (const uid of unidadesIds) {
            despesasPendentesCount += await this.despesasService.contarPendentes(uid);
            despesasPendentesValor += await this.despesasService.somarPendentes(uid);
          }
        } else {
          despesasPendentesCount = await this.despesasService.contarPendentes(unidadeFiltro);
          despesasPendentesValor = await this.despesasService.somarPendentes(unidadeFiltro);
        }
      } catch (error) {
        console.warn('⚠️ [DASHBOARD] Erro ao buscar despesas pendentes:', error.message);
      }

      // Buscar assinaturas ativas
      let assinaturasAtivas: any[] = [];
      if (unidadesIds.length > 0) {
        for (const uid of unidadesIds) {
          const assinaturasUnidade = await this.assinaturasService.findAll(
            uid,
            'ATIVA' as any,
          );
          assinaturasAtivas.push(...assinaturasUnidade);
        }
      } else {
        assinaturasAtivas = await this.assinaturasService.findAll(
          unidadeFiltro,
          'ATIVA' as any,
        );
      }

      // Calcular totais do mês atual
      const hoje = new Date();
      const mesAtual = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;

      let faturasMes: any[] = [];
      if (unidadesIds.length > 0) {
        for (const uid of unidadesIds) {
          const faturas = await this.faturasService.findAll(
            uid,
            undefined,
            mesAtual,
          );
          faturasMes.push(...faturas);
        }
      } else {
        faturasMes = await this.faturasService.findAll(
          unidadeFiltro,
          undefined,
          mesAtual,
        );
      }
      const receitasMes = faturasMes
        .filter((f) => f.status === 'PAGA')
        .reduce((sum, f) => sum + Number(f.valor_pago || 0), 0);

      // Buscar vendas online do mês e adicionar às receitas
      let vendasMes: any[] = [];
      if (unidadesIds.length > 0) {
        // Franqueado: buscar vendas de todas as unidades
        const franqueadoResult = await this.dataSource.query(
          'SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1',
          [user.id],
        );
        const franqueado_id = franqueadoResult[0]?.id;
        if (franqueado_id) {
          vendasMes = await this.vendasService.findAll({}, franqueado_id);
        }
      } else {
        // Gerente: buscar vendas da unidade
        vendasMes = await this.vendasService.findAll({
          unidadeId: unidadeFiltro,
        });
      }

      // Filtrar vendas do mês atual e pagas
      const vendasMesAtual = vendasMes.filter((v) => {
        const dataVenda = new Date(v.created_at);
        const mesVenda = `${dataVenda.getFullYear()}-${(dataVenda.getMonth() + 1).toString().padStart(2, '0')}`;
        return mesVenda === mesAtual && v.status === 'PAGO';
      });

      const receitasVendas = vendasMesAtual.reduce(
        (sum, v) => sum + Number(v.valor || 0),
        0,
      );

      const receitasTotaisMes = receitasMes + receitasVendas;

      // Contar vendas pendentes (não pagas)
      const vendasPendentes = vendasMes.filter(
        (v) => v.status === 'PENDENTE' || v.status === 'AGUARDANDO_PAGAMENTO',
      );
      const vendasPendentesCount = vendasPendentes.length;
      const vendasPendentesValor = vendasPendentes.reduce(
        (sum, v) => sum + Number(v.valor || 0),
        0,
      );

      // Buscar despesas do mês
      let totalDespesasMes = 0;
      try {
        if (unidadesIds.length > 0) {
          // Franqueado: soma de todas as unidades
          for (const uid of unidadesIds) {
            totalDespesasMes += await this.despesasService.somarPendentes(uid);
          }
        } else {
          // Gerente ou outro: uma unidade apenas
          totalDespesasMes =
            await this.despesasService.somarPendentes(unidadeFiltro);
        }
      } catch (error) {
        console.warn('⚠️ [DASHBOARD] Erro ao buscar despesas:', error.message);
      }

      const resultado = {
        totalReceitasMes: receitasTotaisMes,
        totalDespesasMes: totalDespesasMes,
        saldoMes: receitasTotaisMes - totalDespesasMes,
        faturasPendentes: faturasPendentesCount, // Quantidade de faturas a receber
        faturasPagas: faturasMes.filter((f) => f.status === StatusFatura.PAGA)
          .length,
        faturasAtrasadas: faturasAtrasadasCount, // Quantidade de faturas atrasadas
        valorFaturasPendentes: valorPendente, // Valor total faturas pendentes
        despesasPendentes: despesasPendentesCount, // Quantidade de despesas a pagar
        valorDespesasPendentes: despesasPendentesValor, // Valor total despesas pendentes
        vendasPendentes: vendasPendentesCount, // Quantidade de vendas online pendentes
        valorVendasPendentes: vendasPendentesValor, // Valor total vendas pendentes
        totalAssinaturasAtivas: assinaturasAtivas.length,
        previsaoReceitaMesProximo: assinaturasAtivas.reduce(
          (sum, a) => sum + Number(a.valor || 0),
          0,
        ),
      };

      return resultado;
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      return this.getEmptyDashboard();
    }
  }

  private getEmptyDashboard() {
    return {
      totalReceitasMes: 0,
      totalDespesasMes: 0,
      saldoMes: 0,
      faturasPendentes: 0,
      faturasPagas: 0,
      faturasAtrasadas: 0,
      totalAssinaturasAtivas: 0,
      previsaoReceitaMesProximo: 0,
    };
  }

  async getEvolucaoReceita(
    user: any,
    unidade_id?: string,
    meses = 6,
  ): Promise<any> {

    // Verificar se é franqueado (pode estar em perfis ou tipo_usuario)
    const isFranqueado =
      user.tipo_usuario === 'FRANQUEADO' ||
      user.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );


    // Verificar se é franqueado e buscar suas unidades
    let unidadesIds: string[] = [];
    if (!unidade_id && isFranqueado) {
      // Buscar franqueado_id na tabela franqueados
      const franqueadoResult = await this.dataSource.query(
        'SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1',
        [user.id],
      );

      if (franqueadoResult.length > 0) {
        const franqueado_id = franqueadoResult[0].id;

        const unidades = await this.unidadeRepository.find({
          where: { franqueado_id: franqueado_id },
          select: ['id'],
        });
        unidadesIds = unidades.map((u) => u.id);
      }
    }

    // Se não tem unidade_id E não é franqueado E usuário tem unidade, usar unidade do usuário
    if (!unidade_id && !isFranqueado && user.unidade_id) {
      unidade_id = user.unidade_id;
    }

    const dados: Array<{
      mes: string;
      receita: number;
      despesas: number;
      saldo: number;
      data: string;
    }> = [];
    const hoje = new Date();

    for (let i = meses - 1; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesString = `${mes.getFullYear()}-${(mes.getMonth() + 1).toString().padStart(2, '0')}`;
      const dataString = mes.toISOString().split('T')[0];

      try {
        let faturasMes: any[] = [];
        if (unidadesIds.length > 0) {
          // Franqueado: agregar faturas de todas as unidades
          for (const uid of unidadesIds) {
            const faturas = await this.faturasService.findAll(
              uid,
              undefined,
              mesString,
            );
            faturasMes.push(...faturas);
          }
        } else if (unidade_id) {
          // Gerente ou outro: uma unidade apenas
          faturasMes = await this.faturasService.findAll(
            unidade_id,
            undefined,
            mesString,
          );
        } else {
          console.warn(
            `⚠️ [EVOLUCAO-RECEITA] Sem unidade_id para buscar faturas do mês ${mesString}`,
          );
        }

        const receita = faturasMes
          .filter((f) => f.status === 'PAGA')
          .reduce((sum, f) => sum + Number(f.valor_pago || 0), 0);

        dados.push({
          mes: mesString,
          data: dataString,
          receita: receita,
          despesas: 0, // Implementar depois
          saldo: receita,
        });
      } catch (error) {
        dados.push({
          mes: mesString,
          data: dataString,
          receita: 0,
          despesas: 0,
          saldo: 0,
        });
      }
    }

    return dados;
  }

  async getInadimplencia(user: any, unidade_id?: string): Promise<any> {
    try {
      // Verificar se é franqueado (pode estar em perfis ou tipo_usuario)
      const isFranqueado =
        user.tipo_usuario === 'FRANQUEADO' ||
        user.perfis?.some(
          (p: any) =>
            (typeof p === 'string' ? p : p.nome)?.toUpperCase() ===
            'FRANQUEADO',
        );

      // Verificar se é franqueado e buscar suas unidades
      let faturasMes: any[] = [];
      if (!unidade_id && isFranqueado) {
        // Buscar franqueado_id na tabela franqueados
        const franqueadoResult = await this.dataSource.query(
          'SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1',
          [user.id],
        );

        if (franqueadoResult.length > 0) {
          const franqueado_id = franqueadoResult[0].id;

          const unidades = await this.unidadeRepository.find({
            where: { franqueado_id: franqueado_id },
            select: ['id'],
          });
          const unidadesIds = unidades.map((u) => u.id);

          for (const uid of unidadesIds) {
            const faturas = await this.faturasService.findAll(uid);
            faturasMes.push(...faturas);
          }
        }
      } else {
        faturasMes = await this.faturasService.findAll(unidade_id);
      }

      const pagas = faturasMes.filter(
        (f) => f.status === StatusFatura.PAGA,
      ).length;
      const pendentes = faturasMes.filter(
        (f) => f.status === StatusFatura.PENDENTE,
      ).length;
      const vencidas = faturasMes.filter(
        (f) => f.status === StatusFatura.VENCIDA,
      ).length;

      return {
        pagas,
        pendentes,
        vencidas,
        total: faturasMes.length,
      };
    } catch (error) {
      console.error('Erro ao buscar inadimplência:', error);
      return {
        pagas: 0,
        pendentes: 0,
        vencidas: 0,
        total: 0,
      };
    }
  }

  async getComparacaoUnidades(user: any): Promise<any> {
    try {
      // Verificar se é franqueado (pode estar em perfis ou tipo_usuario)
      const isFranqueado =
        user.tipo_usuario === 'FRANQUEADO' ||
        user.perfis?.some(
          (p: any) =>
            (typeof p === 'string' ? p : p.nome)?.toUpperCase() ===
            'FRANQUEADO',
        );

      // Verificar se é franqueado e buscar suas unidades
      let unidadesIds: string[] = [];
      if (isFranqueado) {
        // Buscar franqueado_id na tabela franqueados
        const franqueadoResult = await this.dataSource.query(
          'SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1',
          [user.id],
        );

        if (franqueadoResult.length === 0) {
          return [];
        }

        const franqueado_id = franqueadoResult[0].id;

        const unidades = await this.unidadeRepository.find({
          where: { franqueado_id: franqueado_id },
          select: ['id', 'nome'],
        });
        unidadesIds = unidades.map((u) => u.id);

        // Se for franqueado, vamos comparar apenas suas unidades
        const unidadesMap = new Map<
          string,
          { receita: number; nome: string }
        >();

        // Inicializar com todas as unidades do franqueado
        for (const unidade of unidades) {
          unidadesMap.set(unidade.id, {
            receita: 0,
            nome: unidade.nome || `Unidade ${unidade.id}`,
          });
        }

        // Buscar faturas de cada unidade
        for (const uid of unidadesIds) {
          const faturas = await this.faturasService.findAll(
            uid,
            StatusFatura.PAGA,
          );
          const receita = faturas.reduce(
            (sum, f) => sum + Number(f.valor_pago || 0),
            0,
          );

          const current = unidadesMap.get(uid);
          if (current) {
            current.receita = receita;
          }
        }

        // Converter para array
        const dados = Array.from(unidadesMap.entries()).map(([id, data]) => ({
          unidade_id: id,
          nome: data.nome,
          receita: data.receita,
        }));

        // Ordenar por receita (decrescente)
        dados.sort((a, b) => b.receita - a.receita);

        return dados;
      } else {
        // Para outros usuários, buscar todas as faturas e agrupar
        const todasFaturas = await this.faturasService.findAll();

        // Agrupar por unidade
        const unidadesMap = new Map<
          string,
          { receita: number; nome: string }
        >();

        for (const fatura of todasFaturas) {
          if (fatura.status === StatusFatura.PAGA && fatura.aluno) {
            // Buscar a unidade do aluno através da relação
            const unidadeId = fatura.aluno.unidade_id?.toString();
            if (unidadeId) {
              const current = unidadesMap.get(unidadeId) || {
                receita: 0,
                nome: `Unidade ${unidadeId}`,
              };
              current.receita += fatura.valor_pago;
              unidadesMap.set(unidadeId, current);
            }
          }
        }

        // Converter para array
        const dados = Array.from(unidadesMap.entries()).map(([id, data]) => ({
          unidade_id: id,
          nome: data.nome,
          receita: data.receita,
        }));

        // Ordenar por receita (decrescente)
        dados.sort((a, b) => b.receita - a.receita);

        return dados;
      }
    } catch (error) {
      console.error('Erro ao buscar comparação unidades:', error);
      return [];
    }
  }
}
