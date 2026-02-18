import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BankAccountsService } from '../services/bank-accounts.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../dto/bank-account.dto';
import { BankAccount } from '../entities/bank-account.entity';

@ApiTags('Contas Bancárias')
@ApiBearerAuth()
@Controller('financeiro/contas-bancarias')
@UseGuards(JwtAuthGuard)
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista contas bancárias de uma unidade' })
  @ApiResponse({ status: 200, description: 'Lista de contas bancárias' })
  async findByUnidade(
    @Query('unidadeId') unidadeId: string,
    @Req() req: any,
  ): Promise<BankAccount[]> {
    return this.bankAccountsService.findByUnidade(unidadeId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca conta bancária por ID' })
  @ApiResponse({ status: 200, description: 'Conta bancária encontrada' })
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<BankAccount> {
    return this.bankAccountsService.findOne(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Cria nova conta bancária' })
  @ApiResponse({ status: 201, description: 'Conta criada com sucesso' })
  async create(
    @Body() createDto: CreateBankAccountDto,
    @Req() req: any,
  ): Promise<BankAccount> {
    return this.bankAccountsService.create(createDto, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza conta bancária' })
  @ApiResponse({ status: 200, description: 'Conta atualizada com sucesso' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBankAccountDto,
    @Req() req: any,
  ): Promise<BankAccount> {
    return this.bankAccountsService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove conta bancária' })
  @ApiResponse({ status: 200, description: 'Conta removida com sucesso' })
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    await this.bankAccountsService.remove(id, req.user);
    return { message: 'Conta bancária removida com sucesso' };
  }

  @Post(':id/set-principal')
  @ApiOperation({ summary: 'Define conta como principal' })
  @ApiResponse({ status: 200, description: 'Conta definida como principal' })
  async setPrincipal(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<BankAccount> {
    return this.bankAccountsService.setPrincipal(id, req.user);
  }
}
