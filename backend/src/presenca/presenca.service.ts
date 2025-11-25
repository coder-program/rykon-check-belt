import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThan,
  Like,
  DataSource,
  In,
  IsNull,
  Not,
} from 'typeorm';
import {
  Presenca,
  PresencaMetodo,
  PresencaStatus,
} from './entities/presenca.entity';
import { Aula } from './entities/aula.entity';
import { Person, TipoCadastro } from '../people/entities/person.entity';
import { Aluno, StatusAluno } from '../people/entities/aluno.entity';
import { Responsavel } from '../people/entities/responsavel.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { Unidade } from '../people/entities/unidade.entity';
import { GraduacaoService } from '../graduacao/graduacao.service';

export interface AulaAtiva {
  id: string;
  nome: string;
  professor: string;
  unidade: string;
  horarioInicio: string;
  horarioFim: string;
  qrCode: string;
}

export interface EstatisticasPresenca {
  presencaMensal: number;
  aulasMes: number;
  sequenciaAtual: number;
  ultimaPresenca: string | null;
}

@Injectable()
export class PresencaService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Presenca)
    private readonly presencaRepository: Repository<Presenca>,
    @InjectRepository(Aula)
    private readonly aulaRepository: Repository<Aula>,
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
    @InjectRepository(Responsavel)
    private readonly responsavelRepository: Repository<Responsavel>,
    @InjectRepository(AlunoFaixa)
    private readonly alunoFaixaRepository: Repository<AlunoFaixa>,
    @InjectRepository(Unidade)
    private readonly unidadeRepository: Repository<Unidade>,
    private readonly graduacaoService: GraduacaoService,
  ) {}

  async getAulaAtiva(user: any): Promise<AulaAtiva | null> {
    const agora = new Date();
    const diaHoje = agora.getDay();
    const horaAgora = agora.toTimeString().slice(0, 5); // HH:MM

    // Buscar aulas ativas no banco
    const aulas = await this.aulaRepository.find({
      where: {
        dia_semana: diaHoje,
        ativo: true,
      },
      relations: ['unidade', 'professor'],
    });

    // Filtrar aulas que estão acontecendo agora
    for (const aula of aulas) {
      if (aula.estaAtiva()) {
        // Gerar QR Code se ainda não tiver ou se for antigo (mais de 1 hora)
        const precisaNovoQR =
          !aula.qr_code ||
          !aula.qr_code_gerado_em ||
          Date.now() - aula.qr_code_gerado_em.getTime() > 3600000;

        if (precisaNovoQR) {
          aula.qr_code = aula.gerarQRCode();
          aula.qr_code_gerado_em = new Date();
          await this.aulaRepository.save(aula);
        }

        return {
          id: aula.id,
          nome: aula.nome,
          professor: aula.professor?.nome_completo || 'Professor',
          unidade: aula.unidade?.nome || 'Unidade',
          horarioInicio: aula.hora_inicio,
          horarioFim: aula.hora_fim,
          qrCode: aula.qr_code,
        };
      }
    }

    return null;
  }

  async checkInQR(qrCode: string, user: any) {
    // Validar QR Code
    if (!qrCode || !qrCode.startsWith('QR-AULA-')) {
      throw new BadRequestException('QR Code inválido');
    }

    // Extrair aula_id do QR Code
    const qrParts = qrCode.split('-');
    const aulaId = qrParts.length >= 3 ? qrParts[2] : null;

    if (!aulaId) {
      throw new BadRequestException('QR Code inválido - não contém ID da aula');
    }

    // Verificar se a aula existe e está ativa
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId },
      relations: ['unidade'],
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    if (!aula.estaAtiva()) {
      throw new BadRequestException(
        'Esta aula não está disponível para check-in no momento',
      );
    }

    // Buscar aluno
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se já fez check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        aluno_id: aluno.id,
        created_at: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Você já fez check-in hoje');
    }

    // Registrar presença
    const presenca = this.presencaRepository.create({
      aluno_id: aluno.id,
      aula_id: aula.id,
      status: PresencaStatus.PRESENTE,
      modo_registro: PresencaMetodo.QR_CODE,
      hora_checkin: new Date(),
      observacoes: `QR Code: ${qrCode}`,
      created_by: user.id,
    });

    const presencaSalva = await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação - buscar aluno_faixa ativa
    try {
      const alunoFaixaAtiva = await this.alunoFaixaRepository.findOne({
        where: {
          aluno_id: aluno.id,
          ativa: true,
        },
      });

      if (alunoFaixaAtiva) {
        alunoFaixaAtiva.presencas_no_ciclo += 1;
        alunoFaixaAtiva.presencas_total_fx += 1;
        await this.alunoFaixaRepository.save(alunoFaixaAtiva);
      }
    } catch (error) {
      console.error(
        '❌ [checkInQR] Erro ao incrementar graduação:',
        error.message,
      );
    }

    return {
      success: true,
      message: 'Check-in realizado com sucesso!',
      presenca: presencaSalva,
    };
  }

  async checkInManual(aulaId: string, user: any) {
    // Buscar aluno
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Buscar aula
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId },
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    // Verificar se já fez check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        aluno_id: aluno.id,
        created_at: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Você já fez check-in hoje');
    }

    // Registrar presença manual
    const presenca = this.presencaRepository.create({
      aluno_id: aluno.id,
      aula_id: aula.id,
      status: PresencaStatus.PRESENTE,
      modo_registro: PresencaMetodo.MANUAL,
      hora_checkin: new Date(),
      observacoes: `Check-in manual - Aula: ${aula.nome}`,
      created_by: user.id,
    });

    const presencaSalva = await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação
    try {
      const alunoFaixaAtiva = await this.alunoFaixaRepository.findOne({
        where: {
          aluno_id: aluno.id,
          ativa: true,
        },
      });

      if (alunoFaixaAtiva) {
        alunoFaixaAtiva.presencas_no_ciclo += 1;
        alunoFaixaAtiva.presencas_total_fx += 1;
        await this.alunoFaixaRepository.save(alunoFaixaAtiva);
      }
    } catch (error) {
      console.error(
        '❌ [checkInManual] Erro ao incrementar graduação:',
        error.message,
      );
    }

    return {
      success: true,
      message: 'Check-in manual realizado com sucesso!',
      presenca: presencaSalva,
    };
  }

  async checkInDependente(alunoId: string, aulaId: string, user: any) {
    // Buscar o responsável
    const responsavel = await this.responsavelRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (!responsavel) {
      throw new UnauthorizedException('Usuário não é um responsável');
    }

    // Buscar aluno e verificar se é dependente do responsável
    const aluno = await this.alunoRepository.findOne({
      where: {
        id: alunoId,
        responsavel_id: responsavel.id,
      },
    });

    if (!aluno) {
      throw new NotFoundException(
        'Dependente não encontrado ou não pertence a este responsável',
      );
    }

    // Buscar aula
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId },
      relations: ['unidade'],
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    // Buscar configuração da unidade para verificar se requer aprovação
    const unidade = await this.unidadeRepository.findOne({
      where: { id: aula.unidade_id },
      select: ['id', 'nome', 'requer_aprovacao_checkin'],
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    // Verificar se já fez check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        aluno_id: aluno.id,
        created_at: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException(
        `${aluno.nome_completo} já fez check-in hoje`,
      );
    }

    // Definir status de aprovação baseado na configuração da unidade
    const statusAprovacao = unidade.requer_aprovacao_checkin
      ? 'PENDENTE'
      : 'APROVADO';

    // Registrar presença
    const presenca = this.presencaRepository.create({
      aluno_id: aluno.id,
      aula_id: aula.id,
      status: PresencaStatus.PRESENTE,
      modo_registro: PresencaMetodo.MANUAL,
      status_aprovacao: statusAprovacao,
      hora_checkin: new Date(),
      observacoes: `Check-in pelo responsável - Aula: ${aula.nome}`,
      created_by: user.id,
      // Se for aprovação automática, já preencher campos de aprovação
      ...(statusAprovacao === 'APROVADO' && {
        aprovado_por_id: user.id,
        aprovado_em: new Date(),
        observacao_aprovacao:
          'Aprovado automaticamente (unidade não requer aprovação)',
      }),
    });

    const presencaSalva = await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação apenas se aprovado automaticamente
    if (statusAprovacao === 'APROVADO') {
      try {
        const alunoFaixaAtiva = await this.alunoFaixaRepository.findOne({
          where: {
            aluno_id: aluno.id,
            ativa: true,
          },
        });

        if (alunoFaixaAtiva) {
          alunoFaixaAtiva.presencas_no_ciclo += 1;
          alunoFaixaAtiva.presencas_total_fx += 1;
          await this.alunoFaixaRepository.save(alunoFaixaAtiva);
        }
      } catch (error) {
        console.error(
          '❌ [checkInDependente] Erro ao incrementar graduação:',
          error.message,
        );
      }
    }

    const mensagem = unidade.requer_aprovacao_checkin
      ? `Check-in de ${aluno.nome_completo} registrado. Aguardando aprovação.`
      : `Check-in de ${aluno.nome_completo} realizado e aprovado automaticamente!`;

    return {
      success: true,
      message: mensagem,
      presenca: presencaSalva,
    };
  }

  async getMinhasEstatisticas(user: any): Promise<EstatisticasPresenca> {
    // Buscar aluno pelo usuario_id
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (!aluno) {
      return {
        presencaMensal: 0,
        aulasMes: 0,
        sequenciaAtual: 0,
        ultimaPresenca: null,
      };
    }

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

    // Presenças do mês atual
    const presencasMes = await this.presencaRepository.count({
      where: {
        aluno_id: aluno.id,
        created_at: Between(inicioMes, fimMes),
      },
    });

    // Total de dias úteis no mês (aproximação)
    const diasUteisMes = 22; // Aproximadamente 22 dias úteis por mês
    const presencaMensal = Math.round((presencasMes / diasUteisMes) * 100);

    // Última presença
    const ultimaPresenca = await this.presencaRepository.findOne({
      where: { aluno_id: aluno.id },
      order: { created_at: 'DESC' },
    });

    // Sequência atual (simplificado)
    const sequenciaAtual = await this.calcularSequenciaAtual(aluno.id);

    return {
      presencaMensal: Math.min(presencaMensal, 100),
      aulasMes: presencasMes,
      sequenciaAtual,
      ultimaPresenca: ultimaPresenca?.created_at.toISOString() || null,
    };
  }

  async getMinhaHistorico(user: any, limit: number = 10) {
    // Buscar aluno pelo usuario_id
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (!aluno) {
      return [];
    }

    const presencas = await this.presencaRepository.find({
      where: { aluno_id: aluno.id },
      order: { created_at: 'DESC' },
      take: limit,
    });

    // Buscar informações das aulas para cada presença
    const presencasComAulas = await Promise.all(
      presencas.map(async (p) => {
        const aula = await this.aulaRepository.findOne({
          where: { id: p.aula_id },
          relations: ['unidade', 'professor'],
        });

        return {
          id: p.id,
          data: p.created_at,
          horario: p.hora_checkin.toTimeString().slice(0, 5),
          tipo: 'entrada',
          aula: {
            nome: aula?.nome || 'Aula não encontrada',
            professor: aula?.professor?.nome_completo || 'Professor',
            unidade: aula?.unidade?.nome || 'Unidade',
          },
        };
      }),
    );

    return presencasComAulas;
  }

  async checkInCPF(cpf: string, aulaId: string, adminUser: any) {
    // Buscar aluno pelo CPF na tabela alunos - tentar com e sem formatação
    const cpfSemFormatacao = cpf.replace(/\D/g, '');
    const cpfComFormatacao = cpf;

    const aluno = await this.alunoRepository.findOne({
      where: [{ cpf: cpfSemFormatacao }, { cpf: cpfComFormatacao }],
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado com este CPF');
    }

    return this.realizarCheckInAdmin(aluno.id, aulaId, 'cpf', adminUser);
  }

  async checkInNome(nome: string, aulaId: string, adminUser: any) {
    // Buscar aluno pelo nome na tabela alunos
    const aluno = await this.alunoRepository.findOne({
      where: {
        nome_completo: nome,
      },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado com este nome');
    }

    return this.realizarCheckInAdmin(aluno.id, aulaId, 'nome', adminUser);
  }

  private async realizarCheckInAdmin(
    alunoId: string,
    aulaId: string,
    metodo: string,
    adminUser: any,
  ) {
    // Verificar se já fez check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        aluno_id: alunoId,
        created_at: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Aluno já fez check-in hoje');
    }

    // Registrar presença
    const presenca = this.presencaRepository.create({
      aluno_id: alunoId,
      aula_id: aulaId,
      status: PresencaStatus.PRESENTE,
      modo_registro: metodo as PresencaMetodo,
      hora_checkin: new Date(),
      observacoes: `Registrado por: ${adminUser.id}`,
      created_by: adminUser.id,
    });

    const presencaSalva = await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação
    try {
      await this.graduacaoService.incrementarPresenca(alunoId);
    } catch (error) {}

    return {
      success: true,
      message: 'Check-in administrativo realizado com sucesso!',
      presenca: presencaSalva,
    };
  }

  async getEstatisticasAdmin(user: any, periodo: string = 'hoje') {
    let dataInicio: Date;
    let dataFim: Date = new Date();

    switch (periodo) {
      case 'hoje':
        dataInicio = new Date();
        dataInicio.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 7);
        break;
      case 'mes':
        dataInicio = new Date();
        dataInicio.setMonth(dataInicio.getMonth() - 1);
        break;
      default:
        dataInicio = new Date();
        dataInicio.setHours(0, 0, 0, 0);
    }

    const totalPresencas = await this.presencaRepository.count({
      where: {
        created_at: Between(dataInicio, dataFim),
      },
    });

    const presencasPorMetodo = await this.presencaRepository
      .createQueryBuilder('presenca')
      .select('presenca.modo_registro', 'metodo')
      .addSelect('COUNT(*)', 'count')
      .where('presenca.created_at BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .groupBy('presenca.modo_registro')
      .getRawMany();

    const presencasPorHora = await this.presencaRepository
      .createQueryBuilder('presenca')
      .select('EXTRACT(HOUR FROM presenca.hora_checkin)', 'hora')
      .addSelect('COUNT(*)', 'count')
      .where('presenca.created_at BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .groupBy('EXTRACT(HOUR FROM presenca.hora_checkin)')
      .orderBy('hora')
      .getRawMany();

    return {
      periodo,
      totalPresencas,
      presencasPorMetodo,
      presencasPorHora,
      estatisticas: {
        mediaPresencasDia: Math.round(
          totalPresencas /
            Math.max(
              1,
              Math.ceil(
                (dataFim.getTime() - dataInicio.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            ),
        ),
        periodoAnalise: `${dataInicio.toLocaleDateString()} - ${dataFim.toLocaleDateString()}`,
      },
    };
  }

  async getRelatorioPresencas(
    user: any,
    dataInicio?: string,
    dataFim?: string,
    unidadeId?: string,
  ) {
    const inicio = dataInicio
      ? new Date(dataInicio)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fim = dataFim ? new Date(dataFim) : new Date();

    const query = this.presencaRepository
      .createQueryBuilder('presenca')
      .leftJoinAndSelect('presenca.pessoa', 'pessoa')
      .where('presenca.data BETWEEN :inicio AND :fim', { inicio, fim });

    if (unidadeId) {
      // Filtrar por unidade quando implementarmos a relação
      // query.andWhere('pessoa.unidadeId = :unidadeId', { unidadeId });
    }

    const presencas = await query.orderBy('presenca.data', 'DESC').getMany();

    return {
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      total: presencas.length,
      presencas: presencas.map((p) => ({
        id: p.id,
        data: p.created_at,
        aluno: {
          id: p.aluno_id,
          nome: 'Nome não encontrado', // Remover relação pessoa por enquanto
        },
        metodo: p.modo_registro || PresencaMetodo.MANUAL,
        detalhes: p.observacoes || '',
      })),
    };
  }

  async getFrequenciaUltimos30Dias(user: any, unidadeId?: string) {
    const hoje = new Date();
    const tresDiasAtras = new Date(hoje);
    tresDiasAtras.setDate(hoje.getDate() - 30);

    // Query SQL para contar presenças por dia
    let query = `
      SELECT
        DATE(p.hora_checkin) as data,
        COUNT(DISTINCT p.aluno_id) as total_presencas
      FROM teamcruz.presencas p
      INNER JOIN teamcruz.aulas a ON a.id = p.aula_id
      WHERE p.hora_checkin >= $1 AND p.hora_checkin <= $2
    `;

    const params: any[] = [tresDiasAtras, hoje];

    if (unidadeId) {
      query += ` AND a.unidade_id = $3`;
      params.push(unidadeId);
    }

    query += `
      GROUP BY DATE(p.hora_checkin)
      ORDER BY DATE(p.hora_checkin) ASC
    `;

    const resultado = await this.presencaRepository.manager.query(
      query,
      params,
    );

    // Preencher todos os dias mesmo sem dados
    const frequenciaPorDia: Array<{
      data: string;
      dia: number;
      mes: number;
      diaSemana: number;
      presencas: number;
    }> = [];
    for (let i = 29; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - i);
      data.setHours(0, 0, 0, 0);

      const dataStr = data.toISOString().split('T')[0];
      const registro = resultado.find((r: any) => {
        const rData = new Date(r.data);
        return rData.toISOString().split('T')[0] === dataStr;
      });

      frequenciaPorDia.push({
        data: dataStr,
        dia: data.getDate(),
        mes: data.getMonth() + 1,
        diaSemana: data.getDay(),
        presencas: registro ? parseInt(registro.total_presencas) : 0,
      });
    }

    // Calcular estatísticas
    const totalPresencas = frequenciaPorDia.reduce(
      (sum, d) => sum + d.presencas,
      0,
    );
    const mediaDiaria = Math.round(totalPresencas / 30);
    const maiorPico = Math.max(...frequenciaPorDia.map((d) => d.presencas));

    // Calcular tendência (primeiros 10 vs últimos 10 dias)
    const primeiros10 =
      frequenciaPorDia.slice(0, 10).reduce((s, d) => s + d.presencas, 0) / 10;
    const ultimos10 =
      frequenciaPorDia.slice(-10).reduce((s, d) => s + d.presencas, 0) / 10;
    const tendencia =
      primeiros10 > 0 ? ((ultimos10 - primeiros10) / primeiros10) * 100 : 0;

    return {
      dias: frequenciaPorDia,
      estatisticas: {
        mediaDiaria,
        maiorPico,
        totalPeriodo: totalPresencas,
        tendencia: Math.round(tendencia),
      },
    };
  }

  async getAlunosAusentes(user: any, unidadeId?: string, dias: number = 30) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    // Se não forneceu unidadeId, detectar automaticamente baseado no usuário
    let unidadeFiltro = unidadeId;

    if (!unidadeFiltro && user) {
      // Se for franqueado (não master), buscar unidades do franqueado
      const perfis =
        user.perfis?.map((p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
        ) || [];
      const isFranqueado = perfis.includes('FRANQUEADO');
      const isMaster = perfis.includes('MASTER') || perfis.includes('ADMIN');
      const isGerente = perfis.includes('GERENTE_UNIDADE');

      if (!isMaster) {
        if (isFranqueado) {
          // Franqueado: buscar primeira unidade do franqueado
          const unidadesResult = await this.presencaRepository.manager.query(
            `SELECT id FROM teamcruz.unidades WHERE franqueado_id =
             (SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1) LIMIT 1`,
            [user.id],
          );
          if (unidadesResult.length > 0) {
            unidadeFiltro = unidadesResult[0].id;
          }
        } else if (isGerente) {
          // Gerente: buscar unidade que ele gerencia
          const unidadeResult = await this.presencaRepository.manager.query(
            `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
            [user.id],
          );
          if (unidadeResult.length > 0) {
            unidadeFiltro = unidadeResult[0].unidade_id;
          }
        }
      }
    }

    // Query para buscar alunos e suas últimas presenças
    let query = `
      SELECT
        a.id,
        a.usuario_id,
        u.nome as nome_completo,
        u.cpf,
        MAX(pr.hora_checkin) as ultima_presenca,
        COUNT(DISTINCT DATE(pr.hora_checkin)) as total_presencas,
        $1 - COUNT(DISTINCT DATE(pr.hora_checkin)) as ausencias
      FROM teamcruz.alunos a
      INNER JOIN teamcruz.usuarios u ON u.id = a.usuario_id
      LEFT JOIN teamcruz.presencas pr ON pr.aluno_id = a.id
        AND pr.hora_checkin >= $2
      WHERE a.status = 'ATIVO'
    `;

    const params: any[] = [dias, dataLimite];

    if (unidadeFiltro) {
      query += ` AND a.unidade_id = $3`;
      params.push(unidadeFiltro);
    }

    query += `
      GROUP BY a.id, a.usuario_id, u.nome, u.cpf
      HAVING COUNT(DISTINCT DATE(pr.hora_checkin)) < $1
      ORDER BY ausencias DESC, ultima_presenca ASC NULLS FIRST
      LIMIT 20
    `;

    const resultado = await this.presencaRepository.manager.query(
      query,
      params,
    );

    return resultado.map((r: any) => ({
      id: r.id,
      nome: r.nome_completo || r.nome,
      cpf: r.cpf,
      ultimaPresenca: r.ultima_presenca
        ? new Date(r.ultima_presenca).toISOString()
        : null,
      totalPresencas: parseInt(r.total_presencas) || 0,
      ausencias: parseInt(r.ausencias) || dias,
      diasSemTreino: r.ultima_presenca
        ? Math.floor(
            (Date.now() - new Date(r.ultima_presenca).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : dias,
    }));
  }

  async getRankingProfessoresPresenca(user: any, unidadeId?: string) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    // Se não forneceu unidadeId, detectar automaticamente baseado no usuário
    let unidadeFiltro = unidadeId;

    if (!unidadeFiltro && user) {
      // Se for franqueado (não master), buscar unidades do franqueado
      const perfis =
        user.perfis?.map((p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
        ) || [];
      const isFranqueado = perfis.includes('FRANQUEADO');
      const isMaster = perfis.includes('MASTER') || perfis.includes('ADMIN');
      const isGerente = perfis.includes('GERENTE_UNIDADE');

      if (!isMaster) {
        if (isFranqueado) {
          // Franqueado: buscar primeira unidade do franqueado
          const unidadesResult = await this.presencaRepository.manager.query(
            `SELECT id FROM teamcruz.unidades WHERE franqueado_id =
             (SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1) LIMIT 1`,
            [user.id],
          );
          if (unidadesResult.length > 0) {
            unidadeFiltro = unidadesResult[0].id;
          }
        } else if (isGerente) {
          // Gerente: buscar unidade que ele gerencia
          const unidadeResult = await this.presencaRepository.manager.query(
            `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
            [user.id],
          );
          if (unidadeResult.length > 0) {
            unidadeFiltro = unidadeResult[0].unidade_id;
          }
        }
      }
    }

    // Query para buscar professores com estatísticas de aulas ministradas
    let query = `
      SELECT
        prof.id,
        prof.usuario_id,
        u.nome as nome_completo,
        prof.faixa_ministrante as faixa_nome,
        COUNT(DISTINCT aula.id) as total_aulas_dadas,
        COUNT(DISTINCT DATE(aula.data_hora_inicio)) as dias_trabalho,
        COUNT(DISTINCT aula.id) as aulas_presente,
        100.0 as taxa_presenca
      FROM teamcruz.professores prof
      INNER JOIN teamcruz.usuarios u ON u.id = prof.usuario_id
      INNER JOIN teamcruz.professor_unidades pu ON pu.professor_id = prof.id AND pu.ativo = true
      LEFT JOIN teamcruz.aulas aula ON aula.professor_id = prof.id
        AND aula.data_hora_inicio >= $1
      WHERE prof.status = 'ATIVO'
    `;

    const params: any[] = [dataLimite];

    if (unidadeFiltro) {
      query += ` AND pu.unidade_id = $2`;
      params.push(unidadeFiltro);
    }

    query += `
      GROUP BY prof.id, prof.usuario_id, u.nome, prof.faixa_ministrante
      HAVING COUNT(DISTINCT aula.id) > 0
      ORDER BY taxa_presenca DESC, total_aulas_dadas DESC
      LIMIT 20
    `;

    const resultado = await this.presencaRepository.manager.query(
      query,
      params,
    );

    return resultado.map((r: any) => ({
      id: r.id,
      nome: r.nome_completo,
      faixa: {
        nome: r.faixa_nome || 'Não definida',
      },
      totalAulas: parseInt(r.total_aulas_dadas) || 0,
      diasTrabalho: parseInt(r.dias_trabalho) || 0,
      aulasPresente: parseInt(r.aulas_presente) || 0,
      taxaPresenca: parseFloat(r.taxa_presenca) || 0,
    }));
  }

  async getRankingAlunosFrequencia(
    user: any,
    unidadeId?: string,
    limit: number = 10,
  ) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    // Se não forneceu unidadeId, detectar automaticamente baseado no usuário
    let unidadeFiltro = unidadeId;

    if (!unidadeFiltro && user) {
      // Se for franqueado (não master), buscar unidades do franqueado
      const perfis =
        user.perfis?.map((p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
        ) || [];
      const isFranqueado = perfis.includes('FRANQUEADO');
      const isMaster = perfis.includes('MASTER') || perfis.includes('ADMIN');
      const isGerente = perfis.includes('GERENTE_UNIDADE');

      if (!isMaster) {
        if (isFranqueado) {
          // Franqueado: buscar primeira unidade do franqueado
          const unidadesResult = await this.presencaRepository.manager.query(
            `SELECT id FROM teamcruz.unidades WHERE franqueado_id =
             (SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1) LIMIT 1`,
            [user.id],
          );
          if (unidadesResult.length > 0) {
            unidadeFiltro = unidadesResult[0].id;
          }
        } else if (isGerente) {
          // Gerente: buscar unidade que ele gerencia
          const unidadeResult = await this.presencaRepository.manager.query(
            `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
            [user.id],
          );
          if (unidadeResult.length > 0) {
            unidadeFiltro = unidadeResult[0].unidade_id;
          }
        }
      }
    }

    // Query para buscar alunos com melhor frequência
    let query = `
      SELECT
        a.id,
        a.usuario_id,
        u.nome as nome_completo,
        COUNT(DISTINCT pr.id) as total_presencas,
        COUNT(DISTINCT DATE(pr.hora_checkin)) as dias_presentes,
        ROUND(
          (COUNT(DISTINCT DATE(pr.hora_checkin))::numeric / 30.0 * 100), 1
        ) as taxa_frequencia,
        MAX(pr.hora_checkin) as ultima_presenca
      FROM teamcruz.alunos a
      INNER JOIN teamcruz.usuarios u ON u.id = a.usuario_id
      LEFT JOIN teamcruz.presencas pr ON pr.aluno_id = a.id
        AND pr.hora_checkin >= $1
        AND pr.status = 'presente'
      WHERE a.status = 'ATIVO'
    `;

    const params: any[] = [dataLimite];

    if (unidadeFiltro) {
      query += ` AND a.unidade_id = $2`;
      params.push(unidadeFiltro);
    }

    query += `
      GROUP BY a.id, a.usuario_id, u.nome
      HAVING COUNT(DISTINCT pr.id) > 0
      ORDER BY dias_presentes DESC, total_presencas DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);

    const resultado = await this.presencaRepository.manager.query(
      query,
      params,
    );

    return resultado.map((r: any) => ({
      id: r.id,
      nome: r.nome_completo,
      totalPresencas: parseInt(r.total_presencas) || 0,
      diasPresentes: parseInt(r.dias_presentes) || 0,
      taxaFrequencia: parseFloat(r.taxa_frequencia) || 0,
      streak: parseInt(r.dias_presentes) || 0, // Simplificado como dias presentes
      percent: parseFloat(r.taxa_frequencia) || 0,
    }));
  }

  async buscarAlunos(termo: string, user: any) {
    const query = this.personRepository
      .createQueryBuilder('pessoa')
      .where('pessoa.tipo_cadastro = :tipo', { tipo: TipoCadastro.ALUNO })
      .andWhere(
        '(pessoa.nome_completo ILIKE :termo OR pessoa.cpf LIKE :cpfTermo)',
        {
          termo: `%${termo}%`,
          cpfTermo: `%${termo.replace(/\D/g, '')}%`,
        },
      )
      .take(20);

    const alunos = await query.getMany();

    return alunos.map((aluno) => ({
      id: aluno.id,
      nome: aluno.nome_completo,
      cpf: aluno.cpf,
      email: aluno.email,
    }));
  }

  async getAulasDisponiveis(user: any, data?: string) {
    const hoje = data ? new Date(data) : new Date();
    const diaSemana = hoje.getDay();

    try {
      // Buscar unidade do aluno
      let unidadeId: string | null = null;

      const aluno = await this.alunoRepository.findOne({
        where: { usuario_id: user.id },
        relations: ['unidade'],
      });

      if (aluno?.unidade_id) {
        unidadeId = aluno.unidade_id;
      }

      // Buscar aulas ativas da unidade do aluno ou todas se não tiver unidade
      const whereConditions: any = {
        ativo: true,
        dia_semana: diaSemana,
      };

      if (unidadeId) {
        whereConditions.unidade_id = unidadeId;
      }

      const aulas = await this.aulaRepository.find({
        where: whereConditions,
        relations: ['unidade', 'professor'],
        order: {
          data_hora_inicio: 'ASC',
        },
      });

      // Filtrar aulas que ainda não começaram ou estão em andamento
      const agora = hoje.getTime();
      const aulasDisponiveis = aulas.filter((aula) => {
        if (aula.data_hora_fim) {
          return aula.data_hora_fim.getTime() > agora;
        }
        return true;
      });

      // Formatar resposta
      const aulasFormatadas = aulasDisponiveis.map((aula) => {
        // Se tiver data_hora_inicio, usar ela, senão criar uma data de hoje com o horário
        let dataAula = hoje;
        if (aula.data_hora_inicio) {
          dataAula = new Date(aula.data_hora_inicio);
        }

        // Contar quantos alunos já estão inscritos (presenças registradas)
        // Por enquanto, deixar como 0 - pode ser implementado depois
        const inscritos = 0;

        return {
          id: aula.id,
          nome: aula.nome,
          professor: aula.professor?.nome_completo || 'Professor não atribuído',
          unidade: aula.unidade?.nome || 'Unidade',
          horarioInicio: aula.hora_inicio,
          horarioFim: aula.hora_fim,
          data: dataAula.toISOString(),
          vagas: aula.capacidade_maxima || 30,
          inscritos: inscritos,
          tipo: aula.tipo,
        };
      });

      return aulasFormatadas;
    } catch (error) {
      console.error('❌ [getAulasDisponiveis] Erro ao buscar aulas:', error);
      // Em caso de erro, retornar array vazio ao invés de falhar
      return [];
    }
  }

  async checkInFacial(foto: string, aulaId: string, user: any) {
    // Verificar se já fez check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        aluno_id: user.id,
        created_at: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Você já fez check-in hoje');
    }

    // Por enquanto, vamos simular o reconhecimento facial
    // TODO: Implementar integração com serviço de reconhecimento facial
    if (!foto || foto.length < 100) {
      throw new BadRequestException('Foto inválida para reconhecimento');
    }

    // Registrar presença facial
    const presenca = this.presencaRepository.create({
      aluno_id: user.id,
      aula_id: aulaId,
      status: PresencaStatus.PRESENTE,
      modo_registro: PresencaMetodo.FACIAL,
      hora_checkin: new Date(),
      observacoes: 'Check-in via reconhecimento facial',
      created_by: user.id,
      peso_presenca: 1.0,
    });

    const presencaSalva = await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação se for aluno
    if (user.perfis?.includes('aluno')) {
      try {
        await this.graduacaoService.incrementarPresenca(user.id);
      } catch (error) {}
    }

    return {
      success: true,
      message: 'Check-in facial realizado com sucesso!',
      presenca: presencaSalva,
    };
  }

  async checkInResponsavel(
    alunoId: string,
    aulaId: string,
    responsavelUser: any,
  ) {
    // Verificar se o usuário logado é responsável do aluno
    const aluno = await this.personRepository.findOne({
      where: { id: alunoId },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se o responsável tem permissão para fazer check-in deste aluno
    // TODO: Implementar validação de relacionamento responsável-aluno
    // Por enquanto, vamos permitir apenas se o usuário for da mesma unidade ou for admin

    // Verificar se já fez check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        aluno_id: alunoId,
        created_at: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Este aluno já fez check-in hoje');
    }

    // Registrar presença pelo responsável
    const presenca = this.presencaRepository.create({
      aluno_id: alunoId,
      aula_id: aulaId,
      status: PresencaStatus.PRESENTE,
      modo_registro: PresencaMetodo.RESPONSAVEL,
      hora_checkin: new Date(),
      observacoes: `Check-in realizado pelo responsável: ${responsavelUser.name || responsavelUser.email}`,
      created_by: responsavelUser.id,
    });

    const presencaSalva = await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação do aluno
    try {
      await this.graduacaoService.incrementarPresenca(alunoId);
    } catch (error) {}

    return {
      success: true,
      message: 'Check-in do aluno realizado com sucesso!',
      presenca: presencaSalva,
    };
  }

  async getMeusFilhos(responsavelUser: any) {
    // Por enquanto, retornamos uma lista mockada
    // TODO: Implementar relacionamento responsável-aluno na base de dados

    // Buscar alunos que este usuário pode fazer check-in (simulado)
    const alunos = await this.personRepository.find({
      where: {
        tipo_cadastro: TipoCadastro.ALUNO,
        // TODO: Adicionar filtro por relacionamento responsável-aluno
      },
      take: 10,
    });

    // Verificar quais já fizeram check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencasHoje = await this.presencaRepository.find({
      where: {
        aluno_id: In(alunos.map((a) => a.id)),
        created_at: Between(hoje, amanha),
      },
    });

    const idsComPresenca = new Set(presencasHoje.map((p) => p.aluno_id));

    return alunos.map((aluno) => ({
      id: aluno.id,
      nome: aluno.nome_completo,
      graduacao: 'Branca', // TODO: Buscar graduação real
      jaFezCheckin: idsComPresenca.has(aluno.id),
    }));
  }

  async getRankingUnidade(
    user: any,
    mes?: number,
    ano?: number,
    alunoId?: string,
  ) {
    try {
      // Buscar unidade do aluno
      // Se alunoId foi passado, buscar por ID direto, senão buscar por usuario_id
      const aluno = await this.alunoRepository.findOne({
        where: alunoId ? { id: alunoId } : { usuario_id: user.id },
        relations: ['unidade'],
      });

      if (!aluno || !aluno.unidade_id) {
        return {
          posicao: null,
          totalAlunos: 0,
          ranking: [],
          categoria: null,
        };
      }

      // Usar mês e ano atuais se não foram fornecidos
      const dataRef = new Date();
      const mesRef = mes !== undefined ? mes : dataRef.getMonth() + 1; // 1-12
      const anoRef = ano !== undefined ? ano : dataRef.getFullYear();

      // Calcular primeiro e último dia do mês
      const primeiroDia = new Date(anoRef, mesRef - 1, 1);
      const ultimoDia = new Date(anoRef, mesRef, 0, 23, 59, 59);

      // Buscar todos os alunos ativos da mesma unidade
      const alunosDaUnidade = await this.alunoRepository.find({
        where: {
          unidade_id: aluno.unidade_id,
          status: StatusAluno.ATIVO,
        },
      });

      // Determinar categoria do aluno atual (INFANTIL: até 15 anos no ano atual, ADULTO: 16+)
      const anoNascimentoAluno = new Date(aluno.data_nascimento).getFullYear();
      const idadeNoAnoAtual = anoRef - anoNascimentoAluno;
      const categoriaAluno = idadeNoAnoAtual <= 15 ? 'INFANTIL' : 'ADULTO';

      // Filtrar alunos da mesma categoria
      const alunosMesmaCategoria = alunosDaUnidade.filter((alunoItem) => {
        const anoNascimento = new Date(alunoItem.data_nascimento).getFullYear();
        const idade = anoRef - anoNascimento;
        const categoria = idade <= 15 ? 'INFANTIL' : 'ADULTO';
        return categoria === categoriaAluno;
      });

      // Buscar presenças do mês para todos os alunos da mesma categoria
      const presencas = await this.presencaRepository
        .createQueryBuilder('presenca')
        .where('presenca.aluno_id IN (:...alunosIds)', {
          alunosIds: alunosMesmaCategoria.map((a) => a.id),
        })
        .andWhere('presenca.created_at >= :inicio', { inicio: primeiroDia })
        .andWhere('presenca.created_at <= :fim', { fim: ultimoDia })
        .getMany();

      // Contar presenças por aluno
      const presencasPorAluno = new Map<string, number>();

      for (const presenca of presencas) {
        const count = presencasPorAluno.get(presenca.aluno_id) || 0;
        presencasPorAluno.set(presenca.aluno_id, count + 1);
      }

      // Criar ranking com informações dos alunos
      const rankingComDetalhes = alunosMesmaCategoria.map((alunoItem) => ({
        alunoId: alunoItem.id,
        nome: alunoItem.nome_completo,
        faixa: alunoItem.faixa_atual,
        graus: alunoItem.graus,
        presencas: presencasPorAluno.get(alunoItem.id) || 0,
      }));

      // Ordenar por número de presenças (descendente)
      rankingComDetalhes.sort((a, b) => b.presencas - a.presencas);

      // Encontrar posição do aluno atual
      const posicaoAluno = rankingComDetalhes.findIndex(
        (item) => item.alunoId === aluno.id,
      );

      const posicao = posicaoAluno >= 0 ? posicaoAluno + 1 : null;
      const presencasDoAluno = presencasPorAluno.get(aluno.id) || 0;

      // Retornar apenas o top 10 no ranking completo
      const top10 = rankingComDetalhes.slice(0, 10).map((item, index) => ({
        posicao: index + 1,
        nome: item.nome,
        faixa: item.faixa,
        graus: item.graus,
        presencas: item.presencas,
        isUsuarioAtual: item.alunoId === aluno.id,
      }));

      return {
        posicao,
        presencas: presencasDoAluno,
        totalAlunos: alunosMesmaCategoria.length,
        mes: mesRef,
        ano: anoRef,
        categoria: categoriaAluno,
        ranking: top10,
      };
    } catch (error) {
      console.error('❌ [getRankingUnidade] Erro ao buscar ranking:', error);
      return {
        posicao: null,
        totalAlunos: 0,
        ranking: [],
        categoria: null,
      };
    }
  }

  private async calcularSequenciaAtual(pessoaId: string): Promise<number> {
    // Buscar presenças dos últimos 30 dias em ordem decrescente
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const presencas = await this.presencaRepository.find({
      where: {
        aluno_id: pessoaId,
        created_at: Between(trintaDiasAtras, new Date()),
      },
      order: { created_at: 'DESC' },
    });

    if (presencas.length === 0) return 0;

    // Calcular sequência de dias consecutivos
    let sequencia = 0;
    let dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);

    for (const presenca of presencas) {
      const dataPresenca = new Date(presenca.created_at);
      dataPresenca.setHours(0, 0, 0, 0);

      if (dataPresenca.getTime() === dataAtual.getTime()) {
        sequencia++;
        dataAtual.setDate(dataAtual.getDate() - 1);
      } else if (
        dataPresenca.getTime() <
        dataAtual.getTime() - 24 * 60 * 60 * 1000
      ) {
        // Quebrou a sequência
        break;
      }
    }

    return sequencia;
  }

  // ========== TABLET CHECK-IN METHODS ==========

  async checkInTablet(
    alunoId: string,
    aulaId: string,
    metodo: string,
    user: any,
  ) {
    // Validar perfil TABLET_CHECKIN
    if (!user?.perfis?.includes('TABLET_CHECKIN')) {
      throw new ForbiddenException(
        'Apenas perfil TABLET_CHECKIN pode fazer check-in via tablet',
      );
    }

    // Buscar unidade do usuário tablet
    const unidadeTablet = await this.getUnidadeTablet(user.id);
    if (!unidadeTablet) {
      throw new ForbiddenException(
        'Usuário tablet não está vinculado a nenhuma unidade',
      );
    }

    // Verificar se aluno existe
    const aluno = await this.personRepository.findOne({
      where: { id: alunoId, tipo_cadastro: 'ALUNO' as any },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se o aluno pertence à mesma unidade do tablet
    if (aluno.unidade_id !== unidadeTablet) {
      throw new ForbiddenException(
        'Você não pode fazer check-in de alunos de outra unidade',
      );
    }

    // Verificar se aula existe e está ativa
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId, ativo: true },
      relations: ['unidade'],
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada ou inativa');
    }

    // Buscar configuração da unidade para verificar se requer aprovação
    const unidade = await this.unidadeRepository.findOne({
      where: { id: aula.unidade_id },
      select: ['id', 'nome', 'requer_aprovacao_checkin'],
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    // Verificar se já existe presença para esta aula hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaExistente = await this.presencaRepository.findOne({
      where: {
        aluno_id: alunoId,
        aula_id: aulaId,
        created_at: Between(hoje, amanha),
      },
    });

    if (presencaExistente) {
      return {
        message: 'Check-in já registrado para esta aula hoje',
        presenca: presencaExistente,
        status: presencaExistente.status_aprovacao || 'PENDENTE',
      };
    }

    // Definir status de aprovação baseado na configuração da unidade
    const statusAprovacao = unidade.requer_aprovacao_checkin
      ? 'PENDENTE'
      : 'APROVADO';

    // Criar presença com status baseado na configuração da unidade
    const presenca = this.presencaRepository.create({
      aluno_id: alunoId,
      aula_id: aulaId,
      metodo: metodo as PresencaMetodo,
      status: PresencaStatus.PRESENTE,
      status_aprovacao: statusAprovacao,
      data_presenca: new Date(),
      // Se for aprovação automática, já preencher campos de aprovação
      ...(statusAprovacao === 'APROVADO' && {
        aprovado_por_id: user.id,
        aprovado_em: new Date(),
        observacao_aprovacao:
          'Aprovado automaticamente (unidade não requer aprovação)',
      }),
    });

    await this.presencaRepository.save(presenca);

    const mensagem = unidade.requer_aprovacao_checkin
      ? 'Check-in registrado com sucesso. Aguardando aprovação.'
      : 'Check-in registrado e aprovado automaticamente!';

    return {
      message: mensagem,
      presenca,
      aluno: {
        id: aluno.id,
        nome: aluno.nome_completo,
        foto: null, // Foto será obtida do Aluno entity se necessário
      },
      aula: {
        id: aula.id,
        nome: aula.nome,
        unidade: aula.unidade?.nome,
      },
    };
  }

  async getPresencasPendentes(user: any, data?: string, aulaId?: string) {
    // Verificar permissão
    const perfisPermitidos = ['RECEPCIONISTA', 'PROFESSOR', 'GERENTE_UNIDADE'];
    const temPermissao = user?.perfis?.some((p) =>
      perfisPermitidos.includes(p),
    );

    if (!temPermissao) {
      throw new ForbiddenException(
        'Apenas RECEPCIONISTA, PROFESSOR ou GERENTE pode visualizar presenças pendentes',
      );
    }

    // Determinar unidade do usuário
    const unidadeId = await this.getUnidadeUsuario(user);
    if (!unidadeId) {
      throw new ForbiddenException(
        'Usuário não está vinculado a nenhuma unidade',
      );
    }

    // Construir query
    const where: any = {
      status_aprovacao: 'PENDENTE',
    };

    if (data) {
      const dataFiltro = new Date(data);
      dataFiltro.setHours(0, 0, 0, 0);
      const dataFim = new Date(dataFiltro);
      dataFim.setDate(dataFim.getDate() + 1);
      where.created_at = Between(dataFiltro, dataFim);
    }

    if (aulaId) {
      where.aula_id = aulaId;
    }

    const presencas = await this.presencaRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.aluno', 'pessoa')
      .leftJoinAndSelect('pessoa.aluno', 'aluno')
      .leftJoinAndSelect('p.aula', 'aula')
      .leftJoinAndSelect('aula.unidade', 'unidade')
      .leftJoinAndSelect('aula.professor', 'professor')
      .where('p.status_aprovacao = :status', { status: 'PENDENTE' })
      .andWhere('unidade.id = :unidadeId', { unidadeId })
      .andWhere(data ? 'DATE(p.created_at) = :data' : '1=1', {
        data: data ? new Date(data) : undefined,
      })
      .andWhere(aulaId ? 'p.aula_id = :aulaId' : '1=1', { aulaId })
      .orderBy('p.created_at', 'DESC')
      .getMany();

    return presencas.map((p) => ({
      id: p.id,
      aluno: {
        id: p.aluno?.id,
        nome: p.aluno?.nome_completo,
        foto: null, // Foto será obtida do Aluno entity se necessário
        cpf: p.aluno?.cpf,
      },
      aula: {
        id: p.aula?.id,
        nome: p.aula?.nome,
        professor: p.aula?.professor?.nome_completo,
        horario: `${p.aula?.hora_inicio} - ${p.aula?.hora_fim}`,
      },
      metodo: p.metodo,
      dataCheckin: p.created_at,
      status: p.status_aprovacao,
    }));
  }

  async aprovarPresenca(id: string, user: any, observacao?: string) {
    // Verificar permissão
    const perfisPermitidos = ['RECEPCIONISTA', 'PROFESSOR', 'GERENTE_UNIDADE'];
    const temPermissao = user?.perfis?.some((p) =>
      perfisPermitidos.includes(p),
    );

    if (!temPermissao) {
      throw new ForbiddenException(
        'Apenas RECEPCIONISTA, PROFESSOR ou GERENTE pode aprovar presenças',
      );
    }

    const presenca = await this.presencaRepository.findOne({
      where: { id },
      relations: ['aula', 'aula.unidade', 'aluno'],
    });

    if (!presenca) {
      throw new NotFoundException('Presença não encontrada');
    }

    // Verificar se presença está pendente
    if (presenca.status_aprovacao !== 'PENDENTE') {
      throw new BadRequestException(
        `Presença já foi ${presenca.status_aprovacao.toLowerCase()}`,
      );
    }

    // Verificar se usuário pertence à mesma unidade
    const unidadeId = await this.getUnidadeUsuario(user);
    if (presenca.aula?.unidade?.id !== unidadeId) {
      throw new ForbiddenException(
        'Você não tem permissão para aprovar presenças de outra unidade',
      );
    }

    // Aprovar presença
    presenca.status_aprovacao = 'APROVADO';
    presenca.aprovado_por_id = user.id;
    presenca.aprovado_em = new Date();
    if (observacao) {
      presenca.observacao_aprovacao = observacao;
    }

    await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação quando aprovar
    try {
      const alunoFaixaAtiva = await this.alunoFaixaRepository.findOne({
        where: {
          aluno_id: presenca.aluno_id,
          ativa: true,
        },
      });

      if (alunoFaixaAtiva) {
        alunoFaixaAtiva.presencas_no_ciclo += 1;
        alunoFaixaAtiva.presencas_total_fx += 1;
        await this.alunoFaixaRepository.save(alunoFaixaAtiva);
      }
    } catch (error) {
      console.error(
        '❌ [aprovarPresenca] Erro ao incrementar graduação:',
        error.message,
      );
    }

    return {
      message: 'Presença aprovada com sucesso',
      presenca: {
        id: presenca.id,
        status: presenca.status_aprovacao,
        aprovadoPor: user.nome,
        aprovadoEm: presenca.aprovado_em,
      },
    };
  }

  async rejeitarPresenca(id: string, user: any, observacao: string) {
    // Verificar permissão
    const perfisPermitidos = ['RECEPCIONISTA', 'PROFESSOR', 'GERENTE_UNIDADE'];
    const temPermissao = user?.perfis?.some((p) =>
      perfisPermitidos.includes(p),
    );

    if (!temPermissao) {
      throw new ForbiddenException(
        'Apenas RECEPCIONISTA, PROFESSOR ou GERENTE pode rejeitar presenças',
      );
    }

    const presenca = await this.presencaRepository.findOne({
      where: { id },
      relations: ['aula', 'aula.unidade', 'aluno'],
    });

    if (!presenca) {
      throw new NotFoundException('Presença não encontrada');
    }

    // Verificar se presença está pendente
    if (presenca.status_aprovacao !== 'PENDENTE') {
      throw new BadRequestException(
        `Presença já foi ${presenca.status_aprovacao.toLowerCase()}`,
      );
    }

    // Verificar se usuário pertence à mesma unidade
    const unidadeId = await this.getUnidadeUsuario(user);
    if (presenca.aula?.unidade?.id !== unidadeId) {
      throw new ForbiddenException(
        'Você não tem permissão para rejeitar presenças de outra unidade',
      );
    }

    // Rejeitar presença
    presenca.status_aprovacao = 'REJEITADO';
    presenca.aprovado_por_id = user.id;
    presenca.aprovado_em = new Date();
    presenca.observacao_aprovacao = observacao;

    await this.presencaRepository.save(presenca);

    return {
      message: 'Presença rejeitada com sucesso',
      presenca: {
        id: presenca.id,
        status: presenca.status_aprovacao,
        rejeitadoPor: user.nome,
        rejeitadoEm: presenca.aprovado_em,
        motivo: observacao,
      },
    };
  }

  private async getUnidadeUsuario(user: any): Promise<string | null> {
    // Buscar unidade do usuário baseado no perfil
    const perfil = user.perfis?.[0];

    if (perfil === 'GERENTE_UNIDADE') {
      // Buscar unidade onde é responsável
      const result = await this.personRepository.query(
        `
        SELECT u.id
        FROM teamcruz.unidades u
        WHERE u.responsavel_cpf = (
          SELECT cpf FROM teamcruz.usuarios WHERE id = $1
        )
        LIMIT 1
      `,
        [user.id],
      );
      return result[0]?.id || null;
    }

    if (perfil === 'RECEPCIONISTA') {
      const result = await this.personRepository.query(
        `
        SELECT ru.unidade_id
        FROM teamcruz.recepcionista_unidades ru
        WHERE ru.recepcionista_id = $1
        LIMIT 1
      `,
        [user.id],
      );
      return result[0]?.unidade_id || null;
    }

    if (perfil === 'PROFESSOR') {
      const result = await this.personRepository.query(
        `
        SELECT pu.unidade_id
        FROM teamcruz.professor_unidades pu
        WHERE pu.professor_id = $1
        LIMIT 1
      `,
        [user.id],
      );
      return result[0]?.unidade_id || null;
    }

    return null;
  }

  private async getUnidadeTablet(userId: string): Promise<string | null> {
    // TABLET_CHECKIN usa a tabela tablet_unidades
    const result = await this.personRepository.query(
      `
      SELECT tu.unidade_id
      FROM teamcruz.tablet_unidades tu
      WHERE tu.tablet_id = $1 AND tu.ativo = true
      LIMIT 1
    `,
      [userId],
    );
    return result[0]?.unidade_id || null;
  }
}
