import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../dto/bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccount)
    private bankAccountsRepository: Repository<BankAccount>,
    private dataSource: DataSource,
  ) {}

  /**
   * Lista contas bancárias de uma unidade
   */
  async findByUnidade(unidadeId: string, user: any): Promise<BankAccount[]> {
    // Validar permissão
    this.validateAccess(unidadeId, user);

    return this.bankAccountsRepository.find({
      where: { unidadeId, ativo: true },
      order: { principal: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Busca conta bancária por ID
   */
  async findOne(id: string, user: any): Promise<BankAccount> {
    const account = await this.bankAccountsRepository.findOne({
      where: { id },
      relations: ['unidade'],
    });

    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    // Validar permissão
    this.validateAccess(account.unidadeId, user);

    return account;
  }

  /**
   * Cria nova conta bancária
   */
  async create(createDto: CreateBankAccountDto, user: any): Promise<BankAccount> {
    // Validar permissão
    this.validateAccess(createDto.unidadeId, user);

    // Se marca como principal, remover flag de outras contas
    if (createDto.principal) {
      await this.removePrincipalFlag(createDto.unidadeId);
    }

    // Validar CPF/CNPJ
    this.validateDocument(createDto.titularCpfCnpj);

    const account = this.bankAccountsRepository.create(createDto);
    return this.bankAccountsRepository.save(account);
  }

  /**
   * Atualiza conta bancária
   */
  async update(id: string, updateDto: UpdateBankAccountDto, user: any): Promise<BankAccount> {
    const account = await this.findOne(id, user);

    // Se marca como principal, remover flag de outras contas
    if (updateDto.principal && !account.principal) {
      await this.removePrincipalFlag(account.unidadeId);
    }

    // Validar CPF/CNPJ se fornecido
    if (updateDto.titularCpfCnpj) {
      this.validateDocument(updateDto.titularCpfCnpj);
    }

    Object.assign(account, updateDto);
    return this.bankAccountsRepository.save(account);
  }

  /**
   * Remove (soft delete) conta bancária
   */
  async remove(id: string, user: any): Promise<void> {
    const account = await this.findOne(id, user);

    // Não permitir remover conta principal se houver outras contas
    if (account.principal) {
      const otherAccounts = await this.bankAccountsRepository.count({
        where: { unidadeId: account.unidadeId, ativo: true, id: Not(id) },
      });

      if (otherAccounts > 0) {
        throw new BadRequestException(
          'Não é possível remover a conta principal. Defina outra conta como principal primeiro.',
        );
      }
    }

    account.ativo = false;
    await this.bankAccountsRepository.save(account);
  }

  /**
   * Define conta como principal
   */
  async setPrincipal(id: string, user: any): Promise<BankAccount> {
    const account = await this.findOne(id, user);

    if (account.principal) {
      return account; // Já é principal
    }

    await this.removePrincipalFlag(account.unidadeId);
    account.principal = true;
    return this.bankAccountsRepository.save(account);
  }

  /**
   * Remove flag de conta principal de todas as contas da unidade
   */
  private async removePrincipalFlag(unidadeId: string): Promise<void> {
    await this.bankAccountsRepository.update(
      { unidadeId, principal: true },
      { principal: false },
    );
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
        throw new ForbiddenException('Você não tem permissão para acessar contas desta unidade');
      }
      return;
    }

    // Gerente só pode acessar unidade que gerencia
    if (userRole === 'gerente') {
      if (user.gerente?.unidadeId !== unidadeId) {
        throw new ForbiddenException('Você não tem permissão para acessar contas desta unidade');
      }
      return;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar contas bancárias');
  }

  /**
   * Valida CPF ou CNPJ
   */
  private validateDocument(document: string): void {
    const cleanDoc = document.replace(/\D/g, '');

    if (cleanDoc.length === 11) {
      // Validar CPF
      if (!this.isValidCPF(cleanDoc)) {
        throw new BadRequestException('CPF inválido');
      }
    } else if (cleanDoc.length === 14) {
      // Validar CNPJ
      if (!this.isValidCNPJ(cleanDoc)) {
        throw new BadRequestException('CNPJ inválido');
      }
    } else {
      throw new BadRequestException('CPF ou CNPJ inválido');
    }
  }

  /**
   * Valida CPF
   */
  private isValidCPF(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    return digit === parseInt(cpf.charAt(10));
  }

  /**
   * Valida CNPJ
   */
  private isValidCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cnpj.charAt(12))) return false;

    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return digit === parseInt(cnpj.charAt(13));
  }
}

// Importação necessária para o Not
import { Not } from 'typeorm';
