import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnexosService } from '../services/anexos.service';
import { Response } from 'express';

@Controller('anexos')
@UseGuards(JwtAuthGuard)
export class AnexosController {
  constructor(private readonly anexosService: AnexosService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAnexo(
    @UploadedFile() file: Express.Multer.File,
    @Query('tipo') tipo?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo fornecido');
    }

    const tipoValido =
      tipo && ['despesa', 'comprovante', 'nota_fiscal'].includes(tipo)
        ? tipo
        : 'comprovante';

    return this.anexosService.uploadAnexo(file, tipoValido);
  }

  @Post('despesa/:id/anexar')
  @UseInterceptors(FileInterceptor('file'))
  async anexarDespesa(@Param('id') id: string, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo fornecido');
    }

    return this.anexosService.anexarComprovanteDespesa(id, file);
  }

  @Delete('despesa/:id/remover')
  async removerAnexoDespesa(@Param('id') id: string) {
    return this.anexosService.removerAnexoDespesa(id);
  }

  @Get('download/:filename')
  async baixarAnexo(@Param('filename') filename: string, @Res() res: Response) {
    const arquivo = await this.anexosService.baixarAnexo(filename);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(arquivo);
  }

  @Get('listar')
  async listarAnexos(@Query('tipo') tipo?: string) {
    return this.anexosService.listarAnexos(tipo);
  }
}
