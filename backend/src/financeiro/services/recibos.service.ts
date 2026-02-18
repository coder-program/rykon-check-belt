import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Fatura } from '../entities/fatura.entity';
import { Transacao, StatusTransacao } from '../entities/transacao.entity';
import { Unidade } from '../../people/entities/unidade.entity';

@Injectable()
export class RecibosService {
  private readonly logger = new Logger(RecibosService.name);

  constructor(
    @InjectRepository(Fatura)
    private readonly faturasRepository: Repository<Fatura>,
    @InjectRepository(Transacao)
    private readonly transacoesRepository: Repository<Transacao>,
    @InjectRepository(Unidade)
    private readonly unidadesRepository: Repository<Unidade>,
  ) {}

  /**
   * Gera PDF do recibo de pagamento da fatura
   */
  async gerarReciboPDF(faturaId: string): Promise<Buffer> {
    // Buscar fatura com todos os relacionamentos
    const fatura = await this.faturasRepository.findOne({
      where: { id: faturaId },
      relations: ['aluno', 'assinatura', 'assinatura.unidade', 'assinatura.plano'],
    });

    if (!fatura) {
      throw new NotFoundException(`Fatura ${faturaId} não encontrada`);
    }

    if (fatura.status !== 'PAGA') {
      throw new NotFoundException(`Fatura ${fatura.numero_fatura} não está paga`);
    }

    // Buscar transação de pagamento
    const transacao = await this.transacoesRepository.findOne({
      where: { fatura_id: faturaId, status: StatusTransacao.CONFIRMADA },
      order: { created_at: 'DESC' },
    });

    // Buscar unidade completa
    const unidade = fatura.assinatura?.unidade || await this.unidadesRepository.findOne({
      where: { id: fatura.assinatura?.unidade_id },
    });

    return this.gerarPDF(fatura, transacao, unidade);
  }

  /**
   * Gera o PDF do recibo
   */
  private async gerarPDF(
    fatura: Fatura,
    transacao: Transacao | null,
    unidade: Unidade | null,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.desenharHeader(doc, unidade);

        // Título
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('COMPROVANTE DE PAGAMENTO', { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(10)
          .fillColor('#666666')
          .text(`Recibo Nº ${fatura.numero_fatura}`, { align: 'center' })
          .moveDown(2);

        // Dados do pagamento
        this.desenharDadosPagamento(doc, fatura, transacao);

        // Dados do aluno
        this.desenharDadosAluno(doc, fatura);

        // Detalhes da fatura
        this.desenharDetalhesFatura(doc, fatura);

        // Footer
        this.desenharFooter(doc, unidade);

        doc.end();
      } catch (error) {
        this.logger.error(`Erro ao gerar PDF: ${error.message}`, error.stack);
        reject(error);
      }
    });
  }

  private desenharHeader(doc: PDFKit.PDFDocument, unidade: Unidade | null) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(unidade?.nome || 'Academia', { align: 'center' });

    if (unidade?.telefone_celular || unidade?.telefone_fixo) {
      const telefone = unidade.telefone_celular || unidade.telefone_fixo;
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Tel: ${telefone}`, { align: 'center' })
        .moveDown(0.3);
    }

    if (unidade?.email) {
      doc.text(`Email: ${unidade.email}`, { align: 'center' });
    }

    doc.moveDown(1);

    // Linha separadora
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1.5);

    doc.fillColor('#000000');
  }

  private desenharDadosPagamento(
    doc: PDFKit.PDFDocument,
    fatura: Fatura,
    transacao: Transacao | null,
  ) {
    const startY = doc.y;

    // Box com fundo colorido
    doc
      .fillColor('#eff6ff')
      .rect(50, startY, 495, 100)
      .fill();

    doc.fillColor('#000000');

    const leftX = 70;
    const rightX = 320;
    let y = startY + 20;

    // Data de pagamento
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Data do Pagamento:', leftX, y);

    doc
      .font('Helvetica')
      .text(
        fatura.data_pagamento
          ? new Date(fatura.data_pagamento).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A',
        leftX + 120,
        y,
      );

    y += 20;

    // Forma de pagamento
    doc.font('Helvetica-Bold').text('Forma de Pagamento:', leftX, y);

    const metodoPagamento =
      transacao?.paytime_payment_type ||
      transacao?.metodo_pagamento ||
      fatura.metodo_pagamento ||
      'Não informado';

    doc.font('Helvetica').text(metodoPagamento, leftX + 120, y);

    y += 20;

    // Valor pago
    doc.font('Helvetica-Bold').text('Valor Pago:', leftX, y);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#059669')
      .text(
        `R$ ${(fatura.valor_pago || fatura.valor_total).toFixed(2)}`,
        leftX + 120,
        y - 2,
      );

    // Status
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Status:', rightX, startY + 40);

    doc
      .fontSize(12)
      .fillColor('#059669')
      .text('✓ PAGO', rightX + 60, startY + 38);

    doc.fillColor('#000000').moveDown(3);
  }

  private desenharDadosAluno(doc: PDFKit.PDFDocument, fatura: Fatura) {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Dados do Aluno', { underline: true })
      .moveDown(0.5);

    const y = doc.y;

    doc.fontSize(10).font('Helvetica-Bold').text('Nome:', 50, y);

    doc
      .font('Helvetica')
      .text(
        fatura.aluno?.nome_completo || 'Não informado',
        120,
        y,
        { width: 420 },
      );

    if (fatura.aluno?.cpf) {
      doc.font('Helvetica-Bold').text('CPF:', 50, doc.y + 5);
      doc.font('Helvetica').text(fatura.aluno.cpf, 120, doc.y);
    }

    if (fatura.aluno?.email) {
      doc.font('Helvetica-Bold').text('Email:', 50, doc.y + 5);
      doc.font('Helvetica').text(fatura.aluno.email, 120, doc.y);
    }

    doc.moveDown(1.5);
  }

  private desenharDetalhesFatura(doc: PDFKit.PDFDocument, fatura: Fatura) {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Detalhes da Fatura', { underline: true })
      .moveDown(0.5);

    // Tabela
    const tableTop = doc.y;
    const leftX = 50;
    const rightX = 400;

    // Header da tabela
    doc
      .fillColor('#f3f4f6')
      .rect(leftX, tableTop, 495, 25)
      .fill();

    doc
      .fillColor('#000000')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Descrição', leftX + 10, tableTop + 8)
      .text('Valor', rightX, tableTop + 8, { width: 135, align: 'right' });

    let y = tableTop + 35;

    // Linhas da tabela
    const items = [
      { label: 'Valor Original', valor: fatura.valor_original },
    ];

    if (fatura.valor_desconto > 0) {
      items.push({
        label: 'Desconto',
        valor: -fatura.valor_desconto,
      });
    }

    if (fatura.valor_acrescimo > 0) {
      items.push({
        label: 'Acréscimos (Multa/Juros)',
        valor: fatura.valor_acrescimo,
      });
    }

    items.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';

      doc.fillColor(bgColor).rect(leftX, y - 5, 495, 25).fill();

      doc
        .fillColor('#000000')
        .fontSize(10)
        .font('Helvetica')
        .text(item.label, leftX + 10, y)
        .text(
          item.valor >= 0
            ? `R$ ${item.valor.toFixed(2)}`
            : `- R$ ${Math.abs(item.valor).toFixed(2)}`,
          rightX,
          y,
          { width: 135, align: 'right' },
        );

      y += 25;
    });

    // Total
    doc
      .fillColor('#1e40af')
      .rect(leftX, y, 495, 30)
      .fill();

    doc
      .fillColor('#ffffff')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('VALOR TOTAL PAGO', leftX + 10, y + 8)
      .fontSize(14)
      .text(`R$ ${fatura.valor_total.toFixed(2)}`, rightX, y + 6, {
        width: 135,
        align: 'right',
      });

    doc.fillColor('#000000').moveDown(2);

    // Informações adicionais
    if (fatura.descricao) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Descrição: ', { continued: true })
        .font('Helvetica')
        .text(fatura.descricao);
    }

    if (fatura.assinatura?.plano) {
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .text('Plano: ', { continued: true })
        .font('Helvetica')
        .text(fatura.assinatura.plano.nome);
    }

    doc.moveDown(2);
  }

  private desenharFooter(doc: PDFKit.PDFDocument, unidade: Unidade | null) {
    const bottomY = 750;

    // Linha separadora
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, bottomY)
      .lineTo(545, bottomY)
      .stroke();

    doc
      .fontSize(8)
      .fillColor('#666666')
      .text(
        'Este documento é um comprovante de pagamento válido.',
        50,
        bottomY + 10,
        { align: 'center' },
      );

    doc.text(
      `Emitido automaticamente pelo sistema Rykon em ${new Date().toLocaleString('pt-BR')}`,
      50,
      bottomY + 22,
      { align: 'center' },
    );

    if (unidade?.cnpj) {
      doc.text(`CNPJ: ${unidade.cnpj}`, 50, bottomY + 34, { align: 'center' });
    }
  }
}
