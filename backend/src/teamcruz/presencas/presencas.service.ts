import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Presenca, OrigemRegistro } from './entities/presenca.entity';
import { Aluno } from '../alunos/entities/aluno.entity';
import { Unidade } from '../../people/entities/unidade.entity';
import {
  CheckinDto,
  CheckinManualDto,
  CheckinQrCodeDto,
  ProgressoResponseDto,
} from './dto/checkin.dto';

@Injectable()
export class PresencasService {
  constructor(
    @InjectRepository(Presenca) private presencasRepo: Repository<Presenca>,
    @InjectRepository(Aluno) private alunosRepo: Repository<Aluno>,
    @InjectRepository(Unidade) private unidadesRepo: Repository<Unidade>,
  ) {}

  /**
   * RF-01: Registrar presença de alunos/professores
   */
  async registrarPresenca(checkinDto: CheckinDto, enderecoIp?: string) {
    // Validar se o aluno existe
    const aluno = await this.alunosRepo.findOne({
      where: { id: checkinDto.alunoId },
    });
    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Validar se a unidade existe
    const unidade = await this.unidadesRepo.findOne({
      where: { id: checkinDto.unidadeId },
    });
    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    // Verificar se já existe registro de presença no mesmo dia
    const hoje = new Date();
    const inicioHoje = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
    );
    const fimHoje = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate() + 1,
    );

    const presencaExistente = await this.presencasRepo.findOne({
      where: {
        alunoId: checkinDto.alunoId,
        unidadeId: checkinDto.unidadeId,
        dataHora: Between(inicioHoje, fimHoje),
      },
    });

    if (presencaExistente) {
      throw new BadRequestException('Presença já registrada hoje nesta unidade');
    }

    // Criar registro de presença
    const presenca = this.presencasRepo.create({
      alunoId: checkinDto.alunoId,
      unidadeId: checkinDto.unidadeId,
      origemRegistro: checkinDto.origemRegistro,
      latitude: checkinDto.latitude,
      longitude: checkinDto.longitude,
      enderecoIp,
      observacoes: checkinDto.observacoes,
    });

    const presencaSalva = await this.presencasRepo.save(presenca);

    // Retornar confirmação com progresso
    const progresso = await this.calcularProgresso(checkinDto.alunoId);

    return {
      id: presencaSalva.id,
      message: `✅ Presença registrada. Faltam ${progresso.aulasFaltantes} aulas para o próximo grau.`,
      progresso,
      dataHora: presencaSalva.dataHora,
    };
  }

  /**
   * RF-02: Registrar presença manual para crianças sem celular
   */
  async registrarPresencaManual(
    checkinManualDto: CheckinManualDto,
    enderecoIp?: string,
  ) {
    // Buscar aluno por CPF ou telefone
    const aluno = await this.alunosRepo.findOne({
      where: [
        { cpf: checkinManualDto.cpfOuTelefone },
        { telefone: checkinManualDto.cpfOuTelefone },
      ],
    });

    if (!aluno) {
      throw new NotFoundException(
        'Aluno não encontrado com o CPF ou telefone informado',
      );
    }

    // Usar o método padrão de check-in
    return this.registrarPresenca(
      {
        alunoId: aluno.id,
        unidadeId: checkinManualDto.unidadeId,
        origemRegistro: OrigemRegistro.MANUAL,
        observacoes: checkinManualDto.observacoes,
      },
      enderecoIp,
    );
  }

  /**
   * Registrar presença via QR Code
   */
  async registrarPresencaQrCode(
    checkinQrDto: CheckinQrCodeDto,
    enderecoIp?: string,
  ) {
    // Validar token da unidade (implementação simplificada)
    const unidade = await this.validarTokenUnidade(checkinQrDto.tokenUnidade);

    return this.registrarPresenca(
      {
        alunoId: checkinQrDto.alunoId,
        unidadeId: unidade.id,
        origemRegistro: OrigemRegistro.QR_CODE,
        latitude: checkinQrDto.latitude,
        longitude: checkinQrDto.longitude,
      },
      enderecoIp,
    );
  }

  /**
   * RF-03: Calcular progresso do aluno
   */
  async calcularProgresso(alunoId: string): Promise<ProgressoResponseDto> {
    const aluno = await this.alunosRepo.findOne({
      where: { id: alunoId },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Contar aulas realizadas
    const aulasRealizadas = await this.presencasRepo.count({
      where: { alunoId },
    });

    // Para MVP, usar regras simples (pode ser expandido)
    const aulasPorGrau = 20; // Configurável
    const grauAtual = aluno.grausAtual || 0;
    const aulasParaProximoGrau =
      aulasPorGrau - (aulasRealizadas % aulasPorGrau);

    return {
      alunoId: aluno.id,
      nome: aluno.nome,
      faixaAtual: 'Branca', // TODO: buscar da tabela de faixas
      grauAtual,
      aulasRealizadas,
      aulasFaltantes: aulasParaProximoGrau,
      proximaGraduacao: this.calcularProximaGraduacao('Branca', grauAtual),
      porcentagemProgresso: Math.round(
        ((aulasRealizadas % aulasPorGrau) / aulasPorGrau) * 100,
      ),
    };
  }

  /**
   * Listar presenças por data
   */
  async listarPorData(dateStr?: string, unidadeId?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    );

    const where: any = {
      dataHora: Between(start, end),
    };

    if (unidadeId) {
      where.unidadeId = unidadeId;
    }

    return this.presencasRepo.find({
      where,
      relations: ['aluno', 'unidade'],
      order: { dataHora: 'DESC' },
    });
  }

  /**
   * Buscar aluno por CPF ou telefone (para tablet)
   */
  async buscarAlunoPorCpfOuTelefone(cpfOuTelefone: string) {
    const aluno = await this.alunosRepo.findOne({
      where: [{ cpf: cpfOuTelefone }, { telefone: cpfOuTelefone }],
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    return {
      id: aluno.id,
      nome: aluno.nome,
      faixa: 'Branca', // TODO: buscar da tabela de faixas
    };
  }

  /**
   * Gerar QR Code para unidade
   */
  async gerarQrCodeUnidade(unidadeId: string) {
    const unidade = await this.unidadesRepo.findOne({
      where: { id: unidadeId },
    });
    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    // Gerar token único (implementação simplificada)
    const token = this.gerarTokenSeguro(unidadeId);

    return {
      unidadeId,
      token,
      qrCodeData: `rykon-checkin://${unidadeId}/${token}`,
      validoAte: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    };
  }

  // Métodos auxiliares privados
  private async validarTokenUnidade(token: string): Promise<Unidade> {
    // Implementação simplificada - em produção usar cache/redis
    const [unidadeId] = token.split('-');
    const unidade = await this.unidadesRepo.findOne({
      where: { id: unidadeId },
    });

    if (!unidade) {
      throw new BadRequestException('Token de unidade inválido');
    }

    return unidade;
  }

  private gerarTokenSeguro(unidadeId: string): string {
    const timestamp = Date.now().toString();
    return `${unidadeId}-${timestamp}`;
  }

  private calcularProximaGraduacao(faixaAtual: string, grauAtual: number): string {
    // Lógica simplificada - pode ser expandida com tabela de graduações
    const graduacoes = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];
    const indexAtual = graduacoes.indexOf(faixaAtual);

    if (grauAtual < 4 && indexAtual >= 0) {
      return `${faixaAtual} ${grauAtual + 1}º grau`;
    } else if (indexAtual < graduacoes.length - 1) {
      return graduacoes[indexAtual + 1];
    }

    return 'Graduação máxima atingida';
  }

  // Métodos legados para compatibilidade
  aulasAbertas() {
    return [
      {
        id: 1,
        horario: '07:00',
        turma: 'Adulto Manhã',
        instrutor: 'Carlos Cruz',
        vagas: 7,
      },
      {
        id: 2,
        horario: '09:00',
        turma: 'Competição',
        instrutor: 'Carlos Cruz',
        vagas: 3,
      },
      {
        id: 3,
        horario: '16:00',
        turma: 'Kids Tarde',
        instrutor: 'João Silva',
        vagas: 10,
      },
      {
        id: 4,
        horario: '19:00',
        turma: 'Adulto Noite',
        instrutor: 'Carlos Cruz',
        vagas: 5,
      },
    ];
  }

  async checkin(alunoId: string) {
    // Método legado - redirecionar para novo método
    return this.registrarPresenca({
      alunoId,
      unidadeId: 'default-unit', // Temporário
      origemRegistro: OrigemRegistro.TABLET,
    });
  }
}
