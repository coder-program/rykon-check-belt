import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, Like, DataSource, In } from 'typeorm';
// import { format, startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay } from 'date-fns';
import {
  Presenca,
  PresencaMetodo,
  PresencaStatus,
} from './entities/presenca.entity';
import { Person, TipoCadastro } from '../people/entities/person.entity';
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
    private readonly graduacaoService: GraduacaoService,
  ) {}

  async getAulaAtiva(user: any): Promise<AulaAtiva | null> {
    // Por enquanto, simular uma aula ativa baseada no horário atual
    const agora = new Date();
    const hora = agora.getHours();

    // Definir aulas por horário (mockado por enquanto)
    let aulaAtiva: AulaAtiva | null = null;

    if (hora >= 7 && hora < 9) {
      aulaAtiva = {
        id: 'aula-manha-1',
        nome: 'Jiu-Jitsu Gi - Adultos Manhã',
        professor: 'Carlos Silva',
        unidade: 'TeamCruz Vila Madalena',
        horarioInicio: '07:00',
        horarioFim: '08:30',
        qrCode: `QR-AULA-${Date.now()}`,
      };
    } else if (hora >= 18 && hora < 20) {
      aulaAtiva = {
        id: 'aula-noite-1',
        nome: 'Jiu-Jitsu Gi - Adultos Noite',
        professor: 'Ana Santos',
        unidade: 'TeamCruz Vila Madalena',
        horarioInicio: '19:00',
        horarioFim: '20:30',
        qrCode: `QR-AULA-${Date.now()}`,
      };
    }

    return aulaAtiva;
  }

  async checkInQR(qrCode: string, user: any) {
    // Validar QR Code
    if (!qrCode || !qrCode.startsWith('QR-AULA-')) {
      throw new BadRequestException('QR Code inválido');
    }

    // Verificar se já fez check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        pessoaId: user.id,
        dataPresenca: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Você já fez check-in hoje');
    }

    // Registrar presença
    const presenca = this.presencaRepository.create({
      pessoaId: user.id,
      dataPresenca: new Date(),
      metodoCheckin: PresencaMetodo.QR_CODE,
      observacoes: `QR Code: ${qrCode}`,
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
      message: 'Check-in realizado com sucesso!',
      presenca: presencaSalva,
    };
  }

  async checkInManual(aulaId: string, user: any) {
    // Verificar se já fez check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        pessoaId: user.id,
        dataPresenca: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Você já fez check-in hoje');
    }

    // Registrar presença manual
    const presenca = this.presencaRepository.create({
      pessoaId: user.id,
      dataPresenca: new Date(),
      metodoCheckin: PresencaMetodo.MANUAL,
      observacoes: `Aula ID: ${aulaId}`,
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
      message: 'Check-in manual realizado com sucesso!',
      presenca: presencaSalva,
    };
  }

  async getMinhasEstatisticas(user: any): Promise<EstatisticasPresenca> {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

    // Presenças do mês atual
    const presencasMes = await this.presencaRepository.count({
      where: {
        pessoaId: user.id,
        dataPresenca: Between(inicioMes, fimMes),
      },
    });

    // Total de dias úteis no mês (aproximação)
    const diasUteisMes = 22; // Aproximadamente 22 dias úteis por mês
    const presencaMensal = Math.round((presencasMes / diasUteisMes) * 100);

    // Última presença
    const ultimaPresenca = await this.presencaRepository.findOne({
      where: { pessoaId: user.id },
      order: { dataPresenca: 'DESC' },
    });

    // Sequência atual (simplificado)
    const sequenciaAtual = await this.calcularSequenciaAtual(user.id);

    return {
      presencaMensal: Math.min(presencaMensal, 100),
      aulasMes: presencasMes,
      sequenciaAtual,
      ultimaPresenca: ultimaPresenca?.dataPresenca.toISOString() || null,
    };
  }

  async getMinhaHistorico(user: any, limit: number = 10) {
    const presencas = await this.presencaRepository.find({
      where: { pessoaId: user.id },
      order: { dataPresenca: 'DESC' },
      take: limit,
    });

    return presencas.map((p) => ({
      id: p.id,
      data: p.dataPresenca,
      horario: p.horaCheckin.toTimeString().slice(0, 5),
      tipo: 'entrada',
      aula: {
        nome: 'Jiu-Jitsu Gi',
        professor: 'Professor',
        unidade: 'TeamCruz Vila Madalena',
      },
    }));
  }

  async checkInCPF(cpf: string, aulaId: string, adminUser: any) {
    // Buscar aluno pelo CPF
    const aluno = await this.personRepository.findOne({
      where: {
        cpf: cpf.replace(/\D/g, ''),
        tipo_cadastro: TipoCadastro.ALUNO,
      },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado com este CPF');
    }

    return this.realizarCheckInAdmin(aluno.id, aulaId, 'cpf', adminUser);
  }

  async checkInNome(nome: string, aulaId: string, adminUser: any) {
    // Buscar aluno pelo nome
    const aluno = await this.personRepository.findOne({
      where: {
        nome_completo: nome,
        tipo_cadastro: TipoCadastro.ALUNO,
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
        pessoaId: alunoId,
        dataPresenca: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Aluno já fez check-in hoje');
    }

    // Registrar presença
    const presenca = this.presencaRepository.create({
      pessoaId: alunoId,
      dataPresenca: new Date(),
      metodoCheckin: metodo as PresencaMetodo,
      observacoes: `Registrado por: ${adminUser.id}, Aula: ${aulaId}`,
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
        dataPresenca: Between(dataInicio, dataFim),
      },
    });

    const presencasPorMetodo = await this.presencaRepository
      .createQueryBuilder('presenca')
      .select('presenca.metodoCheckin', 'metodo')
      .addSelect('COUNT(*)', 'count')
      .where('presenca.dataPresenca BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .groupBy('presenca.metodoCheckin')
      .getRawMany();

    const presencasPorHora = await this.presencaRepository
      .createQueryBuilder('presenca')
      .select('EXTRACT(HOUR FROM presenca.horaCheckin)', 'hora')
      .addSelect('COUNT(*)', 'count')
      .where('presenca.dataPresenca BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .groupBy('EXTRACT(HOUR FROM presenca.horaCheckin)')
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
        data: p.dataPresenca,
        aluno: {
          id: p.pessoaId,
          nome: p.pessoa?.nome_completo || 'Nome não encontrado',
        },
        metodo: p.metodoCheckin || PresencaMetodo.MANUAL,
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
        pessoaId: user.id,
        dataPresenca: Between(hoje, amanha),
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
      pessoaId: user.id,
      dataPresenca: new Date(),
      metodoCheckin: PresencaMetodo.FACIAL,
      observacoes: 'Check-in via reconhecimento facial',
      fotoCheckin: foto.substring(0, 500), // Salvar parte da foto
      dispositivoInfo: {
        metodo: 'facial_recognition',
        timestamp: new Date().toISOString(),
      },
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
        pessoaId: alunoId,
        dataPresenca: Between(hoje, amanha),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException('Este aluno já fez check-in hoje');
    }

    // Registrar presença pelo responsável
    const presenca = this.presencaRepository.create({
      pessoaId: alunoId,
      dataPresenca: new Date(),
      metodoCheckin: PresencaMetodo.RESPONSAVEL,
      responsavelCheckinId: responsavelUser.id,
      observacoes: `Check-in realizado pelo responsável: ${responsavelUser.name || responsavelUser.email}`,
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
        pessoaId: In(alunos.map((a) => a.id)),
        dataPresenca: Between(hoje, amanha),
      },
    });

    const idsComPresenca = new Set(presencasHoje.map((p) => p.pessoaId));

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
        pessoaId,
        dataPresenca: Between(trintaDiasAtras, new Date()),
      },
      order: { dataPresenca: 'DESC' },
    });

    if (presencas.length === 0) return 0;

    // Calcular sequência de dias consecutivos
    let sequencia = 0;
    let dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);

    for (const presenca of presencas) {
      const dataPresenca = new Date(presenca.dataPresenca);
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
