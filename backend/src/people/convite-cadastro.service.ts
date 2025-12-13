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
import * as bcrypt from 'bcrypt';

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
  ) {}

  async criarConvite(dto: CriarConviteDto, criadoPorId: string) {
    // Gerar token único
    const token = randomBytes(32).toString('hex');

    // Criar convite
    const convite = this.conviteRepository.create({
      ...dto,
      token,
      criado_por: criadoPorId,
      data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    });

    await this.conviteRepository.save(convite);

    // Buscar perfil_id de 'aluno'
    const perfilAluno = await this.usuarioRepository.query(
      `SELECT id FROM teamcruz.perfis WHERE UPPER(nome) = 'ALUNO' LIMIT 1`,
    );
    const perfilId = perfilAluno[0]?.id;

    // Gerar link para /register com unidade e perfil pré-preenchidos
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${baseUrl}/register?unidade=${dto.unidade_id}&perfil=${perfilId}`;

    return {
      ...convite,
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

    if (new Date() > convite.data_expiracao) {
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

    if (new Date() > convite.data_expiracao) {
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
    const dataNasc = new Date(dto.data_nascimento);
    const idade = Math.floor(
      (Date.now() - dataNasc.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

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
      data_nascimento: dataNasc,
      genero: dto.genero as any,
      endereco_id: enderecoId || undefined,
      unidade_id: convite.unidade_id,
      usuario_id: usuarioId || undefined,
      status: 'ATIVO' as any,
      data_matricula:
        convite.tipo_cadastro === 'ALUNO' ? new Date() : undefined,
      faixa_atual: dto.faixa_atual || undefined,
      grau_atual: dto.grau_atual ? parseInt(dto.grau_atual) : undefined,
      responsavel_nome: dto.responsavel_nome || undefined,
      responsavel_cpf: dto.responsavel_cpf || undefined,
      responsavel_telefone: dto.responsavel_telefone || undefined,
    });

    const personSalva = await this.personRepository.save(person);

    // Marcar convite como usado
    convite.usado = true;
    convite.usado_em = new Date();
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
    const mensagem = nome
      ? `Olá ${nome}! Seu link de cadastro está pronto: ${link}`
      : `Olá! Seu link de cadastro está pronto: ${link}`;

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
    convite.data_expiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
}
