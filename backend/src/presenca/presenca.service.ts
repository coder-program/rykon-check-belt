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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Calcula a distância entre duas coordenadas geográficas usando a fórmula de Haversine
   * @param lat1 Latitude do ponto 1
   * @param lon1 Longitude do ponto 1
   * @param lat2 Latitude do ponto 2
   * @param lon2 Longitude do ponto 2
   * @returns Distância em metros
   */
  private calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Valida se o aluno está próximo à unidade (dentro de 100 metros)
   */
  private validarLocalizacao(
    unidade: Unidade,
    latitudeAluno: number,
    longitudeAluno: number,
  ): { valido: boolean; distancia: number; mensagem?: string } {
    // Se a unidade não tem coordenadas cadastradas, permite o check-in
    if (!unidade.latitude || !unidade.longitude) {
      return { valido: true, distancia: 0 };
    }

    const distancia = this.calcularDistancia(
      latitudeAluno,
      longitudeAluno,
      unidade.latitude,
      unidade.longitude,
    );

    const RAIO_PERMITIDO = 100; // 100 metros

    if (distancia > RAIO_PERMITIDO) {
      return {
        valido: false,
        distancia: Math.round(distancia),
        mensagem: `Você está muito longe da unidade (${Math.round(distancia)}m). É necessário estar a até ${RAIO_PERMITIDO}m para fazer check-in.`,
      };
    }

    return { valido: true, distancia: Math.round(distancia) };
  }

  async getAulaAtiva(user: any): Promise<AulaAtiva | null> {
    const agora = new Date();
    const diaHoje = agora.getDay();
    const horaAgora = agora.toTimeString().slice(0, 5); // HH:MM

    // Detectar unidade(s) do usuário baseado no perfil
    let unidadesPermitidas: string[] = [];

    const perfis =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) || [];

    const isResponsavel = perfis.includes('RESPONSAVEL');
    const isAluno = perfis.includes('ALUNO');
    const isGerente = perfis.includes('GERENTE_UNIDADE');
    const isRecepcionista = perfis.includes('RECEPCIONISTA');
    const isTablet = perfis.includes('TABLET_CHECKIN');
    const isMaster = perfis.includes('MASTER') || perfis.includes('ADMIN');

    // Se for responsável, buscar unidades dos dependentes
    if (isResponsavel) {
      const dependentesData = await this.presencaRepository.manager.query(
        `SELECT DISTINCT a.unidade_id
         FROM teamcruz.alunos a
         INNER JOIN teamcruz.responsaveis r ON r.id = a.responsavel_id
         WHERE r.usuario_id = $1 AND a.status = 'ATIVO' AND a.unidade_id IS NOT NULL`,
        [user.id],
      );

      unidadesPermitidas = [
        ...new Set(
          dependentesData.map((d: any) => d.unidade_id).filter(Boolean),
        ),
      ] as string[];
      
    }
    // Se for aluno, buscar sua própria unidade
    else if (isAluno) {
      const aluno = await this.alunoRepository.findOne({
        where: { usuario_id: user.id },
      });
      if (aluno?.unidade_id) {
        unidadesPermitidas = [aluno.unidade_id];
      } else {
        console.warn(`⚠️ [getAulaAtiva] Aluno sem unidade vinculada!`, user.id);
      }
    }
    // Se for gerente, buscar unidade que gerencia
    else if (isGerente) {
      const unidadeResult = await this.presencaRepository.manager.query(
        `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (unidadeResult.length > 0) {
        unidadesPermitidas = [unidadeResult[0].unidade_id];
      }
    }
    // Se for recepcionista, buscar unidade vinculada
    else if (isRecepcionista) {
      const unidadeResult = await this.presencaRepository.manager.query(
        `SELECT unidade_id FROM teamcruz.recepcionista_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (unidadeResult.length > 0) {
        unidadesPermitidas = [unidadeResult[0].unidade_id];
      }
    }
    // Se for tablet, buscar unidade vinculada na tabela tablet_unidades
    else if (isTablet) {
      const unidadeResult = await this.presencaRepository.manager.query(
        `SELECT unidade_id FROM teamcruz.tablet_unidades WHERE tablet_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (unidadeResult.length > 0) {
        unidadesPermitidas = [unidadeResult[0].unidade_id];
      } else {
        console.warn('⚠️ [getAulaAtiva] Tablet sem unidade vinculada!', user.id);
      }
    }
    // Master pode ver todas as aulas
    else if (isMaster) {
      unidadesPermitidas = []; // Vazio = todas
    }

    // Buscar aulas ativas no banco
    const queryBuilder = this.aulaRepository
      .createQueryBuilder('aula')
      .leftJoinAndSelect('aula.unidade', 'unidade')
      .leftJoinAndSelect('aula.professor', 'professor')
      .where('aula.dia_semana = :dia', { dia: diaHoje })
      .andWhere('aula.ativo = :ativo', { ativo: true });

    // Filtrar por unidades permitidas (exceto master)
    if (unidadesPermitidas.length > 0) {
      queryBuilder.andWhere('aula.unidade_id IN (:...unidades)', {
        unidades: unidadesPermitidas,
      });
    } else if (!isMaster) {
      // Se não tem unidades permitidas e não é master, não retornar nada
      return null;
    }

    const aulas = await queryBuilder.getMany();

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

  async checkInQR(
    qrCode: string,
    user: any,
    latitude?: number,
    longitude?: number,
  ) {
    
    let aula;

    // Validar QR Code e determinar tipo
    if (qrCode.startsWith('QR-AULA-')) {
      // QR Code de aula específica
      // Extrair UUID completo (pode conter hífens)
      const aulaId = qrCode.replace('QR-AULA-', '');

      if (!aulaId) {
        throw new BadRequestException('QR Code inválido - não contém ID da aula');
      }

      aula = await this.aulaRepository.findOne({
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

    } else if (qrCode.startsWith('QR-UNIDADE-')) {
      // QR Code de unidade - buscar aula ativa no momento
      // Extrair UUID completo (pode conter hífens)
      const unidadeId = qrCode.replace('QR-UNIDADE-', '');

      if (!unidadeId) {
        throw new BadRequestException('QR Code inválido - não contém ID da unidade');
      }

      // Buscar aula ativa na unidade agora
      const agora = new Date();
      const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
      
      const aulasAtivas = await this.aulaRepository.find({
        where: {
          unidade_id: unidadeId,
          data_hora_inicio: Between(inicioHoje, fimHoje),
          ativo: true,
        },
        relations: ['unidade'],
      });

      if (aulasAtivas.length === 0) {
        throw new BadRequestException(
          'Não há aulas cadastradas hoje nesta unidade.',
        );
      }

      // Filtrar aulas que estão ativas no momento
      const aulaAtiva = aulasAtivas.find(a => a.estaAtiva());

      if (!aulaAtiva) {
        throw new BadRequestException(
          'Não há aula ativa no momento nesta unidade. Por favor, aguarde o horário de início da aula.',
        );
      }

      aula = aulaAtiva;

    } else {
      console.error('❌ [checkInQR] QR Code com formato inválido:', qrCode);
      throw new BadRequestException('QR Code inválido - formato não reconhecido');
    }

    // Validar localização se as coordenadas foram fornecidas
    if (latitude !== undefined && longitude !== undefined) {
      const validacao = this.validarLocalizacao(
        aula.unidade,
        latitude,
        longitude,
      );

      if (!validacao.valido) {
        throw new BadRequestException(validacao.mensagem);
      }
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

    // Log para debug: contar total de presenças aprovadas do aluno
    const totalPresencas = await this.presencaRepository.count({
      where: {
        aluno_id: aluno.id,
        status_aprovacao: 'APROVADO',
      },
    });
    
    // Verificar configuração de aprovação da unidade
    const requerAprovacao = aula.unidade.requer_aprovacao_checkin === true;
    const statusAprovacao = requerAprovacao ? 'PENDENTE' : 'APROVADO';

    // Registrar presença
    const presenca = this.presencaRepository.create({
      aluno_id: aluno.id,
      aula_id: aula.id,
      status: PresencaStatus.PRESENTE,
      modo_registro: PresencaMetodo.QR_CODE,
      status_aprovacao: statusAprovacao,
      hora_checkin: new Date(),
      observacoes: `QR Code: ${qrCode}`,
      created_by: user.id,
      // Se aprovação automática, preencher campos de aprovação
      ...(statusAprovacao === 'APROVADO' && {
        aprovado_por_id: user.id,
        aprovado_em: new Date(),
        observacao_aprovacao: 'Aprovado automaticamente (unidade não requer aprovação)',
      }),
    });

    const presencaSalva = await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação apenas se aprovado automaticamente
    if (statusAprovacao === 'APROVADO') {
      try {
        await this.graduacaoService.incrementarPresenca(aluno.id);
      } catch (error) {
        console.error(
          '❌ [checkInQR] Erro ao incrementar graduação:',
          error.message,
        );
      }
    }

    const mensagem = requerAprovacao
      ? 'Check-in registrado. Aguardando aprovação.'
      : 'Check-in realizado e aprovado automaticamente!';

    return {
      success: true,
      message: mensagem,
      presenca: presencaSalva,
    };
  }

  async checkInManual(
    aulaId: string,
    user: any,
    latitude?: number,
    longitude?: number,
  ) {
    // Buscar aluno
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Buscar aula com unidade
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId },
      relations: ['unidade'],
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    // Validar localização se as coordenadas foram fornecidas
    if (latitude !== undefined && longitude !== undefined) {
      const validacao = this.validarLocalizacao(
        aula.unidade,
        latitude,
        longitude,
      );

      if (!validacao.valido) {
        throw new BadRequestException(validacao.mensagem);
      }
    }

    // Verificar se já existe check-in hoje (apenas 1 check-in por dia permitido)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        aluno_id: aluno.id,
        created_at: Between(hoje, amanha),
        status_aprovacao: In(['APROVADO', 'PENDENTE']),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException(
        'Você já fez check-in hoje. Apenas 1 check-in por dia é permitido.',
      );
    }

    // Verificar configuração de aprovação da unidade
    const requerAprovacao = aula.unidade.requer_aprovacao_checkin === true;
    const statusAprovacao = requerAprovacao ? 'PENDENTE' : 'APROVADO';

    // Registrar presença manual
    const presenca = this.presencaRepository.create({
      aluno_id: aluno.id,
      aula_id: aula.id,
      status: PresencaStatus.PRESENTE,
      modo_registro: PresencaMetodo.MANUAL,
      status_aprovacao: statusAprovacao,
      hora_checkin: new Date(),
      observacoes: `Check-in manual - Aula: ${aula.nome}`,
      created_by: user.id,
      // Se aprovação automática, preencher campos de aprovação
      ...(statusAprovacao === 'APROVADO' && {
        aprovado_por_id: user.id,
        aprovado_em: new Date(),
        observacao_aprovacao: 'Aprovado automaticamente (unidade não requer aprovação)',
      }),
    });

    const presencaSalva = await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação apenas se aprovado automaticamente
    if (statusAprovacao === 'APROVADO') {
      try {
        await this.graduacaoService.incrementarPresenca(aluno.id);
      } catch (error) {
        console.error(
          '❌ [checkInManual] Erro ao incrementar graduação:',
          error.message,
        );
      }
    }

    const mensagem = requerAprovacao
      ? 'Check-in registrado. Aguardando aprovação.'
      : 'Check-in manual realizado e aprovado automaticamente!';

    return {
      success: true,
      message: mensagem,
      presenca: presencaSalva,
    };
  }

  async checkInDependente(
    alunoId: string, 
    aulaId: string | undefined, 
    user: any,
    qrCode?: string,
    latitude?: number,
    longitude?: number,
  ) {
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

    let aula;

    // Se QR Code foi fornecido, processar para obter a aula
    if (qrCode) {
      if (qrCode.startsWith('QR-AULA-')) {
        const aulaIdFromQr = qrCode.replace('QR-AULA-', '');
        aula = await this.aulaRepository.findOne({
          where: { id: aulaIdFromQr },
          relations: ['unidade'],
        });
      } else if (qrCode.startsWith('QR-UNIDADE-')) {
        const unidadeId = qrCode.replace('QR-UNIDADE-', '');
        
        const agora = new Date();
        const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
        
        const aulasAtivas = await this.aulaRepository.find({
          where: {
            unidade_id: unidadeId,
            data_hora_inicio: Between(inicioHoje, fimHoje),
            ativo: true,
          },
          relations: ['unidade'],
        });
        
        aula = aulasAtivas.find(a => a.estaAtiva());
        
        if (!aula) {
          throw new BadRequestException(
            'Não há aula ativa no momento nesta unidade.',
          );
        }
      } else {
        throw new BadRequestException('QR Code com formato inválido');
      }
      
      if (!aula) {
        throw new NotFoundException('Aula não encontrada via QR Code');
      }
      
    } else if (aulaId) {
      // Usar aulaId tradicional
      aula = await this.aulaRepository.findOne({
        where: { id: aulaId },
        relations: ['unidade'],
      });
      
      if (!aula) {
        throw new NotFoundException('Aula não encontrada');
      }
    } else {
      throw new BadRequestException('É necessário fornecer aulaId ou qrCode');
    }

    // Validar localização se fornecida
    if (latitude !== undefined && longitude !== undefined) {
      const validacao = this.validarLocalizacao(aula.unidade, latitude, longitude);
      if (!validacao.valido) {
        console.warn('⚠️ Validação de localização falhou:', validacao.mensagem);
        // Não bloqueia - apenas aviso
      }
    }

    // Buscar configuração da unidade para verificar se requer aprovação
    const unidade = await this.unidadeRepository.findOne({
      where: { id: aula.unidade_id },
      select: ['id', 'nome', 'requer_aprovacao_checkin'],
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    // Verificar se já existe check-in hoje (apenas 1 check-in por dia permitido)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaHoje = await this.presencaRepository.findOne({
      where: {
        aluno_id: aluno.id,
        created_at: Between(hoje, amanha),
        status_aprovacao: In(['APROVADO', 'PENDENTE']),
      },
    });

    if (presencaHoje) {
      throw new BadRequestException(
        `${aluno.nome_completo} já fez check-in hoje. Apenas 1 check-in por dia é permitido.`,
      );
    }

    // Definir status de aprovação baseado na configuração da unidade
    // Garantir que NULL seja tratado como false (não requer aprovação)
    const requerAprovacao = unidade.requer_aprovacao_checkin === true;
    const statusAprovacao = requerAprovacao ? 'PENDENTE' : 'APROVADO';

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
        await this.graduacaoService.incrementarPresenca(aluno.id);
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

    // Buscar apenas presenças APROVADAS
    const presencas = await this.presencaRepository.find({
      where: {
        aluno_id: aluno.id,
        status_aprovacao: 'APROVADO', // ✅ Apenas presenças aprovadas
      },
      relations: ['aula', 'aula.unidade', 'aula.professor'],
      order: { created_at: 'DESC' },
      take: limit,
    });

    // Buscar faixa ativa do aluno
    const faixaAtiva = await this.alunoFaixaRepository.findOne({
      where: { aluno_id: aluno.id, ativa: true },
      relations: ['faixaDef'],
    });

    // Mapear as presenças com informações das aulas
    const presencasComAulas = presencas.map((p) => {
      return {
        id: p.id,
        data: p.created_at,
        horario: p.hora_checkin?.toTimeString().slice(0, 5) || '00:00',
        tipo: 'entrada',
        faixa: faixaAtiva?.faixaDef?.nome_exibicao || 'Branca',
        faixaCodigo: faixaAtiva?.faixaDef?.codigo || 'BRANCA',
        graus: faixaAtiva?.graus_atual || 0,
        aula: {
          nome: p.aula?.nome || 'Aula não encontrada',
          professor: p.aula?.professor?.nome_completo || 'Professor',
          unidade: p.aula?.unidade?.nome || 'Unidade',
        },
      };
    });

    return presencasComAulas;
  }

  async getMinhasPendentes(user: any) {
    // Buscar aluno pelo usuario_id
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (!aluno) {
      return [];
    }

    // Buscar presenças PENDENTES do aluno
    const presencasPendentes = await this.presencaRepository.find({
      where: {
        aluno_id: aluno.id,
        status_aprovacao: 'PENDENTE',
      },
      relations: ['aula', 'aula.unidade'],
      order: { created_at: 'DESC' },
    });

    return presencasPendentes.map((p) => ({
      id: p.id,
      data: p.created_at,
      aula: p.aula?.nome || 'Aula',
      unidade: p.aula?.unidade?.nome || 'Unidade',
      metodo: p.metodo,
    }));
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

  async getAlunoByCpfOrId(cpfOrId: string) {
    // Tentar buscar por ID primeiro
    let aluno = await this.alunoRepository.findOne({
      where: { id: cpfOrId },
    });

    // Se não encontrou por ID, tentar por CPF
    if (!aluno) {
      const cpfSemFormatacao = cpfOrId.replace(/\D/g, '');
      aluno = await this.alunoRepository.findOne({
        where: [{ cpf: cpfSemFormatacao }, { cpf: cpfOrId }],
      });
    }

    return aluno;
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

  async realizarCheckInPorId(
    alunoId: string,
    aulaId: string,
    metodo: string,
    adminUser: any,
  ) {
    // Verificar se aluno existe
    const aluno = await this.alunoRepository.findOne({
      where: { id: alunoId },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    return this.realizarCheckInAdmin(alunoId, aulaId, metodo, adminUser);
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

    // Buscar aula com unidade para verificar configuração de aprovação
    const aula = await this.aulaRepository.findOne({
      where: { id: aulaId },
      relations: ['unidade'],
    });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada');
    }

    // Verificar configuração de aprovação da unidade
    const requerAprovacao = aula.unidade?.requer_aprovacao_checkin === true;
    const statusAprovacao = requerAprovacao ? 'PENDENTE' : 'APROVADO';

    // Registrar presença
    const presenca = this.presencaRepository.create({
      aluno_id: alunoId,
      aula_id: aulaId,
      status: PresencaStatus.PRESENTE,
      modo_registro: metodo as PresencaMetodo,
      status_aprovacao: statusAprovacao,
      hora_checkin: new Date(),
      observacoes: `Registrado por: ${adminUser.id}`,
      created_by: adminUser.id,
      // Se aprovação automática, preencher campos de aprovação
      ...(statusAprovacao === 'APROVADO' && {
        aprovado_por_id: adminUser.id,
        aprovado_em: new Date(),
        observacao_aprovacao: 'Aprovado automaticamente (unidade não requer aprovação)',
      }),
    });

    const presencaSalva = await this.presencaRepository.save(presenca);
    
    // Incrementar contador de graduação apenas se aprovado automaticamente
    if (statusAprovacao === 'APROVADO') {
      try {
        await this.graduacaoService.incrementarPresenca(alunoId);
      } catch (error) {}
    }

    const mensagem = requerAprovacao
      ? 'Check-in registrado. Aguardando aprovação.'
      : 'Check-in administrativo realizado e aprovado automaticamente!';

    return {
      success: true,
      message: mensagem,
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
    // Verificar se é gerente ou recepcionista e obter sua unidade automaticamente
    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );
    const isGerente = perfisNomes.includes('GERENTE_UNIDADE');
    const isRecepcionista = perfisNomes.includes('RECEPCIONISTA');
    
    // Se for gerente ou recepcionista, SEMPRE forçar filtro pela unidade dele
    if (isGerente || isRecepcionista) {
      const unidadeUsuario = await this.getUnidadeUsuario(user);
      if (unidadeUsuario) {
        unidadeId = unidadeUsuario;
      }
    }

    // Se for franqueado e não especificou unidade, buscar todas as unidades dele
    let unidadesFranqueado: string[] = [];
    const isFranqueado = perfisNomes.includes('FRANQUEADO');
    if (isFranqueado && !unidadeId) {
      const franqueadoId = await this.getFranqueadoIdByUser(user.id);
      if (franqueadoId) {
        const unidadesResult = await this.unidadeRepository.find({
          where: { franqueado_id: franqueadoId },
          select: ['id'],
        });
        unidadesFranqueado = unidadesResult.map(u => u.id);
      }
    }
    
    // Parse dates correctly to avoid timezone issues
    let inicio: Date;
    let fim: Date;

    if (dataInicio) {
      // Parse date string in local timezone
      const [year, month, day] = dataInicio.split('-').map(Number);
      inicio = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      inicio.setHours(0, 0, 0, 0);
    }

    if (dataFim) {
      const [year, month, day] = dataFim.split('-').map(Number);
      fim = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      fim = new Date();
      fim.setHours(23, 59, 59, 999);
    }

    const query = this.presencaRepository
      .createQueryBuilder('presenca')
      .innerJoin(Aluno, 'aluno', 'aluno.id = presenca.aluno_id')
      .leftJoin('aluno.faixas', 'alunoFaixa', 'alunoFaixa.ativa = true')
      .leftJoin('alunoFaixa.faixaDef', 'faixaDef')
      .leftJoinAndSelect('presenca.aula', 'aula')
      .leftJoinAndSelect('aula.unidade', 'unidade')
      .leftJoinAndSelect('aula.professor', 'professor')
      .where('presenca.created_at BETWEEN :inicio AND :fim', { inicio, fim });

    // Primeiro buscar SEM filtro de unidade para ver se existem presenças
    const todasPresencas = await this.presencaRepository
      .createQueryBuilder('presenca')
      .innerJoin(Aluno, 'aluno', 'aluno.id = presenca.aluno_id')
      .addSelect('aluno.unidade_id', 'aluno_unidade_id')
      .where('presenca.created_at BETWEEN :inicio AND :fim', { inicio, fim })
      .getRawMany();
    
    if (todasPresencas.length > 0) {
      todasPresencas.forEach((p, i) => {
      });
    }

    if (unidadeId) {
      query.andWhere(
        '(aluno.unidade_id = :unidadeId OR aula.unidade_id = :unidadeId)',
        { unidadeId }
      );
    } else if (unidadesFranqueado.length > 0) {
      query.andWhere(
        '(aluno.unidade_id IN (:...unidadesFranqueado) OR aula.unidade_id IN (:...unidadesFranqueado))',
        { unidadesFranqueado }
      );
    } else {
    }

    const presencas = await query
      .addSelect('aluno.nome_completo', 'aluno_nome')
      .addSelect('aluno.id', 'aluno_id_select')
      .addSelect('faixaDef.categoria', 'faixa_categoria')
      .addSelect('faixaDef.nome_exibicao', 'faixa_nome')
      .addSelect('unidade.nome', 'unidade_nome')
      .addSelect('unidade.id', 'unidade_id')
      .addSelect('professor.nome_completo', 'professor_nome_completo')
      .addSelect('professor.id', 'professor_id')
      .orderBy('presenca.created_at', 'DESC')
      .getRawMany();

    const resultado = presencas.map((p) => {
      // Buscar categoria da faixa cadastrada (INFANTIL ou ADULTO)
      const faixaCategoria = p.faixa_categoria || 'ADULTO';
      const isKids = faixaCategoria === 'INFANTIL';
      const categoria = isKids ? 'KIDS' : 'ADULTO';

      return {
        id: p.presenca_id,
        data: p.presenca_created_at,
        aluno: {
          id: p.aluno_id_select || p.presenca_aluno_id,
          nome: p.aluno_nome || 'Nome não encontrado',
          categoria,
          isKids,
        },
        aula: {
          id: p.aula_id || p.presenca_aula_id,
          nome: p.aula_nome || 'Aula',
          unidade: p.unidade_nome ? {
            id: p.unidade_id,
            nome: p.unidade_nome,
          } : null,
          professor: p.professor_nome_completo ? {
            id: p.professor_id,
            nome_completo: p.professor_nome_completo,
          } : null,
        },
        status: p.presenca_status,
        metodo: p.presenca_modo_registro,
      };
    });

    return resultado;
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

    const perfis =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) || [];
    const isFranqueado = perfis.includes('FRANQUEADO');
    const isMaster = perfis.includes('MASTER') || perfis.includes('ADMIN');
    const isGerente = perfis.includes('GERENTE_UNIDADE');

    if (!unidadeFiltro && user) {
      if (!isMaster) {
        if (isFranqueado) {
          // Franqueado: buscar unidades do franqueado
          const unidadesResult = await this.presencaRepository.manager.query(
            `SELECT id FROM teamcruz.unidades WHERE franqueado_id =
             (SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1)`,
            [user.id],
          );

          // Franqueado sem unidades - retornar vazio
          if (unidadesResult.length === 0) {
            return [];
          }

          // Se não especificou unidade, não retornar dados agregados
          if (!unidadeId) {
            return [];
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
    // CORREÇÃO: Considerar data de matrícula para não marcar alunos recém-cadastrados como ausentes
    let query = `
      SELECT
        a.id,
        a.usuario_id,
        u.nome as nome_completo,
        u.cpf,
        u.created_at as data_matricula,
        MAX(pr.hora_checkin) as ultima_presenca,
        COUNT(DISTINCT DATE(pr.hora_checkin)) as total_presencas,
        -- Calcular dias desde matrícula (não contar dias antes de se matricular)
        CASE
          WHEN u.created_at > $2 THEN
            -- Se matriculou recentemente, contar apenas dias desde a matrícula
            GREATEST(0, DATE_PART('day', NOW() - u.created_at)::int - COUNT(DISTINCT DATE(pr.hora_checkin)))
          ELSE
            -- Se já está há mais de 30 dias, usar período completo
            $1 - COUNT(DISTINCT DATE(pr.hora_checkin))
        END as ausencias,
        DATE_PART('day', NOW() - u.created_at)::int as dias_desde_matricula
      FROM teamcruz.alunos a
      INNER JOIN teamcruz.usuarios u ON u.id = a.usuario_id
      LEFT JOIN teamcruz.presencas pr ON pr.aluno_id = a.id
        AND pr.hora_checkin >= $2
        AND pr.hora_checkin >= u.created_at  -- Só contar presenças após matrícula
      WHERE a.status = 'ATIVO'
        AND u.created_at <= NOW()  -- Garantir que está matriculado
    `;

    const params: any[] = [dias, dataLimite];

    if (unidadeFiltro) {
      query += ` AND a.unidade_id = $3`;
      params.push(unidadeFiltro);
    }

    query += `
      GROUP BY a.id, a.usuario_id, u.nome, u.cpf, u.created_at
      HAVING
        -- Só mostrar alunos com ausências significativas
        -- Se matriculou há menos de 7 dias, não aparecer no ranking
        DATE_PART('day', NOW() - u.created_at)::int >= 7
        AND
        CASE
          WHEN u.created_at > $2 THEN
            GREATEST(0, DATE_PART('day', NOW() - u.created_at)::int - COUNT(DISTINCT DATE(pr.hora_checkin))) > 0
          ELSE
            ($1 - COUNT(DISTINCT DATE(pr.hora_checkin))) > 0
        END
      ORDER BY ausencias DESC, ultima_presenca ASC NULLS FIRST
      LIMIT 20
    `;

    const resultado = await this.presencaRepository.manager.query(
      query,
      params,
    );

    return resultado.map((r: any) => {
      const diasDesdeMatricula = parseInt(r.dias_desde_matricula) || 0;
      const totalPresencas = parseInt(r.total_presencas) || 0;
      const ausencias = parseInt(r.ausencias) || 0;

      return {
        id: r.id,
        nome: r.nome_completo || r.nome,
        cpf: r.cpf,
        dataMatricula: r.data_matricula
          ? new Date(r.data_matricula).toISOString()
          : null,
        ultimaPresenca: r.ultima_presenca
          ? new Date(r.ultima_presenca).toISOString()
          : null,
        totalPresencas,
        ausencias,
        diasDesdeMatricula,
        diasSemTreino: r.ultima_presenca
          ? Math.floor(
              (Date.now() - new Date(r.ultima_presenca).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : diasDesdeMatricula,
      };
    });
  }

  async getRankingProfessoresPresenca(user: any, unidadeId?: string) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    // Se não forneceu unidadeId, detectar automaticamente baseado no usuário
    let unidadeFiltro = unidadeId;

    const perfis =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) || [];
    const isFranqueado = perfis.includes('FRANQUEADO');
    const isMaster = perfis.includes('MASTER') || perfis.includes('ADMIN');
    const isGerente = perfis.includes('GERENTE_UNIDADE');

    if (!unidadeFiltro && user) {
      if (!isMaster) {
        if (isFranqueado) {
          // Franqueado: buscar unidades do franqueado
          const unidadesResult = await this.presencaRepository.manager.query(
            `SELECT id FROM teamcruz.unidades WHERE franqueado_id =
             (SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1)`,
            [user.id],
          );

          // Franqueado sem unidades - retornar vazio
          if (unidadesResult.length === 0) {
            return [];
          }

          // Se não especificou unidade, não retornar dados agregados
          if (!unidadeId) {
            return [];
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
        u.data_nascimento,
        COUNT(DISTINCT pr.id) as total_presencas,
        COUNT(DISTINCT DATE(pr.hora_checkin)) as dias_presentes,
        ROUND(
          (COUNT(DISTINCT DATE(pr.hora_checkin))::numeric / 30.0 * 100), 1
        ) as taxa_frequencia,
        MAX(pr.hora_checkin) as ultima_presenca
      FROM teamcruz.alunos a
      INNER JOIN teamcruz.usuarios u ON u.id = a.usuario_id
      INNER JOIN teamcruz.presencas pr ON pr.aluno_id = a.id
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
      GROUP BY a.id, a.usuario_id, u.nome, u.data_nascimento
      ORDER BY dias_presentes DESC, total_presencas DESC, u.nome ASC
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
      dataNascimento: r.data_nascimento,
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

  async getAulasDisponiveis(user: any, data?: string, alunoId?: string) {
    const hoje = data ? new Date(data) : new Date();
    const diaSemana = hoje.getDay();

    try {
      // Buscar unidade do aluno ou franqueado
      let unidadeId: string | null = null;

      // Se foi passado alunoId, buscar a unidade desse aluno específico (dependente)
      let aluno: any = null;
      if (alunoId) {
        aluno = await this.alunoRepository.findOne({
          where: { id: alunoId },
          relations: ['unidade'],
        });
      } else {
        // Tentar como aluno do próprio usuário logado
        aluno = await this.alunoRepository.findOne({
          where: { usuario_id: user.id },
          relations: ['unidade'],
        });
      }

      if (aluno?.unidade_id) {
        unidadeId = aluno.unidade_id;
      } else {
        // Se não é aluno, tentar buscar como franqueado
        const franqueado = await this.dataSource.query(
          `SELECT u.id FROM teamcruz.unidades u 
           INNER JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
           WHERE f.usuario_id = $1 LIMIT 1`,
          [user.id],
        );

        if (franqueado.length > 0) {
          unidadeId = franqueado[0].id;
        }
      }

      // Buscar aulas ativas da unidade do aluno/franqueado ou todas se não tiver unidade
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

      // IMPORTANTE: Para aulas recorrentes (com dia_semana), NÃO usar data_hora_fim
      // porque são timestamps antigos. Apenas retornar todas as aulas do dia.
      const aulasDisponiveis = aulas.filter((aula) => {
        // Se é aula recorrente (tem dia_semana), sempre disponível
        if (aula.dia_semana !== null && aula.dia_semana !== undefined) {
          return true;
        }
        
        // Se for aula única (sem dia_semana), usar data_hora_fim
        if (aula.data_hora_fim) {
          const agora = hoje.getTime();
          const fimTime = aula.data_hora_fim.getTime();
          const disponivel = fimTime > agora;
          return disponivel;
        }
        
        // Sem data_hora_fim e sem dia_semana, sempre disponível
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
      console.error(' [getAulasDisponiveis] Erro ao buscar aulas:', error);
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

    // OTIMIZAÇÃO: Limitar resultados e evitar sobrecarga
    const alunos = await this.personRepository.find({
      where: {
        tipo_cadastro: TipoCadastro.ALUNO,
        // TODO: Adicionar filtro por relacionamento responsável-aluno
      },
      take: 20, // Limite de 20 filhos por responsável
      select: ['id', 'nome_completo'], // Buscar apenas campos necessários
    });

    // Verificar quais já fizeram check-in hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    if (alunos.length === 0) {
      return [];
    }

    const presencasHoje = await this.presencaRepository.find({
      where: {
        aluno_id: In(alunos.map((a) => a.id)),
        created_at: Between(hoje, amanha),
      },
      select: ['aluno_id'], // Buscar apenas o ID
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

      // Determinar categoria do aluno atual (INFANTIL: até 15 anos no ano atual, ADULTO: 16+)
      const anoNascimentoAluno = new Date(aluno.data_nascimento).getFullYear();
      const idadeNoAnoAtual = anoRef - anoNascimentoAluno;
      const categoriaAluno = idadeNoAnoAtual <= 15 ? 'INFANTIL' : 'ADULTO';

      // OTIMIZAÇÃO: Usar query SQL para calcular ranking direto no banco
      const query = `
        WITH alunos_filtrados AS (
          SELECT 
            a.id,
            a.nome_completo,
            EXTRACT(YEAR FROM AGE(CAST($4 AS DATE), a.data_nascimento)) as idade
          FROM teamcruz.alunos a
          WHERE a.unidade_id = $1
            AND a.status = 'ATIVO'
            AND CASE 
              WHEN $5 = 'INFANTIL' THEN EXTRACT(YEAR FROM AGE(CAST($4 AS DATE), a.data_nascimento)) <= 15
              ELSE EXTRACT(YEAR FROM AGE(CAST($4 AS DATE), a.data_nascimento)) > 15
            END
        ),
        presencas_mes AS (
          SELECT 
            p.aluno_id,
            COUNT(*) as total_presencas
          FROM teamcruz.presencas p
          WHERE p.aluno_id IN (SELECT id FROM alunos_filtrados)
            AND p.created_at >= $2
            AND p.created_at <= $3
          GROUP BY p.aluno_id
        )
        SELECT 
          af.id as aluno_id,
          af.nome_completo as nome,
          COALESCE(fd.nome_exibicao, 'Sem faixa') as faixa,
          COALESCE(f.graus_atual, 0) as graus,
          COALESCE(pm.total_presencas, 0) as presencas,
          ROW_NUMBER() OVER (ORDER BY COALESCE(pm.total_presencas, 0) DESC) as posicao
        FROM alunos_filtrados af
        LEFT JOIN presencas_mes pm ON pm.aluno_id = af.id
        LEFT JOIN teamcruz.aluno_faixa f ON f.aluno_id = af.id AND f.ativa = true
        LEFT JOIN teamcruz.faixa_def fd ON fd.id = f.faixa_def_id
        ORDER BY COALESCE(pm.total_presencas, 0) DESC
        LIMIT 100
      `;

      const rankingComDetalhes = await this.presencaRepository.manager.query(
        query,
        [
          aluno.unidade_id,
          primeiroDia,
          ultimoDia,
          `${anoRef}-01-01`,
          categoriaAluno,
        ],
      );

      // Encontrar posição do aluno atual
      const alunoNoRanking = rankingComDetalhes.find(
        (item: any) => item.aluno_id === aluno.id,
      );
      const posicao = alunoNoRanking ? parseInt(alunoNoRanking.posicao) : null;
      const presencasDoAluno = alunoNoRanking
        ? parseInt(alunoNoRanking.presencas)
        : 0;

      // Retornar apenas o top 10 no ranking completo
      const top10 = rankingComDetalhes.slice(0, 10).map((item: any, index) => ({
        posicao: index + 1,
        nome: item.nome,
        faixa: item.faixa,
        graus: parseInt(item.graus),
        presencas: parseInt(item.presencas),
        isUsuarioAtual: item.aluno_id === aluno.id,
      }));

      return {
        posicao,
        presencas: presencasDoAluno,
        totalAlunos: rankingComDetalhes.length,
        mes: mesRef,
        ano: anoRef,
        categoria: categoriaAluno,
        ranking: top10,
      };
    } catch (error) {
      console.error(' [getRankingUnidade] Erro ao buscar ranking:', error);
      return {
        posicao: null,
        totalAlunos: 0,
        ranking: [],
        categoria: null,
      };
    }
  }

  private async calcularSequenciaAtual(pessoaId: string): Promise<number> {
    // OTIMIZAÇÃO: Usar query SQL mais eficiente para calcular sequência
    const query = `
      WITH dias_unicos AS (
        SELECT DISTINCT DATE(created_at) as data
        FROM teamcruz.presencas
        WHERE aluno_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY DATE(created_at) DESC
      ),
      sequencia AS (
        SELECT 
          data,
          data - LAG(data, 1, data + 1) OVER (ORDER BY data DESC) as dias_diff
        FROM dias_unicos
      )
      SELECT COUNT(*) as total
      FROM sequencia
      WHERE dias_diff >= -1
        AND data >= (
          SELECT MIN(data) 
          FROM sequencia 
          WHERE dias_diff < -1
        );
    `;

    const resultado = await this.presencaRepository.manager.query(query, [
      pessoaId,
    ]);

    return parseInt(resultado[0]?.total || '0');
  }

  // ========== TABLET CHECK-IN METHODS ==========

  async checkInTablet(
    alunoId: string,
    aulaId: string,
    metodo: string,
    user: any,
  ) {
    // Validar perfil TABLET_CHECKIN
    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );

    if (!perfisNomes.includes('TABLET_CHECKIN')) {
      console.error(' [checkInTablet] Perfil não autorizado:', perfisNomes);
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
    const aluno = await this.alunoRepository.findOne({
      where: { id: alunoId },
    });

    if (!aluno) {
      console.error(
        ' [checkInTablet] Aluno não encontrado no banco. ID:',
        alunoId,
      );
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se o aluno pertence à mesma unidade do tablet
    if (aluno.unidade_id !== unidadeTablet) {
      console.error(' [checkInTablet] Aluno de outra unidade:', {
        alunoUnidade: aluno.unidade_id,
        tabletUnidade: unidadeTablet,
      });
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

    // Verificar se já existe presença para este aluno hoje (independente da aula)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const presencaExistente = await this.presencaRepository.findOne({
      where: {
        aluno_id: alunoId,
        hora_checkin: Between(hoje, amanha),
        status_aprovacao: In(['APROVADO', 'PENDENTE']),
      },
    });

    if (presencaExistente) {
      throw new BadRequestException(
        'Este aluno já realizou check-in hoje. Apenas 1 check-in por dia é permitido.',
      );
    }

    // Check-in via tablet sempre é aprovado automaticamente
    const statusAprovacao = 'APROVADO';

    // Criar presença já aprovada (tablet sempre aprova automaticamente)
    const presenca = this.presencaRepository.create({
      aluno_id: alunoId,
      aula_id: aulaId,
      metodo: metodo as PresencaMetodo,
      status: PresencaStatus.PRESENTE,
      status_aprovacao: statusAprovacao,
      data_presenca: new Date(),
      aprovado_por_id: user.id,
      aprovado_em: new Date(),
      observacao_aprovacao: 'Aprovado automaticamente via tablet',
    });

    await this.presencaRepository.save(presenca);

    // Incrementar contador de graduação do aluno
    try {
      await this.graduacaoService.incrementarPresenca(alunoId);
    } catch (error) {
      console.error('[checkInTablet] Erro ao incrementar presença:', error);
    }

    const mensagem = 'Check-in registrado e aprovado automaticamente!';

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
    const perfisPermitidos = [
      'RECEPCIONISTA',
      'PROFESSOR',
      'GERENTE_UNIDADE',
      'INSTRUTOR',
    ];

    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );

    const temPermissao = perfisNomes.some((p) => perfisPermitidos.includes(p));

    if (!temPermissao) {
      console.error(
        ' [getPresencasPendentes] Usuário sem permissão:',
        perfisNomes,
      );
      throw new ForbiddenException(
        'Apenas RECEPCIONISTA, PROFESSOR ou GERENTE pode visualizar presenças pendentes',
      );
    }

    // Determinar unidade do usuário
    const unidadeId = await this.getUnidadeUsuario(user);
    if (!unidadeId) {
      console.error(' [getPresencasPendentes] Usuário sem unidade');
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
      .leftJoin(Aluno, 'aluno', 'aluno.id = p.aluno_id')
      .leftJoinAndSelect('p.aula', 'aula')
      .leftJoinAndSelect('aula.unidade', 'unidade')
      .leftJoinAndSelect('aula.professor', 'professor')
      .addSelect([
        'aluno.id',
        'aluno.nome_completo',
        'aluno.cpf',
        'aluno.foto_url',
      ])
      .where('p.status_aprovacao = :status', { status: 'PENDENTE' })
      .andWhere('unidade.id = :unidadeId', { unidadeId })
      .andWhere(data ? 'DATE(p.created_at) = :data' : '1=1', {
        data: data ? new Date(data) : undefined,
      })
      .andWhere(aulaId ? 'p.aula_id = :aulaId' : '1=1', { aulaId })
      .orderBy('p.created_at', 'DESC')
      .getRawAndEntities();

    const { raw, entities } = presencas;

    return entities.map((p, index) => {
      const rawData = raw[index];

      return {
        id: p.id,
        aluno: {
          id: rawData?.aluno_id || p.aluno_id,
          nome: rawData?.aluno_nome_completo || 'Nome não encontrado',
          foto: rawData?.aluno_foto_url || null,
          cpf: rawData?.aluno_cpf || '',
        },
        aula: {
          id: p.aula?.id || p.aula_id,
          nome: p.aula?.nome || 'Aula',
          professor: p.aula?.professor?.nome_completo || '',
          horario: p.aula ? `${p.aula.hora_inicio} - ${p.aula.hora_fim}` : '',
        },
        metodo: p.metodo,
        dataCheckin: p.created_at,
        status: p.status_aprovacao,
      };
    });
  }

  async aprovarPresenca(id: string, user: any, observacao?: string) {
    // Verificar permissão
    const perfisPermitidos = [
      'RECEPCIONISTA',
      'PROFESSOR',
      'GERENTE_UNIDADE',
      'INSTRUTOR',
    ];

    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );

    const temPermissao = perfisNomes.some((p) => perfisPermitidos.includes(p));

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

    // Aprovar presença - usar update ao invés de save para evitar sobrescrever campos relacionados
    const updateData: any = {
      status_aprovacao: 'APROVADO',
      aprovado_por_id: user.id,
      aprovado_em: new Date(),
    };

    if (observacao) {
      updateData.observacao_aprovacao = observacao;
    }

    await this.presencaRepository.update(id, updateData);

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
        ' [aprovarPresenca] Erro ao incrementar graduação:',
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
    const perfisPermitidos = [
      'RECEPCIONISTA',
      'PROFESSOR',
      'GERENTE_UNIDADE',
      'INSTRUTOR',
    ];

    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );

    const temPermissao = perfisNomes.some((p) => perfisPermitidos.includes(p));

    if (!temPermissao) {
      throw new ForbiddenException(
        'Apenas RECEPCIONISTA, PROFESSOR ou GERENTE pode rejeitar presenças',
      );
    }

    // Query sem relations para evitar que aluno_id seja undefined no save
    const presenca = await this.presencaRepository.findOne({
      where: { id },
      relations: ['aula', 'aula.unidade'],
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

    // Guardar informações antes de deletar
    const presencaInfo = {
      id: presenca.id,
      aluno_id: presenca.aluno_id,
      aula_id: presenca.aula_id,
      rejeitadoPor: user.nome,
      rejeitadoEm: new Date(),
      motivo: observacao,
    };

    // DELETAR o registro de presença (em vez de apenas marcar como REJEITADO)
    await this.presencaRepository.remove(presenca);

    return {
      message: 'Presença rejeitada e removida com sucesso',
      presenca: presencaInfo,
    };
  }

  private async getUnidadeUsuario(user: any): Promise<string | null> {
    // Normalizar perfis
    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );

    if (perfisNomes.includes('GERENTE_UNIDADE')) {
      const result = await this.personRepository.query(
        `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      return result[0]?.unidade_id || null;
    }

    if (perfisNomes.includes('RECEPCIONISTA')) {
      const result = await this.personRepository.query(
        `SELECT unidade_id FROM teamcruz.recepcionista_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      return result[0]?.unidade_id || null;
    }

    if (
      perfisNomes.includes('PROFESSOR') ||
      perfisNomes.includes('INSTRUTOR')
    ) {
      const result = await this.personRepository.query(
        `SELECT pu.unidade_id
         FROM teamcruz.professor_unidades pu
         LEFT JOIN teamcruz.professores p ON p.id = pu.professor_id
         WHERE (p.usuario_id = $1 OR pu.usuario_id = $1) AND pu.ativo = true
         LIMIT 1`,
        [user.id],
      );
      return result[0]?.unidade_id || null;
    }

    console.warn('⚠️ [getUnidadeUsuario] Nenhum perfil com unidade encontrado');
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

  private async getFranqueadoIdByUser(userId: string): Promise<string | null> {
    if (!userId) {
      return null;
    }
    const result = await this.personRepository.query(
      `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
      [userId],
    );
    return result[0]?.id || null;
  }

  async getHistoricoAluno(alunoId: string, user: any, limit: number = 10) {
    // Verificar se é master ou franqueado
    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );
    const isMaster = perfisNomes.includes('MASTER');

    // Buscar o aluno
    const aluno = await this.alunoRepository.findOne({
      where: { id: alunoId },
      relations: ['responsavel'],
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se é o próprio aluno
    const isProprioAluno = aluno.usuario_id === user.id;

    // Verificar se é responsável pelo aluno
    const isResponsavel = aluno.responsavel?.usuario_id === user.id;

    if (!isMaster && !isProprioAluno && !isResponsavel) {
      throw new UnauthorizedException(
        'Você não tem permissão para visualizar o histórico deste aluno',
      );
    }

    // Buscar presenças APROVADAS e PENDENTES (não mostrar apenas as REJEITADAS)
    const presencas = await this.presencaRepository.find({
      where: {
        aluno_id: alunoId,
        status_aprovacao: In(['APROVADO', 'PENDENTE']),
      },
      relations: ['aula', 'aula.unidade', 'aula.professor'],
      order: { created_at: 'DESC' },
      take: limit,
    });

    // Buscar faixa ativa do aluno
    const faixaAtiva = await this.alunoFaixaRepository.findOne({
      where: { aluno_id: alunoId, ativa: true },
      relations: ['faixaDef'],
    });

    // Mapear as presenças com informações das aulas
    const presencasComAulas = presencas.map((p) => {
      return {
        id: p.id,
        data: p.created_at,
        horario: p.hora_checkin?.toTimeString().slice(0, 5) || '00:00',
        tipo: 'entrada',
        faixa: faixaAtiva?.faixaDef?.nome_exibicao || 'Branca',
        faixaCodigo: faixaAtiva?.faixaDef?.codigo || 'BRANCA',
        graus: faixaAtiva?.graus_atual || 0,
        statusAprovacao: p.status_aprovacao, // Adicionar status de aprovação
        aula: {
          nome: p.aula?.nome || 'Aula não encontrada',
          professor: p.aula?.professor?.nome_completo || 'Professor',
          unidade: p.aula?.unidade?.nome || 'Unidade',
        },
      };
    });

    return presencasComAulas;
  }

  async getEstatisticasAluno(alunoId: string, user: any): Promise<EstatisticasPresenca> {
    // Verificar se é master ou franqueado
    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );
    const isMaster = perfisNomes.includes('MASTER');

    // Buscar o aluno
    const aluno = await this.alunoRepository.findOne({
      where: { id: alunoId },
      relations: ['responsavel'],
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se é o próprio aluno
    const isProprioAluno = aluno.usuario_id === user.id;

    // Verificar se é responsável pelo aluno
    const isResponsavel = aluno.responsavel?.usuario_id === user.id;

    if (!isMaster && !isProprioAluno && !isResponsavel) {
      throw new UnauthorizedException(
        'Você não tem permissão para visualizar as estatísticas deste aluno',
      );
    }

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

    // Presenças do mês atual (apenas aprovadas para estatísticas)
    const presencasMes = await this.presencaRepository.count({
      where: {
        aluno_id: alunoId,
        created_at: Between(inicioMes, fimMes),
        status_aprovacao: 'APROVADO', // Apenas presenças aprovadas para estatísticas
      },
    });

    // Total de dias úteis no mês (aproximação)
    const diasUteisMes = 22;
    const presencaMensal = Math.round((presencasMes / diasUteisMes) * 100);

    // Última presença (considerando aprovadas e pendentes)
    const ultimaPresenca = await this.presencaRepository.findOne({
      where: {
        aluno_id: alunoId,
        status_aprovacao: In(['APROVADO', 'PENDENTE']),
      },
      order: { created_at: 'DESC' },
    });

    // Sequência atual
    const sequenciaAtual = await this.calcularSequenciaAtual(alunoId);

    const resultado = {
      presencaMensal: Math.min(presencaMensal, 100),
      aulasMes: presencasMes,
      sequenciaAtual,
      ultimaPresenca: ultimaPresenca?.created_at.toISOString() || null,
    };

    return resultado;
  }
}
