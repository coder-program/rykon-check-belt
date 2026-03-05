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
import { Aluno } from '../../people/entities/aluno.entity';
import { Assinatura } from '../entities/assinatura.entity';
import { Endereco } from '../../enderecos/endereco.entity';
import { PaytimeService } from '../../paytime/paytime.service';
import { CompletarDadosBoletoDto } from '../dto/completar-dados-boleto.dto';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface ProcessarPagamentoPixDto {
  faturaId: string;
  expiresIn?: number; // Tempo de expiração em segundos (padrão 3600 = 1h)
}

export interface ProcessarPagamentoCartaoDto {
  faturaId: string;
  cpf?: string; // CPF do titular do cartão (opcional, se não enviado usa o CPF do aluno)
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
  // Campos de antifraude
  session_id?: string; // Session ID do ClearSale
  antifraud_type?: 'IDPAY' | 'THREEDS'; // Tipo de antifraude a acionar (IDPAY ou THREEDS)
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
    @InjectRepository(Assinatura)
    private assinaturaRepository: Repository<Assinatura>,
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Endereco)
    private enderecoRepository: Repository<Endereco>,
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

    // 2.5. Verificar se já existe PIX pendente para esta fatura
    const transacaoExistente = await this.transacaoRepository.findOne({
      where: {
        fatura_id: fatura.id,
        metodo_pagamento: 'PIX',
        status: StatusTransacao.PENDENTE,
      },
      order: { created_at: 'DESC' },
    });

    if (transacaoExistente && transacaoExistente.paytime_transaction_id) {
      this.logger.log(
        `🔄 Encontrada transação PIX existente ${transacaoExistente.id} para fatura ${fatura.id}`,
      );

      // Verificar se o PIX ainda está válido (tem código EMV)
      const metadata = transacaoExistente.paytime_metadata as any;
      if (metadata?.emv) {
        this.logger.log(
          `✅ Reutilizando PIX existente - Código EMV presente`,
        );

        return {
          transacao_id: transacaoExistente.id,
          paytime_transaction_id: transacaoExistente.paytime_transaction_id,
          qr_code: metadata.emv, // Retornar EMV como qr_code para frontend
          status: metadata.status,
          valor: fatura.valor_total,
          fatura_numero: fatura.numero_fatura,
        };
      } else {
        this.logger.log(
          `⚠️ PIX existente sem código EMV - Criando novo`,
        );
      }
    }

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
      data: dayjs().tz('America/Sao_Paulo').toDate(),
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
        info_additional: [
          {
            key: 'aluno_id',
            value: fatura.aluno_id,
          },
          {
            key: 'aluno_cpf',
            value: fatura.aluno.cpf?.replace(/\D/g, ''),
          },
          {
            key: 'aluno_nome',
            value: fatura.aluno.nome_completo,
          },
          {
            key: 'aluno_email',
            value: fatura.aluno.email || `aluno${fatura.aluno_id}@teamcruz.com`,
          },
          {
            key: 'aluno_telefone',
            value: fatura.aluno.telefone?.replace(/\D/g, '') || '00000000000',
          },
          {
            key: 'numero_matricula',
            value: fatura.aluno.numero_matricula || '',
          },
        ],
      };

      this.logger.log(
        `🚀 Criando transação PIX na Paytime - Establishment: ${establishment}, Valor: ${pixData.amount}`,
      );
      this.logger.log(`📋 Dados do cliente sendo enviados:`);
      this.logger.log(`   - Nome: ${pixData.client.first_name} ${pixData.client.last_name}`);
      this.logger.log(`   - CPF: ${pixData.client.document}`);
      this.logger.log(`   - Email: ${pixData.client.email}`);
      this.logger.log(`   - Telefone: ${pixData.client.phone}`);

      const paytimeResponse =
        await this.paytimeService.createPixTransaction(
          parseInt(establishment, 10),
          pixData,
        );

      this.logger.log(`✅ Resposta Paytime recebida:`);
      this.logger.log(`   - ID: ${paytimeResponse._id || paytimeResponse.id}`);
      this.logger.log(`   - Status: ${paytimeResponse.status}`);
      this.logger.log(`   - Type: ${paytimeResponse.type}`);
      this.logger.log(`   - EMV presente: ${paytimeResponse.emv ? 'SIM (' + paytimeResponse.emv.length + ' chars)' : 'NÃO ⚠️'}`);
      this.logger.log(`   - Gateway: ${paytimeResponse.gateway_authorization}`);

      // 5. Atualizar transação com dados do Paytime
      // Campo 'emv' é o código PIX copia e cola (conforme doc Rykon-Pay)
      transacaoSalva.paytime_transaction_id = paytimeResponse._id || paytimeResponse.id;
      transacaoSalva.paytime_metadata = {
        emv: paytimeResponse.emv, // Código copia e cola
        gateway_key: paytimeResponse.gateway_key,
        status: paytimeResponse.status,
        amount: paytimeResponse.amount,
        original_amount: paytimeResponse.original_amount,
        fees: paytimeResponse.fees,
        expected_on: paytimeResponse.expected_on,
      };
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.log(
        `✅ Transação PIX criada com sucesso - ID: ${paytimeResponse._id}, Status: ${paytimeResponse.status}`,
      );
      this.logger.log(
        `✅ Código EMV (copia e cola): ${paytimeResponse.emv ? 'PRESENTE' : 'AUSENTE'}`,
      );

      // Validar se EMV foi retornado
      if (!paytimeResponse.emv) {
        this.logger.warn('⚠️ ATENÇÃO: Paytime não retornou o campo EMV (código copia e cola)');
        this.logger.warn(`⚠️ Resposta completa: ${JSON.stringify(paytimeResponse)}`);
      }

      return {
        transacao_id: transacaoSalva.id,
        paytime_transaction_id: paytimeResponse._id || paytimeResponse.id,
        qr_code: paytimeResponse.emv, // Retornar como qr_code para compatibilidade frontend
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
      data: dayjs().tz('America/Sao_Paulo').toDate(),
      status: StatusTransacao.PENDENTE,
      metodo_pagamento: 'CARTAO', // Valor único CARTAO (constraint do banco)
      paytime_payment_type: dto.paymentType, // CREDIT ou DEBIT (detalhado para Paytime)
      criado_por: userId,
    });

    const transacaoSalva = await this.transacaoRepository.save(transacao);

    try {
      // 3.5. Validar CPF - usar CPF enviado ou CPF do aluno
      const cpfParaUsar = dto.cpf || fatura.aluno.cpf;
      
      if (!cpfParaUsar || cpfParaUsar.replace(/\D/g, '').length !== 11) {
        throw new BadRequestException({
          tipo_erro: 'DADOS_FALTANTES',
          message: dto.cpf 
            ? 'CPF fornecido é inválido. Informe um CPF válido com 11 dígitos.'
            : 'CPF do aluno não cadastrado ou inválido.',
          campos_faltantes: ['cpf'],
          sugestao: dto.cpf
            ? 'Verifique o CPF informado e tente novamente.'
            : 'Complete seu cadastro com um CPF válido para processar pagamento.',
        });
      }
      
      this.logger.log(`💳 CPF para pagamento: ${cpfParaUsar.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`);
      this.logger.log(`   Origem: ${dto.cpf ? 'Fornecido no formulário' : 'Cadastro do aluno'}`);

      // 3.6. Obter endereço - usar billing_address fornecido ou buscar do cadastro
      let address = dto.billing_address;
      
      // Se endereço não foi fornecido ou está incompleto, buscar do cadastro
      if (!address || !address.street || !address.number || !address.city || !address.state || !address.zip_code) {
        this.logger.log('📍 Endereço não fornecido no request, buscando do cadastro...');
        
        // Tentar obter do aluno primeiro
        if (fatura.aluno.endereco) {
          this.logger.log('📍 Usando endereço do ALUNO');
          address = {
            street: fatura.aluno.endereco.logradouro,
            number: fatura.aluno.endereco.numero,
            complement: fatura.aluno.endereco.complemento || '',
            neighborhood: fatura.aluno.endereco.bairro,
            city: fatura.aluno.endereco.cidade,
            state: fatura.aluno.endereco.estado,
            zip_code: fatura.aluno.endereco.cep,
          };
        } 
        // Se aluno não tem, tentar responsável
        else if (fatura.aluno.responsavel?.endereco) {
          this.logger.log('📍 Usando endereço do RESPONSÁVEL');
          address = {
            street: fatura.aluno.responsavel.endereco.logradouro,
            number: fatura.aluno.responsavel.endereco.numero,
            complement: fatura.aluno.responsavel.endereco.complemento || '',
            neighborhood: fatura.aluno.responsavel.endereco.bairro,
            city: fatura.aluno.responsavel.endereco.cidade,
            state: fatura.aluno.responsavel.endereco.estado,
            zip_code: fatura.aluno.responsavel.endereco.cep,
          };
        } else {
          // Se não tem endereço em lugar nenhum, lançar erro
          throw new BadRequestException({
            tipo_erro: 'DADOS_FALTANTES',
            message: 'Endereço não encontrado. Complete seu cadastro para processar pagamento com cartão.',
            campos_faltantes: ['endereco.cep', 'endereco.logradouro', 'endereco.numero', 'endereco.bairro', 'endereco.cidade', 'endereco.estado'],
            sugestao: 'Preencha o endereço no seu perfil ou forneça no pagamento.',
          });
        }
      } else {
        this.logger.log('📍 Usando endereço fornecido no request');
      }

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
          document: cpfParaUsar.replace(/\D/g, ''),
          phone: fatura.aluno.telefone?.replace(/\D/g, '') || '00000000000',
          email: fatura.aluno.email || `aluno${fatura.aluno_id}@teamcruz.com`,
          address: {
            street: address.street,
            number: address.number,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            zip_code: address.zip_code,
          },
        },
        card: {
          holder_name: dto.card.holder_name,
          holder_document: cpfParaUsar.replace(/\D/g, ''),
          card_number: dto.card.number,
          expiration_month: parseInt(dto.card.expiration_month, 10),
          expiration_year: parseInt(dto.card.expiration_year, 10),
          security_code: dto.card.cvv,
        },
        // Session ID do ClearSale (Paytime detecta automaticamente o tipo de antifraude)
        ...(dto.session_id && { session_id: dto.session_id }),
        // Tipo de antifraude: IDPAY (padrão) ou THREEDS
        antifraud_type: dto.antifraud_type || 'IDPAY',
      };

      this.logger.log(
        `💳 Criando transação Cartão na Paytime - Establishment: ${establishment}`,
      );
      this.logger.log(`   - Valor: R$ ${(cardData.amount / 100).toFixed(2)} (${cardData.amount} centavos)`);
      this.logger.log(`   - Tipo: ${cardData.payment_type}`);
      this.logger.log(`   - Parcelas: ${cardData.installments}x`);
      if (dto.session_id) {
        this.logger.log(`   - Session ID ClearSale: ${dto.session_id.substring(0, 20)}...`);
      }
      this.logger.log(`   - Antifraude Type: ${cardData['antifraud_type']}`);
      this.logger.log(`   - session_id presente: ${cardData['session_id'] ? 'SIM' : 'NÃO'}`);
      
      // Log do body completo (omitindo dados sensíveis) — LOG level para garantir visibilidade
      const safeBody = {
        ...cardData,
        card: {
          ...cardData.card,
          card_number: cardData.card.card_number.substring(0, 6) + '******' + cardData.card.card_number.slice(-4),
          security_code: '***',
        },
      };
      this.logger.log(`📦 [CARD] Body completo enviado para rykon-pay:\n${JSON.stringify(safeBody, null, 2)}`);

      const paytimeResponse =
        await this.paytimeService.createCardTransaction(
          parseInt(establishment, 10),
          cardData,
        );

      this.logger.log(`✅ Resposta Paytime Cartão recebida:`);
      this.logger.log(`   - ID: ${paytimeResponse._id || paytimeResponse.id}`);
      this.logger.log(`   - Status: ${paytimeResponse.status}`);
      this.logger.log(`   - Type: ${paytimeResponse.type}`);
      this.logger.log(`   - Card Brand: ${paytimeResponse.card?.brand_name}`);
      this.logger.log(`   - Gateway: ${paytimeResponse.gateway_authorization}`);
      this.logger.log(`   - Antifraude: ${paytimeResponse.antifraud ? 'SIM' : 'NÃO'}`);
      if (paytimeResponse.antifraud?.[0]) {
        this.logger.log(`   - Antifraude Status: ${paytimeResponse.antifraud[0].analyse_status}`);
        this.logger.log(`   - Antifraude Required: ${paytimeResponse.antifraud[0].analyse_required || 'N/A'}`);
      }

      // 5. Atualizar transação com dados do Paytime (conforme documentação)
      transacaoSalva.paytime_transaction_id = paytimeResponse._id || paytimeResponse.id;
      transacaoSalva.paytime_metadata = {
        // Card info
        brand_name: paytimeResponse.card?.brand_name,
        first4_digits: paytimeResponse.card?.first4_digits,
        last4_digits: paytimeResponse.card?.last4_digits,
        expiration_month: paytimeResponse.card?.expiration_month,
        expiration_year: paytimeResponse.card?.expiration_year,
        holder_name: paytimeResponse.card?.holder_name,
        // Transaction info
        status: paytimeResponse.status,
        type: paytimeResponse.type,
        gateway_key: paytimeResponse.gateway_key,
        gateway_authorization: paytimeResponse.gateway_authorization,
        // Amounts
        amount: paytimeResponse.amount,
        original_amount: paytimeResponse.original_amount,
        fees: paytimeResponse.fees,
        installments: paytimeResponse.installments,
        // Expected payment
        expected_on: paytimeResponse.expected_on,
        // Antifraud (se existir)
        antifraud: paytimeResponse.antifraud?.[0] ? {
          analyse_status: paytimeResponse.antifraud[0].analyse_status,
          analyse_required: paytimeResponse.antifraud[0].analyse_required,
          antifraud_id: paytimeResponse.antifraud[0].antifraud_id,
        } : null,
      };

      // 6. Atualizar status da transação baseado na resposta
      // Status possíveis: CREATED, PENDING, PAID, APPROVED, FAILED, REFUNDED, DISPUTED, CANCELED, CHARGEBACK
      if (paytimeResponse.status === 'PAID' || paytimeResponse.status === 'APPROVED') {
        transacaoSalva.status = StatusTransacao.CONFIRMADA;
        await this.transacaoRepository.save(transacaoSalva);
        await this.baixarFatura(fatura, transacaoSalva);
        this.logger.log(`✅ Pagamento CONFIRMADO - Fatura baixada`);
      } else if (paytimeResponse.status === 'FAILED' || paytimeResponse.status === 'CANCELED') {
        transacaoSalva.status = StatusTransacao.CANCELADA;
        transacaoSalva.observacoes = `Pagamento ${paytimeResponse.status}`;
        await this.transacaoRepository.save(transacaoSalva);
        this.logger.warn(`⚠️ Pagamento ${paytimeResponse.status}`);
      } else if (paytimeResponse.status === 'PENDING') {
        // PENDING pode ser processamento normal ou aguardando antifraude
        transacaoSalva.status = StatusTransacao.PENDENTE;
        await this.transacaoRepository.save(transacaoSalva);
        
        // Verificar se requer autenticação antifraude
        const antifraudRequired = paytimeResponse.antifraud?.[0]?.analyse_required;
        if (antifraudRequired) {
          this.logger.warn(
            `⚠️ Transação requer autenticação ANTIFRAUDE: ${antifraudRequired} (THREEDS ou IDPAY)`,
          );
        } else {
          this.logger.log(`⏳ Pagamento em processamento (PENDING)`);
        }
      } else {
        // Outros status (CREATED, REFUNDED, DISPUTED, CHARGEBACK)
        transacaoSalva.status = StatusTransacao.PENDENTE;
        await this.transacaoRepository.save(transacaoSalva);
        this.logger.log(`ℹ️ Pagamento com status: ${paytimeResponse.status}`);
      }

      this.logger.log(
        `✅ Transação Cartão criada - ID: ${paytimeResponse._id || paytimeResponse.id}, Status: ${paytimeResponse.status}`,
      );
      this.logger.debug(
        `🔍 [IDPAY] Resposta completa Paytime: ${JSON.stringify(paytimeResponse)}`,
      );
      this.logger.log(
        `🔍 [IDPAY] antifraud array: ${JSON.stringify(paytimeResponse.antifraud)}`,
      );

      return {
        transacao_id: transacaoSalva.id,
        paytime_transaction_id: paytimeResponse._id || paytimeResponse.id,
        status: paytimeResponse.status,
        card: {
          brand_name: paytimeResponse.card?.brand_name,
          first4_digits: paytimeResponse.card?.first4_digits,
          last4_digits: paytimeResponse.card?.last4_digits,
        },
        installments: paytimeResponse.installments,
        valor: fatura.valor_total,
        fatura_numero: fatura.numero_fatura,
        // Incluir info de antifraude se presente
        antifraud_required: paytimeResponse.antifraud?.[0]?.analyse_required || null,
        // Passar array completo para o frontend extrair antifraud_id e session
        antifraud: paytimeResponse.antifraud || null,
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

    // 2.5. Verificar se já existe boleto pendente para esta fatura
    const transacoesExistentes = await this.transacaoRepository.find({
      where: {
        fatura_id: fatura.id,
        metodo_pagamento: 'BOLETO',
        status: StatusTransacao.PENDENTE,
      },
      order: { created_at: 'DESC' },
    });

    // Tentar reusar boletos existentes (da mais recente para a mais antiga)
    for (const transacaoExistente of transacoesExistentes) {
      if (!transacaoExistente.paytime_transaction_id) {
        // Transação sem ID do Paytime, cancelar
        this.logger.log(
          `⚠️ Transação ${transacaoExistente.id} sem paytime_transaction_id - Cancelando`,
        );
        transacaoExistente.status = StatusTransacao.CANCELADA;
        transacaoExistente.observacoes = 'Transação sem ID do Paytime';
        await this.transacaoRepository.save(transacaoExistente);
        continue;
      }

      this.logger.log(
        `🔄 Verificando transação existente ${transacaoExistente.id} para fatura ${fatura.id} - Paytime ID: ${transacaoExistente.paytime_transaction_id}`,
      );

      // Verificar status do boleto no Paytime
      try {
        const paytimeBoleto = await this.paytimeService.getBillet(
          parseInt(establishment, 10),
          transacaoExistente.paytime_transaction_id,
        );

        this.logger.log(
          `📊 Boleto ${transacaoExistente.paytime_transaction_id} - Status: ${paytimeBoleto.status}, Barcode: ${paytimeBoleto.barcode ? 'SIM' : 'NÃO'}, Digitable: ${paytimeBoleto.digitable_line ? 'SIM' : 'NÃO'}`,
        );

        // Verificar se boleto está travado em PROCESSING há muito tempo
        if (paytimeBoleto.status === 'PROCESSING') {
          const transacaoCriadaEm = dayjs.utc(transacaoExistente.created_at);
          const agora = dayjs.utc();
          const minutosEmProcessing = agora.diff(transacaoCriadaEm, 'minute', true);
          
          this.logger.log(
            `⏱️  Transação criada em: ${transacaoCriadaEm.toISOString()}, Agora: ${agora.toISOString()}, Minutos em PROCESSING: ${minutosEmProcessing.toFixed(2)}`,
          );
          
          // Se está em PROCESSING há mais de 2 minutos E não tem dados, considerar inválido
          if (minutosEmProcessing > 2 && !paytimeBoleto.barcode && !paytimeBoleto.digitable_line) {
            this.logger.warn(
              `⚠️ Boleto ${transacaoExistente.paytime_transaction_id} travado em PROCESSING há ${minutosEmProcessing.toFixed(1)} minutos sem dados - Cancelando`,
            );
            transacaoExistente.status = StatusTransacao.CANCELADA;
            transacaoExistente.observacoes = `Boleto travado em PROCESSING sem dados após ${minutosEmProcessing.toFixed(1)} minutos`;
            await this.transacaoRepository.save(transacaoExistente);
            continue; // Tentar próxima transação
          } else {
            this.logger.log(
              `✅ Boleto PROCESSING ainda válido - Minutos: ${minutosEmProcessing.toFixed(2)}, Tem dados: ${paytimeBoleto.barcode || paytimeBoleto.digitable_line ? 'SIM' : 'NÃO'}`,
            );
          }
        }

        // Se o boleto está válido (PENDING ou PROCESSING recente com/sem dados), retornar
        if (
          paytimeBoleto.status === 'PENDING' ||
          (paytimeBoleto.status === 'PROCESSING' && (paytimeBoleto.barcode || paytimeBoleto.digitable_line))
        ) {
          this.logger.log(
            `✅ Reutilizando boleto existente - Status: ${paytimeBoleto.status}, Barcode: ${paytimeBoleto.barcode ? 'SIM' : 'NÃO'}`,
          );

          // Atualizar metadata se necessário
          transacaoExistente.paytime_metadata = {
            barcode: paytimeBoleto.barcode,
            digitable_line: paytimeBoleto.digitable_line,
            pdf_url: paytimeBoleto.url,
            due_date: paytimeBoleto.expiration_at,
            status: paytimeBoleto.status,
            gateway_key: paytimeBoleto.gateway_key,
            establishment_id: paytimeBoleto.establishment_id,
          };
          await this.transacaoRepository.save(transacaoExistente);

          return {
            transacao_id: transacaoExistente.id,
            paytime_transaction_id: transacaoExistente.paytime_transaction_id,
            barcode: paytimeBoleto.barcode,
            digitable_line: paytimeBoleto.digitable_line,
            pdf_url: paytimeBoleto.url,
            due_date: paytimeBoleto.expiration_at,
            status: paytimeBoleto.status,
            valor: fatura.valor_total,
            fatura_numero: fatura.numero_fatura,
          };
        } else {
          this.logger.log(
            `⚠️ Boleto existente com status ${paytimeBoleto.status} - Tentando próximo ou criando novo`,
          );
          // Cancelar transação com status não válido
          transacaoExistente.status = StatusTransacao.CANCELADA;
          transacaoExistente.observacoes = `Boleto com status ${paytimeBoleto.status}`;
          await this.transacaoRepository.save(transacaoExistente);
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ Erro ao verificar boleto ${transacaoExistente.paytime_transaction_id}: ${error.message} - Cancelando e tentando próximo`,
        );
        
        // Se deu 404 ou qualquer erro, cancelar a transação inválida
        transacaoExistente.status = StatusTransacao.CANCELADA;
        transacaoExistente.observacoes = `Boleto não encontrado no Paytime: ${error.message}`;
        await this.transacaoRepository.save(transacaoExistente);
      }
    }

    this.logger.log(
      `📝 Nenhum boleto válido encontrado. Criando novo para fatura ${fatura.id}`,
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
      data: dayjs().tz('America/Sao_Paulo').toDate(),
      status: StatusTransacao.PENDENTE,
      metodo_pagamento: 'BOLETO',
      paytime_payment_type: 'BILLET',
      criado_por: userId,
    });

    const transacaoSalva = await this.transacaoRepository.save(transacao);

    try {
      // 4. Calcular data de vencimento (padrão: +3 dias úteis)
      const dueDate =
        dto.dueDate || this.calcularDataVencimentoBoleto(dayjs().tz('America/Sao_Paulo').toDate(), 3);

      // 4.5. Buscar dados para o boleto (com fallback para responsável)
      const dadosBoleto = this.obterDadosParaBoleto(fatura.aluno);
      
      // Validar CPF
      if (!dadosBoleto.cpf || dadosBoleto.cpf.length !== 11) {
        throw new BadRequestException({
          tipo_erro: 'DADOS_FALTANTES',
          message: `CPF não cadastrado ou inválido. CPF é obrigatório para gerar boleto.`,
          campos_faltantes: ['cpf'],
          origem_dados: dadosBoleto.origem,
          sugestao: dadosBoleto.origem === 'nenhum' 
            ? 'Cadastre o CPF do aluno ou do responsável antes de gerar boleto.'
            : `Complete o cadastro do ${dadosBoleto.origem} com um CPF válido.`
        });
      }
      
      // Validar CEP
      if (!dadosBoleto.cep || dadosBoleto.cep === '00000000' || dadosBoleto.cep.length !== 8) {
        throw new BadRequestException({
          tipo_erro: 'DADOS_FALTANTES',
          message: `CEP não cadastrado ou inválido. CEP é obrigatório para gerar boleto.`,
          campos_faltantes: ['endereco.cep'],
          origem_dados: dadosBoleto.origem,
          sugestao: dadosBoleto.origem === 'nenhum'
            ? 'Cadastre o endereço completo do aluno ou do responsável antes de gerar boleto.'
            : `Complete o endereço do ${dadosBoleto.origem} com um CEP válido.`
        });
      }
      
      // Validar Cidade
      if (!dadosBoleto.cidade) {
        throw new BadRequestException({
          tipo_erro: 'DADOS_FALTANTES',
          message: `Endereço incompleto. Cidade é obrigatória para gerar boleto.`,
          campos_faltantes: ['endereco.cidade'],
          origem_dados: dadosBoleto.origem,
          sugestao: `Complete o endereço do ${dadosBoleto.origem} com a cidade.`
        });
      }

      this.logger.log(
        `✅ Validação OK - Origem dos dados: ${dadosBoleto.origem.toUpperCase()} - CPF: ${dadosBoleto.cpf.substring(0, 3)}***, CEP: ${dadosBoleto.cep.substring(0, 5)}-***`,
      );

      // Calcular payment_limit_date (2 dias úteis após vencimento)
      const paymentLimitDate = this.calcularDataVencimentoBoleto(
        dayjs(dueDate).tz('America/Sao_Paulo').toDate(),
        2,
      );

      // Calcular limit_date do desconto (5 dias antes do vencimento) — omitir se já passou
      const today = dayjs().tz('America/Sao_Paulo').startOf('day');
      const discountLimitDate = dayjs(dueDate).tz('America/Sao_Paulo').subtract(5, 'day').startOf('day');
      const discountBlock = discountLimitDate.isBefore(today)
        ? undefined
        : {
            mode: 'PERCENTAGE',
            amount: 1,
            limit_date: discountLimitDate.format('YYYY-MM-DD'),
          };

      // 5. Chamar Paytime para criar boleto
      const boletoData = {
        amount: Math.round(fatura.valor_total * 100), // Converter para centavos
        expiration: dueDate, // Data de vencimento no formato YYYY-MM-DD
        payment_limit_date: paymentLimitDate, // Data limite para pagamento
        recharge: false,
        client: {
          first_name: dadosBoleto.nome.split(' ')[0],
          last_name: dadosBoleto.nome.split(' ').slice(1).join(' ') || 'Cliente',
          document: dadosBoleto.cpf,
          email: dadosBoleto.email,
          address: {
            street: dadosBoleto.logradouro,
            number: dadosBoleto.numero,
            neighborhood: dadosBoleto.bairro,
            complement: dadosBoleto.complemento,
            city: dadosBoleto.cidade,
            state: dadosBoleto.estado,
            zip_code: dadosBoleto.cep,
          },
        },
        instruction: {
          booklet: false,
          description: `Pagamento de Mensalidade - ${fatura.descricao || fatura.numero_fatura}`,
          late_fee: {
            mode: 'PERCENTAGE',
            amount: 1,
          },
          interest: {
            mode: 'MONTHLY_PERCENTAGE',
            amount: 1,
          },
          ...(discountBlock ? { discount: discountBlock } : {}),
        },
        // info_additional não é aceito pela API de boletos do Paytime
        // Removido conforme erro: "property info_additional should not exist"
      };

      this.logger.log(
        `📋 Body do boleto a ser enviado:`,
      );
      this.logger.log(JSON.stringify(boletoData, null, 2));

      this.logger.log(
        `Criando boleto na Paytime - Establishment: ${establishment}, Valor: R$ ${fatura.valor_total.toFixed(2)}`,
      );

      const paytimeResponse =
        await this.paytimeService.createBilletTransaction(
          parseInt(establishment, 10),
          boletoData,
        );

      // 6. Atualizar transação com dados do Paytime
      transacaoSalva.paytime_transaction_id = paytimeResponse._id || paytimeResponse.id;
      transacaoSalva.paytime_metadata = {
        barcode: paytimeResponse.barcode,
        digitable_line: paytimeResponse.digitable_line,
        pdf_url: paytimeResponse.url,
        due_date: paytimeResponse.expiration_at || paytimeResponse.due_date,  
        status: paytimeResponse.status,
        gateway_key: paytimeResponse.gateway_key,
        establishment_id: paytimeResponse.establishment_id,
      };
      
      this.logger.log(`💾 Salvando transação no banco local...`);
      this.logger.log(`   🆔 Transação Local ID: ${transacaoSalva.id}`);
      this.logger.log(`   🆔 Paytime Transaction ID: ${paytimeResponse._id || paytimeResponse.id}`);
      this.logger.log(`   🏢 Unidade ID: ${transacaoSalva.unidade_id}`);
      this.logger.log(`   📊 Status: ${transacaoSalva.status}`);
      this.logger.log(`   💰 Valor: ${transacaoSalva.valor}`);
      
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.log(`✅ Transação salva com SUCESSO no banco local!`);
      this.logger.log(`✅ Boleto criado com sucesso - ID Paytime: ${paytimeResponse._id || paytimeResponse.id}`);

      return {
        transacao_id: transacaoSalva.id,
        paytime_transaction_id: paytimeResponse._id || paytimeResponse.id,
        barcode: paytimeResponse.barcode,
        digitable_line: paytimeResponse.digitable_line,
        pdf_url: paytimeResponse.url,
        due_date: paytimeResponse.expiration_at,
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
        paytime_metadata: transacao.paytime_metadata,
      };
    }

    // Buscar status na Paytime
    try {
      const establishment = await this.obterEstablishmentDaUnidade(
        transacao.unidade_id,
      );
      
      // Usar endpoint correto conforme tipo de pagamento
      let paytimeTransaction;
      if (transacao.paytime_payment_type === 'BILLET') {
        paytimeTransaction = await this.paytimeService.getBillet(
          parseInt(establishment, 10),
          transacao.paytime_transaction_id,
        );
      } else {
        paytimeTransaction = await this.paytimeService.getTransaction(
          parseInt(establishment, 10),
          transacao.paytime_transaction_id,
        );
      }

      // Atualizar metadata se mudou (especialmente para boletos em PROCESSING)
      const novaMetadata = {
        ...transacao.paytime_metadata,
      };

      // Para boletos, atualizar dados quando ficarem disponíveis
      if (transacao.paytime_payment_type === 'BILLET') {
        novaMetadata.barcode = paytimeTransaction.barcode || novaMetadata.barcode;
        novaMetadata.digitable_line = paytimeTransaction.digitable_line || novaMetadata.digitable_line;
        novaMetadata.pdf_url = paytimeTransaction.url || novaMetadata.pdf_url;
        novaMetadata.status = paytimeTransaction.status;
        
        // ⏱️ TIMEOUT: Verificar se boleto está travado em PROCESSING há mais de 2 minutos
        if (paytimeTransaction.status === 'PROCESSING') {
          const transacaoCriadaEm = dayjs.utc(transacao.created_at);
          const agora = dayjs.utc();
          const minutosEmProcessing = agora.diff(transacaoCriadaEm, 'minute', true);
          
          this.logger.log(
            `⏱️  [STATUS CHECK] Boleto ${transacao.paytime_transaction_id} - Criado em: ${transacaoCriadaEm.toISOString()}, Agora: ${agora.toISOString()}, Minutos em PROCESSING: ${minutosEmProcessing.toFixed(2)}`,
          );
          
          // Se está em PROCESSING há mais de 2 minutos E não tem dados, cancelar automaticamente
          // minutosEmProcessing > 0 garante que não há falso positivo por offset de timezone do DB
          if (minutosEmProcessing > 2 && !paytimeTransaction.barcode && !paytimeTransaction.digitable_line) {
            this.logger.warn(
              `⚠️ [TIMEOUT] Boleto ${transacao.paytime_transaction_id} travado em PROCESSING há ${minutosEmProcessing.toFixed(1)} minutos sem dados - Cancelando automaticamente`,
            );
            
            transacao.status = StatusTransacao.CANCELADA;
            transacao.observacoes = `Boleto travado em PROCESSING sem dados após ${minutosEmProcessing.toFixed(1)} minutos - cancelado automaticamente`;
            await this.transacaoRepository.save(transacao);
            
            return {
              status: 'ERROR',
              pago: false,
              error_message: `Boleto travado em PROCESSING por mais de 2 minutos. Por favor, gere um novo boleto.`,
              paytime_metadata: novaMetadata,
              timeout: true,
            };
          }
        }
        
        // Se houve mudança, atualizar no banco
        if (JSON.stringify(novaMetadata) !== JSON.stringify(transacao.paytime_metadata)) {
          transacao.paytime_metadata = novaMetadata;
          await this.transacaoRepository.save(transacao);
        }
      }

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
          data_pagamento: dayjs().tz('America/Sao_Paulo').toDate(),
          paytime_metadata: novaMetadata,
        };
      }

      // Se mudou para FAILED ou CANCELED no Paytime, sincronizar localmente
      if (
        (paytimeTransaction.status === 'FAILED' || paytimeTransaction.status === 'CANCELED') &&
        transacao.status === StatusTransacao.PENDENTE
      ) {
        transacao.status = StatusTransacao.CANCELADA;
        transacao.observacoes = `Pagamento ${paytimeTransaction.status} na Paytime`;
        await this.transacaoRepository.save(transacao);
        this.logger.warn(
          `⚠️ Transação ${transacao.id} marcada como CANCELADA — Paytime status: ${paytimeTransaction.status}`,
        );

        return {
          status: 'CANCELADA',
          pago: false,
          paytime_status: paytimeTransaction.status,
          paytime_metadata: novaMetadata,
        };
      }

      return {
        status: transacao.status,
        pago: paytimeTransaction.status === 'PAID',
        paytime_status: paytimeTransaction.status,
        paytime_metadata: novaMetadata,
      };
    } catch (error) {
      // Transação expirada/não encontrada no Paytime → marcar como CANCELADA e não logar como ERROR
      const isNotFound =
        error.message?.includes('não encontrada') ||
        error?.status === 404 ||
        error?.response?.status === 404;

      if (isNotFound) {
        if (transacao.status === StatusTransacao.PENDENTE) {
          transacao.status = StatusTransacao.CANCELADA;
          transacao.observacoes = 'Transação expirada/não encontrada no Paytime';
          await this.transacaoRepository.save(transacao);
          this.logger.warn(
            `⚠️ Transação ${transacao.id} marcada como CANCELADA — ID Paytime ${transacao.paytime_transaction_id} não encontrado (expirado)`,
          );
        } else {
          // Já estava CANCELADA/FAILED localmente — apenas logar como debug
          this.logger.debug(
            `🔕 ID Paytime ${transacao.paytime_transaction_id} não encontrado (já ${transacao.status} localmente) — ignorando`,
          );
        }
        return {
          status: transacao.status,
          pago: false,
          paytime_metadata: transacao.paytime_metadata,
        };
      }

      this.logger.error(
        `Erro ao verificar status do pagamento: ${error.message}`,
      );
      return {
        status: transacao.status,
        pago: false,
        erro: error.message,
        paytime_metadata: transacao.paytime_metadata,
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
      relations: [
        'aluno',
        'aluno.endereco',
        'aluno.responsavel',
        'aluno.responsavel.endereco',
        'assinatura',
        'assinatura.unidade',
      ],
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
    fatura.data_pagamento = dayjs().tz('America/Sao_Paulo').toDate();

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
   * Obter dados para boleto com fallback (aluno → responsável)
   */
  private obterDadosParaBoleto(aluno: any): {
    nome: string;
    cpf: string;
    email: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    origem: 'aluno' | 'responsavel' | 'nenhum';
  } {
    // Tentar dados do aluno primeiro
    const cpfAluno = aluno.cpf?.replace(/\D/g, '');
    const cepAluno = aluno.endereco?.cep?.replace(/\D/g, '');
    const enderecoCompletoAluno =
      cepAluno &&
      cepAluno !== '00000000' &&
      cepAluno.length === 8 &&
      aluno.endereco?.cidade;

    if (cpfAluno && cpfAluno.length === 11 && enderecoCompletoAluno) {
      this.logger.log(
        `📍 Usando dados do ALUNO para boleto`,
      );
      return {
        nome: aluno.nome_completo,
        cpf: cpfAluno,
        email: aluno.email || `aluno${aluno.id}@teamcruz.com`,
        cep: cepAluno,
        logradouro: aluno.endereco.logradouro || 'Rua não informada',
        numero: aluno.endereco.numero || 'S/N',
        complemento: aluno.endereco.complemento || 'Sem complemento',
        bairro: aluno.endereco.bairro || 'Centro',
        cidade: aluno.endereco.cidade,
        estado: aluno.endereco.estado || 'SP',
        origem: 'aluno',
      };
    }

    // Se aluno não tem dados completos, tentar responsável
    if (aluno.responsavel) {
      const cpfResp = aluno.responsavel.cpf?.replace(/\D/g, '');
      const cepResp = aluno.responsavel.endereco?.cep?.replace(/\D/g, '');
      const enderecoCompletoResp =
        cepResp &&
        cepResp !== '00000000' &&
        cepResp.length === 8 &&
        aluno.responsavel.endereco?.cidade;

      if (cpfResp && cpfResp.length === 11 && enderecoCompletoResp) {
        this.logger.log(
          `📍 Aluno sem dados completos. Usando dados do RESPONSÁVEL para boleto`,
        );
        return {
          nome: aluno.responsavel.nome_completo,
          cpf: cpfResp,
          email: aluno.responsavel.email || `responsavel${aluno.responsavel.id}@teamcruz.com`,
          cep: cepResp,
          logradouro: aluno.responsavel.endereco.logradouro || 'Rua não informada',
          numero: aluno.responsavel.endereco.numero || 'S/N',
          complemento: aluno.responsavel.endereco.complemento || 'Sem complemento',
          bairro: aluno.responsavel.endereco.bairro || 'Centro',
          cidade: aluno.responsavel.endereco.cidade,
          estado: aluno.responsavel.endereco.estado || 'SP',
          origem: 'responsavel',
        };
      }
    }

    // Se não tem nenhum dado completo, retornar dados vazios para validação falhar
    this.logger.warn(
      `⚠️ Nem aluno nem responsável possuem dados completos para boleto`,
    );
    return {
      nome: aluno.nome_completo || '',
      cpf: cpfAluno || '',
      email: aluno.email || '',
      cep: cepAluno || '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      origem: 'nenhum',
    };
  }

  /**
   * Completar dados faltantes e gerar boleto
   */
  async completarDadosEGerarBoleto(
    dto: CompletarDadosBoletoDto,
    userId: string,
  ): Promise<any> {
    this.logger.log(`📝 Completando dados para boleto - Fatura: ${dto.faturaId}`);

    // 1. Buscar e validar fatura
    const fatura = await this.validarFatura(dto.faturaId, userId);
    const aluno = fatura.aluno;

    // 2. Atualizar CPF do aluno se necessário
    if (!aluno.cpf || aluno.cpf !== dto.cpf) {
      aluno.cpf = dto.cpf;
      this.logger.log(`📝 Atualizando CPF do aluno ${aluno.id}`);
    }

    // 3. Verificar se aluno já tem endereço
    let endereco: Endereco | null = null;
    
    if (aluno.endereco_id) {
      // Atualizar endereço existente
      const enderecoExistente = await this.enderecoRepository.findOne({
        where: { id: aluno.endereco_id },
      });
      
      if (enderecoExistente) {
        enderecoExistente.cep = dto.cep;
        enderecoExistente.logradouro = dto.logradouro;
        enderecoExistente.numero = dto.numero;
        enderecoExistente.complemento = dto.complemento || '';
        enderecoExistente.bairro = dto.bairro;
        enderecoExistente.cidade = dto.cidade;
        enderecoExistente.estado = dto.estado;
        endereco = enderecoExistente;
        this.logger.log(`📝 Atualizando endereço existente ${endereco.id}`);
      }
    }
    
    if (!endereco) {
      // Criar novo endereço
      endereco = this.enderecoRepository.create({
        cep: dto.cep,
        logradouro: dto.logradouro,
        numero: dto.numero,
        complemento: dto.complemento || '',
        bairro: dto.bairro,
        cidade: dto.cidade,
        estado: dto.estado,
        pais: 'Brasil',
      });
      this.logger.log(`📝 Criando novo endereço`);
    }

    // 4. Salvar endereço
    endereco = await this.enderecoRepository.save(endereco);
    
    // 5. Vincular endereço ao aluno se necessário
    if (!aluno.endereco_id || aluno.endereco_id !== endereco.id) {
      aluno.endereco_id = endereco.id;
    }

    // 6. Salvar aluno
    await this.alunoRepository.save(aluno);
    
    this.logger.log(
      `✅ Dados completados - Aluno: ${aluno.id}, Endereço: ${endereco.id}`,
    );

    // 7. Agora tentar gerar o boleto novamente
    return this.processarPagamentoBoleto(
      { faturaId: dto.faturaId },
      userId,
    );
  }

  /**
   * 🔥 RECORRÊNCIA: Processar primeira cobrança com tokenização
   * Usado na assinatura inicial para salvar token do cartão
   */
  async processarPrimeiraCobrancaComToken(
    dto: ProcessarPagamentoCartaoDto,
    assinaturaId: string,
    userId: string,
  ): Promise<any> {
    this.logger.log(
      `💳 TOKENIZAÇÃO: Processando primeira cobrança com create_token para assinatura ${assinaturaId}`,
    );

    // 1. Validar fatura e assinatura
    const fatura = await this.validarFatura(dto.faturaId, userId);
    
    const assinatura = await this.assinaturaRepository.findOne({
      where: { id: assinaturaId },
      relations: ['aluno', 'plano', 'unidade'],
    });

    if (!assinatura) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    // 2. Buscar establishment
    const establishment = await this.obterEstablishmentDaUnidade(
      fatura.assinatura.unidade.id,
    );

    // 3. Criar transação PENDENTE
    const transacao = this.transacaoRepository.create({
      tipo: TipoTransacao.ENTRADA,
      origem: OrigemTransacao.FATURA,
      categoria: CategoriaTransacao.MENSALIDADE,
      descricao: `Primeira Cobrança (Tokenização) - ${fatura.descricao || fatura.numero_fatura}`,
      aluno_id: fatura.aluno_id,
      unidade_id: fatura.assinatura.unidade.id,
      fatura_id: fatura.id,
      valor: fatura.valor_total,
      data: dayjs().tz('America/Sao_Paulo').toDate(),
      status: StatusTransacao.PENDENTE,
      metodo_pagamento: 'CARTAO',
      paytime_payment_type: dto.paymentType,
      criado_por: userId,
    });

    const transacaoSalva = await this.transacaoRepository.save(transacao);

    try {
      // 4. Validar dados obrigatórios
      if (!fatura.aluno.cpf || fatura.aluno.cpf.replace(/\D/g, '').length !== 11) {
        throw new BadRequestException('CPF do aluno não cadastrado ou inválido.');
      }

      // 5. Obter endereço
      let address = dto.billing_address;
      
      if (!address || !address.street || !address.number || !address.city || !address.state || !address.zip_code) {
        if (fatura.aluno.endereco) {
          address = {
            street: fatura.aluno.endereco.logradouro,
            number: fatura.aluno.endereco.numero,
            complement: fatura.aluno.endereco.complemento || '',
            neighborhood: fatura.aluno.endereco.bairro,
            city: fatura.aluno.endereco.cidade,
            state: fatura.aluno.endereco.estado,
            zip_code: fatura.aluno.endereco.cep,
          };
        } else if (fatura.aluno.responsavel?.endereco) {
          address = {
            street: fatura.aluno.responsavel.endereco.logradouro,
            number: fatura.aluno.responsavel.endereco.numero,
            complement: fatura.aluno.responsavel.endereco.complemento || '',
            neighborhood: fatura.aluno.responsavel.endereco.bairro,
            city: fatura.aluno.responsavel.endereco.cidade,
            state: fatura.aluno.responsavel.endereco.estado,
            zip_code: fatura.aluno.responsavel.endereco.cep,
          };
        } else {
          throw new BadRequestException('Endereço não encontrado. Complete seu cadastro.');
        }
      }

      // 6. Criar payload COM create_token: true
      const paymentData = {
        payment_type: dto.paymentType,
        amount: Math.round(fatura.valor_total * 100),
        installments: dto.installments || 1,
        interest: dto.interest || 'ESTABLISHMENT',
        client: {
          first_name: fatura.aluno.nome_completo.split(' ')[0],
          last_name: fatura.aluno.nome_completo.split(' ').slice(1).join(' ') || 'Cliente',
          document: fatura.aluno.cpf?.replace(/\D/g, ''),
          phone: fatura.aluno.telefone?.replace(/\D/g, '') || '00000000000',
          email: fatura.aluno.email || `aluno${fatura.aluno_id}@teamcruz.com`,
          address: {
            street: address.street,
            number: address.number,
            complement: address.complement || '',
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            country: 'BR',
            zip_code: address.zip_code.replace(/\D/g, ''),
          },
        },
        card: {
          card_number: dto.card.number.replace(/\D/g, ''),
          holder_name: dto.card.holder_name,
          holder_document: fatura.aluno.cpf?.replace(/\D/g, ''),
          expiration_month: parseInt(dto.card.expiration_month),
          expiration_year: parseInt(dto.card.expiration_year),
          security_code: dto.card.cvv,
          create_token: true, // ← CAMPO CRÍTICO PARA TOKENIZAÇÃO
        },
        info_additional: [
          { key: 'aluno_id', value: fatura.aluno_id },
          { key: 'assinatura_id', value: assinaturaId },
          { key: 'tokenizacao', value: 'true' },
        ],
      };

      // Adicionar antifraude — session_id e antifraud_type são campos top-level na Paytime
      if (dto.session_id) {
        paymentData['session_id'] = dto.session_id;
      }
      // Sempre acionar IDPAY (ou o tipo indicado), conforme configuração do establishment
      paymentData['antifraud_type'] = dto.antifraud_type || 'IDPAY';

      this.logger.log(`📤 Enviando para Paytime com create_token: true`);

      // 7. Enviar para Paytime
      const paytimeResponse = await this.paytimeService.createCardTransaction(
        parseInt(establishment, 10),
        paymentData,
      );

      // 8. Salvar TRANSACTION ID e METADATA
      transacaoSalva.paytime_transaction_id = paytimeResponse._id || paytimeResponse.id;
      transacaoSalva.paytime_metadata = paytimeResponse;

      // 9. SALVAR TOKEN retornado (SE HOUVER)
      if (paytimeResponse.card?.token) {
        this.logger.log(`🔑 TOKEN RECEBIDO: ${paytimeResponse.card.token.substring(0, 20)}...`);
        
        assinatura.token_cartao = paytimeResponse.card.token;
        assinatura.dados_pagamento = {
          last4: paytimeResponse.card.last4_digits || paytimeResponse.card.last4,
          brand: paytimeResponse.card.brand_name || paytimeResponse.card.brand,
          exp_month: dto.card.expiration_month,
          exp_year: dto.card.expiration_year,
          holder_name: dto.card.holder_name,
          tokenized_at: dayjs().tz('America/Sao_Paulo').toISOString(),
        };
        
        await this.assinaturaRepository.save(assinatura);
        this.logger.log(`✅ TOKEN salvo na assinatura ${assinaturaId}`);
      } else {
        this.logger.warn(`⚠️ Paytime NÃO retornou token no response`);
      }

      // 10. Atualizar status da transação
      if (paytimeResponse.status === 'PAID' || paytimeResponse.status === 'APPROVED') {
        transacaoSalva.status = StatusTransacao.CONFIRMADA;
        await this.transacaoRepository.save(transacaoSalva);
        await this.baixarFatura(fatura, transacaoSalva);
        this.logger.log(`✅ Primeira cobrança CONFIRMADA e TOKEN salvo`);
      } else if (paytimeResponse.status === 'FAILED' || paytimeResponse.status === 'CANCELED') {
        transacaoSalva.status = StatusTransacao.CANCELADA;
        transacaoSalva.observacoes = `Pagamento ${paytimeResponse.status}`;
        await this.transacaoRepository.save(transacaoSalva);
        this.logger.warn(`⚠️ Primeira cobrança ${paytimeResponse.status}`);
      } else {
        transacaoSalva.status = StatusTransacao.PENDENTE;
        await this.transacaoRepository.save(transacaoSalva);
        this.logger.log(`⏳ Primeira cobrança em processamento: ${paytimeResponse.status}`);
      }

      return {
        transacao_id: transacaoSalva.id,
        paytime_transaction_id: paytimeResponse._id || paytimeResponse.id,
        status: paytimeResponse.status,
        token_salvo: !!paytimeResponse.card?.token,
        card: {
          brand: assinatura.dados_pagamento?.brand,
          last4: assinatura.dados_pagamento?.last4,
        },
        valor: fatura.valor_total,
        fatura_numero: fatura.numero_fatura,
      };

    } catch (error) {
      transacaoSalva.status = StatusTransacao.CANCELADA;
      transacaoSalva.observacoes = `Erro ao processar: ${error.message}`;
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.error(`❌ Erro ao processar primeira cobrança com token: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔥 RECORRÊNCIA: Cobrar usando token salvo (sem dados do cartão)
   * Usado nas cobranças automáticas mensais pelo scheduler
   */
  async cobrarComToken(
    assinatura: Assinatura,
    fatura: Fatura,
  ): Promise<any> {
    this.logger.log(
      `💳 RECORRÊNCIA: Cobrando fatura ${fatura.numero_fatura} com token da assinatura ${assinatura.id}`,
    );

    // 1. Validar que tem token
    if (!assinatura.token_cartao) {
      throw new BadRequestException(
        'Assinatura não possui token de cartão salvo. Atualize o cartão.',
      );
    }

    // 2. Buscar establishment
    const establishment = await this.obterEstablishmentDaUnidade(
      assinatura.unidade_id,
    );

    // 3. Buscar dados do aluno (pode não estar em relations)
    if (!fatura.aluno && fatura.aluno_id) {
      const aluno = await this.alunoRepository.findOne({
        where: { id: fatura.aluno_id },
      });
      if (aluno) {
        fatura.aluno = aluno;
      }
    }

    // 4. Criar transação PENDENTE
    const transacao = this.transacaoRepository.create({
      tipo: TipoTransacao.ENTRADA,
      origem: OrigemTransacao.FATURA,
      categoria: CategoriaTransacao.MENSALIDADE,
      descricao: `Cobrança Recorrente - ${fatura.numero_fatura}`,
      aluno_id: fatura.aluno_id,
      unidade_id: assinatura.unidade_id,
      fatura_id: fatura.id,
      valor: fatura.valor_total,
      data: dayjs().tz('America/Sao_Paulo').toDate(),
      status: StatusTransacao.PENDENTE,
      metodo_pagamento: 'CARTAO',
      paytime_payment_type: 'CREDIT',
    });

    const transacaoSalva = await this.transacaoRepository.save(transacao);

    try {
      // 5. Criar payload SOMENTE COM TOKEN
      const paymentData = {
        payment_type: 'CREDIT',
        amount: Math.round(fatura.valor_total * 100),
        installments: 1,
        interest: 'ESTABLISHMENT',
        client: {
          first_name: fatura.aluno.nome_completo.split(' ')[0],
          last_name: fatura.aluno.nome_completo.split(' ').slice(1).join(' ') || 'Cliente',
          document: fatura.aluno.cpf?.replace(/\D/g, ''),
          phone: fatura.aluno.telefone?.replace(/\D/g, '') || '00000000000',
          email: fatura.aluno.email || `aluno${fatura.aluno_id}@teamcruz.com`,
        },
        card: {
          token: assinatura.token_cartao, // ← SÓ O TOKEN, SEM DADOS DO CARTÃO
        },
        info_additional: [
          { key: 'aluno_id', value: fatura.aluno_id },
          { key: 'assinatura_id', value: assinatura.id },
          { key: 'cobranca_recorrente', value: 'true' },
          { key: 'fatura_numero', value: fatura.numero_fatura },
        ],
      };
      // ❌ SEM antifraude na recorrência
      // ❌ SEM dados completos do cartão
      // ❌ SEM create_token (já temos)

      this.logger.log(`📤 Enviando para Paytime com token (sem dados do cartão)`);

      // 6. Enviar para Paytime
      const paytimeResponse = await this.paytimeService.createCardTransaction(
        parseInt(establishment, 10),
        paymentData,
      );

      // 7. Salvar metadata
      transacaoSalva.paytime_transaction_id = paytimeResponse._id || paytimeResponse.id;
      transacaoSalva.paytime_metadata = {
        ...paytimeResponse,
        cobrado_com_token: true,
        brand: assinatura.dados_pagamento?.brand,
        last4: assinatura.dados_pagamento?.last4,
      };

      // 8. Atualizar status
      if (paytimeResponse.status === 'PAID' || paytimeResponse.status === 'APPROVED') {
        transacaoSalva.status = StatusTransacao.CONFIRMADA;
        await this.transacaoRepository.save(transacaoSalva);
        
        // Baixar fatura
        fatura.status = StatusFatura.PAGA;
        fatura.data_pagamento = dayjs().tz('America/Sao_Paulo').toDate();
        fatura.valor_pago = fatura.valor_total;
        await this.faturaRepository.save(fatura);
        
        this.logger.log(`✅ Cobrança recorrente APROVADA - Fatura ${fatura.numero_fatura} paga`);

        return {
          success: true,
          transacao_id: transacaoSalva.id,
          paytime_transaction_id: paytimeResponse._id || paytimeResponse.id,
          status: paytimeResponse.status,
        };

      } else if (paytimeResponse.status === 'FAILED' || paytimeResponse.status === 'CANCELED') {
        transacaoSalva.status = StatusTransacao.CANCELADA;
        transacaoSalva.observacoes = `Cobrança recorrente ${paytimeResponse.status}`;
        await this.transacaoRepository.save(transacaoSalva);
        
        this.logger.warn(`⚠️ Cobrança recorrente ${paytimeResponse.status}`);

        return {
          success: false,
          transacao_id: transacaoSalva.id,
          paytime_transaction_id: paytimeResponse._id || paytimeResponse.id,
          status: paytimeResponse.status,
          error: `Pagamento ${paytimeResponse.status}`,
        };

      } else {
        // PENDING ou outros
        transacaoSalva.status = StatusTransacao.PENDENTE;
        await this.transacaoRepository.save(transacaoSalva);
        
        this.logger.log(`⏳ Cobrança recorrente em processamento: ${paytimeResponse.status}`);

        return {
          success: false,
          transacao_id: transacaoSalva.id,
          paytime_transaction_id: paytimeResponse._id || paytimeResponse.id,
          status: paytimeResponse.status,
          error: 'Pagamento em processamento',
        };
      }

    } catch (error) {
      transacaoSalva.status = StatusTransacao.CANCELADA;
      transacaoSalva.observacoes = `Erro: ${error.message}`;
      await this.transacaoRepository.save(transacaoSalva);

      this.logger.error(
        `❌ Erro ao cobrar com token (assinatura ${assinatura.id}): ${error.message}`,
      );

      return {
        success: false,
        transacao_id: transacaoSalva.id,
        error: error.message,
        status: 'FAILED',
      };
    }
  }

  /**
   * Calcular data de vencimento do boleto (dias úteis)
   */
  private calcularDataVencimentoBoleto(
    dataBase: Date,
    diasUteis: number,
  ): string {
    let data = dayjs(dataBase).tz('America/Sao_Paulo');
    let diasAdicionados = 0;

    while (diasAdicionados < diasUteis) {
      data = data.add(1, 'day');
      const diaSemana = data.day();
      // Pular sábado (6) e domingo (0)
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAdicionados++;
      }
    }

    return data.format('YYYY-MM-DD'); // Formato: YYYY-MM-DD
  }
}
