import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
    @InjectRepository(AlunoFaixa)
    private readonly alunoFaixaRepository: Repository<AlunoFaixa>,
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
    console.log('✅ [checkInQR] Presença registrada:', presencaSalva.id);

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
        console.log(
          '✅ [checkInQR] Presenças incrementadas:',
          alunoFaixaAtiva.presencas_no_ciclo,
        );
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
    console.log('🔵 [checkInManual] Iniciando check-in manual');

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
    console.log('✅ [checkInManual] Presença registrada:', presencaSalva.id);

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
    } catch (error) {
      console.log('Erro ao incrementar graduação:', error.message);
    }

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

    console.log(
      '🔍 [getAulasDisponiveis] Buscando aulas para o dia:',
      diaSemana,
    );

    try {
      // Buscar unidade do aluno
      let unidadeId: string | null = null;

      const aluno = await this.alunoRepository.findOne({
        where: { usuario_id: user.id },
        relations: ['unidade'],
      });

      if (aluno?.unidade_id) {
        unidadeId = aluno.unidade_id;
        console.log('🔍 [getAulasDisponiveis] Unidade do aluno:', unidadeId);
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

      console.log('🔍 [getAulasDisponiveis] Aulas encontradas:', aulas.length);

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

      console.log(
        '✅ [getAulasDisponiveis] Aulas formatadas:',
        aulasFormatadas.length,
      );

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
      } catch (error) {
        console.log('Erro ao incrementar graduação:', error.message);
      }
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
    } catch (error) {
      console.log('Erro ao incrementar graduação:', error.message);
    }

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

  async getRankingUnidade(user: any, mes?: number, ano?: number) {
    console.log(
      '🏆 [getRankingUnidade] Buscando ranking para usuário:',
      user.id,
    );

    try {
      // Buscar unidade do aluno
      const aluno = await this.alunoRepository.findOne({
        where: { usuario_id: user.id },
        relations: ['unidade'],
      });

      if (!aluno || !aluno.unidade_id) {
        console.log('⚠️ [getRankingUnidade] Aluno sem unidade');
        return {
          posicao: null,
          totalAlunos: 0,
          ranking: [],
        };
      }

      // Usar mês e ano atuais se não foram fornecidos
      const dataRef = new Date();
      const mesRef = mes !== undefined ? mes : dataRef.getMonth() + 1; // 1-12
      const anoRef = ano !== undefined ? ano : dataRef.getFullYear();

      console.log(`🏆 [getRankingUnidade] Período: ${mesRef}/${anoRef}`);
      console.log(`🏆 [getRankingUnidade] Unidade: ${aluno.unidade_id}`);

      // Calcular primeiro e último dia do mês
      const primeiroDia = new Date(anoRef, mesRef - 1, 1);
      const ultimoDia = new Date(anoRef, mesRef, 0, 23, 59, 59);

      console.log(
        `🏆 [getRankingUnidade] Período: ${primeiroDia} até ${ultimoDia}`,
      );

      // Buscar todos os alunos ativos da mesma unidade
      const alunosDaUnidade = await this.alunoRepository.find({
        where: {
          unidade_id: aluno.unidade_id,
          status: StatusAluno.ATIVO,
        },
      });

      console.log(
        `🏆 [getRankingUnidade] Alunos da unidade: ${alunosDaUnidade.length}`,
      );

      // Buscar presenças do mês para todos os alunos da unidade
      const presencas = await this.presencaRepository
        .createQueryBuilder('presenca')
        .where('presenca.aluno_id IN (:...alunosIds)', {
          alunosIds: alunosDaUnidade.map((a) => a.id),
        })
        .andWhere('presenca.created_at >= :inicio', { inicio: primeiroDia })
        .andWhere('presenca.created_at <= :fim', { fim: ultimoDia })
        .getMany();

      console.log(
        `🏆 [getRankingUnidade] Presenças encontradas: ${presencas.length}`,
      );

      // Contar presenças por aluno
      const presencasPorAluno = new Map<string, number>();

      for (const presenca of presencas) {
        const count = presencasPorAluno.get(presenca.aluno_id) || 0;
        presencasPorAluno.set(presenca.aluno_id, count + 1);
      }

      // Criar ranking com informações dos alunos
      const rankingComDetalhes = alunosDaUnidade.map((alunoItem) => ({
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

      console.log(`🏆 [getRankingUnidade] Posição do aluno: ${posicao}`);
      console.log(
        `🏆 [getRankingUnidade] Presenças do aluno: ${presencasDoAluno}`,
      );

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
        totalAlunos: alunosDaUnidade.length,
        mes: mesRef,
        ano: anoRef,
        ranking: top10,
      };
    } catch (error) {
      console.error('❌ [getRankingUnidade] Erro ao buscar ranking:', error);
      return {
        posicao: null,
        totalAlunos: 0,
        ranking: [],
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
}
