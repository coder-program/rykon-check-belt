import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { CreateContractDto, UpdateContractDto, SignContractDto } from '../dto/contract.dto';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private contractsRepository: Repository<Contract>,
    private dataSource: DataSource,
  ) {}

  /**
   * Busca contrato ativo da unidade
   */
  async findActiveByUnidade(unidadeId: string, tipo: string, user: any): Promise<Contract> {
    // Validar permissão
    this.validateAccess(unidadeId, user);

    const contract = await this.contractsRepository.findOne({
      where: { 
        unidadeId, 
        tipo,
        status: 'ATIVO' 
      },
      relations: ['unidade'],
      order: { createdAt: 'DESC' },
    });

    if (!contract) {
      // Se não existe contrato ativo, criar um padrão
      return this.createDefaultContract(unidadeId, tipo, user);
    }

    return contract;
  }

  /**
   * Lista todos os contratos da unidade
   */
  async findByUnidade(unidadeId: string, user: any): Promise<Contract[]> {
    // Validar permissão
    this.validateAccess(unidadeId, user);

    return this.contractsRepository.find({
      where: { unidadeId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca contrato por ID
   */
  async findOne(id: string, user: any): Promise<Contract> {
    const contract = await this.contractsRepository.findOne({
      where: { id },
      relations: ['unidade'],
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // Validar permissão
    this.validateAccess(contract.unidadeId, user);

    return contract;
  }

  /**
   * Cria novo contrato
   */
  async create(createDto: CreateContractDto, user: any): Promise<Contract> {
    // Validar permissão (apenas master pode criar contratos)
    if (user.perfil?.nome?.toLowerCase() !== 'master') {
      throw new ForbiddenException('Apenas administradores podem criar contratos');
    }

    // Verificar se já existe contrato ativo do mesmo tipo
    const existingActive = await this.contractsRepository.findOne({
      where: {
        unidadeId: createDto.unidadeId,
        tipo: createDto.tipo || 'rykon-pay',
        status: 'ATIVO',
      },
    });

    if (existingActive) {
      throw new BadRequestException('Já existe um contrato ativo deste tipo para esta unidade');
    }

    const contract = this.contractsRepository.create({
      ...createDto,
      createdBy: user.id,
      status: 'ATIVO',
    });

    return this.contractsRepository.save(contract);
  }

  /**
   * Atualiza contrato
   */
  async update(id: string, updateDto: UpdateContractDto, user: any): Promise<Contract> {
    const contract = await this.findOne(id, user);

    // Apenas master pode atualizar
    if (user.perfil?.nome?.toLowerCase() !== 'master') {
      throw new ForbiddenException('Apenas administradores podem atualizar contratos');
    }

    Object.assign(contract, updateDto);
    return this.contractsRepository.save(contract);
  }

  /**
   * Assina contrato
   */
  async signContract(id: string, signDto: SignContractDto, user: any): Promise<Contract> {
    const contract = await this.findOne(id, user);

    if (contract.assinado) {
      throw new BadRequestException('Este contrato já foi assinado');
    }

    if (contract.status !== 'ATIVO') {
      throw new BadRequestException('Apenas contratos ativos podem ser assinados');
    }

    contract.assinado = true;
    contract.dataAssinatura = new Date();
    contract.assinadoPorNome = signDto.assinadoPorNome;
    contract.assinadoPorCpf = signDto.assinadoPorCpf;

    return this.contractsRepository.save(contract);
  }

  /**
   * Gera PDF do contrato
   */
  async generatePDF(id: string, user: any): Promise<Buffer> {
    const contract = await this.contractsRepository.findOne({
      where: { id },
      relations: ['unidade'],
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // Validar permissão
    this.validateAccess(contract.unidadeId, user);

    return this.createPDFBuffer(contract);
  }

  /**
   * Cria contrato padrão se não existir
   */
  private async createDefaultContract(unidadeId: string, tipo: string, user: any): Promise<Contract> {
    // Buscar dados da unidade
    const unidade = await this.dataSource.query(
      `SELECT nome, documento FROM teamcruz.unidades WHERE id = $1`,
      [unidadeId]
    );

    if (!unidade || unidade.length === 0) {
      throw new NotFoundException('Unidade não encontrada');
    }

    const defaultContent = this.getDefaultContractContent(tipo, unidade[0].nome);

    const contract = this.contractsRepository.create({
      unidadeId,
      tipo,
      titulo: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - RYKON-PAY',
      conteudo: defaultContent,
      versao: '1.0',
      status: 'ATIVO',
      dataInicio: new Date(),
      valorMensal: 0,
      taxaTransacao: 2.5,
      createdBy: user.id,
    });

    return this.contractsRepository.save(contract);
  }

  /**
   * Retorna conteúdo padrão do contrato
   */
  private getDefaultContractContent(tipo: string, unidadeNome: string): string {
    return `
      <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS - RYKON-PAY</h1>
      
      <p>Pelo presente instrumento particular, as partes:</p>
      
      <h3>CONTRATANTE:</h3>
      <p><strong>${unidadeNome}</strong>, doravante denominada CONTRATANTE.</p>
      
      <h3>CONTRATADA:</h3>
      <p><strong>RYKON TECNOLOGIA LTDA</strong>, inscrita no CNPJ sob nº XX.XXX.XXX/0001-XX, com sede à [ENDEREÇO], doravante denominada CONTRATADA.</p>
      
      <h3>CLÁUSULA PRIMEIRA - DO OBJETO</h3>
      <p>A CONTRATADA fornecerá à CONTRATANTE acesso à plataforma Rykon-Pay, que permite:</p>
      <ul>
        <li>Processamento de pagamentos via cartão de crédito, débito e PIX</li>
        <li>Gestão financeira integrada ao sistema Rykon</li>
        <li>Controle de recebíveis e liquidações</li>
        <li>Dashboard de análises e relatórios</li>
      </ul>
      
      <h3>CLÁUSULA SEGUNDA - DAS TAXAS</h3>
      <p>As taxas de transação serão definidas conforme plano comercial contratado, sendo aplicadas sobre cada transação processada.</p>
      <p>Taxa padrão: 2,5% por transação + taxas operacionais dos gateways de pagamento.</p>
      
      <h3>CLÁUSULA TERCEIRA - DA VIGÊNCIA</h3>
      <p>Este contrato entra em vigor na data de sua assinatura e vigorará por prazo indeterminado.</p>
      
      <h3>CLÁUSULA QUARTA - DA RESCISÃO</h3>
      <p>Qualquer das partes poderá rescindir o presente contrato mediante notificação prévia de 30 (trinta) dias.</p>
      
      <h3>CLÁUSULA QUINTA - DO FORO</h3>
      <p>As partes elegem o foro da comarca de [CIDADE/UF] para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato.</p>
      
      <p>E por estarem assim justas e contratadas, assinam o presente instrumento.</p>
      
      <p style="margin-top: 60px;">_________________________________________</p>
      <p><strong>RYKON TECNOLOGIA LTDA</strong></p>
      <p>CONTRATADA</p>
      
      <p style="margin-top: 60px;">_________________________________________</p>
      <p><strong>${unidadeNome}</strong></p>
      <p>CONTRATANTE</p>
    `;
  }

  /**
   * Cria buffer do PDF
   */
  private async createPDFBuffer(contract: Contract): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Título
      doc.fontSize(18).font('Helvetica-Bold').text(contract.titulo, { align: 'center' });
      doc.moveDown(2);

      // Informações do contrato
      doc.fontSize(10).font('Helvetica');
      doc.text(`Contrato Nº: ${contract.id}`, { align: 'right' });
      doc.text(`Versão: ${contract.versao}`, { align: 'right' });
      doc.text(`Data: ${new Date(contract.dataInicio).toLocaleDateString('pt-BR')}`, { align: 'right' });
      doc.moveDown(2);

      // Conteúdo (remover tags HTML básicas)
      const cleanContent = contract.conteudo
        .replace(/<h1>/g, '\n')
        .replace(/<\/h1>/g, '\n')
        .replace(/<h3>/g, '\n')
        .replace(/<\/h3>/g, '\n')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '\n')
        .replace(/<ul>/g, '')
        .replace(/<\/ul>/g, '')
        .replace(/<li>/g, '• ')
        .replace(/<\/li>/g, '\n')
        .replace(/<strong>/g, '')
        .replace(/<\/strong>/g, '')
        .replace(/<br\s*\/?>/g, '\n');

      doc.fontSize(11).text(cleanContent, { align: 'justify' });

      // Se assinado, adicionar informações
      if (contract.assinado) {
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('ASSINATURA DIGITAL', { align: 'center' });
        doc.font('Helvetica');
        doc.text(`Assinado por: ${contract.assinadoPorNome}`, { align: 'center' });
        doc.text(`CPF: ${contract.assinadoPorCpf}`, { align: 'center' });
        doc.text(`Data: ${new Date(contract.dataAssinatura).toLocaleString('pt-BR')}`, { align: 'center' });
      }

      doc.end();
    });
  }

  /**
   * Valida acesso do usuário à unidade
   */
  private validateAccess(unidadeId: string, user: any): void {
    const userRole = user.perfil?.nome?.toLowerCase();
    
    // Master pode tudo
    if (userRole === 'master') {
      return;
    }

    // Franqueado só pode acessar sua própria unidade
    if (userRole === 'franqueado') {
      if (user.franqueado?.unidadeId !== unidadeId) {
        throw new ForbiddenException('Você não tem permissão para acessar contratos desta unidade');
      }
      return;
    }

    // Gerente só pode acessar unidade que gerencia
    if (userRole === 'gerente') {
      if (user.gerente?.unidadeId !== unidadeId) {
        throw new ForbiddenException('Você não tem permissão para acessar contratos desta unidade');
      }
      return;
    }

    throw new ForbiddenException('Você não tem permissão para acessar contratos');
  }
}
