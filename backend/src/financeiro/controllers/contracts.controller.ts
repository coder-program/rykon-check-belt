import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContractsService } from '../services/contracts.service';
import { CreateContractDto, UpdateContractDto, SignContractDto } from '../dto/contract.dto';
import { Contract } from '../entities/contract.entity';

@ApiTags('Contratos')
@ApiBearerAuth()
@Controller('financeiro/contratos')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('unidade/:unidadeId')
  @ApiOperation({ summary: 'Busca contrato ativo da unidade' })
  @ApiResponse({ status: 200, description: 'Contrato encontrado' })
  async findActiveByUnidade(
    @Param('unidadeId') unidadeId: string,
    @Query('tipo') tipo: string = 'rykon-pay',
    @Req() req: any,
  ): Promise<Contract> {
    return this.contractsService.findActiveByUnidade(unidadeId, tipo, req.user);
  }

  @Get('unidade/:unidadeId/all')
  @ApiOperation({ summary: 'Lista todos os contratos da unidade' })
  @ApiResponse({ status: 200, description: 'Lista de contratos' })
  async findByUnidade(
    @Param('unidadeId') unidadeId: string,
    @Req() req: any,
  ): Promise<Contract[]> {
    return this.contractsService.findByUnidade(unidadeId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca contrato por ID' })
  @ApiResponse({ status: 200, description: 'Contrato encontrado' })
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Contract> {
    return this.contractsService.findOne(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Cria novo contrato (apenas admin)' })
  @ApiResponse({ status: 201, description: 'Contrato criado com sucesso' })
  async create(
    @Body() createDto: CreateContractDto,
    @Req() req: any,
  ): Promise<Contract> {
    return this.contractsService.create(createDto, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza contrato (apenas admin)' })
  @ApiResponse({ status: 200, description: 'Contrato atualizado com sucesso' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateContractDto,
    @Req() req: any,
  ): Promise<Contract> {
    return this.contractsService.update(id, updateDto, req.user);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Assina contrato' })
  @ApiResponse({ status: 200, description: 'Contrato assinado com sucesso' })
  async signContract(
    @Param('id') id: string,
    @Body() signDto: SignContractDto,
    @Req() req: any,
  ): Promise<Contract> {
    return this.contractsService.signContract(id, signDto, req.user);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Gera PDF do contrato' })
  @ApiResponse({ 
    status: 200, 
    description: 'PDF gerado com sucesso',
    content: { 'application/pdf': {} }
  })
  async generatePDF(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.contractsService.generatePDF(id, req.user);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=contrato-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.status(HttpStatus.OK).end(pdfBuffer);
  }
}
