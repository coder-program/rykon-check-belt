import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConviteCadastro } from './entities/convite-cadastro.entity';
import {
  CriarConviteDto,
  CompletarCadastroDto,
} from './dto/convite-cadastro.dto';
import { randomBytes } from 'crypto';
import { Person } from './entities/person.entity';
import { Endereco } from '../enderecos/endereco.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Aluno, StatusAluno, Genero } from './entities/aluno.entity';
import { AlunoConvenio, AlunoConvenioStatus } from '../financeiro/entities/aluno-convenio.entity';
import { Convenio } from '../financeiro/entities/convenio.entity';
import * as bcrypt from 'bcrypt';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class ConviteCadastroService {
  constructor(
    @InjectRepository(ConviteCadastro)
    private conviteRepository: Repository<ConviteCadastro>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(Endereco)
    private enderecoRepository: Repository<Endereco>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(AlunoConvenio)
    private alunoConvenioRepository: Repository<AlunoConvenio>,
    @InjectRepository(Convenio)
    private convenioRepository: Repository<Convenio>,
  ) {}

  async criarConvite(dto: CriarConviteDto, criadoPorId: string) {
    // Apenas gerar link público de cadastro
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${baseUrl}/register`;

    return {
      telefone: dto.telefone,
      link,
      linkWhatsApp: this.gerarLinkWhatsApp(
        dto.telefone,
        link,
        dto.nome_pre_cadastro,
      ),
    };
  }

  async listarConvites(unidadeId?: string) {
    const query = this.conviteRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.unidade', 'unidade')
      .leftJoinAndSelect('c.criador', 'criador')
      .orderBy('c.criado_em', 'DESC');

    if (unidadeId) {
      query.andWhere('c.unidade_id = :unidadeId', { unidadeId });
    }

    const convites = await query.getMany();

    // Buscar perfil_id de 'aluno'
    const perfilAluno = await this.usuarioRepository.query(
      `SELECT id FROM teamcruz.perfis WHERE UPPER(nome) = 'ALUNO' LIMIT 1`,
    );
    const perfilId = perfilAluno[0]?.id;

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return convites.map((c) => ({
      ...c,
      link: `${baseUrl}/register?unidade=${c.unidade_id}&perfil=${perfilId}`,
    }));
  }

  async validarToken(token: string) {
    const convite = await this.conviteRepository.findOne({
      where: { token },
      relations: ['unidade'],
    });

    if (!convite) {
      return {
        valido: false,
        mensagem: 'Convite não encontrado',
      };
    }

    if (convite.usado) {
      return {
        valido: false,
        mensagem: 'Este convite já foi utilizado',
      };
    }

    if (dayjs().tz('America/Sao_Paulo').isAfter(dayjs(convite.data_expiracao).tz('America/Sao_Paulo'))) {
      return {
        valido: false,
        mensagem: 'Este convite expirou',
      };
    }

    return {
      valido: true,
      mensagem: 'Token válido',
      convite: {
        tipo_cadastro: convite.tipo_cadastro,
        unidade: {
          id: convite.unidade.id,
          nome: convite.unidade.nome,
        },
        nome_pre_cadastro: convite.nome_pre_cadastro,
        email: convite.email,
        telefone: convite.telefone,
        cpf: convite.cpf,
      },
    };
  }

  async completarCadastro(dto: CompletarCadastroDto) {
    const convite = await this.conviteRepository.findOne({
      where: { token: dto.token },
    });

    if (!convite) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (convite.usado) {
      throw new BadRequestException('Este convite já foi utilizado');
    }

    if (dayjs().tz('America/Sao_Paulo').isAfter(dayjs(convite.data_expiracao).tz('America/Sao_Paulo'))) {
      throw new BadRequestException('Este convite expirou');
    }

    // Verificar se CPF já existe
    const cpfExiste = await this.personRepository.findOne({
      where: { cpf: dto.cpf },
    });

    if (cpfExiste) {
      throw new BadRequestException('CPF já cadastrado no sistema');
    }

    // Criar endereço se informado
    let enderecoId: string | null = null;
    if (dto.cep) {
      const endereco = this.enderecoRepository.create({
        cep: dto.cep,
        logradouro: dto.logradouro,
        numero: dto.numero,
        complemento: dto.complemento,
        bairro: dto.bairro,
        cidade: dto.cidade,
        estado: dto.estado,
      });
      const enderecoSalvo = await this.enderecoRepository.save(endereco);
      enderecoId = enderecoSalvo.id;
    }

    // Criar usuário se for responsável ou aluno adulto (18+)
    let usuarioId: string | null = null;
    const dataNasc = dayjs(dto.data_nascimento).tz('America/Sao_Paulo');
    const idade = dayjs().tz('America/Sao_Paulo').diff(dataNasc, 'year');

    if (convite.tipo_cadastro === 'RESPONSAVEL' || idade >= 18) {
      // Verificar se email já existe
      const emailExiste = await this.usuarioRepository.findOne({
        where: { email: dto.email },
      });

      if (emailExiste) {
        throw new BadRequestException('Email já cadastrado no sistema');
      }

      // Hash da senha
      const senhaHash = dto.senha
        ? await bcrypt.hash(dto.senha, 10)
        : undefined;

      const usuario = this.usuarioRepository.create({
        email: dto.email || undefined,
        nome: dto.nome_completo,
        cpf: dto.cpf,
        telefone: dto.telefone || undefined,
        password: senhaHash,
        ativo: true,
        cadastro_completo: true,
      });

      const usuarioSalvo = await this.usuarioRepository.save(usuario);
      usuarioId = usuarioSalvo.id;

      // Atribuir perfil de RESPONSAVEL se for o caso
      if (convite.tipo_cadastro === 'RESPONSAVEL') {
        // TODO: Criar entrada na tabela perfil_usuario
      }
    }

    // Criar Person (aluno ou responsável)
    const person = this.personRepository.create({
      tipo_cadastro: convite.tipo_cadastro as any,
      nome_completo: dto.nome_completo,
      cpf: dto.cpf,
      email: dto.email,
      telefone_whatsapp: dto.telefone,
      data_nascimento: dataNasc.toDate(),
      genero: dto.genero as any,
      endereco_id: enderecoId || undefined,
      unidade_id: convite.unidade_id || undefined,
      usuario_id: usuarioId || undefined,
      status: 'ATIVO' as any,
      data_matricula:
        convite.tipo_cadastro === 'ALUNO' ? dayjs().tz('America/Sao_Paulo').toDate() : undefined,
      faixa_atual: dto.faixa_atual || undefined,
      grau_atual: dto.grau_atual ? parseInt(dto.grau_atual) : undefined,
      responsavel_nome: dto.responsavel_nome || undefined,
      responsavel_cpf: dto.responsavel_cpf || undefined,
      responsavel_telefone: dto.responsavel_telefone || undefined,
    });

    const personSalva = await this.personRepository.save(person);

    // Marcar convite como usado
    convite.usado = true;
    convite.usado_em = dayjs().tz('America/Sao_Paulo').toDate();
    if (usuarioId) {
      convite.usuario_criado_id = usuarioId;
    }
    await this.conviteRepository.save(convite);

    return {
      success: true,
      message: 'Cadastro completado com sucesso!',
      pessoa_id: personSalva.id,
      usuario_id: usuarioId,
    };
  }

  private gerarLinkWhatsApp(
    telefone: string | undefined,
    link: string,
    nome?: string,
  ): string | null {
    if (!telefone) return null;

    const telefoneFormatado = telefone.replace(/\D/g, '');
    // Enviar apenas o link, sem informações adicionais
    const mensagem = link;

    return `https://wa.me/55${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;
  }

  async reenviarConvite(conviteId: string) {
    const convite = await this.conviteRepository.findOne({
      where: { id: conviteId },
    });

    if (!convite) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (convite.usado) {
      throw new BadRequestException('Convite já foi utilizado');
    }

    // Estender expiração por mais 7 dias
    convite.data_expiracao = dayjs().tz('America/Sao_Paulo').add(7, 'day').toDate();
    await this.conviteRepository.save(convite);

    const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cadastro/${convite.token}`;

    return {
      ...convite,
      link,
      linkWhatsApp: this.gerarLinkWhatsApp(
        convite.telefone || undefined,
        link,
        convite.nome_pre_cadastro || undefined,
      ),
    };
  }

  async cancelarConvite(conviteId: string) {
    const convite = await this.conviteRepository.findOne({
      where: { id: conviteId },
    });

    if (!convite) {
      throw new NotFoundException('Convite não encontrado');
    }

    await this.conviteRepository.remove(convite);

    return { success: true, message: 'Convite cancelado' };
  }

  /**
   * Cadastro público com suporte a convênios (Gympass/Totalpass)
   */
  async cadastroPublico(dto: any) {
    // Verificar se CPF já existe
    const cpfExiste = await this.alunoRepository.findOne({
      where: { cpf: dto.cpf },
    });

    if (cpfExiste) {
      throw new BadRequestException('CPF já cadastrado no sistema');
    }

    // Verificar se email já existe
    if (dto.email) {
      const emailExiste = await this.usuarioRepository.findOne({
        where: { email: dto.email },
      });

      if (emailExiste) {
        throw new BadRequestException('Email já cadastrado no sistema');
      }
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(dto.senha, 10);

    // Criar usuário
    const usuario = this.usuarioRepository.create({
      email: dto.email,
      nome: dto.nome_completo,
      cpf: dto.cpf,
      telefone: dto.telefone,
      password: senhaHash,
      ativo: true,
      cadastro_completo: true,
    });

    const usuarioSalvo = await this.usuarioRepository.save(usuario);

    // Criar aluno
    const aluno = this.alunoRepository.create({
      nome_completo: dto.nome_completo,
      cpf: dto.cpf,
      email: dto.email,
      telefone: dto.telefone,
      data_nascimento: dayjs(dto.data_nascimento).tz('America/Sao_Paulo').toDate(),
      genero: (dto.genero as Genero) || Genero.MASCULINO,
      unidade_id: dto.unidade_id,
      usuario_id: usuarioSalvo.id,
      status: StatusAluno.ATIVO,
      data_matricula: dayjs().tz('America/Sao_Paulo').toDate(),
    });

    const alunoSalvo = await this.alunoRepository.save(aluno);

    // Se tem dados de convênio, criar vínculo
    if (dto.convenio_tipo && dto.convenio_user_id) {
      const convenio = await this.convenioRepository.findOne({
        where: { codigo: dto.convenio_tipo },
      });

      if (convenio) {
        const alunoConvenio = this.alunoConvenioRepository.create({
          aluno_id: alunoSalvo.id,
          convenio_id: convenio.id,
          unidade_id: dto.unidade_id,
          convenio_user_id: dto.convenio_user_id,
          status: AlunoConvenioStatus.ATIVO,
          data_ativacao: dayjs().tz('America/Sao_Paulo').toDate(),
          metadata: {
            email: dto.email,
            telefone: dto.telefone,
            origem: 'cadastro_publico',
          },
        });

        await this.alunoConvenioRepository.save(alunoConvenio);
      }
    }

    return {
      success: true,
      message: 'Cadastro completado com sucesso!',
      aluno_id: alunoSalvo.id,
      usuario_id: usuarioSalvo.id,
    };
  }
}
