import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fatura, StatusFatura } from '../entities/fatura.entity';
import {
  Transacao,
  TipoTransacao,
  OrigemTransacao,
  CategoriaTransacao,
  StatusTransacao,
} from '../entities/transacao.entity';
import { Unidade } from '../../people/entities/unidade.entity';
import { PaytimeService } from '../../paytime/paytime.service';

export interface ProcessarPagamentoPixDto {
  faturaId: string;
  expiresIn?: number; // Tempo de expiração em segundos (padrão 3600 = 1h)
}

export interface ProcessarPagamentoCartaoDto {
  faturaId: string;
  paymentType: 'CREDIT' | 'DEBIT';
  installments?: number;
  interest?: 'ESTABLISHMENT' | 'CUSTOMER';
  card: {
    number: string;
    holder_name: string;
    expiration_month: string;
    expiration_year: string;
    cvv: string;
  };
  billing_address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
    complement?: string;
  };
}

export interface ProcessarPagamentoBoletoDto {
  faturaId: string;
  dueDate?: string; // Data de vencimento (padrão: +3 dias úteis)
}

@Injectable()
export class PaytimeIntegrationService {
  private readonly logger = new Logger(PaytimeIntegrationService.name);

  constructor(
    @InjectRepository(Fatura)
    private faturaRepository: Repository<Fatura>,
    @InjectRepository(Transacao)
    private transacaoRepository: Repository<Transacao>,
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    private paytimeService: PaytimeService,
  ) {}

  /**
   * Processar pagamento PIX
   */
  async processarPagamentoPix(
    dto: ProcessarPagamentoPixDto,
    userId: string,
  ): Promise<any> {
    // 1. Buscar e validar fatura
    const fatura = await this.validarFatura(dto.faturaId, userId);

    // 2. Buscar configuração Paytime da unidade
    const establishment = await this.obterEstablishmentDaUnidade(
      fatura.assinatura.unidade.id,
    );

    // 3. Criar transação PENDENTE
    const transacao = this.transacaoRepository.create({
      tipo: TipoTransacao.ENTRADA,
      origem: OrigemTransacao.FATURA,
      categoria: CategoriaTransacao.MENSALIDADE,
      descricao: `Pagamento PIX - ${fatura.descricao || fatura.numero_fatura}`,
      aluno_id: fatura.aluno_id,
      unidade_id: fatura.assinatura.unidade.id,
      fatura_id: fatura.id,
      valor: fatura.valor_total,
      data: new Date(),
      status: StatusTransacao.PENDENTE,
      metodo_pagamento: 'PIX',
      paytime_payment_type: 'PIX',
      criado_por: userId,
    });

    const transacaoSalva = await this.transacaoRepository.save(transacao);

    try {
      // 4. Chamar Paytime para criar transação PIX
      const pixData = {
        payment_type: 'PIX',
        amount: Math.round(fatura.valor_total * 100), // Converter para centavos
        interest: 'ESTABLISHMENT',
        client: {
          first_name: fatura.aluno.nome_completo.split(' ')[0],
          last_name:
            fatura.aluno.nome_completo.split(' ').slice(1).join(' ') ||
            'Cliente',
          document: fatura.aluno.cpf?.replace(/\D/g, ''),
          phone: fatura.aluno.telefone?.replace(/\D/g, '') || '00000000000',
          email: fatura.aluno.email || `aluno${fatura.aluno_id}@teamcruz.com`,
        },
      };

      this.logger.log(
        `Criando transação PIX na Paytime - Establishment: ${establishment}, Valor: ${pixData.amount}`,
      );

      const paytimeResponse =
        await this.paytimeService.createPixTransaction(
          parseInt(establishment, 10),
          pixData,
        );

      // 5. Atualizar transação com dados do Paytime
      transacaoSalva.paytime_transaction_id = paytimeResponse.id;
      transacaoSalva.paytime_metadata = {
        qr_code: paytimeResponse.pix?.qr_code,
        qr_code_url: paytimeResponse.pix?.qr_code_url,
        expires_at: paytimeResponse.pix?.expires_at,
        status: paytimeResponse.status,
      };
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.log(
        `Transação PIX criada com sucesso - ID Paytime: ${paytimeResponse.id}`,
      );

      return {
        transacao_id: transacaoSalva.id,
        paytime_transaction_id: paytimeResponse.id,
        qr_code: paytimeResponse.pix?.qr_code,
        qr_code_url: paytimeResponse.pix?.qr_code_url,
        expires_at: paytimeResponse.pix?.expires_at,
        status: paytimeResponse.status,
        valor: fatura.valor_total,
        fatura_numero: fatura.numero_fatura,
      };
    } catch (error) {
      // 6. Em caso de erro, marcar transação como CANCELADA
      transacaoSalva.status = StatusTransacao.CANCELADA;
      transacaoSalva.observacoes = `Erro ao processar pagamento: ${error.message}`;
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.error(`Erro ao processar pagamento PIX: ${error.message}`);
      this.logger.error(`Erro completo: ${JSON.stringify(error.response || error)}`);
      this.logger.error(`🔵 Verificando error.paytimeError: ${error.paytimeError ? 'EXISTE' : 'NÃO EXISTE'}`);
      this.logger.error(`🔵 Verificando error.response: ${error.response ? 'EXISTE' : 'NÃO EXISTE'}`);
      this.logger.error(`🔵 Verificando error.response.paytimeError: ${error.response?.paytimeError ? 'EXISTE' : 'NÃO EXISTE'}`);
      
      // Retornar erro exato da Paytime com status correto
      // O BadRequestException coloca dados em error.response
      const paytimeError = error.paytimeError || error.response?.paytimeError || error.response;
      
      if (paytimeError && paytimeError.statusCode) {
        this.logger.error(`🔴 RETORNANDO ERRO PAYTIME:`);
        this.logger.error(`   - statusCode: ${paytimeError.statusCode}`);
        this.logger.error(`   - message: ${paytimeError.message}`);
        this.logger.error(`   - error: ${paytimeError.error}`);
        this.logger.error(`   - path: ${paytimeError.path}`);
        this.logger.error(`   - JSON completo: ${JSON.stringify(paytimeError)}`);
        
        throw new HttpException(
          paytimeError,
          paytimeError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      this.logger.error(`🟡 RETORNANDO ERRO ORIGINAL (sem paytimeError)`);
      throw error;
    }
  }

  /**
   * Processar pagamento com Cartão
   */
  async processarPagamentoCartao(
    dto: ProcessarPagamentoCartaoDto,
    userId: string,
  ): Promise<any> {
    // 1. Buscar e validar fatura
    const fatura = await this.validarFatura(dto.faturaId, userId);

    // 2. Buscar configuração Paytime da unidade
    const establishment = await this.obterEstablishmentDaUnidade(
      fatura.assinatura.unidade.id,
    );

    // 3. Criar transação PENDENTE
    const transacao = this.transacaoRepository.create({
      tipo: TipoTransacao.ENTRADA,
      origem: OrigemTransacao.FATURA,
      categoria: CategoriaTransacao.MENSALIDADE,
      descricao: `Pagamento Cartão ${dto.paymentType === 'CREDIT' ? 'Crédito' : 'Débito'} - ${fatura.descricao || fatura.numero_fatura}`,
      aluno_id: fatura.aluno_id,
      unidade_id: fatura.assinatura.unidade.id,
      fatura_id: fatura.id,
      valor: fatura.valor_total,
      data: new Date(),
      status: StatusTransacao.PENDENTE,
      metodo_pagamento:
        dto.paymentType === 'CREDIT' ? 'CARTAO_CREDITO' : 'CARTAO_DEBITO',
      paytime_payment_type: dto.paymentType,
      criado_por: userId,
    });

    const transacaoSalva = await this.transacaoRepository.save(transacao);

    try {
      // 4. Chamar Paytime para criar transação com Cartão
      const cardData = {
        payment_type: dto.paymentType,
        amount: Math.round(fatura.valor_total * 100), // Converter para centavos
        installments: dto.installments || 1,
        interest: dto.interest || 'ESTABLISHMENT',
        client: {
          first_name: fatura.aluno.nome_completo.split(' ')[0],
          last_name:
            fatura.aluno.nome_completo.split(' ').slice(1).join(' ') ||
            'Cliente',
          document: fatura.aluno.cpf?.replace(/\D/g, ''),
          phone: fatura.aluno.telefone?.replace(/\D/g, '') || '00000000000',
          email: fatura.aluno.email || `aluno${fatura.aluno_id}@teamcruz.com`,
        },
        card: dto.card,
        billing_address: dto.billing_address,
      };

      this.logger.log(
        `Criando transação Cartão na Paytime - Establishment: ${establishment}, Valor: ${cardData.amount}`,
      );

      const paytimeResponse =
        await this.paytimeService.createCardTransaction(
          parseInt(establishment, 10),
          cardData,
        );

      // 5. Atualizar transação com dados do Paytime
      transacaoSalva.paytime_transaction_id = paytimeResponse.id;
      transacaoSalva.paytime_metadata = {
        brand: paytimeResponse.card?.brand,
        last4_digits: paytimeResponse.card?.last4_digits,
        installments: paytimeResponse.installments,
        status: paytimeResponse.status,
      };

      // 6. Se pagamento aprovado, marcar como CONFIRMADA e baixar fatura
      if (paytimeResponse.status === 'PAID') {
        transacaoSalva.status = StatusTransacao.CONFIRMADA;
        await this.transacaoRepository.save(transacaoSalva);
        await this.baixarFatura(fatura, transacaoSalva);
      } else {
        transacaoSalva.status = StatusTransacao.PENDENTE;
        await this.transacaoRepository.save(transacaoSalva);
      }

      this.logger.log(
        `Transação Cartão criada - ID Paytime: ${paytimeResponse.id}, Status: ${paytimeResponse.status}`,
      );

      return {
        transacao_id: transacaoSalva.id,
        paytime_transaction_id: paytimeResponse.id,
        status: paytimeResponse.status,
        card: {
          brand: paytimeResponse.card?.brand,
          last4_digits: paytimeResponse.card?.last4_digits,
        },
        installments: paytimeResponse.installments,
        valor: fatura.valor_total,
        fatura_numero: fatura.numero_fatura,
      };
    } catch (error) {
      // 7. Em caso de erro, marcar transação como CANCELADA
      transacaoSalva.status = StatusTransacao.CANCELADA;
      transacaoSalva.observacoes = `Erro ao processar pagamento: ${error.message}`;
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.error(`Erro ao processar pagamento Cartão: ${error.message}`);
      this.logger.error(`Erro completo: ${JSON.stringify(error.response || error)}`);
      this.logger.error(`🔵 Verificando error.paytimeError: ${error.paytimeError ? 'EXISTE' : 'NÃO EXISTE'}`);
      
      // Retornar erro exato da Paytime com status correto
      const paytimeError = error.paytimeError || error.response?.paytimeError || error.response;
      
      if (paytimeError && paytimeError.statusCode) {
        this.logger.error(`🔴 RETORNANDO ERRO PAYTIME CARD: ${JSON.stringify(paytimeError)}`);
        throw new HttpException(
          paytimeError,
          paytimeError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      this.logger.error(`🟡 RETORNANDO ERRO ORIGINAL CARD`);
      throw error;
    }
  }

  /**
   * Processar pagamento com Boleto
   */
  async processarPagamentoBoleto(
    dto: ProcessarPagamentoBoletoDto,
    userId: string,
  ): Promise<any> {
    // 1. Buscar e validar fatura
    const fatura = await this.validarFatura(dto.faturaId, userId);

    // 2. Buscar configuração Paytime da unidade
    const establishment = await this.obterEstablishmentDaUnidade(
      fatura.assinatura.unidade.id,
    );

    // 3. Criar transação PENDENTE
    const transacao = this.transacaoRepository.create({
      tipo: TipoTransacao.ENTRADA,
      origem: OrigemTransacao.FATURA,
      categoria: CategoriaTransacao.MENSALIDADE,
      descricao: `Pagamento Boleto - ${fatura.descricao || fatura.numero_fatura}`,
      aluno_id: fatura.aluno_id,
      unidade_id: fatura.assinatura.unidade.id,
      fatura_id: fatura.id,
      valor: fatura.valor_total,
      data: new Date(),
      status: StatusTransacao.PENDENTE,
      metodo_pagamento: 'BOLETO',
      paytime_payment_type: 'BILLET',
      criado_por: userId,
    });

    const transacaoSalva = await this.transacaoRepository.save(transacao);

    try {
      // 4. Calcular data de vencimento (padrão: +3 dias úteis)
      const dueDate =
        dto.dueDate || this.calcularDataVencimentoBoleto(new Date(), 3);

      // 5. Chamar Paytime para criar boleto
      const boletoData = {
        payment_type: 'BILLET',
        amount: Math.round(fatura.valor_total * 100), // Converter para centavos
        interest: 'ESTABLISHMENT',
        client: {
          first_name: fatura.aluno.nome_completo.split(' ')[0],
          last_name:
            fatura.aluno.nome_completo.split(' ').slice(1).join(' ') ||
            'Cliente',
          document: fatura.aluno.cpf?.replace(/\D/g, ''),
          phone: fatura.aluno.telefone?.replace(/\D/g, '') || '00000000000',
          email: fatura.aluno.email || `aluno${fatura.aluno_id}@teamcruz.com`,
        },
        due_date: dueDate,
      };

      this.logger.log(
        `Criando boleto na Paytime - Establishment: ${establishment}, Valor: ${boletoData.amount}`,
      );

      const paytimeResponse =
        await this.paytimeService.createBilletTransaction(
          parseInt(establishment, 10),
          boletoData,
        );

      // 6. Atualizar transação com dados do Paytime
      transacaoSalva.paytime_transaction_id = paytimeResponse.id;
      transacaoSalva.paytime_metadata = {
        barcode: paytimeResponse.billet?.barcode,
        digitable_line: paytimeResponse.billet?.digitable_line,
        pdf_url: paytimeResponse.billet?.pdf_url,
        due_date: paytimeResponse.billet?.due_date,
        status: paytimeResponse.status,
      };
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.log(
        `Boleto criado com sucesso - ID Paytime: ${paytimeResponse.id}`,
      );

      return {
        transacao_id: transacaoSalva.id,
        paytime_transaction_id: paytimeResponse.id,
        barcode: paytimeResponse.billet?.barcode,
        digitable_line: paytimeResponse.billet?.digitable_line,
        pdf_url: paytimeResponse.billet?.pdf_url,
        due_date: paytimeResponse.billet?.due_date,
        status: paytimeResponse.status,
        valor: fatura.valor_total,
        fatura_numero: fatura.numero_fatura,
      };
    } catch (error) {
      // 7. Em caso de erro, marcar transação como CANCELADA
      transacaoSalva.status = StatusTransacao.CANCELADA;
      transacaoSalva.observacoes = `Erro ao processar pagamento: ${error.message}`;
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.error(`Erro ao processar boleto: ${error.message}`);
      this.logger.error(`Erro completo: ${JSON.stringify(error.response || error)}`);
      this.logger.error(`🔵 Verificando error.paytimeError: ${error.paytimeError ? 'EXISTE' : 'NÃO EXISTE'}`);
      
      // Retornar erro exato da Paytime com status correto
      const paytimeError = error.paytimeError || error.response?.paytimeError || error.response;
      
      if (paytimeError && paytimeError.statusCode) {
        this.logger.error(`🔴 RETORNANDO ERRO PAYTIME BILLET: ${JSON.stringify(paytimeError)}`);
        throw new HttpException(
          paytimeError,
          paytimeError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      this.logger.error(`🟡 RETORNANDO ERRO ORIGINAL BILLET`);
      throw error;
    }
  }

  /**
   * Verificar status de pagamento PIX
   */
  async verificarStatusPix(transacaoId: string, userId: string): Promise<any> {
    const transacao = await this.transacaoRepository.findOne({
      where: { id: transacaoId },
      relations: ['fatura', 'fatura.aluno', 'fatura.assinatura'],
    });

    if (!transacao) {
      throw new NotFoundException('Transação não encontrada');
    }

    // Verificar se pertence ao usuário
    if (transacao.fatura.aluno.usuario_id !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta transação',
      );
    }

    if (!transacao.paytime_transaction_id) {
      return {
        status: transacao.status,
        pago: false,
      };
    }

    // Buscar status na Paytime
    try {
      const establishment = await this.obterEstablishmentDaUnidade(
        transacao.unidade_id,
      );
      const paytimeTransaction = await this.paytimeService.getTransaction(
        parseInt(establishment, 10),
        transacao.paytime_transaction_id,
      );

      // Se mudou para PAID, atualizar transação e fatura
      if (
        paytimeTransaction.status === 'PAID' &&
        transacao.status === StatusTransacao.PENDENTE
      ) {
        transacao.status = StatusTransacao.CONFIRMADA;
        await this.transacaoRepository.save(transacao);
        await this.baixarFatura(transacao.fatura, transacao);

        return {
          status: 'CONFIRMADA',
          pago: true,
          data_pagamento: new Date(),
        };
      }

      return {
        status: transacao.status,
        pago: paytimeTransaction.status === 'PAID',
        paytime_status: paytimeTransaction.status,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao verificar status do pagamento: ${error.message}`,
      );
      return {
        status: transacao.status,
        pago: false,
        erro: error.message,
      };
    }
  }

  /**
   * Validar fatura antes de processar pagamento
   */
  private async validarFatura(
    faturaId: string,
    userId: string,
  ): Promise<Fatura> {
    const fatura = await this.faturaRepository.findOne({
      where: { id: faturaId },
      relations: ['aluno', 'assinatura', 'assinatura.unidade'],
    });

    if (!fatura) {
      throw new NotFoundException('Fatura não encontrada');
    }

    // Verificar se pertence ao aluno logado
    if (fatura.aluno.usuario_id !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para pagar esta fatura',
      );
    }

    // Validar status da fatura
    if (fatura.status !== StatusFatura.PENDENTE) {
      throw new BadRequestException('Fatura já foi paga ou cancelada');
    }

    // Validar valor
    if (fatura.valor_total <= 0) {
      throw new BadRequestException('Valor da fatura inválido');
    }

    return fatura;
  }

  /**
   * Obter Establishment ID da unidade
   */
  private async obterEstablishmentDaUnidade(
    unidadeId: string,
  ): Promise<string> {
    const unidade = await this.unidadeRepository.findOne({
      where: { id: unidadeId },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    if (!unidade.paytime_establishment_id) {
      throw new BadRequestException(
        'Pagamento online não disponível para esta unidade. Entre em contato com a administração.',
      );
    }

    return unidade.paytime_establishment_id;
  }

  /**
   * Baixar fatura após pagamento confirmado
   */
  private async baixarFatura(
    fatura: Fatura,
    transacao: Transacao,
  ): Promise<void> {
    fatura.valor_pago = (fatura.valor_pago || 0) + transacao.valor;
    fatura.data_pagamento = new Date();

    if (fatura.valor_pago >= fatura.valor_total) {
      fatura.status = StatusFatura.PAGA;
    } else {
      fatura.status = StatusFatura.PARCIALMENTE_PAGA;
    }

    await this.faturaRepository.save(fatura);

    this.logger.log(
      `Fatura ${fatura.numero_fatura} baixada - Valor pago: R$ ${fatura.valor_pago}`,
    );
  }

  /**
   * Calcular data de vencimento do boleto (dias úteis)
   */
  private calcularDataVencimentoBoleto(
    dataBase: Date,
    diasUteis: number,
  ): string {
    const data = new Date(dataBase);
    let diasAdicionados = 0;

    while (diasAdicionados < diasUteis) {
      data.setDate(data.getDate() + 1);
      const diaSemana = data.getDay();
      // Pular sábado (6) e domingo (0)
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAdicionados++;
      }
    }

    return data.toISOString().split('T')[0]; // Formato: YYYY-MM-DD
  }
}
