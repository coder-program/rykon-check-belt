import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Despesa } from '../entities/despesa.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  filename: string;
  url: string;
  path: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class AnexosService {
  private readonly logger = new Logger(AnexosService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  constructor(
    @InjectRepository(Despesa)
    private despesasRepository: Repository<Despesa>,
  ) {
    // Use /tmp directory in production (Railway compatible) or local uploads in development
    const uploadBase = process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd();
    this.uploadDir = path.join(uploadBase, 'uploads', 'financeiro');
    this.garantirDiretorioExiste();
  }

  private async garantirDiretorioExiste(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Diretório de uploads criado: ${this.uploadDir}`);
    }
  }

  async uploadAnexo(
    file: any,
    tipo: 'despesa' | 'comprovante' | 'nota_fiscal' | string,
  ): Promise<UploadResult> {
    try {
      // Validar arquivo
      this.validarArquivo(file);

      // Gerar nome único
      const extensao = path.extname(file.originalname);
      const nomeArquivo = `${tipo}_${uuidv4()}${extensao}`;
      const caminhoCompleto = path.join(this.uploadDir, nomeArquivo);

      // Salvar arquivo
      await fs.writeFile(caminhoCompleto, file.buffer);

      this.logger.log(`✅ Arquivo salvo: ${nomeArquivo}`);

      return {
        filename: nomeArquivo,
        url: `/uploads/financeiro/${nomeArquivo}`,
        path: caminhoCompleto,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      this.logger.error('Erro ao fazer upload de anexo:', error);
      throw error;
    }
  }

  async anexarComprovanteDespesa(
    despesaId: string,
    file: any,
  ): Promise<Despesa> {
    const resultado = await this.uploadAnexo(file, 'despesa');

    const despesa = await this.despesasRepository.findOne({
      where: { id: despesaId },
    });

    if (!despesa) {
      // Remover arquivo se despesa não existe
      await this.removerArquivo(resultado.path);
      throw new Error('Despesa não encontrada');
    }

    // Remover anexo antigo se existir
    if (despesa.anexo) {
      const caminhoAntigo = path.join(
        this.uploadDir,
        path.basename(despesa.anexo),
      );
      await this.removerArquivo(caminhoAntigo);
    }

    despesa.anexo = resultado.url;
    await this.despesasRepository.save(despesa);

    this.logger.log(`✅ Anexo vinculado à despesa ${despesaId}`);

    return despesa;
  }

  async removerAnexoDespesa(despesaId: string): Promise<Despesa> {
    const despesa = await this.despesasRepository.findOne({
      where: { id: despesaId },
    });

    if (!despesa) {
      throw new Error('Despesa não encontrada');
    }

    if (despesa.anexo) {
      const caminhoArquivo = path.join(
        this.uploadDir,
        path.basename(despesa.anexo),
      );
      await this.removerArquivo(caminhoArquivo);

      despesa.anexo = null;
      await this.despesasRepository.save(despesa);

      this.logger.log(`✅ Anexo removido da despesa ${despesaId}`);
    }

    return despesa;
  }

  async baixarAnexo(filename: string): Promise<Buffer> {
    const caminhoArquivo = path.join(this.uploadDir, filename);

    try {
      const arquivo = await fs.readFile(caminhoArquivo);
      return arquivo;
    } catch (error) {
      this.logger.error(`Erro ao baixar anexo ${filename}:`, error);
      throw new Error('Arquivo não encontrado');
    }
  }

  private validarArquivo(file: any): void {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo fornecido');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Permitidos: PDF, JPG, PNG, XLS, XLSX`,
      );
    }
  }

  private async removerArquivo(caminho: string): Promise<void> {
    try {
      await fs.unlink(caminho);
      this.logger.log(`🗑️ Arquivo removido: ${caminho}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Erro ao remover arquivo ${caminho}:`, error);
      }
    }
  }

  async listarAnexos(tipo?: string): Promise<any[]> {
    try {
      const arquivos = await fs.readdir(this.uploadDir);

      const anexos = await Promise.all(
        arquivos
          .filter((f) => !tipo || f.startsWith(tipo))
          .map(async (filename) => {
            const caminho = path.join(this.uploadDir, filename);
            const stats = await fs.stat(caminho);

            return {
              filename,
              url: `/uploads/financeiro/${filename}`,
              size: stats.size,
              created_at: stats.birthtime,
            };
          }),
      );

      return anexos;
    } catch (error) {
      this.logger.error('Erro ao listar anexos:', error);
      return [];
    }
  }
}
