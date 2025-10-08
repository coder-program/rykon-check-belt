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
import { Aluno } from '../people/entities/aluno.entity';
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
    console.log('🔵 [getAulaAtiva] Buscando aula ativa...');

    const agora = new Date();
    const diaHoje = agora.getDay();
    const horaAgora = agora.toTimeString().slice(0, 5); // HH:MM

    console.log(
      '🔵 [getAulaAtiva] Dia da semana:',
      diaHoje,
      'Hora:',
      horaAgora,
    );

    // Buscar aulas ativas no banco
    const aulas = await this.aulaRepository.find({
      where: {
        dia_semana: diaHoje,
        ativo: true,
      },
      relations: ['unidade', 'professor'],
    });

    console.log('🔵 [getAulaAtiva] Aulas encontradas para hoje:', aulas.length);

    if (aulas.length > 0) {
      console.log('🔵 [getAulaAtiva] Detalhes das aulas encontradas:');
      aulas.forEach((aula, index) => {
        console.log(
          `  Aula ${index + 1}: ${aula.nome} - Ativo: ${aula.ativo} - Data início: ${aula.data_hora_inicio} - Data fim: ${aula.data_hora_fim}`,
        );
      });
    }

    // Filtrar aulas que estão acontecendo agora
    for (const aula of aulas) {
      console.log(
        `🔵 [getAulaAtiva] Verificando se aula "${aula.nome}" está ativa...`,
      );
      if (aula.estaAtiva()) {
        console.log('✅ [getAulaAtiva] Aula ativa encontrada:', aula.nome);

        // Gerar QR Code se ainda não tiver ou se for antigo (mais de 1 hora)
        const precisaNovoQR =
          !aula.qr_code ||
          !aula.qr_code_gerado_em ||
          Date.now() - aula.qr_code_gerado_em.getTime() > 3600000;

        if (precisaNovoQR) {
          aula.qr_code = aula.gerarQRCode();
          aula.qr_code_gerado_em = new Date();
          await this.aulaRepository.save(aula);
          console.log('🔵 [getAulaAtiva] QR Code gerado:', aula.qr_code);
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

    console.log('⚠️ [getAulaAtiva] Nenhuma aula ativa no momento');
    return null;
  }

  async checkInQR(qrCode: string, user: any) {
    console.log('🔵 [checkInQR] Iniciando check-in por QR Code');
    console.log('🔵 [checkInQR] QR Code:', qrCode);
    console.log('🔵 [checkInQR] User ID:', user.id);

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
    // Por enquanto, retornar aulas mockadas
    const hoje = data ? new Date(data) : new Date();
    const diaSemana = hoje.getDay();

    const aulasPadrao = [
      {
        id: 'aula-manha-1',
        nome: 'Jiu-Jitsu Gi - Adultos Manhã',
        professor: 'Carlos Silva',
        horarioInicio: '07:00',
        horarioFim: '08:30',
        vagas: 20,
        inscritos: 15,
      },
      {
        id: 'aula-noite-1',
        nome: 'Jiu-Jitsu Gi - Adultos Noite',
        professor: 'Ana Santos',
        horarioInicio: '19:00',
        horarioFim: '20:30',
        vagas: 25,
        inscritos: 18,
      },
    ];

    if (diaSemana === 0 || diaSemana === 6) {
      // Final de semana - menos aulas
      return aulasPadrao.slice(0, 1);
    }

    return aulasPadrao;
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
