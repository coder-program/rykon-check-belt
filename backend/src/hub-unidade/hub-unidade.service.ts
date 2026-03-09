import {
  Injectable, Logger, NotFoundException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UnidadeVideo }        from './entities/unidade-video.entity';
import { UnidadeRecado }       from './entities/unidade-recado.entity';
import { UnidadeRecadoLido }   from './entities/unidade-recado-lido.entity';
import { UnidadeProduto }      from './entities/unidade-produto.entity';
import { ProdutoPedido, StatusPedido, MetodoPagamento } from './entities/produto-pedido.entity';
import { ProdutoPedidoItem }   from './entities/produto-pedido-item.entity';
import {
  CriarVideoDto, AtualizarVideoDto,
  CriarRecadoDto, AtualizarRecadoDto,
  CriarProdutoDto, AtualizarProdutoDto,
  CriarPedidoDto,
} from './dto/hub-unidade.dto';
import { EmailService }   from '../email/email.service';
import { Unidade }        from '../people/entities/unidade.entity';
import { Aluno }          from '../people/entities/aluno.entity';
import { Fatura, StatusFatura } from '../financeiro/entities/fatura.entity';
import { MetodoPagamento as FaturaMetodoPagamento } from '../financeiro/entities/assinatura.entity';

const TAXA_PLATAFORMA = 0.05; // 5% split para a plataforma

@Injectable()
export class HubUnidadeService {
  private readonly logger = new Logger(HubUnidadeService.name);

  constructor(
    @InjectRepository(UnidadeVideo)      private videoRepo: Repository<UnidadeVideo>,
    @InjectRepository(UnidadeRecado)     private recadoRepo: Repository<UnidadeRecado>,
    @InjectRepository(UnidadeRecadoLido) private leituraRepo: Repository<UnidadeRecadoLido>,
    @InjectRepository(UnidadeProduto)    private produtoRepo: Repository<UnidadeProduto>,
    @InjectRepository(ProdutoPedido)     private pedidoRepo: Repository<ProdutoPedido>,
    @InjectRepository(ProdutoPedidoItem) private itemRepo: Repository<ProdutoPedidoItem>,
    @InjectRepository(Unidade)           private unidadeRepo: Repository<Unidade>,
    @InjectRepository(Aluno)             private alunoRepo: Repository<Aluno>,
    @InjectRepository(Fatura)            private faturaRepo: Repository<Fatura>,
    private readonly emailService: EmailService,
  ) {}

  // ================================================================
  // VÍDEOS
  // ================================================================
  async listarVideos(unidadeId: string): Promise<UnidadeVideo[]> {
    return this.videoRepo.find({
      where: { unidade_id: unidadeId, ativo: true },
      relations: ['modalidade'],
      order: { ordem: 'ASC', criado_em: 'DESC' },
    });
  }

  async listarTodosVideos(unidadeId: string): Promise<UnidadeVideo[]> {
    return this.videoRepo.find({
      where: { unidade_id: unidadeId },
      relations: ['modalidade'],
      order: { ordem: 'ASC', criado_em: 'DESC' },
    });
  }

  async criarVideo(dto: CriarVideoDto, usuarioId: string): Promise<UnidadeVideo> {
    const video = this.videoRepo.create({
      ...dto,
      ativo: dto.ativo ?? true,
      ordem: dto.ordem ?? 0,
      criado_por: usuarioId,
      modalidade_id: dto.modalidade_id ?? null,
    });
    return this.videoRepo.save(video);
  }

  async atualizarVideo(id: string, dto: AtualizarVideoDto): Promise<UnidadeVideo> {
    const video = await this.videoRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Vídeo não encontrado');
    Object.assign(video, dto);
    return this.videoRepo.save(video);
  }

  async removerVideo(id: string): Promise<void> {
    const video = await this.videoRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Vídeo não encontrado');
    await this.videoRepo.remove(video);
  }

  // ================================================================
  // RECADOS
  // ================================================================
  async listarRecados(unidadeId: string): Promise<UnidadeRecado[]> {
    return this.recadoRepo.find({
      where: { unidade_id: unidadeId, ativo: true },
      order: { publicado_em: 'DESC' },
    });
  }

  async criarRecado(dto: CriarRecadoDto, usuarioId: string): Promise<UnidadeRecado> {
    const recado = this.recadoRepo.create({ ...dto, criado_por: usuarioId });
    return this.recadoRepo.save(recado);
  }

  async atualizarRecado(id: string, dto: AtualizarRecadoDto): Promise<UnidadeRecado> {
    const recado = await this.recadoRepo.findOne({ where: { id } });
    if (!recado) throw new NotFoundException('Recado não encontrado');
    Object.assign(recado, dto);
    return this.recadoRepo.save(recado);
  }

  async removerRecado(id: string): Promise<void> {
    const recado = await this.recadoRepo.findOne({ where: { id } });
    if (!recado) throw new NotFoundException('Recado não encontrado');
    await this.recadoRepo.remove(recado);
  }

  // ================================================================
  // HELPER PRIVADO
  // ================================================================
  /** Resolve um usuarioId ou alunoId para a entidade Aluno.
   *  Tenta por id primeiro (aluno direto), depois por usuario_id. */
  private async resolveAluno(id: string): Promise<Aluno> {
    let aluno = await this.alunoRepo.findOne({ where: { id } });
    if (!aluno) aluno = await this.alunoRepo.findOne({ where: { usuario_id: id } as any });
    if (!aluno) throw new NotFoundException('Aluno n\u00e3o encontrado');
    return aluno;
  }

  /** Marca um recado como lido pelo aluno */
  async marcarLido(recadoId: string, userId: string): Promise<void> {
    const aluno = await this.resolveAluno(userId);
    const existe = await this.leituraRepo.findOne({
      where: { recado_id: recadoId, aluno_id: aluno.id },
    });
    if (!existe) {
      await this.leituraRepo.save(this.leituraRepo.create({ recado_id: recadoId, aluno_id: aluno.id }));
    }
  }

  /** Retorna true se o aluno tem recados n\u00e3o lidos na sua unidade */
  async temRecadosNaoLidos(userId: string): Promise<{ tem: boolean; quantidade: number }> {
    let aluno = await this.alunoRepo.findOne({ where: { id: userId } });
    if (!aluno) aluno = await this.alunoRepo.findOne({ where: { usuario_id: userId } as any });
    if (!aluno) return { tem: false, quantidade: 0 };

    const todos = await this.recadoRepo.find({
      where: { unidade_id: aluno.unidade_id, ativo: true },
      select: ['id'],
    });
    if (!todos.length) return { tem: false, quantidade: 0 };

    const lidos = await this.leituraRepo.find({
      where: {
        aluno_id: aluno.id,
        recado_id: In(todos.map((r) => r.id)),
      },
      select: ['recado_id'],
    });
    const idsLidos = new Set(lidos.map((l) => l.recado_id));
    const naoLidos = todos.filter((r) => !idsLidos.has(r.id)).length;
    return { tem: naoLidos > 0, quantidade: naoLidos };
  }

  // ================================================================
  // PRODUTOS
  // ================================================================
  async listarProdutos(unidadeId: string): Promise<UnidadeProduto[]> {
    return this.produtoRepo.find({
      where: [
        { unidade_id: unidadeId, ativo: true },
        { visibilidade: 'GLOBAL', ativo: true },
      ],
      order: { criado_em: 'DESC' },
    });
  }

  async listarProdutosAdmin(unidadeId: string): Promise<UnidadeProduto[]> {
    return this.produtoRepo.find({
      where: { unidade_id: unidadeId },
      order: { criado_em: 'DESC' },
    });
  }

  async criarProduto(dto: CriarProdutoDto, usuarioId: string): Promise<UnidadeProduto> {
    const produto = this.produtoRepo.create({
      ...dto,
      visibilidade: dto.visibilidade ?? 'LOCAL',
      permite_parcelamento: dto.permite_parcelamento ?? false,
      max_parcelas: dto.max_parcelas ?? 1,
      criado_por: usuarioId,
    });
    return this.produtoRepo.save(produto);
  }

  async atualizarProduto(id: string, dto: AtualizarProdutoDto): Promise<UnidadeProduto> {
    const produto = await this.produtoRepo.findOne({ where: { id } });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    Object.assign(produto, dto);
    return this.produtoRepo.save(produto);
  }

  async removerProduto(id: string): Promise<void> {
    const produto = await this.produtoRepo.findOne({ where: { id } });
    if (!produto) throw new NotFoundException('Produto não encontrado');

    // Se existem pedidos vinculados, não pode deletar fisicamente — faz soft-delete
    const temPedidos = await this.itemRepo.count({ where: { produto_id: id } });
    if (temPedidos > 0) {
      produto.ativo = false;
      await this.produtoRepo.save(produto);
    } else {
      await this.produtoRepo.remove(produto);
    }
  }

  // ================================================================
  // PEDIDOS
  // ================================================================
  async criarPedido(dto: CriarPedidoDto, userId: string): Promise<ProdutoPedido> {
    // 1. Busca aluno (aceita usuario_id ou aluno_id)
    const aluno = await this.resolveAluno(userId);

    // 2. Resolves produtos
    const produtosIds = dto.itens.map((i) => i.produto_id);
    const produtos = await this.produtoRepo.findByIds(produtosIds);
    if (produtos.length !== produtosIds.length)
      throw new NotFoundException('Um ou mais produtos não foram encontrados');

    const produtoMap = new Map(produtos.map((p) => [p.id, p]));

    // 3. Valida estoque
    for (const item of dto.itens) {
      const produto = produtoMap.get(item.produto_id)!;
      if (produto.estoque < item.quantidade)
        throw new BadRequestException(`Estoque insuficiente para "${produto.nome}" (disponível: ${produto.estoque})`);
    }

    // 3b. Verifica se já existe pedido PENDENTE idêntico para evitar duplicatas
    const pedidosPendentes = await this.pedidoRepo.find({
      where: { aluno_id: aluno.id, status_pagamento: StatusPedido.PENDENTE },
      relations: ['itens', 'itens.produto', 'fatura'],
    });
    const inputIds = [...produtosIds].sort();
    for (const ped of pedidosPendentes) {
      const pedIds = ped.itens.map((i) => i.produto_id).sort();
      const mesmosItens =
        pedIds.length === inputIds.length &&
        pedIds.every((id, idx) => id === inputIds[idx]) &&
        ped.itens.every((pedItem) => {
          const dtoItem = dto.itens.find((i) => i.produto_id === pedItem.produto_id);
          return dtoItem && dtoItem.quantidade === pedItem.quantidade;
        });
      if (mesmosItens) {
        throw new ConflictException(
          `Você já possui um pedido pendente para esses produtos (pedido #${ped.id.slice(0, 8)}). ` +
          `Finalize o pagamento ou aguarde o processamento antes de criar um novo pedido.`,
        );
      }
    }

    // 4. Calcula os valores
    const valorTotal = dto.itens.reduce(
      (sum, item) => sum + item.quantidade * Number(produtoMap.get(item.produto_id)!.preco),
      0,
    );
    const taxaSplit    = Math.round(valorTotal * TAXA_PLATAFORMA * 100) / 100;
    const valorLiquido = Math.round((valorTotal - taxaSplit) * 100) / 100;

    // 5. Determina unidade vendedora (da maioria dos itens, assumindo todos da mesma unidade ou global)
    const unidadeVendedoraId = produtos[0].unidade_id;

    // 6. Cria pedido
    const pedido = this.pedidoRepo.create({
      aluno_id: aluno.id,
      unidade_vendedora_id: unidadeVendedoraId,
      status_pagamento: StatusPedido.PENDENTE,
      metodo_pagamento: dto.metodo_pagamento as MetodoPagamento,
      parcelas: dto.parcelas ?? 1,
      valor_total_produtos: valorTotal,
      taxa_gateway: 0,  // será atualizado pelo webhook do gateway após processamento
      taxa_plataforma_split: taxaSplit,
      valor_liquido_unidade: valorLiquido,
    });
    const pedidoSalvo = await this.pedidoRepo.save(pedido);

    // 7. Cria itens
    const itens = dto.itens.map((item) =>
      this.itemRepo.create({
        pedido_id: pedidoSalvo.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: produtoMap.get(item.produto_id)!.preco,
      }),
    );
    await this.itemRepo.save(itens);

    // 8. Cria Fatura vinculada ao pedido (usa sistema Rykon Pay)
    const ultimaFatura = await this.faturaRepo
      .createQueryBuilder('fatura')
      .orderBy('fatura.created_at', 'DESC')
      .getOne();
    const proximoNum = ultimaFatura
      ? parseInt(ultimaFatura.numero_fatura.split('-')[1] ?? '0', 10) + 1
      : 1;
    const numeroFatura = `FAT-${proximoNum.toString().padStart(6, '0')}`;

    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 3);

    const nomeProdutos = dto.itens.length === 1
      ? produtoMap.get(dto.itens[0].produto_id)!.nome
      : `${dto.itens.length} produtos — Lojinha Hub`;

    const fatura = this.faturaRepo.create({
      aluno_id: aluno.id,
      numero_fatura: numeroFatura,
      descricao: `Compra: ${nomeProdutos}`,
      valor_original: valorTotal,
      valor_desconto: 0,
      valor_acrescimo: 0,
      valor_total: valorTotal,
      data_vencimento: dataVencimento,
      status: StatusFatura.PENDENTE,
      metodo_pagamento: (dto.metodo_pagamento as unknown as FaturaMetodoPagamento) ?? null,
    });
    const faturaSalva = await this.faturaRepo.save(fatura);

    // 9. Vincula fatura ao pedido
    await this.pedidoRepo.update(pedidoSalvo.id, { fatura_id: faturaSalva.id });

    return this.pedidoRepo.findOne({
      where: { id: pedidoSalvo.id },
      relations: ['itens', 'itens.produto', 'fatura'],
    }) as Promise<ProdutoPedido>;
  }

  /** Aprovar pedido (chamado pelo webhook do gateway) */
  async aprovarPedido(pedidoId: string, transacaoId: string, taxaGateway = 0): Promise<ProdutoPedido> {
    const pedido = await this.pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['itens', 'itens.produto', 'aluno', 'unidade_vendedora'],
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    if (pedido.status_pagamento === StatusPedido.APROVADO)
      throw new ConflictException('Pedido já aprovado');

    // Atualiza pedido
    pedido.status_pagamento  = StatusPedido.APROVADO;
    pedido.transacao_id      = transacaoId;
    pedido.taxa_gateway       = taxaGateway;
    pedido.valor_liquido_unidade = Math.max(
      0,
      Number(pedido.valor_total_produtos) - Number(pedido.taxa_plataforma_split) - taxaGateway,
    );
    pedido.pago_em = new Date();
    await this.pedidoRepo.save(pedido);

    // Decrementa estoque
    for (const item of pedido.itens) {
      await this.produtoRepo.decrement({ id: item.produto_id }, 'estoque', item.quantidade);
    }

    // Envia emails assincronamente (não bloqueia resposta)
    this.enviarEmailsPosPagamento(pedido).catch((err) =>
      this.logger.error('Erro ao enviar emails pós-pagamento:', err),
    );

    return pedido;
  }

  async cancelarPedido(pedidoId: string, userId: string): Promise<ProdutoPedido> {
    const aluno = await this.resolveAluno(userId);

    const pedido = await this.pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['itens', 'itens.produto', 'fatura'],
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    if (pedido.aluno_id !== aluno.id)
      throw new BadRequestException('Este pedido não pertence a você');
    if (pedido.status_pagamento !== StatusPedido.PENDENTE)
      throw new BadRequestException('Apenas pedidos pendentes podem ser cancelados');

    pedido.status_pagamento = StatusPedido.CANCELADO;
    await this.pedidoRepo.save(pedido);

    // Cancela fatura vinculada, se existir
    if (pedido.fatura && pedido.fatura.status === StatusFatura.PENDENTE) {
      pedido.fatura.status = StatusFatura.CANCELADA;
      await this.faturaRepo.save(pedido.fatura);
    }

    return pedido;
  }

  async listarPedidosAluno(userId: string): Promise<ProdutoPedido[]> {
    let aluno = await this.alunoRepo.findOne({ where: { id: userId } });
    if (!aluno) aluno = await this.alunoRepo.findOne({ where: { usuario_id: userId } as any });
    const alunoId = aluno?.id ?? userId;
    return this.pedidoRepo.find({
      where: { aluno_id: alunoId },
      relations: ['itens', 'itens.produto', 'fatura'],
      order: { criado_em: 'DESC' },
    });
  }

  async listarPedidosUnidade(unidadeId: string): Promise<ProdutoPedido[]> {
    return this.pedidoRepo.find({
      where: { unidade_vendedora_id: unidadeId },
      relations: ['itens', 'itens.produto', 'aluno'],
      order: { criado_em: 'DESC' },
    });
  }

  // ================================================================
  // EMAILS
  // ================================================================
  private async enviarEmailsPosPagamento(pedido: ProdutoPedido): Promise<void> {
    const unidade = pedido.unidade_vendedora;
    const aluno   = pedido.aluno;

    const itensList = pedido.itens
      .map((i) => `<li>${i.quantidade}x ${i.produto?.nome} — R$ ${(i.quantidade * Number(i.preco_unitario)).toFixed(2)}</li>`)
      .join('\n');

    const total = Number(pedido.valor_total_produtos).toFixed(2);

    // Email para o ALUNO
    if (aluno?.email) {
      await (this.emailService as any).transporter.sendMail({
        from: `"Rykon Fit" <${process.env.SMTP_USER}>`,
        to: aluno.email,
        subject: '✅ Compra Confirmada! Veja os detalhes',
        html: `
          <h2>Olá ${aluno.nome_completo}! Sua compra foi aprovada 🎉</h2>
          <p><strong>Pedido:</strong> ${pedido.id}</p>
          <p><strong>Total:</strong> R$ ${total}</p>
          <p><strong>Forma de pagamento:</strong> ${pedido.metodo_pagamento}${pedido.parcelas > 1 ? ` em ${pedido.parcelas}x` : ''}</p>
          <br/>
          <h3>Itens:</h3>
          <ul>${itensList}</ul>
          <br/>
          <h3>📦 Retirada</h3>
          <p>Entre em contato com a unidade para combinar a entrega:</p>
          <ul>
            ${unidade?.telefone_celular ? `<li>WhatsApp/Celular: ${unidade.telefone_celular}</li>` : ''}
            ${unidade?.telefone_fixo ? `<li>Telefone: ${unidade.telefone_fixo}</li>` : ''}
            ${unidade?.email ? `<li>E-mail: ${unidade.email}</li>` : ''}
          </ul>
          <p>— Equipe Rykon Fit</p>
        `,
      });
    }

    // Email para a UNIDADE
    if (unidade?.email) {
      await (this.emailService as any).transporter.sendMail({
        from: `"Rykon Fit" <${process.env.SMTP_USER}>`,
        to: unidade.email,
        subject: `🛒 Nova venda! Pedido #${pedido.id.slice(0, 8)}`,
        html: `
          <h2>Você tem uma nova venda! 🎉</h2>
          <p><strong>Aluno:</strong> ${aluno?.nome_completo}</p>
          <p><strong>Contato aluno:</strong> ${aluno?.telefone || 'não informado'} | ${aluno?.email || 'não informado'}</p>
          <p><strong>Total:</strong> R$ ${total} (seu líquido: R$ ${Number(pedido.valor_liquido_unidade).toFixed(2)})</p>
          <br/>
          <h3>Itens:</h3>
          <ul>${itensList}</ul>
          <p>Acesse o painel para mais detalhes.</p>
        `,
      });
    }
  }

  // ================================================================
  // UPLOAD DE IMAGEM
  // ================================================================
  async uploadImagemProduto(file: any): Promise<{ url: string }> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Apenas imagens são permitidas (jpeg, png, webp, gif)');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Imagem deve ter no máximo 5MB');
    }
    const uploadBase = process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd();
    const uploadDir = path.join(uploadBase, 'uploads', 'hub-produtos');
    await fs.mkdir(uploadDir, { recursive: true });
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `produto_${uuidv4()}${ext}`;
    await fs.writeFile(path.join(uploadDir, filename), file.buffer);
    this.logger.log(`✅ Imagem de produto salva: ${filename}`);
    return { url: `/hub-unidade/imagens/${filename}` };
  }

  async caminhoImagemProduto(filename: string): Promise<string> {
    const uploadBase = process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd();
    const filePath = path.resolve(path.join(uploadBase, 'uploads', 'hub-produtos', filename));
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('Imagem não encontrada');
    }
    return filePath;
  }
}
